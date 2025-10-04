import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { cancelInterview } from '@/lib/services/queueService';
import { handleError } from '@/lib/errors/QueueErrors';

// Zod schema for cancel validation
const cancelSchema = z.object({
  interviewId: z.string().min(1, 'ID de l\'entretien requis'),
  reason: z.string().optional(),
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
    const validationResult = cancelSchema.safeParse(body);
    if (!validationResult.success) {
      const errorResponse = handleError(new Error(
        validationResult.error.issues.map(issue => 
          `${issue.path[0]}: ${issue.message}`
        ).join(', ')
      ));
      return NextResponse.json(
        { error: errorResponse.message },
        { status: errorResponse.statusCode }
      );
    }

    const { interviewId, reason } = validationResult.data;

    // Cancel the interview
    const result = await cancelInterview(interviewId, session.user.id, reason);

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
    const errorResponse = handleError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: errorResponse.statusCode }
    );
  }
}
