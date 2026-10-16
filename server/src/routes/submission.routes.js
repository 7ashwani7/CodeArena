import { Router } from 'express';
import { submissionController } from '../controllers/submission.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { submissionRateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import {
  validateSubmissionPayload,
  validateSubmissionHistoryQuery
} from '../validators/submission.validator.js';

const router = Router();

// Run code against public sample test cases
router.post(
  '/run',
  requireAuth,
  submissionRateLimiter,
  validateSubmissionPayload,
  submissionController.runSampleCases
);

// Submit code for official evaluation against full judge test suite
router.post(
  '/',
  requireAuth,
  submissionRateLimiter,
  validateSubmissionPayload,
  submissionController.createSubmission
);

// Retrieve submission history for current authenticated user
router.get(
  '/me',
  requireAuth,
  validate(validateSubmissionHistoryQuery),
  submissionController.getMySubmissions
);

// Retrieve a specific submission by ID (must belong to authenticated user or admin)
router.get(
  '/:id',
  requireAuth,
  submissionController.getSubmissionById
);

export default router;
