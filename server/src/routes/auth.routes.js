import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Rate-limited public authentication endpoints
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/logout', optionalAuth, authController.logout);

// Anti-CSRF token helper endpoint
router.get('/csrf', authController.getCsrfToken);

// Protected user profile endpoint
router.get('/me', requireAuth, authController.getMe);

// Admin-only verification route
router.get('/admin-check', requireAuth, requireRole('admin'), authController.adminCheck);

export default router;
