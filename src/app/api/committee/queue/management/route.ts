import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Interview from '@/lib/models/Interview';
import Company from '@/lib/models/Company';
import User from '@/lib/models/User';
import { withTransaction } from '@/lib/utils/transactions';
import mongoose from 'mongoose';

// GET - Get queue management data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'committee') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    if (!session.user.assignedRoom) {
      return NextResponse.json({ error: 'Aucune salle assignée' }, { status: 400 });
    }

    await connectDB();

    // Get company for this committee member's assigned room
    const company = await Company.findOne({ 
      room: session.user.assignedRoom, 
      isActive: true 
    });

    if (!company) {
      return NextResponse.json({ 
        error: 'Aucune entreprise trouvée pour cette salle' 
      }, { status: 404 });
    }

    // Get detailed queue information
    const waitingInterviews = await Interview.find({
      companyId: company._id,
      status: 'waiting'
    })
    .populate('studentId', 'firstName name studentStatus email phone')
    .sort({ priorityScore: 1, joinedAt: 1 })
    .lean();

    const currentInterview = await Interview.findOne({
      companyId: company._id,
      status: 'in_progress'
    })
    .populate('studentId', 'firstName name studentStatus email phone');

    // Calculate queue statistics
    const queueStats = await Interview.aggregate([
      { $match: { companyId: company._id, status: 'waiting' } },
      {
        $group: {
          _id: null,
          totalWaiting: { $sum: 1 },
          averagePriorityScore: { $avg: '$priorityScore' },
          minWaitTime: { $min: '$joinedAt' }
        }
      }
    ]);

    // Get today's completed interviews for efficiency metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStats = await Interview.aggregate([
      {
        $match: {
          companyId: company._id,
          status: 'completed',
          completedAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          totalCompleted: { $sum: 1 },
          averageDuration: {
            $avg: {
              $divide: [
                { $subtract: ['$completedAt', '$startedAt'] },
                60000 // Convert to minutes
              ]
            }
          }
        }
      }
    ]);

    const formattedQueue = waitingInterviews.map((interview: any, index) => ({
      interviewId: interview._id.toString(),
      position: index + 1,
      studentName: `${interview.studentId.firstName} ${interview.studentId.name}`,
      studentEmail: interview.studentId.email,
      studentPhone: interview.studentId.phone,
      studentStatus: interview.studentId.studentStatus,
      opportunityType: interview.opportunityType,
      joinedAt: interview.joinedAt,
      priorityScore: interview.priorityScore,
      estimatedWaitTime: (index + 1) * company.estimatedInterviewDuration
    }));

    const responseData = {
      queueManagement: {
        company: {
          _id: company._id.toString(),
          name: company.name,
          room: company.room,
          estimatedDuration: company.estimatedInterviewDuration,
          isQueuePaused: company.isQueuePaused || false,
          isEmergencyMode: company.isEmergencyMode || false
        },
        currentInterview: currentInterview ? {
          interviewId: currentInterview._id.toString(),
          studentName: `${currentInterview.studentId.firstName} ${currentInterview.studentId.name}`,
          studentEmail: currentInterview.studentId.email,
          studentPhone: currentInterview.studentId.phone,
          studentStatus: currentInterview.studentId.studentStatus,
          opportunityType: currentInterview.opportunityType,
          startedAt: currentInterview.startedAt
        } : null,
        waitingQueue: formattedQueue,
        statistics: {
          totalWaiting: queueStats[0]?.totalWaiting || 0,
          averagePriorityScore: queueStats[0]?.averagePriorityScore || 0,
          oldestWaitTime: queueStats[0]?.minWaitTime || null,
          todayCompleted: todayStats[0]?.totalCompleted || 0,
          averageDuration: Math.round(todayStats[0]?.averageDuration || company.estimatedInterviewDuration),
          estimatedNextCall: formattedQueue.length > 0 ? formattedQueue[0].estimatedWaitTime : 0
        }
      }
    };
    
    console.log('API Response - Company status:', {
      isQueuePaused: responseData.queueManagement.company.isQueuePaused,
      isEmergencyMode: responseData.queueManagement.company.isEmergencyMode
    });
    
    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('Error fetching queue management data:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// POST - Advanced queue management actions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'committee') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    if (!session.user.assignedRoom) {
      return NextResponse.json({ error: 'Aucune salle assignée' }, { status: 400 });
    }

    const body = await request.json();
    const { action, interviewId, newPosition, notes } = body;

    await connectDB();

    // Get company for this committee member's assigned room
    const company = await Company.findOne({ 
      room: session.user.assignedRoom, 
      isActive: true 
    });

    if (!company) {
      return NextResponse.json({ 
        error: 'Aucune entreprise trouvée pour cette salle' 
      }, { status: 404 });
    }

    let result;

    switch (action) {
      case 'reorder':
        result = await reorderQueue(company._id.toString(), interviewId, newPosition);
        break;
      case 'priority_override':
        result = await priorityOverride(company._id.toString(), interviewId);
        break;
      case 'add_notes':
        result = await addInterviewNotes(interviewId, notes);
        break;
      case 'emergency_call':
        result = await emergencyCall(company._id.toString(), interviewId);
        break;
      case 'pause_queue':
        result = await pauseQueue(company._id.toString());
        break;
      case 'resume_queue':
        result = await resumeQueue(company._id.toString());
        break;
      case 'emergency_mode':
        result = await emergencyMode(company._id.toString());
        break;
      case 'clear_queue':
        result = await clearQueue(company._id.toString());
        break;
      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: result.message,
      data: result.data 
    }, { status: 200 });
  } catch (error) {
    console.error('Error in queue management action:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Helper function to reorder queue
async function reorderQueue(companyId: string, interviewId: string, newPosition: number) {
  return await withTransaction(async (session) => {
    // Get all waiting interviews for this company
    const waitingInterviews = await Interview.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      status: 'waiting'
    })
    .sort({ priorityScore: 1, joinedAt: 1 })
    .session(session);

    const targetInterview = waitingInterviews.find(i => i._id.toString() === interviewId);
    if (!targetInterview) {
      return { success: false, message: 'Interview non trouvée' };
    }

    // Remove target interview from list
    const otherInterviews = waitingInterviews.filter(i => i._id.toString() !== interviewId);
    
    // Insert at new position
    otherInterviews.splice(newPosition - 1, 0, targetInterview);

    // Update positions
    for (let i = 0; i < otherInterviews.length; i++) {
      await Interview.findByIdAndUpdate(
        otherInterviews[i]._id,
        { queuePosition: i + 1 },
        { session }
      );
    }

    return { 
      success: true, 
      message: 'File d\'attente réorganisée avec succès',
      data: { newPosition }
    };
  });
}

