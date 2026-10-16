import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function requestLogger(req, res, next) {
  if (env.isTest) {
    return next();
  }

  const start = performance.now();

  res.on('finish', () => {
    const duration = Math.round(performance.now() - start);
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration
    });
  });

  next();
}
