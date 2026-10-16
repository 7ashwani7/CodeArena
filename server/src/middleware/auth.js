import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AppError } from '../utils/apiResponse.js';
import { verifyJwtToken, AUTH_COOKIE_NAME } from '../utils/token.js';

/**
 * Authentication middleware that verifies JWT and validates session against database
 */
export async function requireAuth(req, res, next) {
  try {
    // Extract token from HTTP-only cookie first, fallback to Authorization header
    let token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('Authentication required. Please sign in to continue.', 401, 'UNAUTHORIZED')
      );
    }

    // Verify JWT cryptographic signature and expiration
    let decoded;
    try {
      decoded = verifyJwtToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return next(
          new AppError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED')
        );
      }
      return next(
        new AppError('Invalid authentication token. Please sign in again.', 401, 'INVALID_TOKEN')
      );
    }

    // Verify session revocation status in database if session hash is present
    if (decoded.sessionHash) {
      const session = await RefreshToken.findOne({ tokenHash: decoded.sessionHash });
      if (!session) {
        return next(
          new AppError('Session not found or has been revoked.', 401, 'SESSION_REVOKED')
        );
      }
      if (session.isRevoked) {
        return next(
          new AppError('Session was revoked. Please sign in again.', 401, 'SESSION_REVOKED')
        );
      }
      if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
        return next(
          new AppError('Session expired. Please sign in again.', 401, 'SESSION_EXPIRED')
        );
      }
    }

    // Load active user from database
    const user = await User.findById(decoded.sub).select('-passwordHash');
    if (!user) {
      return next(
        new AppError('User account associated with this session no longer exists.', 401, 'USER_NOT_FOUND')
      );
    }

    // Attach verified user and session to request
    req.user = user;
    req.sessionHash = decoded.sessionHash;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles - e.g. 'admin'
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError('Authentication required before verifying role.', 401, 'UNAUTHORIZED')
      );
    }

    // SECURITY: Strictly check server-verified role from database, never client-supplied
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('Forbidden: You do not have permission to access this resource.', 403, 'INSUFFICIENT_PERMISSIONS')
      );
    }

    next();
  };
}

/**
 * Optional authentication middleware: Populates req.user if a valid token is present,
 * but allows unauthenticated requests to proceed.
 */
export async function optionalAuth(req, res, next) {
  try {
    let token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const decoded = verifyJwtToken(token);
    if (decoded.sessionHash) {
      const session = await RefreshToken.findOne({ tokenHash: decoded.sessionHash });
      if (!session || session.isRevoked || (session.expiresAt && session.expiresAt.getTime() < Date.now())) {
        return next();
      }
    }

    const user = await User.findById(decoded.sub).select('-passwordHash');
    if (user) {
      req.user = user;
      req.sessionHash = decoded.sessionHash;
    }

    next();
  } catch {
    // If token invalid, proceed unauthenticated
    next();
  }
}
