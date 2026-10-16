import { api } from './api';

export const submissionService = {
  /**
   * Run code against public sample test cases.
   * @param {object} payload
   * @param {string} payload.problemId
   * @param {'javascript' | 'python' | 'cpp' | 'java'} payload.language
   * @param {string} payload.sourceCode
   * @returns {Promise<object>} Run execution results with sample test cases breakdown
   */
  async runCode(payload) {
    const response = await api.post('/submissions/run', payload);
    return response.data;
  },

  /**
   * Submit code for formal judging against all test cases.
   * @param {object} payload
   * @param {string} payload.problemId
   * @param {'javascript' | 'python' | 'cpp' | 'java'} payload.language
   * @param {string} payload.sourceCode
   * @returns {Promise<object>} Judged submission result with status and test case count
   */
  async submitCode(payload) {
    const response = await api.post('/submissions', payload);
    return response.data;
  },

  /**
   * Fetch authenticated user's submission history.
   * @param {object} [params]
   * @param {string} [params.problemId]
   * @param {number} [params.page]
   * @param {number} [params.limit]
   * @returns {Promise<{ submissions: Array, meta: object }>}
   */
  async getMySubmissions(params = {}) {
    const query = new URLSearchParams();
    if (params.problemId) query.set('problemId', params.problemId);
    if (params.status) query.set('status', params.status);
    if (params.language) query.set('language', params.language);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);

    const endpoint = query.toString() ? `/submissions/me?${query.toString()}` : '/submissions/me';
    const response = await api.get(endpoint);
    return {
      submissions: response.data || [],
      meta: response.meta || { page: 1, limit: 20, totalItems: 0, totalPages: 1 }
    };
  },

  /**
   * Fetch a specific submission by its ID.
   * @param {string} id
   * @returns {Promise<object>}
   */
  async getSubmissionById(id) {
    const response = await api.get(`/submissions/${id}`);
    return response.data;
  }
};
