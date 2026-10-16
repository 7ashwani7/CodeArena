import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Rate limiter for sensitive authentication endpoints (registration & login)
 * Limits brute-force credential stuffing and denial of service.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest, // Disabled in test runner for deterministic integration tests
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again in 15 minutes.'
    }
  }
});

/**
 * Rate limiter for code execution and submission dispatches.
 */
export const submissionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 submissions per minute per user/IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  message: {
    success: false,
    error: {
      code: 'SUBMISSION_RATE_LIMIT_EXCEEDED',
      message: 'Too many code submission attempts. Please wait a moment before trying again.'
    }
  }
});
