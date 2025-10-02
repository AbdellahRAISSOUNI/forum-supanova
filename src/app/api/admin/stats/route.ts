import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Interview from '@/lib/models/Interview';
import Company from '@/lib/models/Company';

// GET - Get admin dashboard statistics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total students registered
    const totalStudents = await User.countDocuments({
      role: 'student'
    });

    // Get total interviews completed today
    const totalInterviewsToday = await Interview.countDocuments({
      status: 'completed',
      completedAt: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Get active interviews now
    const activeInterviewsNow = await Interview.countDocuments({
      status: 'in_progress'
    });

    // Get total active companies
    const totalCompanies = await Company.countDocuments({
      isActive: true
    });

    // Get additional statistics
    const totalCommitteeMembers = await User.countDocuments({
      role: 'committee'
    });

    const totalQueuesJoined = await Interview.countDocuments({
      status: { $in: ['waiting', 'in_progress'] }
    });

    const averageInterviewDuration = await Company.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avgDuration: { $avg: '$estimatedInterviewDuration' } } }
    ]);

    const avgDuration = averageInterviewDuration.length > 0 
      ? Math.round(averageInterviewDuration[0].avgDuration) 
      : 20;

    // Get system health metrics
    const totalInterviewsAllTime = await Interview.countDocuments();
    const completedInterviewsAllTime = await Interview.countDocuments({
      status: 'completed'
    });

    const systemHealth = {
      totalInterviews: totalInterviewsAllTime,
      completedInterviews: completedInterviewsAllTime,
      completionRate: totalInterviewsAllTime > 0 
        ? Math.round((completedInterviewsAllTime / totalInterviewsAllTime) * 100) 
        : 0
    };

    return NextResponse.json({
      stats: {
        totalStudents,
        totalInterviewsToday,
        activeInterviewsNow,
        totalCompanies,
        totalCommitteeMembers,
        totalQueuesJoined,
        averageDuration: avgDuration,
        systemHealth
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
