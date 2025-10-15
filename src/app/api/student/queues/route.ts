import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentQueuesOptimized } from '@/lib/services/optimizedQueueService';
import { withRateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Accès réservé aux étudiants' }, { status: 403 });
    }

    // Rate limiting for queue retrieval
    const rateLimitCheck = withRateLimit(RATE_LIMITS.queue, () => session.user.id);
    const rateLimitResult = rateLimitCheck(request);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Trop de requêtes. Veuillez attendre avant de réessayer.',
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

    // Get student's active queues (optimized)
    const queues = await getStudentQueuesOptimized(session.user.id);

    return NextResponse.json({ queues }, { 
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=10', // Cache for 10 seconds
        'X-RateLimit-Limit': '20',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching student queues:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
