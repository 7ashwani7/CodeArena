import { api } from './api.js';

/**
 * Service to fetch system diagnostics and backend health.
 */
export async function fetchHealthStatus() {
  const response = await api.get('/health');
  return response.data;
}
