import connectDB from '../db';
import Interview from '../models/Interview';
import User from '../models/User';
import Company from '../models/Company';
import mongoose from 'mongoose';
import { withTransaction } from '../utils/transactions';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  QueueConflictError,
  DatabaseError,
  handleError,
  validateObjectId,
  validateRequired,
  validateEnum
} from '../errors/QueueErrors';

export interface QueuePosition {
  _id: string;
  studentName: string;
  position: number;
  opportunityType: string;
  joinedAt: Date;
  priorityScore: number;
}

export interface JoinQueueResult {
  success: boolean;
  message: string;
  position?: number;
  interviewId?: string;
}

/**
 * Calculate priority score for a user based on their role and opportunity type
 * Lower score = higher priority
 */
export function calculatePriorityScore(user: any, opportunityType: string): number {
  let baseScore = 0;

  // Base score by role
  if (user.role === 'committee') {
    baseScore = 100;
  } else if (user.role === 'admin') {
    baseScore = 50; // Admins have highest priority
  } else if (user.studentStatus === 'ensa') {
    baseScore = 200;
  } else {
    baseScore = 300; // External students
  }

  // Add opportunity type modifier
  switch (opportunityType) {
    case 'pfa':
    case 'pfe':
      baseScore += 0; // No modifier for academic projects
      break;
    case 'employment':
      baseScore += 10;
      break;
    case 'observation':
      baseScore += 20;
      break;
    default:
      baseScore += 30; // Unknown type gets lowest priority
  }

  return baseScore;
}

/**
 * Check for conflicts when joining multiple queues
 */
export async function checkQueueConflicts(
  studentId: string,
  companyId: string
): Promise<{
  canJoin: boolean;
  conflicts: string[];
  message: string;
}> {
  try {
    await connectDB();

    // Validate inputs
    validateObjectId(studentId, 'ID étudiant');
    validateObjectId(companyId, 'ID entreprise');

    // Check for existing in-progress interviews
    const inProgressInterviews = await Interview.find({
      studentId,
      status: 'in_progress'
    }).populate('companyId', 'name room');

    if (inProgressInterviews.length > 0) {
      const conflicts = inProgressInterviews.map((i: any) => i.companyId.name);
      throw new QueueConflictError(
        'Vous avez déjà un entretien en cours',
        conflicts
      );
    }

    // Check for upcoming interviews (next 3 positions) that might conflict
    const upcomingInterviews = await Interview.find({
      studentId,
      status: 'waiting',
      queuePosition: { $lte: 3 }
    }).populate('companyId', 'name room');

    if (upcomingInterviews.length > 0) {
      const conflicts = upcomingInterviews.map((i: any) => i.companyId.name);
      throw new QueueConflictError(
        'Vous avez des entretiens prioritaires en attente (position ≤ 3)',
        conflicts
      );
    }

    return { canJoin: true, conflicts: [], message: 'OK' };
  } catch (error) {
    if (error instanceof QueueConflictError) {
      return {
        canJoin: false,
        conflicts: error.conflicts,
        message: error.message
      };
    }
    
    console.error('Error checking queue conflicts:', error);
    return {
      canJoin: false,
      conflicts: [],
      message: 'Erreur lors de la vérification des conflits'
    };
  }
}

/**
 * Join a queue for a specific company
 */
