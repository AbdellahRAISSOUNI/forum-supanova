import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Company from '@/lib/models/Company';
import { withTransaction } from '@/lib/utils/transactions';
import {
  ValidationError,
  ConflictError,
  DatabaseError,
  handleError,
  validateObjectId
} from '@/lib/errors/QueueErrors';

// Zod schema for company validation
const companySchema = z.object({
  name: z.string().min(1, 'Le nom de l\'entreprise est requis'),
  sector: z.string().min(1, 'Le secteur est requis'),
  website: z.string().url('URL du site web invalide'),
  room: z.string().min(1, 'La salle est requise'),
  estimatedInterviewDuration: z.number().min(5, 'Durée minimum 5 minutes').max(120, 'Durée maximum 120 minutes'),
});

// GET - List all companies
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    await connectDB();

    const companies = await Company.find({})
      .sort({ name: 1 })
      .select('name sector website room estimatedInterviewDuration isActive createdAt updatedAt');

    return NextResponse.json({ companies }, { status: 200 });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// POST - Create new company
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = companySchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError(
        validationResult.error.issues.map(issue => 
          `${issue.path[0]}: ${issue.message}`
        ).join(', ')
      );
    }

    const { name, sector, website, room, estimatedInterviewDuration } = validationResult.data;

    await connectDB();

    // Execute the operation within a transaction
    const result = await withTransaction(async (session) => {
      // Check if company with same name already exists
      const existingCompany = await Company.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') } 
      }).session(session);
      
      if (existingCompany) {
        throw new ConflictError('Une entreprise avec ce nom existe déjà');
      }

      // Create new company
      const newCompany = new Company({
        name,
        sector,
        website,
        room,
        estimatedInterviewDuration,
        isActive: true,
      });

      await newCompany.save({ session });

      return {
        message: 'Entreprise créée avec succès',
        company: newCompany 
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const errorResponse = handleError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: errorResponse.statusCode }
    );
  }
}
