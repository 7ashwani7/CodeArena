import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standard Success Response helper supporting both named options or positional arguments.
 * @param {import('express').Response} res
 * @param {object|null} optionsOrData
 * @param {string} [posMessage]
 * @param {number} [posStatusCode]
 * @param {object} [posMeta]
 */
export function sendSuccess(res, optionsOrData = {}, posMessage = null, posStatusCode = 200, posMeta = null) {
  let data = null;
  let message = posMessage;
  let statusCode = posStatusCode;
  let meta = posMeta;

  if (
    optionsOrData !== null &&
    typeof optionsOrData === 'object' &&
    ('data' in optionsOrData || 'message' in optionsOrData || 'statusCode' in optionsOrData || 'meta' in optionsOrData)
  ) {
    data = optionsOrData.data !== undefined ? optionsOrData.data : null;
    message = optionsOrData.message || message;
    statusCode = optionsOrData.statusCode || statusCode;
    meta = optionsOrData.meta || meta;
  } else {
    data = optionsOrData;
  }

  const payload = {
    success: true,
    data,
    ...(message ? { message } : {}),
    ...(meta ? { meta } : {})
  };
  return res.status(statusCode).json(payload);
}


/**
 * Standard Error Response helper.
 */
export function sendError(res, { message = 'Internal server error', statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null, stack = null } = {}) {
  const payload = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(env.isDevelopment && stack ? { stack } : {})
    }
  };
  return res.status(statusCode).json(payload);
}
