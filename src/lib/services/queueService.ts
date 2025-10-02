import connectDB from '../db';
import Interview from '../models/Interview';
import User from '../models/User';
import Company from '../models/Company';
import mongoose from 'mongoose';

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
 * Join a queue for a specific company
 */
export async function joinQueue(
  studentId: string,
  companyId: string,
  opportunityType: string
): Promise<JoinQueueResult> {
  try {
    await connectDB();

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(companyId)) {
      return {
        success: false,
        message: 'ID invalide'
      };
    }

    // Check if student already in queue for this company
    const existingInterview = await Interview.findOne({
      studentId,
      companyId,
      status: { $in: ['waiting', 'in_progress'] }
    });

    if (existingInterview) {
      return {
        success: false,
        message: 'Vous êtes déjà dans la file d\'attente pour cette entreprise'
      };
    }

    // Get student from database
    const student = await User.findById(studentId);
    if (!student) {
      return {
        success: false,
        message: 'Étudiant non trouvé'
      };
    }

    // Check if company exists and is active
    const company = await Company.findById(companyId);
    if (!company) {
      return {
        success: false,
        message: 'Entreprise non trouvée'
      };
    }

    if (!company.isActive) {
      return {
        success: false,
        message: 'Cette entreprise n\'est plus active'
      };
    }

    // Calculate priority score
    const priorityScore = calculatePriorityScore(student, opportunityType);

    // Count current queue size for company
    const queueCount = await Interview.countDocuments({
      companyId,
      status: 'waiting'
    });

    // Create new interview record
    const newInterview = new Interview({
      studentId,
      companyId,
      status: 'waiting',
      queuePosition: queueCount + 1,
      priorityScore,
      opportunityType,
      joinedAt: new Date()
    });

    await newInterview.save();

    // Reorder the queue after adding the new student
    const reorderResult = await reorderQueue(companyId);
    
    if (!reorderResult.success) {
      console.error('Failed to reorder queue:', reorderResult.message);
      // Still return success for the join operation, but log the reorder failure
    }

    // Get the updated position after reordering
    const updatedInterview = await Interview.findById(newInterview._id);
    const finalPosition = updatedInterview?.queuePosition || queueCount + 1;

    return {
      success: true,
      message: 'Vous avez rejoint la file d\'attente avec succès',
      position: finalPosition,
      interviewId: newInterview._id.toString()
    };

  } catch (error) {
    console.error('Error joining queue:', error);
    return {
      success: false,
      message: 'Erreur interne du serveur'
    };
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

    // Update interview status to cancelled
    await Interview.findByIdAndUpdate(interviewId, {
      status: 'cancelled',
      updatedAt: new Date()
    });

    // Reorder the queue after leaving
    const reorderResult = await reorderQueue(interview.companyId.toString());
    
    if (!reorderResult.success) {
      console.error('Failed to reorder queue after leaving:', reorderResult.message);
      // Still return success for the leave operation, but log the reorder failure
    }

    return {
      success: true,
      message: 'Vous avez quitté la file d\'attente avec succès'
    };

  } catch (error) {
    console.error('Error leaving queue:', error);
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
 * Recalculate queue positions after someone leaves
 */
async function recalculateQueuePositions(companyId: string): Promise<void> {
  try {
    const interviews = await Interview.find({
      companyId,
      status: 'waiting'
    })
      .sort({ priorityScore: 1, joinedAt: 1 });

    // Update positions
    for (let i = 0; i < interviews.length; i++) {
      await Interview.findByIdAndUpdate(interviews[i]._id, {
        queuePosition: i + 1,
        updatedAt: new Date()
      });
    }

  } catch (error) {
    console.error('Error recalculating queue positions:', error);
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

    if (!mongoose.Types.ObjectId.isValid(interviewId) || !mongoose.Types.ObjectId.isValid(committeeUserId)) {
      return {
        success: false,
        message: 'ID invalide'
      };
    }

    // Get committee member
    const committeeMember = await User.findById(committeeUserId);
    if (!committeeMember || committeeMember.role !== 'committee') {
      return {
        success: false,
        message: 'Membre du comité non trouvé'
      };
    }

    // Get interview
    const interview = await Interview.findById(interviewId)
      .populate('companyId', 'room name')
      .populate('studentId', 'firstName name studentStatus role');
    
    if (!interview) {
      return {
        success: false,
        message: 'Entretien non trouvé'
      };
    }

    // Verify committee member has access to this room
    if (committeeMember.assignedRoom !== interview.companyId.room) {
      return {
        success: false,
        message: 'Vous n\'avez pas accès à cette salle'
      };
    }

    // Check interview status
    if (interview.status !== 'waiting') {
      return {
        success: false,
        message: 'Cet entretien n\'est pas en attente'
      };
    }

    // Check if there's already an interview in progress for this company
    const inProgressInterview = await Interview.findOne({
      companyId: interview.companyId._id,
      status: 'in_progress'
    });

    if (inProgressInterview) {
      return {
        success: false,
        message: 'Un entretien est déjà en cours pour cette entreprise'
      };
    }

    // Update interview status
    await Interview.findByIdAndUpdate(interviewId, {
      status: 'in_progress',
      startedAt: new Date(),
      updatedAt: new Date()
    });

    return {
      success: true,
      message: 'Entretien démarré avec succès'
    };
  } catch (error) {
    console.error('Error starting interview:', error);
    return {
      success: false,
      message: 'Erreur interne du serveur'
    };
  }
}

/**
 * End an interview
 */
export async function endInterview(interviewId: string, committeeUserId: string): Promise<JoinQueueResult> {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(interviewId) || !mongoose.Types.ObjectId.isValid(committeeUserId)) {
      return {
        success: false,
        message: 'ID invalide'
      };
    }

    // Get committee member
    const committeeMember = await User.findById(committeeUserId);
    if (!committeeMember || committeeMember.role !== 'committee') {
      return {
        success: false,
        message: 'Membre du comité non trouvé'
      };
    }

    // Get interview
    const interview = await Interview.findById(interviewId)
      .populate('companyId', 'room name')
      .populate('studentId', 'firstName name studentStatus role');
    
    if (!interview) {
      return {
        success: false,
        message: 'Entretien non trouvé'
      };
    }

    // Verify committee member has access to this room
    if (committeeMember.assignedRoom !== interview.companyId.room) {
      return {
        success: false,
        message: 'Vous n\'avez pas accès à cette salle'
      };
    }

    // Check interview status
    if (interview.status !== 'in_progress') {
      return {
        success: false,
        message: 'Cet entretien n\'est pas en cours'
      };
    }

    // Update interview status
    await Interview.findByIdAndUpdate(interviewId, {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date()
    });

    // Reorder the queue after ending the interview
    const reorderResult = await reorderQueue(interview.companyId._id.toString());
    
    if (!reorderResult.success) {
      console.error('Failed to reorder queue after ending interview:', reorderResult.message);
      // Still return success for the end operation, but log the reorder failure
    }

    return {
      success: true,
      message: 'Entretien terminé avec succès'
    };
  } catch (error) {
    console.error('Error ending interview:', error);
    return {
      success: false,
      message: 'Erreur interne du serveur'
    };
  }
}

