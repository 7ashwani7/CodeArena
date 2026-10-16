import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    // SECURITY: Store SHA-256 hash of refresh token; raw token is NEVER stored
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      unique: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required']
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true
    },
    revokedAt: {
      type: Date,
      default: null
    },
    userAgent: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// TTL index to automatically prune expired sessions from database
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
