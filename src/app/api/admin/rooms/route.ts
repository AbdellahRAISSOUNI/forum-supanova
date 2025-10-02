import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Company from '@/lib/models/Company';

// GET - List all available rooms from active companies
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    await connectDB();

    // Get all unique rooms from active companies
    const companies = await Company.find({ isActive: true })
      .select('room name')
      .sort({ room: 1 });

    // Extract unique rooms with company names
    const roomsMap = new Map();
    companies.forEach(company => {
      if (!roomsMap.has(company.room)) {
        roomsMap.set(company.room, []);
      }
      roomsMap.get(company.room).push(company.name);
    });

    const rooms = Array.from(roomsMap.entries()).map(([room, companies]) => ({
      room,
      companies: companies.join(', ')
    }));

    return NextResponse.json({ rooms }, { status: 200 });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
