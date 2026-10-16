import styles from './Button.module.css';

/**
 * Reusable Button component adhering to restrained developer-tool design.
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'} [props.variant='secondary']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {React.ReactNode} [props.icon]
 * @param {'left' | 'right'} [props.iconPosition='left']
 * @param {React.ReactNode} props.children
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  disabled,
  children,
  className = '',
  ...rest
}) {
  const variantClass = styles[variant] || styles.secondary;
  const sizeClass = styles[size] || styles.md;

  return (
    <button
      className={`${styles.button} ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        icon && iconPosition === 'left' && icon
      )}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
}
