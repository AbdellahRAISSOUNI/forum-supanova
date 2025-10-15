import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Interview } from '@/lib/models/Interview';
import { Company } from '@/lib/models/Company';
import { User } from '@/lib/models/User';
import { withTransaction } from '@/lib/utils/transactions';
import mongoose from 'mongoose';

// GET /api/admin/interviews/delete-all - Get current interviews for confirmation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get all current interviews (waiting and in_progress)
    const currentInterviews = await Interview.find({
      status: { $in: ['waiting', 'in_progress'] }
    })
    .populate('companyId', 'name room')
    .populate('studentId', 'firstName name email')
    .lean();

    // Format the response
    const formattedInterviews = currentInterviews.map(interview => ({
      id: interview._id.toString(),
      studentName: `${interview.studentId?.firstName || ''} ${interview.studentId?.name || ''}`.trim(),
      studentEmail: interview.studentId?.email || '',
      companyName: interview.companyId?.name || '',
      room: interview.companyId?.room || '',
      status: interview.status,
      queuePosition: interview.queuePosition || 0,
      createdAt: interview.createdAt,
      startedAt: interview.startedAt
    }));

    return NextResponse.json({
      currentInterviews: formattedInterviews,
      totalCount: formattedInterviews.length
    });

  } catch (error) {
    console.error('Error fetching current interviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current interviews' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/interviews/delete-all - Delete all current interviews
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Use transaction to ensure data consistency
    const result = await withTransaction(async (session) => {
      // Get all current interviews (waiting and in_progress) before deletion
      const currentInterviews = await Interview.find({
        status: { $in: ['waiting', 'in_progress'] }
      })
      .populate('companyId', 'name room')
      .populate('studentId', 'firstName name email')
      .session(session);

      const interviewCount = currentInterviews.length;

      if (interviewCount === 0) {
        return {
          success: true,
          message: 'No current interviews to delete',
          deletedCount: 0
        };
      }

      // Delete all current interviews
      const deleteResult = await Interview.deleteMany({
        status: { $in: ['waiting', 'in_progress'] }
      }).session(session);

      // Reset all company queue states
      await Company.updateMany(
        { isActive: true },
        { 
          $unset: { 
            currentInterviewId: 1,
            isEmergencyMode: 1,
            queuePaused: 1,
            queuePausedAt: 1
          }
        },
        { session }
      );

      // Reset committee member states
      await User.updateMany(
        { role: 'committee' },
        { 
          $unset: { 
            currentInterviewId: 1,
            isInInterview: 1,
            interviewStartedAt: 1
          }
        },
        { session }
      );

      return {
        success: true,
        message: `Successfully deleted ${deleteResult.deletedCount} current interviews`,
        deletedCount: deleteResult.deletedCount,
        affectedCompanies: await Company.countDocuments({ isActive: true }),
        affectedCommitteeMembers: await User.countDocuments({ role: 'committee' })
      };
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error deleting all interviews:', error);
    return NextResponse.json(
      { error: 'Failed to delete interviews' },
      { status: 500 }
    );
  }
}
