import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Company from '@/lib/models/Company';
import mongoose from 'mongoose';
import { withTransaction } from '@/lib/utils/transactions';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  handleError,
  validateObjectId
} from '@/lib/errors/QueueErrors';

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
    validateObjectId(id, 'ID entreprise');

    const body = await request.json();

    // Validate the request body
    const validationResult = companyUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError(
        validationResult.error.issues.map(issue => 
          `${issue.path[0]}: ${issue.message}`
        ).join(', ')
      );
    }

    await connectDB();

    // Execute the operation within a transaction
    const result = await withTransaction(async (session) => {
      // Check if company exists
      const existingCompany = await Company.findById(id).session(session);
      if (!existingCompany) {
        throw new NotFoundError('Entreprise non trouvée');
      }

      // If updating name, check for duplicates
      if (body.name && body.name !== existingCompany.name) {
        const duplicateCompany = await Company.findOne({ 
          name: { $regex: new RegExp(`^${body.name}$`, 'i') },
          _id: { $ne: id }
        }).session(session);
        
        if (duplicateCompany) {
          throw new ConflictError('Une entreprise avec ce nom existe déjà');
        }
      }

      // Update company
      const updatedCompany = await Company.findByIdAndUpdate(
        id,
        { ...body, updatedAt: new Date() },
        { new: true, runValidators: true, session }
      );

      return {
        message: 'Entreprise mise à jour avec succès',
        company: updatedCompany 
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const errorResponse = handleError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: errorResponse.statusCode }
    );
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
    validateObjectId(id, 'ID entreprise');

    await connectDB();

    // Execute the operation within a transaction
    const result = await withTransaction(async (session) => {
      // Check if company exists
      const existingCompany = await Company.findById(id).session(session);
      if (!existingCompany) {
        throw new NotFoundError('Entreprise non trouvée');
      }

      // Soft delete (set isActive=false)
      const deletedCompany = await Company.findByIdAndUpdate(
        id,
        { isActive: false, updatedAt: new Date() },
        { new: true, session }
      );

      return {
        message: 'Entreprise supprimée avec succès',
        company: deletedCompany 
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const errorResponse = handleError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: errorResponse.statusCode }
    );
  }
}
