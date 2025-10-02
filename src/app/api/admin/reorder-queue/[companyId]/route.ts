import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reorderQueue } from '@/lib/services/queueService';

// POST - Manually reorder queue for a company (Admin only)
export async function POST(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const result = await reorderQueue(params.companyId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: result.message,
      reorderedQueue: result.reorderedQueue 
    }, { status: 200 });
  } catch (error) {
    console.error('Error reordering queue:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
