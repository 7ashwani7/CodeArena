/**
 * Base API client configuration and fetch wrapper.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('codearena_jwt');
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('codearena_jwt', token);
  } else {
    localStorage.removeItem('codearena_jwt');
  }
}

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Helper to safely retrieve CSRF token cookie value in browser
 */
function getCsrfTokenFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)codearena_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Perform an HTTP request to the backend with standard JSON headers and cookie credentials.
 * @param {string} endpoint - API path relative to base (e.g. '/health')
 * @param {RequestInit} [options] - Fetch options
 */
export async function request(endpoint, options = {}) {
  // Normalize endpoint to prevent double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${cleanEndpoint}`;

  const csrfToken = getCsrfTokenFromCookie();
  const authToken = getAuthToken();

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    },
    // Ensures HTTP-only authentication cookies are sent and received
    credentials: options.credentials || 'include'
  };


  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorMessage = data?.error?.message || `Request failed with status ${response.status}`;
      const errorCode = data?.error?.code || 'UNKNOWN_ERROR';
      const details = data?.error?.details || null;
      throw new ApiError(errorMessage, response.status, errorCode, details);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network errors, connection refused, or parsing failures
    throw new ApiError(
      error.message || 'Unable to connect to the backend server',
      0,
      'NETWORK_ERROR',
      null
    );
  }
}

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' })
};
