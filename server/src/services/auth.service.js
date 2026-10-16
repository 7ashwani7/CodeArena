import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AppError } from '../utils/apiResponse.js';
import {
  signJwtToken,
  generateRandomToken,
  hashToken,
  SESSION_EXPIRY_MS
} from '../utils/token.js';

// Pre-computed bcrypt hash of a random string used to prevent timing attacks when a user does not exist
const DUMMY_HASH = '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

/**
 * Register a new user and generate a session
 */
export async function registerUser({ username, email, password, name, userAgent = '', ipAddress = '' }) {
  // Check for duplicate email or username
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new AppError('Email is already registered', 409, 'DUPLICATE_EMAIL');
    }
    throw new AppError('Username is already taken', 409, 'DUPLICATE_USERNAME');
  }

  // Hash password using bcrypt (12 rounds)
  const passwordHash = await User.hashPassword(password);

  // Default role is always 'user' — never trusted from client
  const user = await User.create({
    username,
    email,
    passwordHash,
    name: name || '',
    role: 'user'
  });

  // Create persistent session in RefreshToken collection
  const rawToken = generateRandomToken(40);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
    userAgent,
    ipAddress
  });

  // Sign JWT access token with user subject and session reference
  const jwtToken = signJwtToken({
    sub: user._id.toString(),
    role: user.role,
    sessionHash: tokenHash
  });

  return {
    user: user.toJSON(),
    jwtToken,
    sessionHash: tokenHash
  };
}

/**
 * Authenticate user with credentials and issue session
 */
export async function loginUser({ emailOrUsername, password, userAgent = '', ipAddress = '' }) {
  // Look up user by email or username, explicitly selecting hidden passwordHash
  const user = await User.findOne({
    $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
  }).select('+passwordHash');

  // Prevent timing attacks: execute dummy bcrypt compare if user is not found
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Verify password hash
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Create persistent session tracking record
  const rawToken = generateRandomToken(40);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
    userAgent,
    ipAddress
  });

  // Sign JWT access token
  const jwtToken = signJwtToken({
    sub: user._id.toString(),
    role: user.role,
    sessionHash: tokenHash
  });

  return {
    user: user.toJSON(),
    jwtToken,
    sessionHash: tokenHash
  };
}

/**
 * Invalidate an active user session in the database
 */
export async function logoutUser(sessionHash) {
  if (sessionHash) {
    await RefreshToken.updateOne(
      { tokenHash: sessionHash },
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );
  }
  return true;
}

/**
 * Retrieve current user profile
 */
export async function getCurrentUserProfile(userId) {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) {
    throw new AppError('User profile not found', 404, 'USER_NOT_FOUND');
  }
  return user.toJSON();
}
