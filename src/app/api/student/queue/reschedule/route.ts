import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { rescheduleInterview } from '@/lib/services/queueService';

// Zod schema for reschedule validation
const rescheduleSchema = z.object({
  interviewId: z.string().min(1, 'ID de l\'entretien requis'),
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
    const validationResult = rescheduleSchema.safeParse(body);
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

    const { interviewId } = validationResult.data;

    // Reschedule the interview
    const result = await rescheduleInterview(interviewId, session.user.id);

    if (result.success) {
      return NextResponse.json(
        {
          message: result.message
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error rescheduling interview:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}



