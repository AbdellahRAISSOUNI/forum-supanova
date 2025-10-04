import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Interview from '@/lib/models/Interview';
import Company from '@/lib/models/Company';

// GET - Get student statistics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total active queues (waiting + in_progress)
    const totalQueues = await Interview.countDocuments({
      studentId: session.user.id,
      status: { $in: ['waiting', 'in_progress'] }
    });

    // Get active interviews (in progress)
    const activeInterviews = await Interview.countDocuments({
      studentId: session.user.id,
      status: 'in_progress'
    });

    // Get completed interviews today
    const completedToday = await Interview.countDocuments({
      studentId: session.user.id,
      status: 'completed',
      completedAt: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Get total completed interviews (all time)
    const totalCompleted = await Interview.countDocuments({
      studentId: session.user.id,
      status: { $in: ['completed', 'cancelled'] }
    });

    // Get waiting queues
    const waitingQueues = await Interview.countDocuments({
      studentId: session.user.id,
      status: 'waiting'
    });

    // Get total companies available
    const totalCompanies = await Company.countDocuments({
      isActive: true
    });

    // Get average interview duration
    const avgDuration = await Company.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avgDuration: { $avg: '$estimatedInterviewDuration' } } }
    ]);

    const averageDuration = avgDuration.length > 0 ? Math.round(avgDuration[0].avgDuration) : 20;

    return NextResponse.json({
      stats: {
        totalQueues,
        activeInterviews,
        completedToday,
        totalCompleted,
        waitingQueues,
        totalCompanies,
        averageDuration
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student stats:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
