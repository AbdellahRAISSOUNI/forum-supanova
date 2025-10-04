import mongoose, { Document } from 'mongoose';

export interface IInterview extends Document {
  studentId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'passed';
  queuePosition: number;
  priorityScore: number;
  opportunityType: 'pfa' | 'pfe' | 'employment' | 'observation';
  joinedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  passedAt?: Date;
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
    enum: ['waiting', 'in_progress', 'completed', 'cancelled', 'passed'],
    default: 'waiting',
    required: true,
  },
  queuePosition: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: function(value: number) {
        return Number.isInteger(value) && value > 0;
      },
      message: 'Queue position must be a positive integer'
    }
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
  passedAt: {
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

// Index to ensure only one interview per company is in progress
interviewSchema.index({ companyId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'in_progress' } });

// Index for efficient queue position updates
interviewSchema.index({ companyId: 1, status: 1, queuePosition: 1, priorityScore: 1, joinedAt: 1 });

// Pre-save middleware to ensure queue consistency
interviewSchema.pre('save', async function(next) {
  // Only validate queue position for waiting interviews
  if (this.status === 'waiting' && this.isModified('queuePosition')) {
    // Check for duplicate queue positions within the same company
    const existingInterview = await (this.constructor as any).findOne({
      companyId: this.companyId,
      status: 'waiting',
      queuePosition: this.queuePosition,
      _id: { $ne: this._id }
    });
    
    if (existingInterview) {
      const error = new Error(`Queue position ${this.queuePosition} already exists for company ${this.companyId}`);
      return next(error);
    }
  }
  next();
});

const Interview = mongoose.models.Interview || mongoose.model<IInterview>('Interview', interviewSchema);

export default Interview;
