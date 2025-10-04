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
  validateEnum,
  sanitizeObjectId,
  sanitizeString,
  checkRateLimit,
  getSecurityHeaders
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

  // Base score by role - only students can join queues
  if (user.role === 'student') {
    if (user.studentStatus === 'ensa') {
      baseScore = 200;
    } else {
      baseScore = 300; // External students
    }
  } else {
    // Non-students cannot join queues
    throw new ForbiddenError('Seuls les étudiants peuvent rejoindre les files d\'attente');
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
 * Atomically check and create interview record to prevent race conditions
 */
async function atomicCreateInterview(
  studentId: string,
  companyId: string,
  opportunityType: string,
  priorityScore: number,
  session: mongoose.ClientSession
): Promise<{ success: boolean; interview?: any; error?: string }> {
  try {
    // Use findOneAndUpdate with upsert: false to atomically check and create
    const result = await Interview.findOneAndUpdate(
      {
        studentId: new mongoose.Types.ObjectId(studentId),
        companyId: new mongoose.Types.ObjectId(companyId),
        status: { $in: ['waiting', 'in_progress'] }
      },
      {
        $setOnInsert: {
          studentId: new mongoose.Types.ObjectId(studentId),
          companyId: new mongoose.Types.ObjectId(companyId),
          status: 'waiting',
          priorityScore,
          opportunityType,
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        session,
        upsert: false,
        new: true,
        runValidators: true
      }
    );

    // If result is null, it means no existing record was found and no new one was created
    // This indicates the student is not already in the queue
    if (result === null) {
      // Create new interview record
      const newInterview = new Interview({
        studentId: new mongoose.Types.ObjectId(studentId),
        companyId: new mongoose.Types.ObjectId(companyId),
        status: 'waiting',
        priorityScore,
        opportunityType,
        joinedAt: new Date()
      });

      await newInterview.save({ session });
      return { success: true, interview: newInterview };
    } else {
      // Student is already in the queue
      return { success: false, error: 'Vous êtes déjà dans la file d\'attente pour cette entreprise' };
    }
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return { success: false, error: 'Données invalides pour l\'entretien' };
    }
    throw error;
  }
}

/**
 * Atomically get and update queue position
 */
async function atomicUpdateQueuePosition(
  companyId: string,
  session: mongoose.ClientSession
): Promise<{ success: boolean; position?: number; error?: string }> {
  try {
    // Get all waiting interviews for this company, sorted by priority
    const waitingInterviews = await Interview.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      status: 'waiting'
    })
    .sort({ priorityScore: 1, joinedAt: 1 })
    .session(session);

    // Update positions atomically
    const updatePromises = waitingInterviews.map((interview, index) => 
      Interview.findByIdAndUpdate(
        interview._id,
        { queuePosition: index + 1, updatedAt: new Date() },
        { session }
      )
    );

    await Promise.all(updatePromises);

    return { success: true, position: waitingInterviews.length };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la mise à jour des positions' };
  }
}

/**
 * Check for conflicts when joining multiple queues (atomic version)
 */
