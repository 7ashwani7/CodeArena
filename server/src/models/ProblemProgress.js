import mongoose from 'mongoose';

const problemProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: [true, 'Problem ID is required']
    },
    status: {
      type: String,
      enum: {
        values: ['Attempted', 'Solved'],
        message: '{VALUE} is not a valid progress status'
      },
      default: 'Attempted',
      index: true
    },
    solvedAt: {
      type: Date,
      default: null
    },
    bestSubmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      default: null
    },
    attemptsCount: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  {
    timestamps: true
  }
);

// MANDATORY: Unique compound index on userId and problemId
problemProgressSchema.index({ userId: 1, problemId: 1 }, { unique: true });
problemProgressSchema.index({ userId: 1, status: 1 });

export const ProblemProgress = mongoose.model('ProblemProgress', problemProgressSchema);
