import { api } from './api';

export const problemService = {
  /**
   * Fetch paginated and filtered list of published problems
   * @param {object} params
   * @param {string} [params.search]
   * @param {string} [params.difficulty]
   * @param {string} [params.topic]
   * @param {number} [params.page]
   * @param {number} [params.limit]
   * @returns {Promise<{ problems: Array, meta: object }>}
   */
  async getProblems(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set('page', params.page);
    if (params.limit) searchParams.set('limit', params.limit);
    if (params.difficulty && params.difficulty !== 'All') {
      searchParams.set('difficulty', params.difficulty);
    }
    if (params.topic && params.topic !== 'All') {
      searchParams.set('topic', params.topic);
    }
    if (params.search && params.search.trim()) {
      searchParams.set('search', params.search.trim());
    }

    const query = searchParams.toString();
    const endpoint = query ? `/problems?${query}` : '/problems';
    const response = await api.get(endpoint);

    return {
      problems: response.data || [],
      meta: response.meta || {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  },

  /**
   * Fetch a single problem by its unique slug
   * @param {string} slug
   * @returns {Promise<object>} Problem detail record
   */
  async getProblemBySlug(slug) {
    const response = await api.get(`/problems/${encodeURIComponent(slug)}`);
    return response.data;
  },

  /**
   * Admin: Fetch all problems including drafts
   * @returns {Promise<Array>}
   */
  async getAdminProblems() {
    const response = await api.get('/problems/admin/all');
    return response.data || [];
  },

  /**
   * Admin: Fetch complete problem details including judge test cases
   * @param {string} id - Problem ID or slug
   * @returns {Promise<object>}
   */
  async getAdminProblem(id) {
    const response = await api.get(`/problems/admin/${id}`);
    return response.data;
  },

  /**
   * Admin: Fetch paginated audit logs
   * @param {object} params
   * @param {number} [params.page]
   * @param {number} [params.limit]
   * @returns {Promise<{ items: Array, meta: object }>}
   */
  async getAdminAuditLogs(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page);
    if (params.limit) searchParams.set('limit', params.limit);
    const query = searchParams.toString();
    const endpoint = query ? `/problems/admin/audit-logs?${query}` : '/problems/admin/audit-logs';
    const response = await api.get(endpoint);
    return {
      items: response.data || [],
      meta: response.meta || { page: 1, limit: 20, totalItems: 0, totalPages: 1 }
    };
  },

  /**
   * Admin: Create a new problem
   * @param {object} problemData
   * @returns {Promise<object>}
   */
  async createProblem(problemData) {
    const response = await api.post('/problems', problemData);
    return response.data;
  },

  /**
   * Admin: Update problem details
   * @param {string} id - Problem ID
   * @param {object} problemData
   * @returns {Promise<object>}
   */
  async updateProblem(id, problemData) {
    const response = await api.put(`/problems/${id}`, problemData);
    return response.data;
  },

  /**
   * Admin: Toggle or change publication status
   * @param {string} id - Problem ID
   * @param {'published' | 'draft' | 'archived'} publicationStatus
   * @returns {Promise<object>}
   */
  async togglePublication(id, publicationStatus) {
    const response = await api.patch(`/problems/${id}/publication`, {
      publicationStatus
    });
    return response.data;
  },

  /**
   * Admin: Delete problem
   * @param {string} id - Problem ID
   * @param {boolean} [force=false] - Deliberately force delete problem and its submissions
   * @returns {Promise<object>}
   */
  async deleteProblem(id, force = false) {
    const endpoint = force ? `/problems/${id}?force=true` : `/problems/${id}`;
    const response = await api.delete(endpoint);
    return response.data;
  }
};
