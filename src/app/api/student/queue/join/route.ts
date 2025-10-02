import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { joinQueue } from '@/lib/services/queueService';

// Zod schema for join queue validation
const joinQueueSchema = z.object({
  companyId: z.string().min(1, 'ID de l\'entreprise requis'),
  opportunityType: z.enum(['pfa', 'pfe', 'employment', 'observation'], {
    message: 'Type d\'opportunité invalide'
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Accès réservé aux étudiants' }, { status: 403 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = joinQueueSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Données invalides',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path[0],
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { companyId, opportunityType } = validationResult.data;

    // Join the queue
    const result = await joinQueue(session.user.id, companyId, opportunityType);

    if (result.success) {
      return NextResponse.json(
        {
          message: result.message,
          position: result.position,
          interviewId: result.interviewId
        },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error joining queue:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
