import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leaveQueue } from '@/lib/services/queueService';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { interviewId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Accès réservé aux étudiants' }, { status: 403 });
    }

    const { interviewId } = params;

    // Leave the queue
    const result = await leaveQueue(interviewId, session.user.id);

    if (result.success) {
      return NextResponse.json(
        { message: result.message },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error leaving queue:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
