import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  validateUpdateProfile,
  validateProblemIdParam,
  validateBookmarkQuery
} from '../validators/user.validator.js';

const router = Router();

// All user routes require authentication
router.use(requireAuth);

/**
 * @route   GET /api/users/me/progress
 * @desc    Get aggregate progress, acceptance rate, and topic analytics
 * @access  Private
 */
router.get('/me/progress', userController.getProgress);

/**
 * @route   GET /api/users/me/profile
 * @desc    Get current user profile and account details
 * @access  Private
 */
router.get('/me/profile', userController.getProfile);

/**
 * @route   PUT /api/users/me/profile
 * @desc    Update user profile (name, bio, targetRole)
 * @access  Private
 */
router.put('/me/profile', validate(validateUpdateProfile), userController.updateProfile);

/**
 * @route   GET /api/users/me/bookmarks
 * @desc    Get paginated bookmarked problems for user
 * @access  Private
 */
router.get('/me/bookmarks', validate(validateBookmarkQuery), userController.getBookmarks);

/**
 * @route   POST /api/users/me/bookmarks/:problemId
 * @desc    Bookmark a problem
 * @access  Private
 */
router.post('/me/bookmarks/:problemId', validate(validateProblemIdParam), userController.addBookmark);

/**
 * @route   DELETE /api/users/me/bookmarks/:problemId
 * @desc    Remove a bookmark
 * @access  Private
 */
router.delete('/me/bookmarks/:problemId', validate(validateProblemIdParam), userController.removeBookmark);

/**
 * @route   POST /api/users/me/bookmarks/:problemId/toggle
 * @desc    Toggle bookmark state
 * @access  Private
 */
router.post('/me/bookmarks/:problemId/toggle', validate(validateProblemIdParam), userController.toggleBookmark);

export default router;
