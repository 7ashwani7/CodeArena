import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
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
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate bookmarks per user
bookmarkSchema.index({ userId: 1, problemId: 1 }, { unique: true });
// Fast query for user bookmarks sorted by newest
bookmarkSchema.index({ userId: 1, createdAt: -1 });

export const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
