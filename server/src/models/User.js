import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: ''
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never exposed in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: '{VALUE} is not a valid role'
      },
      default: 'user'
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    targetRole: {
      type: String,
      trim: true,
      default: 'Software Engineer',
      maxlength: [100, 'Target role cannot exceed 100 characters']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Unique indexes are automatically declared on username and email in the schema above

/**
 * Compare candidate password with stored hash
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    throw new Error('Password hash not loaded on user model');
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Helper to generate secure password hash using bcrypt with 12 salt rounds
 * @param {string} password
 * @returns {Promise<string>}
 */
userSchema.statics.hashPassword = async function (password) {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const User = mongoose.model('User', userSchema);

