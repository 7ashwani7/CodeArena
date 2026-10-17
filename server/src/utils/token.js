import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export const AUTH_COOKIE_NAME = 'codearena_token';
export const CSRF_COOKIE_NAME = 'codearena_csrf';

// Default session lifespan: 7 days
export const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
export const JWT_EXPIRY = '7d';

/**
 * Generate signed JWT access token containing subject and session tracking hash
 * @param {object} payload
 * @param {string} payload.sub - User ID
 * @param {string} payload.role - User role
 * @param {string} payload.sessionHash - RefreshToken SHA-256 hash
 * @returns {string}
 */
export function signJwtToken(payload) {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    algorithm: 'HS256'
  });
}

/**
 * Verify and decode JWT token
 * @param {string} token
 * @returns {object} Decoded payload
 */
export function verifyJwtToken(token) {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.verify(token, env.JWT_SECRET);
}

/**
 * Generate cryptographically secure random token string
 * @param {number} [bytes=40]
 * @returns {string}
 */
export function generateRandomToken(bytes = 40) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Compute SHA-256 hash of a raw token string
 * SECURITY: Raw refresh tokens are never stored in the database
 * @param {string} rawToken
 * @returns {string}
 */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * HTTP-only cookie configuration for authentication session token
 * @returns {import('express').CookieOptions}
 */
export function getAuthCookieOptions() {
  return {
    httpOnly: true, // Inaccessible to JavaScript (XSS protection)
    secure: env.isProduction, // HTTPS required in production
    sameSite: env.isProduction ? 'none' : 'lax', // 'none' required for cross-domain cookie delivery (e.g. Vercel -> Render)
    path: '/',
    maxAge: SESSION_EXPIRY_MS
  };
}

/**
 * Client-accessible cookie options for Anti-CSRF token
 * @returns {import('express').CookieOptions}
 */
export function getCsrfCookieOptions() {
  return {
    httpOnly: false, // Accessible to JavaScript so fetch client can read & send in X-CSRF-Token header
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: SESSION_EXPIRY_MS
  };
}
