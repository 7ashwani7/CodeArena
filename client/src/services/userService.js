import { api } from './api';

export const userService = {
  /**
   * Fetch aggregate user progress, metrics, and activity from MongoDB.
   * @returns {Promise<object>} Progress overview, topic breakdown, activity, and recent submissions
   */
  async getUserProgress() {
    const response = await api.get('/users/me/progress');
    return response.data;
  },

  /**
   * Fetch current user profile.
   * @returns {Promise<object>}
   */
  async getUserProfile() {
    const response = await api.get('/users/me/profile');
    return response.data;
  },

  /**
   * Update editable profile fields (name, bio, targetRole).
   * @param {object} payload
   * @param {string} [payload.name]
   * @param {string} [payload.bio]
   * @param {string} [payload.targetRole]
   * @returns {Promise<object>}
   */
  async updateUserProfile(payload) {
    const response = await api.put('/users/me/profile', payload);
    return response.data;
  },

  /**
   * Fetch paginated list of user's bookmarked problems.
   * @param {object} [params]
   * @param {number} [params.page]
   * @param {number} [params.limit]
   * @param {string} [params.search]
   * @returns {Promise<{ bookmarks: Array, meta: object }>}
   */
  async getBookmarks(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.search) query.set('search', params.search);

    const endpoint = query.toString() ? `/users/me/bookmarks?${query.toString()}` : '/users/me/bookmarks';
    const response = await api.get(endpoint);
    return {
      bookmarks: response.data || [],
      meta: response.meta || { page: 1, limit: 20, totalItems: 0, totalPages: 1 }
    };
  },

  /**
   * Bookmark a problem.
   * @param {string} problemId
   * @returns {Promise<object>}
   */
  async addBookmark(problemId) {
    const response = await api.post(`/users/me/bookmarks/${problemId}`);
    return response.data;
  },

  /**
   * Remove a bookmark.
   * @param {string} problemId
   * @returns {Promise<object>}
   */
  async removeBookmark(problemId) {
    const response = await api.delete(`/users/me/bookmarks/${problemId}`);
    return response.data;
  },

  /**
   * Toggle problem bookmark state.
   * @param {string} problemId
   * @returns {Promise<{ bookmarked: boolean, problemId: string }>}
   */
  async toggleBookmark(problemId) {
    const response = await api.post(`/users/me/bookmarks/${problemId}/toggle`);
    return response.data;
  }
};
