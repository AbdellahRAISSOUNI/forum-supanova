import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Interview from '@/lib/models/Interview';
import Company from '@/lib/models/Company';

// GET - Get committee member's interview history
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // completed, passed, cancelled
    const date = searchParams.get('date'); // YYYY-MM-DD format

    // Build match criteria
    const matchCriteria: any = {
      companyId: company._id,
      status: { $in: ['completed', 'passed', 'cancelled'] }
    };

    if (status) {
      matchCriteria.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      // Filter by any date field (createdAt, updatedAt, completedAt, passedAt)
      matchCriteria.$or = [
        { createdAt: { $gte: startDate, $lt: endDate } },
        { updatedAt: { $gte: startDate, $lt: endDate } },
        { completedAt: { $gte: startDate, $lt: endDate } },
        { passedAt: { $gte: startDate, $lt: endDate } }
      ];
    }

    // Get interviews with pagination - sort by most recent activity first
    const interviews = await Interview.find(matchCriteria)
      .populate('studentId', 'firstName name studentStatus email')
      .sort({ 
        updatedAt: -1,  // Most recently updated first
        createdAt: -1   // Then by creation date
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await Interview.countDocuments(matchCriteria);

    // Format the response
    const formattedInterviews = interviews.map((interview: any) => {
      // Determine the most recent activity date
      const activityDate = interview.updatedAt || interview.completedAt || interview.passedAt || interview.createdAt;
      
      return {
        id: interview._id.toString(),
        studentName: `${interview.studentId.firstName} ${interview.studentId.name}`,
        studentEmail: interview.studentId.email,
        studentStatus: interview.studentId.studentStatus,
        opportunityType: interview.opportunityType,
        status: interview.status,
        joinedAt: interview.joinedAt,
        startedAt: interview.startedAt,
        completedAt: interview.completedAt,
        passedAt: interview.passedAt,
        activityDate: activityDate, // Most recent activity
        duration: interview.startedAt && (interview.completedAt || interview.passedAt) 
          ? Math.round(
              (new Date(interview.completedAt || interview.passedAt).getTime() - 
               new Date(interview.startedAt).getTime()) / 60000
            )
          : null,
        queuePosition: interview.queuePosition,
        priorityScore: interview.priorityScore
      };
    });

    // Get summary statistics
    const summaryStats = await Interview.aggregate([
      { $match: { companyId: company._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgDuration: {
            $avg: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$startedAt', null] },
                    { $ne: ['$completedAt', null] }
                  ]
                },
                then: {
                  $divide: [
                    { $subtract: ['$completedAt', '$startedAt'] },
                    60000
                  ]
                },
                else: null
              }
            }
          }
        }
      }
    ]);

    const stats = summaryStats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        averageDuration: stat.avgDuration ? Math.round(stat.avgDuration) : null
      };
      return acc;
    }, {} as Record<string, { count: number; averageDuration: number | null }>);

    return NextResponse.json({
      interviews: formattedInterviews,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching committee interview history:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
