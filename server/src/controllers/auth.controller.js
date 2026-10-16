import crypto from 'node:crypto';
import { sendSuccess } from '../utils/apiResponse.js';
import * as authService from '../services/auth.service.js';
import { validateRegister, validateLogin } from '../validators/auth.validator.js';
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  getAuthCookieOptions,
  getCsrfCookieOptions
} from '../utils/token.js';

/**
 * Handle user registration
 * POST /api/auth/register
 */
export async function register(req, res, next) {
  try {
    const validatedData = validateRegister(req.body);

    const result = await authService.registerUser({
      ...validatedData,
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || ''
    });

    // Set secure HTTP-only authentication cookie
    res.cookie(AUTH_COOKIE_NAME, result.jwtToken, getAuthCookieOptions());

    // Issue anti-CSRF token cookie
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

    return sendSuccess(
      res,
      {
        user: result.user,
        csrfToken
      },
      'User registered successfully',
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Handle user login
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const validatedData = validateLogin(req.body);

    const result = await authService.loginUser({
      emailOrUsername: validatedData.emailOrUsername,
      password: validatedData.password,
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || ''
    });

    // Set secure HTTP-only authentication cookie
    res.cookie(AUTH_COOKIE_NAME, result.jwtToken, getAuthCookieOptions());

    // Issue anti-CSRF token cookie
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

    return sendSuccess(
      res,
      {
        user: result.user,
        csrfToken
      },
      'Signed in successfully',
      200
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Handle user logout and session revocation
 * POST /api/auth/logout
 */
export async function logout(req, res, next) {
  try {
    // Revoke persistent database session
    if (req.sessionHash) {
      await authService.logoutUser(req.sessionHash);
    }

    // Clear HTTP-only and CSRF cookies
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });

    return sendSuccess(res, null, 'Signed out successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve authenticated user profile
 * GET /api/auth/me
 */
export async function getMe(req, res, next) {
  try {
    return sendSuccess(
      res,
      { user: req.user },
      'Current authenticated user retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Admin authorization verification check
 * GET /api/auth/admin-check
 */
export async function adminCheck(req, res, next) {
  try {
    return sendSuccess(
      res,
      {
        authorized: true,
        role: req.user.role,
        adminUser: req.user.username
      },
      'Admin authorization verified'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Obtain anti-CSRF token
 * GET /api/auth/csrf
 */
export async function getCsrfToken(req, res) {
  let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());
  }

  return sendSuccess(res, { csrfToken }, 'CSRF token issued');
}
