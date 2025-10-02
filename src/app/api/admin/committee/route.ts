import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Company from '@/lib/models/Company';

// Zod schema for committee member validation
const committeeMemberSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide').min(1, 'L\'email est requis'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  assignedRoom: z.string().min(1, 'La salle assignée est requise'),
});

// GET - List all committee members
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    await connectDB();

    const committeeMembers = await User.find({ role: 'committee' })
      .select('firstName name email assignedRoom createdAt updatedAt')
      .sort({ name: 1 });

    return NextResponse.json({ committeeMembers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching committee members:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// POST - Create new committee member
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = committeeMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Données invalides',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path[0],
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { firstName, name, email, password, assignedRoom } = validationResult.data;

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }

    // Verify that the assigned room exists in companies
    const roomExists = await Company.findOne({ room: assignedRoom, isActive: true });
    if (!roomExists) {
      return NextResponse.json({ error: 'Cette salle n\'existe pas ou n\'est pas active' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new committee member
    const newCommitteeMember = new User({
      firstName,
      name,
      email,
      password: hashedPassword,
      role: 'committee',
      assignedRoom,
    });

    await newCommitteeMember.save();

    return NextResponse.json(
      { 
        message: 'Membre du comité créé avec succès',
        committeeMember: {
          id: newCommitteeMember._id,
          firstName: newCommitteeMember.firstName,
          name: newCommitteeMember.name,
          email: newCommitteeMember.email,
          assignedRoom: newCommitteeMember.assignedRoom,
        }
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating committee member:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