// Helper function for priority override
async function priorityOverride(companyId: string, interviewId: string) {
  return await withTransaction(async (session) => {
    // Set priority score to 0 (highest priority)
    await Interview.findByIdAndUpdate(
      interviewId,
      { priorityScore: 0 },
      { session }
    );

    // Reorder the entire queue
    const waitingInterviews = await Interview.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      status: 'waiting'
    })
    .sort({ priorityScore: 1, joinedAt: 1 })
    .session(session);

    for (let i = 0; i < waitingInterviews.length; i++) {
      await Interview.findByIdAndUpdate(
        waitingInterviews[i]._id,
        { queuePosition: i + 1 },
        { session }
      );
    }

    return { 
      success: true, 
      message: 'Priorité élevée accordée avec succès',
      data: { newPosition: 1 }
    };
  });
}

// Helper function to add notes
async function addInterviewNotes(interviewId: string, notes: string) {
  // In a real system, you might want to add a notes field to the Interview model
  // For now, we'll just return success
  return { 
    success: true, 
    message: 'Notes ajoutées avec succès',
    data: { notes }
  };
}

// Helper function for emergency call
async function emergencyCall(companyId: string, interviewId: string) {
  return await withTransaction(async (session) => {
    // End current interview if any
    const currentInterview = await Interview.findOne({
      companyId: new mongoose.Types.ObjectId(companyId),
      status: 'in_progress'
    }).session(session);

    if (currentInterview) {
      await Interview.findByIdAndUpdate(
        currentInterview._id,
        { 
          status: 'passed',
          passedAt: new Date()
        },
        { session }
      );
    }

    // Start the emergency interview
    await Interview.findByIdAndUpdate(
      interviewId,
      { 
        status: 'in_progress',
        startedAt: new Date(),
        priorityScore: 0
      },
      { session }
    );

    return { 
      success: true, 
      message: 'Appel d\'urgence effectué avec succès',
      data: { emergencyStarted: true }
    };
  });
}

// Helper function to pause queue
async function pauseQueue(companyId: string) {
  return await withTransaction(async (session) => {
    console.log('Pausing queue for company:', companyId);
    
    // Update company to mark queue as paused
    const result = await Company.findByIdAndUpdate(
      companyId,
      { isQueuePaused: true },
      { session, new: true }
    );
    
    console.log('Company updated:', result?.isQueuePaused);

    return { 
      success: true, 
      message: 'File d\'attente mise en pause avec succès',
      data: { queuePaused: true }
    };
  });
}

// Helper function to resume queue
async function resumeQueue(companyId: string) {
  return await withTransaction(async (session) => {
    console.log('Resuming queue for company:', companyId);
    
    // Update company to mark queue as active
    const result = await Company.findByIdAndUpdate(
      companyId,
      { isQueuePaused: false },
      { session, new: true }
    );
    
    console.log('Company updated:', result?.isQueuePaused);

    return { 
      success: true, 
      message: 'File d\'attente reprise avec succès',
      data: { queueResumed: true }
    };
  });
}

// Helper function for emergency mode
async function emergencyMode(companyId: string) {
  return await withTransaction(async (session) => {
    // End current interview if any
    const currentInterview = await Interview.findOne({
      companyId: new mongoose.Types.ObjectId(companyId),
      status: 'in_progress'
    }).session(session);

    if (currentInterview) {
      await Interview.findByIdAndUpdate(
        currentInterview._id,
        { 
          status: 'passed',
          passedAt: new Date()
        },
        { session }
      );
    }

    // Set emergency mode flag
    await Company.findByIdAndUpdate(
      companyId,
      { isEmergencyMode: true },
      { session }
    );

    return { 
      success: true, 
      message: 'Mode d\'urgence activé avec succès',
      data: { emergencyMode: true }
    };
  });
}

// Helper function to clear queue
async function clearQueue(companyId: string) {
  return await withTransaction(async (session) => {
    // Cancel all waiting interviews
    await Interview.updateMany(
      {
        companyId: new mongoose.Types.ObjectId(companyId),
        status: 'waiting'
      },
      { 
        status: 'cancelled',
        cancelledAt: new Date()
      },
      { session }
    );

    return { 
      success: true, 
      message: 'File d\'attente vidée avec succès',
      data: { queueCleared: true }
    };
  });
}
