import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Company from '@/lib/models/Company';
import mongoose from 'mongoose';

// Zod schema for company update validation
const companyUpdateSchema = z.object({
  name: z.string().min(1, 'Le nom de l\'entreprise est requis').optional(),
  sector: z.string().min(1, 'Le secteur est requis').optional(),
  website: z.string().url('URL du site web invalide').optional(),
  room: z.string().min(1, 'La salle est requise').optional(),
  estimatedInterviewDuration: z.number().min(5, 'Durée minimum 5 minutes').max(120, 'Durée maximum 120 minutes').optional(),
  isActive: z.boolean().optional(),
});

// PATCH - Update company
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
      return NextResponse.json({ error: 'ID d\'entreprise invalide' }, { status: 400 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = companyUpdateSchema.safeParse(body);
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

    // Check if company exists
    const existingCompany = await Company.findById(id);
    if (!existingCompany) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 });
    }

    // If updating name, check for duplicates
    if (body.name && body.name !== existingCompany.name) {
      const duplicateCompany = await Company.findOne({ 
        name: { $regex: new RegExp(`^${body.name}$`, 'i') },
        _id: { $ne: id }
      });
      if (duplicateCompany) {
        return NextResponse.json({ error: 'Une entreprise avec ce nom existe déjà' }, { status: 409 });
      }
    }

    // Update company
    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    return NextResponse.json(
      { 
        message: 'Entreprise mise à jour avec succès',
        company: updatedCompany 
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// DELETE - Soft delete company (set isActive=false)
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
      return NextResponse.json({ error: 'ID d\'entreprise invalide' }, { status: 400 });
    }

    await connectDB();

    // Check if company exists
    const existingCompany = await Company.findById(id);
    if (!existingCompany) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 });
    }

    // Soft delete (set isActive=false)
    const deletedCompany = await Company.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    return NextResponse.json(
      { 
        message: 'Entreprise supprimée avec succès',
        company: deletedCompany 
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
