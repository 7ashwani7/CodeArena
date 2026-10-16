import styles from './StatusBadge.module.css';

/**
 * Reusable StatusBadge with animated state indicator.
 * @param {Object} props
 * @param {'healthy' | 'degraded' | 'error' | 'loading'} [props.status='loading']
 * @param {string} [props.label]
 * @param {boolean} [props.pulse=true]
 */
export function StatusBadge({ status = 'loading', label, pulse = true }) {
  const statusClass = styles[status] || styles.loading;
  const pulseClass = pulse ? styles.pulsing : '';

  return (
    <span className={`${styles.badge} ${statusClass}`}>
      <span className={`${styles.dot} ${pulseClass}`} />
      <span>{label || status}</span>
    </span>
  );
}
