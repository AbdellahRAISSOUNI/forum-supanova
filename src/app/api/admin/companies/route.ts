import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Company from '@/lib/models/Company';

// Zod schema for company validation
const companySchema = z.object({
  name: z.string().min(1, 'Le nom de l\'entreprise est requis'),
  sector: z.string().min(1, 'Le secteur est requis'),
  website: z.string().url('URL du site web invalide'),
  room: z.string().min(1, 'La salle est requise'),
  estimatedInterviewDuration: z.number().min(5, 'Durée minimum 5 minutes').max(120, 'Durée maximum 120 minutes'),
});

// GET - List all companies
export async function GET(request: NextRequest) {
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

    const { name, sector, website, room, estimatedInterviewDuration } = validationResult.data;

    await connectDB();

    // Check if company with same name already exists
    const existingCompany = await Company.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCompany) {
      return NextResponse.json({ error: 'Une entreprise avec ce nom existe déjà' }, { status: 409 });
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

    await newCompany.save();

    return NextResponse.json(
      { 
        message: 'Entreprise créée avec succès',
        company: newCompany 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
