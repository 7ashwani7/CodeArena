import { getSystemHealth } from '../services/health.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * Controller: Handles GET /api/health
 */
export function getHealth(req, res, next) {
  try {
    const health = getSystemHealth();
    return sendSuccess(res, {
      data: health,
      message: 'System diagnostics retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
}
