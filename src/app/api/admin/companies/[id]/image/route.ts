import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Company from '@/lib/models/Company';
import { GridFSUtils } from '@/lib/utils/gridfs';
import { validateObjectId } from '@/lib/errors/QueueErrors';

// POST - Upload image for company
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { id } = await params;
    validateObjectId(id, 'ID entreprise');

    await connectDB();

    // Check if company exists
    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier image fourni' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Type de fichier non supporté. Utilisez JPEG, PNG ou WebP' 
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'Fichier trop volumineux. Taille maximum: 5MB' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `company_${id}_${Date.now()}.${fileExtension}`;

    // Upload to GridFS
    const imageId = await GridFSUtils.uploadFile(buffer, filename, {
      companyId: id,
      originalName: file.name,
      contentType: file.type
    });

    // Update company with image info
    const imageUrl = `/api/admin/companies/${id}/image/${imageId}`;
    
    // Delete old image if exists
    if (company.imageId) {
      await GridFSUtils.deleteFile(company.imageId);
    }

    // Update company record
    await Company.findByIdAndUpdate(id, {
      imageId,
      imageUrl,
      updatedAt: new Date()
    });

    return NextResponse.json({
      message: 'Image téléchargée avec succès',
      imageId,
      imageUrl
    }, { status: 200 });

  } catch (error) {
    console.error('Error uploading company image:', error);
    return NextResponse.json({ 
      error: 'Erreur lors du téléchargement de l\'image' 
    }, { status: 500 });
  }
}

// DELETE - Remove image from company
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { id } = await params;
    validateObjectId(id, 'ID entreprise');

    await connectDB();

    // Check if company exists
    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 });
    }

    if (!company.imageId) {
      return NextResponse.json({ error: 'Aucune image à supprimer' }, { status: 400 });
    }

    // Delete from GridFS
    const deleted = await GridFSUtils.deleteFile(company.imageId);
    
    if (!deleted) {
      console.warn('Failed to delete image from GridFS, but continuing with database update');
    }

    // Update company record
    await Company.findByIdAndUpdate(id, {
      $unset: { imageId: 1, imageUrl: 1 },
      updatedAt: new Date()
    });

    return NextResponse.json({
      message: 'Image supprimée avec succès'
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting company image:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la suppression de l\'image' 
    }, { status: 500 });
  }
}
