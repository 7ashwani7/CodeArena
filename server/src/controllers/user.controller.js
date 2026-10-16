import { userService } from '../services/user.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const userController = {
  /**
   * GET /api/users/me/progress
   * Retrieve aggregate progress metrics, topic breakdowns, and recent activity.
   */
  async getProgress(req, res, next) {
    try {
      const progress = await userService.getUserProgress(req.user._id);
      sendSuccess(res, { data: progress, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/users/me/bookmarks
   * Retrieve paginated list of bookmarked problems.
   */
  async getBookmarks(req, res, next) {
    try {
      const { bookmarks, meta } = await userService.getUserBookmarks(req.user._id, req.query);
      sendSuccess(res, { data: bookmarks, meta, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/users/me/bookmarks/:problemId
   * Bookmark a problem.
   */
  async addBookmark(req, res, next) {
    try {
      const result = await userService.addBookmark(req.user._id, req.params.problemId);
      sendSuccess(res, {
        data: result,
        statusCode: 200,
        message: 'Problem bookmarked successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/users/me/bookmarks/:problemId
   * Remove a bookmark.
   */
  async removeBookmark(req, res, next) {
    try {
      const result = await userService.removeBookmark(req.user._id, req.params.problemId);
      sendSuccess(res, {
        data: result,
        statusCode: 200,
        message: 'Bookmark removed successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/users/me/bookmarks/:problemId/toggle
   * Toggle problem bookmark status.
   */
  async toggleBookmark(req, res, next) {
    try {
      const result = await userService.toggleBookmark(req.user._id, req.params.problemId);
      sendSuccess(res, {
        data: result,
        statusCode: 200,
        message: result.bookmarked ? 'Problem bookmarked' : 'Bookmark removed'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/users/me/profile
   * Retrieve current user profile details.
   */
  async getProfile(req, res, next) {
    try {
      const profile = await userService.getUserProfile(req.user._id);
      sendSuccess(res, { data: profile, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/users/me/profile
   * Update user editable profile fields (name, bio, targetRole).
   */
  async updateProfile(req, res, next) {
    try {
      const updatedUser = await userService.updateUserProfile(req.user._id, req.body);
      sendSuccess(res, {
        data: updatedUser,
        statusCode: 200,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};