export async function checkQueueConflictsAtomic(
  studentId: string,
  companyId: string,
  session: mongoose.ClientSession
): Promise<{
  canJoin: boolean;
  conflicts: string[];
  message: string;
}> {
  try {
    // Check for existing in-progress interviews
    const inProgressInterviews = await Interview.find({
      studentId: new mongoose.Types.ObjectId(studentId),
      status: 'in_progress'
    })
    .populate('companyId', 'name room')
    .session(session);

    if (inProgressInterviews.length > 0) {
      const conflicts = inProgressInterviews.map((i: any) => i.companyId.name);
      throw new QueueConflictError(
        'Vous avez déjà un entretien en cours',
        conflicts
      );
    }

    // Check for upcoming interviews (next 3 positions) that might conflict
    const upcomingInterviews = await Interview.find({
      studentId: new mongoose.Types.ObjectId(studentId),
      status: 'waiting',
      queuePosition: { $lte: 3 }
    })
    .populate('companyId', 'name room')
    .session(session);

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
 * Join a queue for a specific company (atomic version)
 */
export async function joinQueueAtomic(
  studentId: string,
  companyId: string,
  opportunityType: string
): Promise<JoinQueueResult> {
  try {
    await connectDB();

    // Sanitize and validate inputs
    const sanitizedStudentId = sanitizeObjectId(studentId);
    const sanitizedCompanyId = sanitizeObjectId(companyId);
    const sanitizedOpportunityType = sanitizeString(opportunityType, 20);
    
    validateRequired(sanitizedOpportunityType, 'Type d\'opportunité');
    validateEnum(sanitizedOpportunityType, ['pfa', 'pfe', 'employment', 'observation'], 'Type d\'opportunité');

    // Check rate limiting
    const rateLimitKey = `join_queue_${sanitizedStudentId}`;
    if (!checkRateLimit(rateLimitKey, 10, 60000)) { // 10 requests per minute
      throw new ValidationError('Trop de tentatives. Veuillez attendre avant de rejoindre une nouvelle file.');
    }

    // Execute the main operation within a transaction
    const result = await withTransaction(async (session) => {
      // Get student from database
      const student = await User.findById(sanitizedStudentId).session(session);
      if (!student) {
        throw new NotFoundError('Étudiant non trouvé');
      }

      // Verify student role
      if (student.role !== 'student') {
        throw new ForbiddenError('Seuls les étudiants peuvent rejoindre les files d\'attente');
      }

      // Check if company exists and is active
      const company = await Company.findById(sanitizedCompanyId).session(session);
      if (!company) {
        throw new NotFoundError('Entreprise non trouvée');
      }

      if (!company.isActive) {
        throw new ConflictError('Cette entreprise n\'est plus active');
      }

      // Check for conflicts with other queues (within transaction)
      const conflictCheck = await checkQueueConflictsAtomic(sanitizedStudentId, sanitizedCompanyId, session);
      if (!conflictCheck.canJoin) {
        throw new QueueConflictError(
          `${conflictCheck.message}. Conflits avec: ${conflictCheck.conflicts.join(', ')}`,
          conflictCheck.conflicts
        );
      }

      // Calculate priority score
      const priorityScore = calculatePriorityScore(student, sanitizedOpportunityType);

      // Atomically create interview record
      const createResult = await atomicCreateInterview(
        sanitizedStudentId,
        sanitizedCompanyId,
        sanitizedOpportunityType,
        priorityScore,
        session
      );

      if (!createResult.success) {
        throw new ConflictError(createResult.error || 'Impossible de rejoindre la file d\'attente');
      }

      // Atomically update queue positions
      const positionResult = await atomicUpdateQueuePosition(sanitizedCompanyId, session);
      if (!positionResult.success) {
        throw new DatabaseError(positionResult.error || 'Erreur lors de la mise à jour des positions');
      }

      // Get the final position of the created interview
      const finalInterview = await Interview.findById(createResult.interview._id).session(session);
      const finalPosition = finalInterview?.queuePosition || positionResult.position;

      return {
        success: true,
        message: 'Vous avez rejoint la file d\'attente avec succès',
        position: finalPosition,
        interviewId: createResult.interview._id.toString()
      };
    });

    return result;

  } catch (error) {
    return handleError(error, 'joinQueueAtomic');
  }
}

/**
 * Leave a queue (cancel interview) - atomic version
 */
export async function leaveQueueAtomic(interviewId: string, studentId: string): Promise<JoinQueueResult> {
  try {
    await connectDB();

    // Validate inputs
    validateObjectId(interviewId, 'ID entretien');
    validateObjectId(studentId, 'ID étudiant');

    // Execute the operation within a transaction
    const result = await withTransaction(async (session) => {
      // Atomically find and update the interview
      const interview = await Interview.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(interviewId),
          studentId: new mongoose.Types.ObjectId(studentId),
          status: 'waiting'
        },
        {
          status: 'cancelled',
          updatedAt: new Date()
        },
        { session, new: true }
      );

      if (!interview) {
        throw new NotFoundError('Interview non trouvée ou déjà traitée');
      }

      // Atomically update queue positions after leaving
      const positionResult = await atomicUpdateQueuePosition(interview.companyId.toString(), session);
      
      if (!positionResult.success) {
        throw new DatabaseError(positionResult.error || 'Erreur lors de la mise à jour des positions');
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
 * Start an interview - atomic version
 */
export async function startInterviewAtomic(interviewId: string, committeeUserId: string): Promise<JoinQueueResult> {
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

      // Get interview with company info
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

      // Atomically check and start interview
      const updatedInterview = await Interview.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(interviewId),
          status: 'waiting',
          // Ensure no other interview is in progress for this company
          companyId: interview.companyId._id
        },
        {
          status: 'in_progress',
          startedAt: new Date(),
          updatedAt: new Date()
        },
        { session, new: true }
      );

      if (!updatedInterview) {
        // Check if there's already an interview in progress
        const inProgressInterview = await Interview.findOne({
          companyId: interview.companyId._id,
          status: 'in_progress'
        }).session(session);

        if (inProgressInterview) {
          throw new ConflictError('Un entretien est déjà en cours pour cette entreprise');
        } else {
          throw new ConflictError('Cet entretien n\'est pas en attente');
        }
      }

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
 * End an interview - atomic version
 */
export async function endInterviewAtomic(interviewId: string, committeeUserId: string): Promise<JoinQueueResult> {
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

      // Get interview with company info
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

      // Atomically end the interview
      const updatedInterview = await Interview.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(interviewId),
          status: 'in_progress'
        },
        {
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        },
        { session, new: true }
      );

      if (!updatedInterview) {
        throw new ConflictError('Cet entretien n\'est pas en cours');
      }

      // Atomically update queue positions after ending the interview
      const positionResult = await atomicUpdateQueuePosition(interview.companyId._id.toString(), session);
      
      if (!positionResult.success) {
        throw new DatabaseError(positionResult.error || 'Erreur lors de la mise à jour des positions');
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
 * Pass/Skip an interview - atomic version
 */
export async function passInterviewAtomic(interviewId: string, committeeUserId: string): Promise<JoinQueueResult> {
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

      // Get interview with company info
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

      // Atomically pass the interview
      const updatedInterview = await Interview.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(interviewId),
          status: 'in_progress'
        },
        {
          status: 'passed',
          passedAt: new Date(),
          updatedAt: new Date()
        },
        { session, new: true }
      );

      if (!updatedInterview) {
        throw new ConflictError('Cet entretien n\'est pas en cours');
      }

      // Atomically update queue positions after passing the interview
      const positionResult = await atomicUpdateQueuePosition(interview.companyId._id.toString(), session);
      
      if (!positionResult.success) {
        throw new DatabaseError(positionResult.error || 'Erreur lors de la mise à jour des positions');
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
 * Move to next student (skip current and start next interview) - atomic version
 */
export async function moveToNextStudentAtomic(companyId: string, committeeUserId: string): Promise<JoinQueueResult> {
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

      // Atomically handle current interview and move to next
      const currentInterview = await Interview.findOne({
        companyId: new mongoose.Types.ObjectId(companyId),
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
        companyId: new mongoose.Types.ObjectId(companyId),
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

      // Update queue positions
      const positionResult = await atomicUpdateQueuePosition(companyId, session);
      if (!positionResult.success) {
        console.warn('Failed to update queue positions after moving to next student:', positionResult.error);
      }

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
