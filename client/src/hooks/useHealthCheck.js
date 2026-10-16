import { useState, useEffect, useCallback } from 'react';
import { fetchHealthStatus } from '../services/healthService.js';

/**
 * Custom hook to monitor backend connectivity and system health.
 * @param {number} [autoPollIntervalMs=0] - Interval to poll API, 0 to disable
 */
export function useHealthCheck(autoPollIntervalMs = 0) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const data = await fetchHealthStatus();
      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend');
      setHealth(null);
      setLatencyMs(null);
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function execute() {
      const start = performance.now();
      try {
        const data = await fetchHealthStatus();
        if (!isCancelled) {
          const end = performance.now();
          setLatencyMs(Math.round(end - start));
          setHealth(data);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Failed to connect to backend');
          setHealth(null);
          setLatencyMs(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setLastChecked(new Date());
        }
      }
    }

    execute();

    if (autoPollIntervalMs > 0) {
      const timer = setInterval(execute, autoPollIntervalMs);
      return () => {
        isCancelled = true;
        clearInterval(timer);
      };
    }

    return () => {
      isCancelled = true;
    };
  }, [autoPollIntervalMs]);

  return {
    health,
    loading,
    error,
    latencyMs,
    lastChecked,
    refetch: checkHealth
  };
}