export async function joinQueue(
  studentId: string,
  companyId: string,
  opportunityType: string
): Promise<JoinQueueResult> {
  try {
    await connectDB();

    // Validate inputs
    validateObjectId(studentId, 'ID étudiant');
    validateObjectId(companyId, 'ID entreprise');
    validateRequired(opportunityType, 'Type d\'opportunité');
    validateEnum(opportunityType, ['pfa', 'pfe', 'employment', 'observation'], 'Type d\'opportunité');

    // Pre-validation checks (outside transaction for performance)
    const existingInterview = await Interview.findOne({
      studentId,
      companyId,
      status: { $in: ['waiting', 'in_progress'] }
    });

    if (existingInterview) {
      throw new ConflictError('Vous êtes déjà dans la file d\'attente pour cette entreprise');
    }

    // Check for conflicts with other queues
    const conflictCheck = await checkQueueConflicts(studentId, companyId);
    if (!conflictCheck.canJoin) {
      throw new QueueConflictError(
        `${conflictCheck.message}. Conflits avec: ${conflictCheck.conflicts.join(', ')}`,
        conflictCheck.conflicts
      );
    }

    // Execute the main operation within a transaction
    const result = await withTransaction(async (session) => {
      // Get student from database
      const student = await User.findById(studentId).session(session);
      if (!student) {
        throw new NotFoundError('Étudiant non trouvé');
      }

      // Check if company exists and is active
      const company = await Company.findById(companyId).session(session);
      if (!company) {
        throw new NotFoundError('Entreprise non trouvée');
      }

      if (!company.isActive) {
        throw new ConflictError('Cette entreprise n\'est plus active');
      }

      // Calculate priority score
      const priorityScore = calculatePriorityScore(student, opportunityType);

      // Count current queue size for company
      const queueCount = await Interview.countDocuments({
        companyId,
        status: 'waiting'
      }).session(session);

      // Create new interview record
      const newInterview = new Interview({
        studentId,
        companyId,
        status: 'waiting',
        queuePosition: queueCount + 1, // Will be corrected by reorderQueue
        priorityScore,
        opportunityType,
        joinedAt: new Date()
      });

      await newInterview.save({ session });

      // Reorder the queue after adding the new student
      const reorderResult = await reorderQueueWithSession(companyId, session);
      
      if (!reorderResult.success) {
        throw new DatabaseError(`Failed to reorder queue: ${reorderResult.message}`);
      }

      // Get the updated position after reordering
      const updatedInterview = await Interview.findById(newInterview._id).session(session);
      const finalPosition = updatedInterview?.queuePosition || queueCount + 1;

      return {
        success: true,
        message: 'Vous avez rejoint la file d\'attente avec succès',
        position: finalPosition,
        interviewId: newInterview._id.toString()
      };
    });

    return result;

  } catch (error) {
    return handleError(error);
  }
}

/**
 * Get queue for a specific company
 */
export async function getQueueForCompany(companyId: string): Promise<QueuePosition[]> {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return [];
    }

    const interviews = await Interview.find({
      companyId,
      status: 'waiting'
    })
      .populate('studentId', 'firstName name')
      .sort({ priorityScore: 1, joinedAt: 1 })
      .lean();

    return interviews.map((interview: any) => ({
      _id: interview._id.toString(),
      studentName: `${interview.studentId.firstName} ${interview.studentId.name}`,
      position: interview.queuePosition,
      opportunityType: interview.opportunityType,
      joinedAt: interview.joinedAt,
      priorityScore: interview.priorityScore
    }));

  } catch (error) {
    console.error('Error getting queue for company:', error);
    return [];
  }
}

/**
 * Leave a queue (cancel interview)
 */
export async function leaveQueue(interviewId: string, studentId: string): Promise<JoinQueueResult> {
  try {
    await connectDB();

    // Validate inputs
    validateObjectId(interviewId, 'ID entretien');
    validateObjectId(studentId, 'ID étudiant');

    // Execute the operation within a transaction
    const result = await withTransaction(async (session) => {
      // Find the interview
      const interview = await Interview.findOne({
        _id: interviewId,
        studentId,
        status: 'waiting'
      }).session(session);

      if (!interview) {
        throw new NotFoundError('Interview non trouvée ou déjà traitée');
      }

      // Update interview status to cancelled
      await Interview.findByIdAndUpdate(interviewId, {
        status: 'cancelled',
        updatedAt: new Date()
      }, { session });

      // Reorder the queue after leaving
      const reorderResult = await reorderQueueWithSession(interview.companyId.toString(), session);
      
      if (!reorderResult.success) {
        throw new DatabaseError(`Failed to reorder queue after leaving: ${reorderResult.message}`);
      }

      return {
        success: true,
        message: 'Vous avez quitté la file d\'attente avec succès'
      };
    });

    return result;

  } catch (error) {
    return handleError(error);
  }
}

/**
 * Reschedule an interview (move to end of queue)
 */
