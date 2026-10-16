import { forwardRef } from 'react';
import { X } from 'lucide-react';
import styles from './Input.module.css';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon,
    clearable,
    onClear,
    value,
    id,
    className = '',
    ...rest
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`${styles.wrapper} ${error ? styles.hasError : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}

      <div className={styles.inputContainer}>
        {icon && <span className={styles.iconLeft}>{icon}</span>}

        <input
          id={inputId}
          ref={ref}
          value={value}
          className={`${styles.input} ${icon ? styles.hasIconLeft : ''} ${clearable && value ? styles.hasIconRight : ''}`}
          {...rest}
        />

        {clearable && value && (
          <button
            type="button"
            className={styles.iconRight}
            onClick={onClear}
            aria-label="Clear input"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {error && <span className={styles.errorText} role="alert">{error}</span>}
      {!error && helperText && <span className={styles.helperText}>{helperText}</span>}
    </div>
  );
});
