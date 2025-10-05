import { NextRequest, NextResponse } from 'next/server';
import { GridFSUtils } from '@/lib/utils/gridfs';
import { validateObjectId } from '@/lib/errors/QueueErrors';

// GET - Retrieve company image
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id, imageId } = await params;
    
    // Validate IDs
    validateObjectId(id, 'ID entreprise');
    validateObjectId(imageId, 'ID image');

    // Get image from GridFS
    const imageBuffer = await GridFSUtils.getFile(imageId);
    
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
