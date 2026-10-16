import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/apiResponse.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, getCsrfCookieOptions } from '../utils/token.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Anti-CSRF protection middleware using Double-Submit Cookie + Custom Header validation
 */
export function csrfProtection(req, res, next) {
  // Ensure a CSRF token cookie exists on any incoming request
  let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());
  }

  // Safe HTTP read methods are exempt from state mutation CSRF checks
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Skip in test environment for automated integration tests if specified
  if (env.isTest && req.headers['x-test-bypass-csrf']) {
    return next();
  }

  // Check Origin/Referer header for cross-origin defense
  const origin = req.headers.origin || req.headers.referer;
  if (origin && env.isProduction) {
    try {
      const originUrl = new URL(origin);
      const expectedUrl = new URL(env.CLIENT_ORIGIN);
      if (originUrl.origin !== expectedUrl.origin) {
        return next(
          new AppError('Forbidden: Cross-origin request rejected.', 403, 'CSRF_INVALID_ORIGIN')
        );
      }
    } catch {
      return next(
        new AppError('Forbidden: Malformed request origin.', 403, 'CSRF_INVALID_ORIGIN')
      );
    }
  }

  // Double-submit token check or custom AJAX header
  const submittedToken = req.headers['x-csrf-token'] || req.body?._csrf;
  const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';

  // If token is submitted, it must match the cookie value
  if (submittedToken && csrfToken && submittedToken === csrfToken) {
    return next();
  }

  // Custom header X-Requested-With is also safe because browsers do not allow
  // cross-origin HTML forms to send custom headers without CORS preflight approval
  if (isAjax) {
    return next();
  }

  // If a session cookie is present on state mutation, strict CSRF validation is required
  if (req.cookies?.[AUTH_COOKIE_NAME]) {
    if (!submittedToken && !isAjax) {
      return next(
        new AppError('Forbidden: Missing CSRF token or custom header.', 403, 'CSRF_TOKEN_MISSING')
      );
    }
    if (submittedToken !== csrfToken) {
      return next(
        new AppError('Forbidden: Invalid CSRF token.', 403, 'CSRF_TOKEN_MISMATCH')
      );
    }
  }

  next();
}
