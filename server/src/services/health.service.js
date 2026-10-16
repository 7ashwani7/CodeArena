import { getDBStatus } from '../config/db.js';
import { env } from '../config/env.js';

const startTime = Date.now();

/**
 * Service to aggregate server runtime diagnostics and DB connectivity.
 */
export function getSystemHealth() {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const dbStatus = getDBStatus();

  const isHealthy = dbStatus.status === 'connected';

  return {
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'CodeArena API',
    version: '1.0.0',
    environment: env.NODE_ENV,
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus.status,
      readyState: dbStatus.readyState,
      databaseName: dbStatus.name
    }
  };
}
