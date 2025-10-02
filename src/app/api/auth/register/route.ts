import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string(),
  studentStatus: z.enum(['ensa', 'external'], {
    required_error: 'Veuillez sélectionner le statut étudiant',
  }),
  opportunityType: z.enum(['pfa', 'pfe', 'employment', 'observation'], {
    required_error: 'Veuillez sélectionner le type d\'opportunité',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('Received registration data:', body);

    // Validate the request body
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      console.log('Validation errors:', validationResult.error.issues);
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

    const { firstName, name, email, password, studentStatus, opportunityType } = validationResult.data;

    // Connect to database
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Un utilisateur avec cet email existe déjà' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      firstName,
      name,
      email,
      password: hashedPassword,
      role: 'student',
      studentStatus,
      opportunityType,
    });

    await newUser.save();

    return NextResponse.json(
      {
        message: 'Compte créé avec succès',
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          studentStatus: newUser.studentStatus,
          opportunityType: newUser.opportunityType,
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}