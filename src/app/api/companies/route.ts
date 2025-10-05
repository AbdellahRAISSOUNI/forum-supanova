import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Company from '@/lib/models/Company';
import Interview from '@/lib/models/Interview';

// GET - List active companies for students with queue status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
    }

    await connectDB();

    // Get only active companies
    const companies = await Company.find({ isActive: true })
      .sort({ name: 1 })
      .select('name sector website room estimatedInterviewDuration imageId imageUrl');

    // For students, also get their queue status for each company
    if (session.user.role === 'student') {
      const companiesWithQueueStatus = await Promise.all(
        companies.map(async (company) => {
          // Get queue length for this company
          const queueLength = await Interview.countDocuments({
            companyId: company._id,
            status: 'waiting'
          });

          // Check if student is already in queue for this company
          const studentInQueue = await Interview.findOne({
            studentId: session.user.id,
            companyId: company._id,
            status: { $in: ['waiting', 'in_progress'] }
          }).select('queuePosition status');

          return {
            ...company.toObject(),
            queueLength,
            studentInQueue: studentInQueue ? {
              position: studentInQueue.queuePosition,
              status: studentInQueue.status
            } : null
          };
        })
      );

      return NextResponse.json({ companies: companiesWithQueueStatus }, { status: 200 });
    }

    // For non-students, return companies without queue status
    return NextResponse.json({ companies }, { status: 200 });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
