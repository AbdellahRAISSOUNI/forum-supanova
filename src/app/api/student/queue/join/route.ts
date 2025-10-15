import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { joinQueue } from '@/lib/services/queueService';
import { handleError } from '@/lib/errors/QueueErrors';
import { withRateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { withCircuitBreaker } from '@/lib/circuitBreaker';

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

    // Rate limiting for queue operations
    const rateLimitCheck = withRateLimit(RATE_LIMITS.queue, () => session.user.id);
    const rateLimitResult = rateLimitCheck(request);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Trop de tentatives. Veuillez attendre avant de réessayer.',
          retryAfter: rateLimitResult.retryAfter 
        }, 
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      );
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = joinQueueSchema.safeParse(body);
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

    const { companyId, opportunityType } = validationResult.data;

    // Use circuit breaker for queue operations
    const joinQueueWithCircuitBreaker = withCircuitBreaker(
      joinQueue,
      `queue-join-${session.user.id}`
    );

    // Join the queue
    const result = await joinQueueWithCircuitBreaker(session.user.id, companyId, opportunityType);

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
    const errorResponse = handleError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: errorResponse.statusCode }
    );
  }
}
