import styles from './Badge.module.css';

/**
 * Reusable Badge for difficulties, tags, and statuses.
 * @param {Object} props
 * @param {'easy'|'medium'|'hard'|'solved'|'attempted'|'todo'|'tag'|'accent'} [props.variant='tag']
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} props.children
 */
export function Badge({
  variant = 'tag',
  icon,
  children,
  className = '',
  ...rest
}) {
  const normalizedVariant = String(variant).toLowerCase();
  const variantClass = styles[normalizedVariant] || styles.tag;

  return (
    <span className={`${styles.badge} ${variantClass} ${className}`} {...rest}>
      {icon}
      <span>{children}</span>
    </span>
  );
}
