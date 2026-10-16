import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Centralized error-handling middleware.
 * Intercepts all synchronous and asynchronous errors forwarded via next(err).
 */
export function errorHandler(err, req, res, _next) {
  logger.error(err.message || 'Internal server error', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    name: err.name,
    stack: env.isDevelopment ? err.stack : undefined
  });

  // 1. Handled operational application error
  if (err.isOperational) {
    return sendError(res, {
      message: err.message,
      statusCode: err.statusCode,
      code: err.code,
      details: err.details,
      stack: err.stack
    });
  }

  // 2. Mongoose schema validation failure
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message
    }));
    return sendError(res, {
      message: 'Validation failed on resource payload',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details,
      stack: err.stack
    });
  }

  // 3. Mongoose CastError (invalid ObjectId or type casting)
  if (err.name === 'CastError') {
    return sendError(res, {
      message: `Invalid format for field '${err.path}'`,
      statusCode: 400,
      code: 'INVALID_FIELD_FORMAT',
      details: [{ field: err.path, value: err.value }],
      stack: err.stack
    });
  }

  // 4. MongoDB duplicate key collision (e.g. unique username or email)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    return sendError(res, {
      message: `Duplicate value entered for ${fields.join(', ')}`,
      statusCode: 409,
      code: 'RESOURCE_CONFLICT',
      details: [{ fields, duplicate: err.keyValue }],
      stack: err.stack
    });
  }

  // 5. Body parser malformed JSON error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, {
      message: 'Malformed JSON payload in request body',
      statusCode: 400,
      code: 'MALFORMED_JSON',
      stack: err.stack
    });
  }

  // 6. Generic unhandled internal server error
  return sendError(res, {
    message: env.isProduction ? 'An unexpected server error occurred' : err.message,
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    stack: err.stack
  });
}
