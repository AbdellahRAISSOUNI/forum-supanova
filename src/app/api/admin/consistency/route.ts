import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAndFixDatabaseConsistency, validateQueueIntegrity } from '@/lib/utils/databaseConsistency';
import { resolveAllPosition1Conflicts } from '@/lib/services/atomicQueueService';
import { z } from 'zod';

const consistencyCheckSchema = z.object({
  companyId: z.string().optional(),
  fix: z.boolean().default(false)
});

// GET - Check database consistency
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const fix = searchParams.get('fix') === 'true';

    if (companyId) {
      // Validate specific company queue
      const result = await validateQueueIntegrity(companyId);
      return NextResponse.json({
        isValid: result.isValid,
        issues: result.issues,
        companyId
      });
    } else if (fix) {
      // Check and fix all consistency issues
      const result = await checkAndFixDatabaseConsistency();
      return NextResponse.json({
        isValid: result.isValid,
        issues: result.issues,
        fixed: result.fixed
      });
    } else {
      // Just check without fixing
      const result = await checkAndFixDatabaseConsistency();
      return NextResponse.json({
        isValid: result.isValid,
        issues: result.issues,
        fixed: 0
      });
    }
  } catch (error) {
    console.error('Consistency check error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de cohérence' },
      { status: 500 }
    );
  }
}

// POST - Fix database consistency issues
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = consistencyCheckSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Paramètres invalides' },
        { status: 400 }
      );
    }

    const { companyId, fix } = validationResult.data;

    if (companyId) {
      // Fix specific company queue
      const result = await validateQueueIntegrity(companyId);
      return NextResponse.json({
        message: 'Vérification terminée',
        isValid: result.isValid,
        issues: result.issues,
        companyId
      });
    } else {
      // Fix all consistency issues
      const consistencyResult = await checkAndFixDatabaseConsistency();

      // Also resolve position 1 conflicts
      const position1Result = await resolveAllPosition1Conflicts();

      return NextResponse.json({
        message: 'Correction terminée',
        isValid: consistencyResult.isValid,
        issues: [...consistencyResult.issues, ...position1Result.errors],
        fixed: consistencyResult.fixed + position1Result.resolved,
        position1ConflictsResolved: position1Result.resolved
      });
    }
  } catch (error) {
    console.error('Consistency fix error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la correction de cohérence' },
      { status: 500 }
    );
  }
}