export async function rescheduleInterview(interviewId: string, studentId: string): Promise<JoinQueueResult> {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(interviewId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      return {
        success: false,
        message: 'ID invalide'
      };
    }

    // Find the interview
    const interview = await Interview.findOne({
      _id: interviewId,
      studentId,
      status: 'waiting'
    });

    if (!interview) {
      return {
        success: false,
        message: 'Interview non trouvée ou déjà traitée'
      };
    }

    // Check if student is in position 1 (about to be called)
    if (interview.queuePosition === 1) {
      return {
        success: false,
        message: 'Impossible de reporter un entretien en position 1. Veuillez annuler à la place.'
      };
    }

    // Get the last position in the queue
    const lastPosition = await Interview.countDocuments({
      companyId: interview.companyId,
      status: 'waiting'
    });

    // Update interview to move to end of queue
    await Interview.findByIdAndUpdate(interviewId, {
      queuePosition: lastPosition,
      joinedAt: new Date(), // Update join time to reflect rescheduling
      updatedAt: new Date()
    });

    // Reorder the queue to maintain proper positions
    const reorderResult = await reorderQueue(interview.companyId.toString());
    
    if (!reorderResult.success) {
      console.error('Failed to reorder queue after rescheduling:', reorderResult.message);
    }

    return {
      success: true,
      message: 'Entretien reporté avec succès. Vous êtes maintenant en fin de file.'
    };

  } catch (error) {
    console.error('Error rescheduling interview:', error);
    return {
      success: false,
      message: 'Erreur interne du serveur'
    };
  }
}

/**
 * Cancel an interview (different from leaving - marks as cancelled but keeps in history)
 */
export async function cancelInterview(interviewId: string, studentId: string, reason?: string): Promise<JoinQueueResult> {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(interviewId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      return {
        success: false,
        message: 'ID invalide'
      };
    }

    // Find the interview
    const interview = await Interview.findOne({
      _id: interviewId,
      studentId,
      status: { $in: ['waiting', 'in_progress'] }
    });

    if (!interview) {
      return {
        success: false,
        message: 'Interview non trouvée ou déjà terminée'
      };
    }

    // Update interview status to cancelled
    await Interview.findByIdAndUpdate(interviewId, {
      status: 'cancelled',
      completedAt: new Date(),
      updatedAt: new Date()
    });

    // Reorder the queue after cancelling
    const reorderResult = await reorderQueue(interview.companyId.toString());
    
    if (!reorderResult.success) {
      console.error('Failed to reorder queue after cancelling:', reorderResult.message);
    }

    return {
      success: true,
      message: 'Entretien annulé avec succès'
    };

  } catch (error) {
    console.error('Error cancelling interview:', error);
    return {
      success: false,
      message: 'Erreur interne du serveur'
    };
  }
}

/**
 * Get student's active queues
 */
export async function getStudentQueues(studentId: string): Promise<any[]> {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return [];
    }

    const interviews = await Interview.find({
      studentId,
      status: { $in: ['waiting', 'in_progress'] }
    })
      .populate('companyId', 'name room estimatedInterviewDuration')
      .sort({ joinedAt: 1 })
      .lean();

    return interviews.map((interview: any) => ({
      _id: interview._id.toString(),
      companyName: interview.companyId.name,
      room: interview.companyId.room,
      estimatedDuration: interview.companyId.estimatedInterviewDuration,
      position: interview.queuePosition,
      opportunityType: interview.opportunityType,
      status: interview.status,
      joinedAt: interview.joinedAt,
      priorityScore: interview.priorityScore
    }));

  } catch (error) {
    console.error('Error getting student queues:', error);
    return [];
  }
}

/**
 * Get student's interview history
 */
export async function getStudentInterviewHistory(studentId: string): Promise<any[]> {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return [];
    }

    const interviews = await Interview.find({
      studentId,
      status: { $in: ['completed', 'cancelled', 'passed'] }
    })
      .populate('companyId', 'name room sector website')
      .sort({ updatedAt: -1 }) // Most recent first
      .lean();

    return interviews.map((interview: any) => ({
      _id: interview._id.toString(),
      companyName: interview.companyId.name,
      companySector: interview.companyId.sector,
      companyWebsite: interview.companyId.website,
      room: interview.companyId.room,
      opportunityType: interview.opportunityType,
      status: interview.status,
      joinedAt: interview.joinedAt,
      startedAt: interview.startedAt,
      completedAt: interview.completedAt,
      passedAt: interview.passedAt,
      finalPosition: interview.queuePosition,
      priorityScore: interview.priorityScore,
      duration: interview.startedAt && interview.completedAt 
        ? Math.round((new Date(interview.completedAt).getTime() - new Date(interview.startedAt).getTime()) / 60000)
        : null,
    }));

  } catch (error) {
    console.error('Error getting student interview history:', error);
    return [];
  }
}


