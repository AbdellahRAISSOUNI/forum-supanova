import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { endInterview } from '@/lib/services/queueService';
import { z } from 'zod';
import { handleError } from '@/lib/errors/QueueErrors';

const endInterviewSchema = z.object({
  interviewId: z.string().min(1, 'ID d\'entretien requis'),
});

// POST - End an interview
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'committee') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = endInterviewSchema.safeParse(body);

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

    const { interviewId } = validationResult.data;
    const result = await endInterview(interviewId, session.user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ message: result.message }, { status: 200 });
  } catch (error) {
    const errorResponse = handleError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: errorResponse.statusCode }
    );
  }
}
