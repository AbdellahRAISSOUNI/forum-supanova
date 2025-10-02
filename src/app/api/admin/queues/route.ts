import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Company from '@/lib/models/Company';
import Interview from '@/lib/models/Interview';

// GET - Get all queues overview for admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    await connectDB();

    // Get all active companies
    const companies = await Company.find({ isActive: true })
      .sort({ name: 1 })
      .select('name room estimatedInterviewDuration');

    // Get queue data for each company
    const queuesOverview = await Promise.all(
      companies.map(async (company) => {
        // Get current in-progress interview
        const currentInterview = await Interview.findOne({
          companyId: company._id,
          status: 'in_progress'
        })
        .populate('studentId', 'firstName name studentStatus role')
        .select('studentId opportunityType startedAt');

        // Get waiting interviews (sorted by priority)
        const waitingInterviews = await Interview.find({
          companyId: company._id,
          status: 'waiting'
        })
        .populate('studentId', 'firstName name studentStatus role')
        .sort({ queuePosition: 1 })
        .limit(10) // Get more than 3 for full queue modal
        .select('studentId opportunityType queuePosition joinedAt priorityScore');

        // Get total waiting count
        const totalWaiting = await Interview.countDocuments({
          companyId: company._id,
          status: 'waiting'
        });

        // Calculate average wait time
        const averageWaitTime = totalWaiting * company.estimatedInterviewDuration;

        // Format current interview
        const currentInterviewData = currentInterview ? {
          studentName: `${currentInterview.studentId.firstName} ${currentInterview.studentId.name}`,
          studentStatus: currentInterview.studentId.studentStatus,
          role: currentInterview.studentId.role,
          opportunityType: currentInterview.opportunityType,
          startedAt: currentInterview.startedAt,
          interviewId: currentInterview._id.toString()
        } : null;

        // Format next 3 in queue
        const nextInQueue = waitingInterviews.slice(0, 3).map((interview: any) => ({
          studentName: `${interview.studentId.firstName} ${interview.studentId.name}`,
          studentStatus: interview.studentId.studentStatus,
          role: interview.studentId.role,
          opportunityType: interview.opportunityType,
          position: interview.queuePosition,
          joinedAt: interview.joinedAt,
          priorityScore: interview.priorityScore,
          interviewId: interview._id.toString()
        }));

        // Format full queue for modal (all waiting interviews)
        const fullQueue = waitingInterviews.map((interview: any) => ({
          studentName: `${interview.studentId.firstName} ${interview.studentId.name}`,
          studentStatus: interview.studentId.studentStatus,
          role: interview.studentId.role,
          opportunityType: interview.opportunityType,
          position: interview.queuePosition,
          joinedAt: interview.joinedAt,
          priorityScore: interview.priorityScore,
          interviewId: interview._id.toString()
        }));

        return {
          companyId: company._id.toString(),
          companyName: company.name,
          room: company.room,
          estimatedDuration: company.estimatedInterviewDuration,
          currentInterview: currentInterviewData,
          nextInQueue,
          fullQueue,
          totalWaiting,
          averageWaitTime
        };
      })
    );

    // Filter out companies with no activity
    const activeQueues = queuesOverview.filter(queue => 
      queue.currentInterview || queue.totalWaiting > 0
    );

    return NextResponse.json({ 
      queues: activeQueues,
      totalCompanies: companies.length,
      activeQueues: activeQueues.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin queues:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
