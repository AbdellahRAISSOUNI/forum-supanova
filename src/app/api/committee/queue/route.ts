import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getQueueForRoom } from '@/lib/services/queueService';

// GET - Get queue for committee member's assigned room
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'committee') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    if (!session.user.assignedRoom) {
      return NextResponse.json({ error: 'Aucune salle assignée' }, { status: 400 });
    }

    const queueData = await getQueueForRoom(session.user.assignedRoom);

    // If no active company for this room, return 200 with null to let UI show empty state
    return NextResponse.json({ queueData: queueData ?? null }, { status: 200 });
  } catch (error) {
    console.error('Error fetching queue for room:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
