import mongoose, { Document, Schema } from 'mongoose';

export interface IInterview extends Document {
  studentId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  queuePosition: number;
  priorityScore: number;
  opportunityType: 'pfa' | 'pfe' | 'employment' | 'observation';
  joinedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const interviewSchema = new mongoose.Schema<IInterview>({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'completed', 'cancelled'],
    default: 'waiting',
    required: true,
  },
  queuePosition: {
    type: Number,
    required: true,
    min: 1,
  },
  priorityScore: {
    type: Number,
    required: true,
    min: 0,
  },
  opportunityType: {
    type: String,
    enum: ['pfa', 'pfe', 'employment', 'observation'],
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  startedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  collection: 'interviews',
});

// Indexes for efficient queries
interviewSchema.index({ studentId: 1 });
interviewSchema.index({ companyId: 1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ queuePosition: 1 });
interviewSchema.index({ priorityScore: 1 });

// Compound index for queue queries
interviewSchema.index({ companyId: 1, status: 1, queuePosition: 1 });

// Compound index to prevent duplicate active interviews
interviewSchema.index({ studentId: 1, companyId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['waiting', 'in_progress'] } } });

const Interview = mongoose.models.Interview || mongoose.model<IInterview>('Interview', interviewSchema);

export default Interview;
