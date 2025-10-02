import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Company from '@/lib/models/Company';
import mongoose from 'mongoose';

// Zod schema for committee member update validation
const committeeMemberUpdateSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis').optional(),
  name: z.string().min(1, 'Le nom est requis').optional(),
  email: z.string().email('Email invalide').optional(),
  assignedRoom: z.string().min(1, 'La salle assignée est requise').optional(),
});

// PATCH - Update committee member
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID de membre du comité invalide' }, { status: 400 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = committeeMemberUpdateSchema.safeParse(body);
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

    await connectDB();

    // Check if committee member exists
    const existingMember = await User.findOne({ _id: id, role: 'committee' });
    if (!existingMember) {
      return NextResponse.json({ error: 'Membre du comité non trouvé' }, { status: 404 });
    }

    // If updating email, check for duplicates
    if (body.email && body.email !== existingMember.email) {
      const duplicateUser = await User.findOne({ 
        email: body.email,
        _id: { $ne: id }
      });
      if (duplicateUser) {
        return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
      }
    }

    // If updating assigned room, verify it exists
    if (body.assignedRoom && body.assignedRoom !== existingMember.assignedRoom) {
      const roomExists = await Company.findOne({ room: body.assignedRoom, isActive: true });
      if (!roomExists) {
        return NextResponse.json({ error: 'Cette salle n\'existe pas ou n\'est pas active' }, { status: 400 });
      }
    }

    // Update committee member
    const updatedMember = await User.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('firstName name email assignedRoom updatedAt');

    return NextResponse.json(
      { 
        message: 'Membre du comité mis à jour avec succès',
        committeeMember: updatedMember 
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating committee member:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// DELETE - Delete committee member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID de membre du comité invalide' }, { status: 400 });
    }

    await connectDB();

    // Check if committee member exists
    const existingMember = await User.findOne({ _id: id, role: 'committee' });
    if (!existingMember) {
      return NextResponse.json({ error: 'Membre du comité non trouvé' }, { status: 404 });
    }

    // Delete committee member
    await User.findByIdAndDelete(id);

    return NextResponse.json(
      { 
        message: 'Membre du comité supprimé avec succès'
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting committee member:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
