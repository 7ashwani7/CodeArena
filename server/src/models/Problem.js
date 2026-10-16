import mongoose from 'mongoose';

const exampleSchema = new mongoose.Schema(
  {
    input: { type: String, required: true, trim: true },
    output: { type: String, required: true, trim: true },
    explanation: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const judgeTestCaseSchema = new mongoose.Schema(
  {
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: true }
  },
  { _id: false }
);

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Problem title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    slug: {
      type: String,
      required: [true, 'Problem slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Problem description is required']
    },
    difficulty: {
      type: String,
      required: [true, 'Problem difficulty is required'],
      enum: {
        values: ['Easy', 'Medium', 'Hard'],
        message: '{VALUE} is not a valid difficulty level'
      },
      index: true
    },
    topics: {
      type: [String],
      default: [],
      index: true
    },
    constraints: {
      type: [String],
      default: []
    },
    examples: {
      type: [exampleSchema],
      default: []
    },
    starterCode: {
      javascript: { type: String, default: '' },
      python: { type: String, default: '' },
      cpp: { type: String, default: '' },
      java: { type: String, default: '' }
    },
    publicationStatus: {
      type: String,
      enum: {
        values: ['published', 'draft', 'archived'],
        message: '{VALUE} is not a valid publication status'
      },
      default: 'published',
      index: true
    },
    // Private judge test cases: INACCESSIBLE to public API responses by default
    judgeTestCases: {
      type: [judgeTestCaseSchema],
      select: false, // Never included in queries unless explicitly requested via .select('+judgeTestCases')
      default: []
    },
    acceptanceRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    submissionCount: {
      type: Number,
      default: 0,
      min: 0
    },
    acceptedCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.judgeTestCases;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound indexes for optimal catalog filtering and sorting
problemSchema.index({ publicationStatus: 1, difficulty: 1 });
problemSchema.index({ publicationStatus: 1, topics: 1 });
problemSchema.index({ publicationStatus: 1, createdAt: -1 });

export const Problem = mongoose.model('Problem', problemSchema);
