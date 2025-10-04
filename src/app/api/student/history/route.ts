import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentInterviewHistory } from '@/lib/services/queueService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Accès réservé aux étudiants' }, { status: 403 });
    }

    // Get student's interview history
    const history = await getStudentInterviewHistory(session.user.id);

    return NextResponse.json({
      history,
      total: history.length,
      completed: history.filter(h => h.status === 'completed').length,
      cancelled: history.filter(h => h.status === 'cancelled').length,
      passed: history.filter(h => h.status === 'passed').length,
    });

  } catch (error) {
    console.error('Error getting interview history:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
