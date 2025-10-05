import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Company from '@/lib/models/Company';
import { GridFSUtils } from '@/lib/utils/gridfs';
import { validateObjectId } from '@/lib/errors/QueueErrors';

// GET - Retrieve company image (public endpoint for students and committee)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow access for all authenticated users (students, committee, admin)
    if (!session) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    validateObjectId(id, 'ID entreprise');

    await connectDB();

    // Get company with image info
    const company = await Company.findById(id).select('name imageId imageUrl');
    
    if (!company) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 });
    }

    if (!company.imageId) {
      return NextResponse.json({ error: 'Aucune image disponible' }, { status: 404 });
    }

    // Get image from GridFS
    const imageBuffer = await GridFSUtils.getFile(company.imageId);
    
    if (!imageBuffer) {
      return NextResponse.json({ error: 'Image non trouvée' }, { status: 404 });
    }

    // Return image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Content-Length': imageBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error retrieving company image:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la récupération de l\'image' 
    }, { status: 500 });
  }
}
