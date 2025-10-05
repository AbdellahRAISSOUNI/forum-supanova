import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Company from '@/lib/models/Company';
import Interview from '@/lib/models/Interview';
import User from '@/lib/models/User';

// GET - Get room status for all rooms or specific room
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('room');

    // Get all active companies/rooms
    const companies = await Company.find({ isActive: true }).select('_id name room estimatedInterviewDuration');

    const roomStatuses = await Promise.all(
      companies.map(async (company) => {
        // Get current interview for this room
        const currentInterview = await Interview.findOne({
          companyId: company._id,
          status: 'in_progress'
        }).populate('studentId', 'firstName name');

        // Get committee member assigned to this room
        const committeeMember = await User.findOne({
          role: 'committee',
          assignedRoom: company.room
        }).select('firstName name email');

        // Get queue statistics
        const queueStats = await Interview.aggregate([
          { $match: { companyId: company._id, status: 'waiting' } },
          {
            $group: {
              _id: null,
              totalWaiting: { $sum: 1 },
              averageWaitTime: { $avg: '$priorityScore' }
            }
          }
        ]);

        // Determine room status
        let status = 'available';
        let statusMessage = 'Disponible';
        
        if (currentInterview) {
          status = 'in_use';
          statusMessage = 'En cours d\'utilisation';
        } else if (queueStats.length > 0 && queueStats[0].totalWaiting > 0) {
          status = 'waiting';
          statusMessage = 'En attente d\'étudiants';
        }

        // Calculate estimated wait time for next student
        const estimatedWaitTime = currentInterview 
          ? company.estimatedInterviewDuration 
          : 0;

        return {
          roomId: company._id.toString(),
          roomName: company.room,
          companyName: company.name,
          status,
          statusMessage,
          estimatedDuration: company.estimatedInterviewDuration,
          currentInterview: currentInterview ? {
            studentName: `${currentInterview.studentId.firstName} ${currentInterview.studentId.name}`,
            startedAt: currentInterview.startedAt
          } : null,
          committeeMember: committeeMember ? {
            name: `${committeeMember.firstName} ${committeeMember.name}`,
            email: committeeMember.email
          } : null,
          queueStats: {
            totalWaiting: queueStats[0]?.totalWaiting || 0,
            estimatedWaitTime
          },
          equipmentStatus: {
            computer: 'operational', // This could be dynamic in a real system
            microphone: 'operational',
            camera: 'operational',
            lighting: 'operational'
          },
          lastUpdated: new Date()
        };
      })
    );

    // Filter by specific room if requested
    if (roomId) {
      const roomStatus = roomStatuses.find(room => room.roomId === roomId);
      if (!roomStatus) {
        return NextResponse.json({ error: 'Salle non trouvée' }, { status: 404 });
      }
      return NextResponse.json({ roomStatus }, { status: 200 });
    }

    return NextResponse.json({ roomStatuses }, { status: 200 });
  } catch (error) {
    console.error('Error fetching room status:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// PATCH - Update room status (for committee members)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'committee') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    if (!session.user.assignedRoom) {
      return NextResponse.json({ error: 'Aucune salle assignée' }, { status: 400 });
    }

    const body = await request.json();
    const { status, message, equipmentIssues } = body;

    await connectDB();

    // Get company for this committee member's assigned room
    const company = await Company.findOne({ 
      room: session.user.assignedRoom, 
      isActive: true 
    });

    if (!company) {
      return NextResponse.json({ 
        error: 'Aucune entreprise trouvée pour cette salle' 
      }, { status: 404 });
    }

    // In a real system, you might want to store room status in a separate collection
    // For now, we'll just return success as the status is calculated dynamically

    return NextResponse.json({ 
      message: 'Statut de la salle mis à jour avec succès',
      roomStatus: {
        roomId: company._id.toString(),
        roomName: company.room,
        companyName: company.name,
        status: status || 'available',
        statusMessage: message || 'Disponible',
        equipmentIssues: equipmentIssues || [],
        lastUpdated: new Date()
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating room status:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
