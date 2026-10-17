import { api, setAuthToken } from './api';

/**
 * Authentication API Service connecting frontend with backend auth endpoints
 */
export const authService = {
  /**
   * Register a new user account
   * @param {object} payload
   * @param {string} payload.username
   * @param {string} payload.email
   * @param {string} payload.password
   * @param {string} [payload.name]
   * @returns {Promise<{ user: object }>}
   */
  async register({ username, email, password, name }) {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
      name
    });
    if (response.data?.token) {
      setAuthToken(response.data.token);
    }
    return response.data;
  },

  /**
   * Authenticate user with credentials
   * @param {object} credentials
   * @param {string} credentials.email - Email address or username
   * @param {string} credentials.password
   * @returns {Promise<{ user: object }>}
   */
  async login({ email, password }) {
    const response = await api.post('/auth/login', {
      email,
      password
    });
    if (response.data?.token) {
      setAuthToken(response.data.token);
    }
    return response.data;
  },

  /**
   * Sign out and revoke active server session
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      await api.post('/auth/logout', {});
    } finally {
      setAuthToken(null);
    }
  },

  /**
   * Restore current authenticated user profile using HTTP-only session cookie
   * @returns {Promise<object>} Current user
   */
  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      return response.data?.user || null;
    } catch (err) {
      if (err.status === 401) {
        setAuthToken(null);
      }
      throw err;
    }
  },

  /**
   * Verify server admin authorization
   * @returns {Promise<boolean>}
   */
  async verifyAdminAccess() {
    const response = await api.get('/auth/admin-check');
    return response.data?.authorized === true;
  }
};
