import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';

// GridFS utility functions for handling file uploads
export class GridFSUtils {
  private static bucket: GridFSBucket | null = null;

  // Initialize GridFS bucket
  static async initializeBucket(): Promise<GridFSBucket> {
    if (this.bucket) {
      return this.bucket;
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined');
    }

    const client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db();
    this.bucket = new GridFSBucket(db, { bucketName: 'company_images' });
    
    return this.bucket;
  }

  // Upload file to GridFS
  static async uploadFile(
    buffer: Buffer, 
    filename: string, 
    metadata?: any
  ): Promise<string> {
    const bucket = await this.initializeBucket();
    
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        ...metadata,
        uploadDate: new Date()
      }
    });

    return new Promise((resolve, reject) => {
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => resolve(uploadStream.id.toString()));
      
      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  // Get file from GridFS
  static async getFile(fileId: string): Promise<Buffer | null> {
    const bucket = await this.initializeBucket();
    
    try {
      const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
      
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        
        downloadStream.on('data', (chunk) => chunks.push(chunk));
        downloadStream.on('error', reject);
        downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (error) {
      console.error('Error getting file from GridFS:', error);
      return null;
    }
  }

  // Delete file from GridFS
  static async deleteFile(fileId: string): Promise<boolean> {
    const bucket = await this.initializeBucket();
    
    try {
      await bucket.delete(new ObjectId(fileId));
      return true;
    } catch (error) {
      console.error('Error deleting file from GridFS:', error);
      return false;
    }
  }

  // Check if file exists in GridFS
  static async fileExists(fileId: string): Promise<boolean> {
    const bucket = await this.initializeBucket();
    
    try {
      const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
      return files.length > 0;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }
}

