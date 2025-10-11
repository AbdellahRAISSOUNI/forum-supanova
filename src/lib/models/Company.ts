import mongoose, { Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  sector: string;
  website: string;
  room: string;
  estimatedInterviewDuration: number;
  isActive: boolean;
  isQueuePaused?: boolean; // Whether the queue is paused
  isEmergencyMode?: boolean; // Whether the queue is in emergency mode
  imageId?: string; // GridFS file ID for company image
  imageUrl?: string; // Cached URL for the image
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new mongoose.Schema<ICompany>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  sector: {
    type: String,
    required: true,
    trim: true,
  },
  website: {
    type: String,
    required: true,
    trim: true,
  },
  room: {
    type: String,
    required: true,
    trim: true,
  },
  estimatedInterviewDuration: {
    type: Number,
    required: true,
    default: 20,
    min: 5,
    max: 120,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isQueuePaused: {
    type: Boolean,
    default: false,
  },
  isEmergencyMode: {
    type: Boolean,
    default: false,
  },
  imageId: {
    type: String,
    default: null,
  },
  imageUrl: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
  collection: 'companies',
});

// Add index on name for faster lookups
companySchema.index({ name: 1 });

const Company = mongoose.models.Company || mongoose.model<ICompany>('Company', companySchema);

export default Company;