/**
 * Reorder queue based on intelligent priority rules
 */
export async function reorderQueue(companyId: string): Promise<{
  success: boolean;
  message: string;
  reorderedQueue?: any[];
}> {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return {
        success: false,
        message: 'ID d\'entreprise invalide'
      };
    }

    // Get all waiting interviews for the company
    const waitingInterviews = await Interview.find({
      companyId,
      status: 'waiting'
    })
    .populate('studentId', 'firstName name studentStatus role')
    .sort({ joinedAt: 1 }); // Sort by joinedAt first for initial ordering

    if (waitingInterviews.length === 0) {
      return {
        success: true,
        message: 'Aucune file d\'attente à réorganiser',
        reorderedQueue: []
      };
    }

    // Group interviews by priority category
    const committeeInterviews = waitingInterviews.filter((interview: any) => 
      interview.studentId.role === 'committee'
    );
    const ensaInterviews = waitingInterviews.filter((interview: any) => 
      interview.studentId.role === 'student' && interview.studentId.studentStatus === 'ensa'
    );
    const externalInterviews = waitingInterviews.filter((interview: any) => 
      interview.studentId.role === 'student' && interview.studentId.studentStatus === 'external'
    );

    // Sort each group by opportunity type priority, then by joinedAt
    const sortByPriority = (interviews: any[]) => {
      return interviews.sort((a, b) => {
        // First sort by opportunity type priority
        const opportunityPriority = {
          'pfa': 1,
          'pfe': 1,
          'employment': 2,
          'observation': 3
        };
        
        const aPriority = opportunityPriority[a.opportunityType] || 4;
        const bPriority = opportunityPriority[b.opportunityType] || 4;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Then sort by joinedAt (earlier = higher priority)
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      });
    };

    const sortedCommittee = sortByPriority(committeeInterviews);
    const sortedEnsa = sortByPriority(ensaInterviews);
    const sortedExternal = sortByPriority(externalInterviews);

    // Apply alternating pattern: 3 committee, 2 external, 2 ensa, repeat
    const reorderedInterviews: any[] = [];
    
    let committeeIndex = 0;
    let ensaIndex = 0;
    let externalIndex = 0;

    while (committeeIndex < sortedCommittee.length || 
           ensaIndex < sortedEnsa.length || 
           externalIndex < sortedExternal.length) {
      
      // Add 3 committee members (if available)
      for (let i = 0; i < 3 && committeeIndex < sortedCommittee.length; i++) {
        reorderedInterviews.push(sortedCommittee[committeeIndex]);
        committeeIndex++;
      }
      
      // Add 2 external students (if available)
      for (let i = 0; i < 2 && externalIndex < sortedExternal.length; i++) {
        reorderedInterviews.push(sortedExternal[externalIndex]);
        externalIndex++;
      }
      
      // Add 2 ENSA students (if available)
      for (let i = 0; i < 2 && ensaIndex < sortedEnsa.length; i++) {
        reorderedInterviews.push(sortedEnsa[ensaIndex]);
        ensaIndex++;
      }
    }

    // Update queue positions in database
    for (let i = 0; i < reorderedInterviews.length; i++) {
      await Interview.findByIdAndUpdate(reorderedInterviews[i]._id, {
        queuePosition: i + 1,
        updatedAt: new Date()
      });
    }

    // Format the reordered queue for response
    const reorderedQueue = reorderedInterviews.map((interview: any, index: number) => ({
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
    console.error('Error reordering queue:', error);
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
