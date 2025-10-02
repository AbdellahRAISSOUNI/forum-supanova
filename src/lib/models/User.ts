import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  email: string;
  password: string;
  name: string;
  firstName?: string;
  role: 'student' | 'committee' | 'admin';
  studentStatus?: 'ensa' | 'external';
  opportunityType?: 'pfa' | 'pfe' | 'employment' | 'observation';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  firstName: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ['student', 'committee', 'admin'],
    default: 'student',
  },
  studentStatus: {
    type: String,
    enum: ['ensa', 'external'],
  },
  opportunityType: {
    type: String,
    enum: ['pfa', 'pfe', 'employment', 'observation'],
  },
}, {
  timestamps: true,
});

// Add index on email for faster lookups
userSchema.index({ email: 1 });

// Export the model
export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);

