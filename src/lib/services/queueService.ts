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

    return {
      success: true,
      message: 'Vous avez rejoint la file d\'attente avec succès',
      position: queueCount + 1,
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

    // Recalculate positions for remaining queue members
    await recalculateQueuePositions(interview.companyId.toString());

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
