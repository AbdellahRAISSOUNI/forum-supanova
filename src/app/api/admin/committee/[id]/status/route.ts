import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Interview from '@/lib/models/Interview';
import Company from '@/lib/models/Company';

// GET - Get committee member status (active interview)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    await connectDB();

    const memberId = params.id;

    // Get company for this member's assigned room
    const member = await import('@/lib/models/User').then(m => m.default.findById(memberId));
    if (!member || member.role !== 'committee') {
      return NextResponse.json({ error: 'Membre du comité non trouvé' }, { status: 404 });
    }

    const company = await Company.findOne({ room: member.assignedRoom, isActive: true });
    if (!company) {
      return NextResponse.json({ 
        isActive: false,
        message: 'Aucune entreprise assignée à cette salle'
      }, { status: 200 });
    }

    // Check if member is currently managing an interview
    const currentInterview = await Interview.findOne({
      companyId: company._id,
      status: 'in_progress'
    })
    .populate('studentId', 'firstName name')
    .select('studentId startedAt');

    if (currentInterview) {
      return NextResponse.json({
        isActive: true,
        currentInterview: {
          studentName: `${currentInterview.studentId.firstName} ${currentInterview.studentId.name}`,
          startedAt: currentInterview.startedAt
        },
        lastActivity: currentInterview.startedAt
      }, { status: 200 });
    }

    // Get last activity (most recent interview for this company)
    const lastInterview = await Interview.findOne({
      companyId: company._id,
      status: 'completed'
    })
    .sort({ completedAt: -1 })
    .select('completedAt');

    return NextResponse.json({
      isActive: false,
      lastActivity: lastInterview?.completedAt || null,
      message: 'Aucun entretien en cours'
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching committee member status:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
