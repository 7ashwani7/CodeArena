import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: [true, 'Problem ID is required'],
      index: true
    },
    language: {
      type: String,
      required: [true, 'Programming language is required'],
      enum: {
        values: ['javascript', 'python', 'cpp', 'java'],
        message: '{VALUE} is not a supported language'
      }
    },
    sourceCode: {
      type: String,
      required: [true, 'Source code is required'],
      maxlength: [65536, 'Source code exceeds maximum allowed length of 64KB']
    },
    status: {
      type: String,
      enum: {
        values: [
          'Pending',
          'Accepted',
          'Wrong Answer',
          'Time Limit Exceeded',
          'Memory Limit Exceeded',
          'Runtime Error',
          'Compilation Error'
        ],
        message: '{VALUE} is not a valid submission status'
      },
      default: 'Pending',
      index: true
    },
    testCaseCounts: {
      passed: { type: Number, default: 0, min: 0 },
      total: { type: Number, default: 0, min: 0 }
    },
    executionTimeMs: {
      type: Number,
      default: null
    },
    memoryUsageKb: {
      type: Number,
      default: null
    },
    safeErrorDetails: {
      type: String,
      default: null,
      maxlength: [2048, 'Error details exceed maximum length']
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for user problem submission history, filtering, and analytics
submissionSchema.index({ userId: 1, problemId: 1, createdAt: -1 });
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ userId: 1, status: 1, createdAt: -1 });
submissionSchema.index({ userId: 1, language: 1, createdAt: -1 });
submissionSchema.index({ problemId: 1, status: 1 });

export const Submission = mongoose.model('Submission', submissionSchema);
