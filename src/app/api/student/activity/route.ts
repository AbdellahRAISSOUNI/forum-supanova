import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Interview from '@/lib/models/Interview';

// GET - Get recent student activity
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    await connectDB();

    // Get recent activity (last 10 activities)
    const recentActivity = await Interview.find({
      studentId: session.user.id,
    })
    .populate('companyId', 'name room')
    .sort({ updatedAt: -1 })
    .limit(10)
    .select('status opportunityType joinedAt startedAt completedAt companyId queuePosition');

    const activities = recentActivity.map((interview: any) => ({
      id: interview._id.toString(),
      companyName: interview.companyId.name,
      room: interview.companyId.room,
      status: interview.status,
      opportunityType: interview.opportunityType,
      queuePosition: interview.queuePosition,
      joinedAt: interview.joinedAt,
      startedAt: interview.startedAt,
      completedAt: interview.completedAt,
      updatedAt: interview.updatedAt,
    }));

    return NextResponse.json({ activities }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student activity:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
