import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Interview from '@/lib/models/Interview';

// GET - Get recent system activity
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    await connectDB();

    // Get recent user registrations
    const recentRegistrations = await User.find({
      role: 'student'
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('firstName name email createdAt studentStatus opportunityType');

    // Get recent interview activities
    const recentInterviews = await Interview.find({})
    .populate('studentId', 'firstName name studentStatus role')
    .populate('companyId', 'name room')
    .sort({ updatedAt: -1 })
    .limit(20)
    .select('status opportunityType joinedAt startedAt completedAt studentId companyId updatedAt');

    // Combine and format activities
    const activities = [];

    // Add registration events
    recentRegistrations.forEach((user: any) => {
      activities.push({
        id: `registration-${user._id}`,
        type: 'registration',
        timestamp: user.createdAt,
        studentName: `${user.firstName} ${user.name}`,
        studentEmail: user.email,
        studentStatus: user.studentStatus,
        opportunityType: user.opportunityType,
        companyName: null,
        room: null,
        action: 'Inscription',
        description: `Nouvel étudiant inscrit: ${user.firstName} ${user.name} (${user.studentStatus})`
      });
    });

    // Add interview events
    recentInterviews.forEach((interview: any) => {
      let action = '';
      let description = '';
      let timestamp = interview.updatedAt;

      switch (interview.status) {
        case 'waiting':
          action = 'Rejoint la file';
          description = `${interview.studentId.firstName} ${interview.studentId.name} a rejoint la file d'attente de ${interview.companyId.name}`;
          timestamp = interview.joinedAt;
          break;
        case 'in_progress':
          action = 'Entretien démarré';
          description = `Entretien démarré pour ${interview.studentId.firstName} ${interview.studentId.name} avec ${interview.companyId.name}`;
          timestamp = interview.startedAt;
          break;
        case 'completed':
          action = 'Entretien terminé';
          description = `Entretien terminé pour ${interview.studentId.firstName} ${interview.studentId.name} avec ${interview.companyId.name}`;
          timestamp = interview.completedAt;
          break;
        case 'cancelled':
          action = 'Sorti de la file';
          description = `${interview.studentId.firstName} ${interview.studentId.name} a quitté la file d'attente de ${interview.companyId.name}`;
          break;
      }

      activities.push({
        id: `interview-${interview._id}`,
        type: 'interview',
        timestamp,
        studentName: `${interview.studentId.firstName} ${interview.studentId.name}`,
        studentEmail: interview.studentId.email,
        studentStatus: interview.studentId.studentStatus,
        opportunityType: interview.opportunityType,
        companyName: interview.companyId.name,
        room: interview.companyId.room,
        action,
        description,
        status: interview.status
      });
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Return top 20 activities
    return NextResponse.json({ 
      activities: activities.slice(0, 20) 
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin activity:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
