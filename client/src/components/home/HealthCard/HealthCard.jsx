import { useState } from 'react';
import { Activity, RefreshCw, Database, Server, Clock, Zap, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { StatusBadge } from '../../common/StatusBadge/StatusBadge';
import styles from './HealthCard.module.css';

/**
 * HealthCard diagnostic component connected to Express /api/health.
 * @param {Object} props
 * @param {Object} props.health
 * @param {boolean} props.loading
 * @param {string|null} props.error
 * @param {number|null} props.latencyMs
 * @param {Date|null} props.lastChecked
 * @param {() => void} props.onRefresh
 */
export function HealthCard({
  health,
  loading,
  error,
  latencyMs,
  lastChecked,
  onRefresh
}) {
  const [showJson, setShowJson] = useState(false);

  const getOverallStatus = () => {
    if (loading && !health) return 'loading';
    if (error || !health) return 'error';
    return health.status === 'healthy' ? 'healthy' : 'degraded';
  };

  const formatUptime = (seconds) => {
    if (seconds == null) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const payloadToDisplay = health || {
    error: error || 'No connection',
    timestamp: lastChecked ? lastChecked.toISOString() : null
  };

  return (
    <section className={styles.section} id="diagnostics">
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h2 className={styles.title}>
              <Activity size={22} color="var(--accent-cyan)" />
              System Health & Diagnostics
            </h2>
            <p className={styles.description}>
              Live heartbeat monitor pinging Express <code>GET /api/health</code> with database connection inspection.
            </p>
          </div>

          <div className={styles.headerActions}>
            <StatusBadge
              status={getOverallStatus()}
              label={
                getOverallStatus() === 'healthy'
                  ? 'System Operational'
                  : getOverallStatus() === 'degraded'
                  ? 'Database Disconnected'
                  : getOverallStatus() === 'loading'
                  ? 'Connecting...'
                  : 'Backend Offline'
              }
            />

            <button
              type="button"
              className={styles.btnRefresh}
              onClick={onRefresh}
              disabled={loading}
              title="Ping health check endpoint again"
            >
              <RefreshCw
                size={14}
                className={loading ? styles.spinning : ''}
              />
              <span>{loading ? 'Pinging...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle size={18} />
            <div>
              <strong>Connection Warning:</strong> {error}. Ensure your Express server is running on port 5000.
            </div>
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>
              <span>Express API</span>
              <Server size={16} />
            </div>
            <div className={styles.metricValue}>
              {health ? health.service || 'CodeArena' : error ? 'Offline' : 'Connecting'}
            </div>
            <div className={styles.metricDetail}>
              Mode: {health?.environment || 'unknown'}
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>
              <span>MongoDB Atlas</span>
              <Database size={16} />
            </div>
            <div className={styles.metricValue}>
              {health?.database?.status === 'connected' ? (
                <span style={{ color: 'var(--accent-emerald)' }}>Connected</span>
              ) : health?.database?.status === 'disconnected' ? (
                <span style={{ color: 'var(--accent-amber)' }}>Disconnected</span>
              ) : (
                'Standby'
              )}
            </div>
            <div className={styles.metricDetail}>
              ReadyState: {health?.database?.readyState ?? '0'} (0: idle/off, 1: live)
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>
              <span>API Latency</span>
              <Zap size={16} />
            </div>
            <div className={styles.metricValue}>
              {latencyMs != null ? `${latencyMs}ms` : '—'}
            </div>
            <div className={styles.metricDetail}>
              Round-trip HTTP ping time
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>
              <span>Server Uptime</span>
              <Clock size={16} />
            </div>
            <div className={styles.metricValue}>
              {formatUptime(health?.uptimeSeconds)}
            </div>
            <div className={styles.metricDetail}>
              {lastChecked ? `Checked: ${lastChecked.toLocaleTimeString()}` : 'Not checked'}
            </div>
          </div>
        </div>

        <div className={styles.jsonDetails}>
          <button
            type="button"
            className={styles.jsonToggle}
            onClick={() => setShowJson(!showJson)}
          >
            {showJson ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{showJson ? 'Hide Raw /api/health Payload' : 'View Raw /api/health Response JSON'}</span>
          </button>

          {showJson && (
            <pre className={styles.jsonBlock}>
              {JSON.stringify(payloadToDisplay, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </section>
  );
}