/**
 * Get queue statistics for a company
 */
export async function getQueueStats(companyId: string): Promise<{
  totalWaiting: number;
  averageWaitTime: number;
  estimatedWaitTime: number;
}> {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return { totalWaiting: 0, averageWaitTime: 0, estimatedWaitTime: 0 };
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return { totalWaiting: 0, averageWaitTime: 0, estimatedWaitTime: 0 };
    }

    const waitingInterviews = await Interview.find({
      companyId,
      status: 'waiting'
    }).sort({ priorityScore: 1, joinedAt: 1 });

    const totalWaiting = waitingInterviews.length;
    const averageWaitTime = company.estimatedInterviewDuration; // This could be calculated from historical data
    const estimatedWaitTime = totalWaiting * averageWaitTime;

    return {
      totalWaiting,
      averageWaitTime,
      estimatedWaitTime
    };

  } catch (error) {
    console.error('Error getting queue stats:', error);
    return { totalWaiting: 0, averageWaitTime: 0, estimatedWaitTime: 0 };
  }
}

/**
 * Start an interview
 */
export async function startInterview(interviewId: string, committeeUserId: string): Promise<JoinQueueResult> {
  try {
    await connectDB();

    // Validate inputs
    validateObjectId(interviewId, 'ID entretien');
    validateObjectId(committeeUserId, 'ID membre comité');

    // Execute the operation within a transaction
    const result = await withTransaction(async (session) => {
      // Get committee member
      const committeeMember = await User.findById(committeeUserId).session(session);
      if (!committeeMember || committeeMember.role !== 'committee') {
        throw new NotFoundError('Membre du comité non trouvé');
      }

      // Get interview
      const interview = await Interview.findById(interviewId)
        .populate('companyId', 'room name')
        .populate('studentId', 'firstName name studentStatus role')
        .session(session);
      
      if (!interview) {
        throw new NotFoundError('Entretien non trouvé');
      }

      // Verify committee member has access to this room
      if (committeeMember.assignedRoom !== interview.companyId.room) {
        throw new ForbiddenError('Vous n\'avez pas accès à cette salle');
      }

      // Check interview status
      if (interview.status !== 'waiting') {
        throw new ConflictError('Cet entretien n\'est pas en attente');
      }

      // Check if there's already an interview in progress for this company
      const inProgressInterview = await Interview.findOne({
        companyId: interview.companyId._id,
        status: 'in_progress'
      }).session(session);

      if (inProgressInterview) {
        throw new ConflictError('Un entretien est déjà en cours pour cette entreprise');
      }

      // Update interview status
      await Interview.findByIdAndUpdate(interviewId, {
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date()
      }, { session });

      return {
        success: true,
        message: 'Entretien démarré avec succès'
      };
    });

    return result;
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Pass/Skip an interview (move to next student without completing)
 */
export async function passInterview(interviewId: string, committeeUserId: string): Promise<JoinQueueResult> {
  try {
    await connectDB();

    // Validate inputs
    validateObjectId(interviewId, 'ID entretien');
    validateObjectId(committeeUserId, 'ID membre comité');

    // Execute the operation within a transaction
    const result = await withTransaction(async (session) => {
      // Get committee member
      const committeeMember = await User.findById(committeeUserId).session(session);
      if (!committeeMember || committeeMember.role !== 'committee') {
        throw new NotFoundError('Membre du comité non trouvé');
      }

      // Get interview
      const interview = await Interview.findById(interviewId)
        .populate('companyId', 'room name')
        .populate('studentId', 'firstName name studentStatus role')
        .session(session);
      
      if (!interview) {
        throw new NotFoundError('Entretien non trouvé');
      }

      // Verify committee member has access to this room
      if (committeeMember.assignedRoom !== interview.companyId.room) {
        throw new ForbiddenError('Vous n\'avez pas accès à cette salle');
      }

      // Check interview status
      if (interview.status !== 'in_progress') {
        throw new ConflictError('Cet entretien n\'est pas en cours');
      }

      // Update interview status to passed
      await Interview.findByIdAndUpdate(interviewId, {
        status: 'passed',
        passedAt: new Date(),
        updatedAt: new Date()
      }, { session });

      // Reorder the queue after passing the interview
      const reorderResult = await reorderQueueWithSession(interview.companyId._id.toString(), session);
      
      if (!reorderResult.success) {
        throw new DatabaseError(`Failed to reorder queue after passing interview: ${reorderResult.message}`);
      }

      return {
        success: true,
        message: 'Entretien passé avec succès - Étudiant suivant dans la file'
      };
    });

    return result;
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Move to next student (skip current and start next interview)
 */
export async function moveToNextStudent(companyId: string, committeeUserId: string): Promise<JoinQueueResult> {
  try {
    await connectDB();

    // Validate inputs
    validateObjectId(companyId, 'ID entreprise');
    validateObjectId(committeeUserId, 'ID membre comité');

    // Execute the operation within a transaction
    const result = await withTransaction(async (session) => {
      // Get committee member
      const committeeMember = await User.findById(committeeUserId).session(session);
      if (!committeeMember || committeeMember.role !== 'committee') {
        throw new NotFoundError('Membre du comité non trouvé');
      }

      // Get company
      const company = await Company.findById(companyId).session(session);
      if (!company) {
        throw new NotFoundError('Entreprise non trouvée');
      }

      // Verify committee member has access to this room
      if (committeeMember.assignedRoom !== company.room) {
        throw new ForbiddenError('Vous n\'avez pas accès à cette salle');
      }

      // Check if there's an interview in progress
      const currentInterview = await Interview.findOne({
        companyId,
        status: 'in_progress'
      }).session(session);

      if (currentInterview) {
        // Pass the current interview first
        await Interview.findByIdAndUpdate(currentInterview._id, {
          status: 'passed',
          passedAt: new Date(),
          updatedAt: new Date()
        }, { session });
      }

      // Get the next student in queue
      const nextInterview = await Interview.findOne({
        companyId,
        status: 'waiting'
      })
      .populate('studentId', 'firstName name studentStatus role')
      .sort({ priorityScore: 1, joinedAt: 1 })
      .session(session);

      if (!nextInterview) {
        return {
          success: true,
          message: 'Aucun étudiant en attente dans cette file'
        };
      }

      // Start the next interview
      await Interview.findByIdAndUpdate(nextInterview._id, {
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date()
      }, { session });

      return {
        success: true,
        message: `Entretien démarré avec ${nextInterview.studentId.firstName} ${nextInterview.studentId.name}`
      };
    });

    return result;
  } catch (error) {
    return handleError(error);
  }
}

/**
 * End an interview
 */
export async function endInterview(interviewId: string, committeeUserId: string): Promise<JoinQueueResult> {
  try {
    await connectDB();

    // Validate inputs
    validateObjectId(interviewId, 'ID entretien');
    validateObjectId(committeeUserId, 'ID membre comité');

    // Execute the operation within a transaction
    const result = await withTransaction(async (session) => {
      // Get committee member
      const committeeMember = await User.findById(committeeUserId).session(session);
      if (!committeeMember || committeeMember.role !== 'committee') {
        throw new NotFoundError('Membre du comité non trouvé');
      }

      // Get interview
      const interview = await Interview.findById(interviewId)
        .populate('companyId', 'room name')
        .populate('studentId', 'firstName name studentStatus role')
        .session(session);
      
      if (!interview) {
        throw new NotFoundError('Entretien non trouvé');
      }

      // Verify committee member has access to this room
      if (committeeMember.assignedRoom !== interview.companyId.room) {
        throw new ForbiddenError('Vous n\'avez pas accès à cette salle');
      }

      // Check interview status
      if (interview.status !== 'in_progress') {
        throw new ConflictError('Cet entretien n\'est pas en cours');
      }

      // Update interview status
      await Interview.findByIdAndUpdate(interviewId, {
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      }, { session });

      // Reorder the queue after ending the interview
      const reorderResult = await reorderQueueWithSession(interview.companyId._id.toString(), session);
      
      if (!reorderResult.success) {
        throw new DatabaseError(`Failed to reorder queue after ending interview: ${reorderResult.message}`);
      }

      return {
        success: true,
        message: 'Entretien terminé avec succès'
      };
    });

    return result;
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Reorder queue based on consistent priority score system
 */
export async function reorderQueue(companyId: string): Promise<{
  success: boolean;
  message: string;
  reorderedQueue?: any[];
}> {
  try {
    await connectDB();
    return await withTransaction(async (session) => {
      return await reorderQueueWithSession(companyId, session);
    });
  } catch (error) {
    console.error('Error reordering queue:', error);
    return {
      success: false,
      message: 'Erreur lors de la réorganisation de la file d\'attente'
    };
  }
}

/**
 * Reorder queue with session support for transactions
 */
async function reorderQueueWithSession(
  companyId: string, 
  session: mongoose.ClientSession
): Promise<{
  success: boolean;
  message: string;
  reorderedQueue?: any[];
}> {
  try {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return {
        success: false,
        message: 'ID d\'entreprise invalide'
      };
    }

    // Get all waiting interviews for the company, sorted by priority score and join time
    const waitingInterviews = await Interview.find({
      companyId,
      status: 'waiting'
    })
    .populate('studentId', 'firstName name studentStatus role')
    .sort({ priorityScore: 1, joinedAt: 1 }) // Consistent with calculatePriorityScore logic
    .session(session);

    if (waitingInterviews.length === 0) {
      return {
        success: true,
        message: 'Aucune file d\'attente à réorganiser',
        reorderedQueue: []
      };
    }

    // Update queue positions based on the sorted order
    for (let i = 0; i < waitingInterviews.length; i++) {
      await Interview.findByIdAndUpdate(waitingInterviews[i]._id, {
        queuePosition: i + 1,
        updatedAt: new Date()
      }, { session });
    }

    // Format the reordered queue for response
    const reorderedQueue = waitingInterviews.map((interview: any, index: number) => ({
      interviewId: interview._id.toString(),
      studentName: `${interview.studentId.firstName} ${interview.studentId.name}`,
      studentStatus: interview.studentId.studentStatus,
      role: interview.studentId.role,
      position: index + 1,
      opportunityType: interview.opportunityType,
      joinedAt: interview.joinedAt,
      priorityScore: interview.priorityScore,
    }));

    return {
      success: true,
      message: 'File d\'attente réorganisée avec succès',
      reorderedQueue
    };
  } catch (error) {
    console.error('Error reordering queue with session:', error);
    return {
      success: false,
      message: 'Erreur lors de la réorganisation de la file d\'attente'
    };
  }
}

/**
 * Get queue for a specific room
 */
export async function getQueueForRoom(room: string): Promise<{
  company: any;
  currentInterview: any;
  nextUp: any;
  waitingQueue: any[];
  totalWaiting: number;
}> {
  try {
    await connectDB();

    // Get company for this room
    const company = await Company.findOne({ room, isActive: true });
    if (!company) {
      throw new Error('Aucune entreprise trouvée pour cette salle');
    }

    // Get current in-progress interview
    const currentInterview = await Interview.findOne({
      companyId: company._id,
      status: 'in_progress'
    })
    .populate('studentId', 'firstName name studentStatus role');

    // Get waiting interviews (now ordered by queuePosition after reordering)
    const waitingInterviews = await Interview.find({
      companyId: company._id,
      status: 'waiting'
    })
    .populate('studentId', 'firstName name studentStatus role')
    .sort({ queuePosition: 1 });

    // Format waiting queue
    const waitingQueue = waitingInterviews.map((interview: any) => ({
      interviewId: interview._id.toString(),
      studentName: `${interview.studentId.firstName} ${interview.studentId.name}`,
      studentStatus: interview.studentId.studentStatus,
      role: interview.studentId.role,
      position: interview.queuePosition,
      opportunityType: interview.opportunityType,
      joinedAt: interview.joinedAt,
      priorityScore: interview.priorityScore,
    }));

    // Get next up (first in waiting queue)
    const nextUp = waitingQueue.length > 0 ? waitingQueue[0] : null;

    return {
      company: {
        _id: company._id.toString(),
        name: company.name,
        room: company.room,
        estimatedInterviewDuration: company.estimatedInterviewDuration
      },
      currentInterview: currentInterview ? {
        interviewId: currentInterview._id.toString(),
        studentName: `${currentInterview.studentId.firstName} ${currentInterview.studentId.name}`,
        studentStatus: currentInterview.studentId.studentStatus,
        role: currentInterview.studentId.role,
        opportunityType: currentInterview.opportunityType,
        startedAt: currentInterview.startedAt,
      } : null,
      nextUp,
      waitingQueue: waitingQueue.slice(0, 10), // Show next 10
      totalWaiting: waitingQueue.length,
    };
  } catch (error) {
    console.error('Error getting queue for room:', error);
    throw error;
  }
}
