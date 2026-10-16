import { Router } from 'express';
import healthRoutes from './health.routes.js';
import problemRoutes from './problem.routes.js';
import authRoutes from './auth.routes.js';
import submissionRoutes from './submission.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

// Mount health check routes at /api/health
router.use('/health', healthRoutes);

// Mount problem catalogue routes at /api/problems
router.use('/problems', problemRoutes);

// Mount authentication and authorization routes at /api/auth
router.use('/auth', authRoutes);

// Mount code submissions and execution routes at /api/submissions
router.use('/submissions', submissionRoutes);

// Mount user progress, profile, and bookmark routes at /api/users
router.use('/users', userRoutes);

export default router;

