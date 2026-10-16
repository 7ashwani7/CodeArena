import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    System diagnostics and database health check
 * @access  Public
 */
router.get('/', getHealth);

export default router;
