import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Interview from '@/lib/models/Interview';
import Company from '@/lib/models/Company';
import User from '@/lib/models/User';

// GET - Get committee-specific statistics
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'committee') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    if (!session.user.assignedRoom) {
      return NextResponse.json({ error: 'Aucune salle assignée' }, { status: 400 });
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('time') || 'today'; // 'today' or 'all'

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build date filter based on time parameter
    const buildDateFilter = (field: string) => {
      if (timeFilter === 'all') {
        return {}; // No date filter for all-time stats
      }
      return {
        [field]: {
          $gte: today,
          $lt: tomorrow
        }
      };
    };

    // Get statistics based on time filter
    const mainStats = await Interview.aggregate([
      {
        $match: {
          companyId: company._id,
          status: 'completed',
          ...buildDateFilter('completedAt')
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

    // Get current queue statistics
    const queueStats = await Interview.aggregate([
      {
        $match: {
          companyId: company._id,
          status: { $in: ['waiting', 'in_progress'] }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get week statistics (only for today filter)
    let weekStats = { totalCompleted: 0, averageDuration: 0 };
    if (timeFilter === 'today') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekResults = await Interview.aggregate([
        {
          $match: {
            companyId: company._id,
            status: 'completed',
            completedAt: {
              $gte: weekStart,
              $lt: tomorrow
            }
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
                  60000
                ]
              }
            }
          }
        }
      ]);
      weekStats = weekResults[0] || { totalCompleted: 0, averageDuration: 0 };
    }

    // Get opportunity type distribution
    const opportunityStats = await Interview.aggregate([
      {
        $match: {
          companyId: company._id,
          status: 'completed',
          ...buildDateFilter('completedAt')
        }
      },
      {
        $group: {
          _id: '$opportunityType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get student status distribution
    const studentStatusStats = await Interview.aggregate([
      {
        $match: {
          companyId: company._id,
          status: 'completed',
          ...buildDateFilter('completedAt')
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $unwind: '$student'
      },
      {
        $group: {
          _id: '$student.studentStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get current interview duration if there's an active interview
    const currentInterview = await Interview.findOne({
      companyId: company._id,
      status: 'in_progress'
    }).populate('studentId', 'firstName name studentStatus');

    let currentInterviewDuration = 0;
    if (currentInterview && currentInterview.startedAt) {
      currentInterviewDuration = Math.floor(
        (Date.now() - new Date(currentInterview.startedAt).getTime()) / 60000
      );
    }

    // Format the response
    const stats = {
      timeFilter,
      company: {
        name: company.name,
        room: company.room,
        estimatedDuration: company.estimatedInterviewDuration
      },
      main: {
        completed: mainStats[0]?.totalCompleted || 0,
        averageDuration: Math.round(mainStats[0]?.averageDuration || 0),
        currentInterview: currentInterview ? {
          studentName: `${currentInterview.studentId.firstName} ${currentInterview.studentId.name}`,
          studentStatus: currentInterview.studentId.studentStatus,
          duration: currentInterviewDuration
        } : null
      },
      week: {
        completed: weekStats.totalCompleted || 0,
        averageDuration: Math.round(weekStats.averageDuration || 0)
      },
      queue: {
        waiting: queueStats.find(s => s._id === 'waiting')?.count || 0,
        inProgress: queueStats.find(s => s._id === 'in_progress')?.count || 0
      },
      distribution: {
        opportunities: opportunityStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {} as Record<string, number>),
        studentStatus: studentStatusStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {} as Record<string, number>)
      }
    };

    return NextResponse.json({ stats }, { status: 200 });
  } catch (error) {
    console.error('Error fetching committee stats:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
