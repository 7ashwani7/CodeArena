import styles from './Skeleton.module.css';

/**
 * Reusable Loading Skeleton.
 * @param {Object} props
 * @param {string|number} [props.width='100%']
 * @param {string|number} [props.height='20px']
 * @param {boolean} [props.circle=false]
 * @param {string} [props.className]
 */
export function Skeleton({
  width = '100%',
  height = '20px',
  circle = false,
  className = '',
  style = {}
}) {
  const inlineStyles = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    ...style
  };

  return (
    <div
      className={`${styles.skeleton} ${circle ? styles.circle : ''} ${className}`}
      style={inlineStyles}
      aria-hidden="true"
    />
  );
}

export function ProblemTableSkeleton({ rows = 6 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1.5fr 80px 80px 1fr',
            gap: '1rem',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <Skeleton width={24} height={16} />
          <Skeleton width="75%" height={16} />
          <Skeleton width={50} height={16} />
          <Skeleton width={45} height={16} />
          <Skeleton width="60%" height={16} />
        </div>
      ))}
    </div>
  );
}
