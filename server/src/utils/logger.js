import { env } from '../config/env.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'jwt_secret',
  'cookie_secret',
  'authorization',
  'cookie'
]);

/**
 * Recursively redacts sensitive keys from log payloads.
 */
function sanitizeData(data) {
  if (data == null) return data;
  if (typeof data === 'string') {
    // Basic redaction for bearer tokens in string logs
    return data.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }
  return data;
}

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = sanitizeData(meta);

  const logEntry = {
    timestamp,
    level,
    message,
    ...(Object.keys(sanitizedMeta).length > 0 ? { meta: sanitizedMeta } : {})
  };

  return env.isDevelopment
    ? `[${timestamp}] [${level.toUpperCase()}] ${message} ${Object.keys(sanitizedMeta).length ? JSON.stringify(sanitizedMeta) : ''}`
    : JSON.stringify(logEntry);
}

export const logger = {
  info(message, meta) {
    console.log(formatLog('info', message, meta));
  },
  warn(message, meta) {
    console.warn(formatLog('warn', message, meta));
  },
  error(message, meta) {
    console.error(formatLog('error', message, meta));
  },
  debug(message, meta) {
    if (env.isDevelopment) {
      console.debug(formatLog('debug', message, meta));
    }
  }
};
