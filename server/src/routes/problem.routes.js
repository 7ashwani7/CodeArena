import { Router } from 'express';
import {
  listProblems,
  getProblem,
  adminListProblems,
  adminListAuditLogs,
  adminGetProblem,
  adminCreateProblem,
  adminUpdateProblem,
  adminTogglePublication,
  adminDeleteProblem
} from '../controllers/problem.controller.js';
import { validate } from '../middleware/validate.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import {
  validateProblemQuery,
  validateProblemSlug,
  validateProblemPayload,
  validatePublicationToggle,
  validateDeleteProblem,
  validateAdminAuditQuery
} from '../validators/problem.validator.js';

const router = Router();

// ==========================================
// Public / Authenticated Problem Browsing
// ==========================================

/**
 * @route   GET /api/problems
 * @desc    Fetch paginated, filtered list of published problems (annotated with user status if authenticated)
 * @query   search, difficulty, topic, page, limit
 * @access  Public (optionalAuth)
 */
router.get('/', optionalAuth, validate(validateProblemQuery), listProblems);

/**
 * @route   GET /api/problems/admin/all
 * @desc    Retrieve all problems (including drafts) for admin management
 * @access  Admin Only
 */
router.get('/admin/all', requireAuth, requireRole('admin'), adminListProblems);

/**
 * @route   GET /api/problems/admin/audit-logs
 * @desc    Retrieve paginated audit logs for admin actions
 * @access  Admin Only
 */
router.get('/admin/audit-logs', requireAuth, requireRole('admin'), validate(validateAdminAuditQuery), adminListAuditLogs);

/**
 * @route   GET /api/problems/admin/:id
 * @desc    Retrieve complete problem details (including judge test cases) for admin editing
 * @access  Admin Only
 */
router.get('/admin/:id', requireAuth, requireRole('admin'), adminGetProblem);

/**
 * @route   GET /api/problems/:slug
 * @desc    Fetch a single published problem by its unique slug
 * @access  Public (optionalAuth)
 */
router.get('/:slug', optionalAuth, validate(validateProblemSlug), getProblem);

// ==========================================
// Admin Problem Management (CRUD)
// ==========================================

/**
 * @route   POST /api/problems
 * @desc    Create a new problem
 * @access  Admin Only
 */
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(validateProblemPayload),
  adminCreateProblem
);

/**
 * @route   PUT /api/problems/:id
 * @desc    Update an existing problem
 * @access  Admin Only
 */
router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate(validateProblemPayload),
  adminUpdateProblem
);

/**
 * @route   PATCH /api/problems/:id/publication
 * @desc    Toggle or update publication status (published / draft / archived)
 * @access  Admin Only
 */
router.patch(
  '/:id/publication',
  requireAuth,
  requireRole('admin'),
  validate(validatePublicationToggle),
  adminTogglePublication
);

/**
 * @route   DELETE /api/problems/:id
 * @desc    Delete a problem
 * @access  Admin Only
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate(validateDeleteProblem),
  adminDeleteProblem
);

export default router;
