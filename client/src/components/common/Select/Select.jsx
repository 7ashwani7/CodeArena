import { ChevronDown } from 'lucide-react';
import styles from './Select.module.css';

export function Select({
  label,
  options = [],
  value,
  onChange,
  id,
  className = '',
  ...rest
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}

      <div className={styles.container}>
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          className={styles.select}
          {...rest}
        >
          {options.map((opt) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={optVal} value={optVal}>
                {optLabel}
              </option>
            );
          })}
        </select>
        <span className={styles.icon}>
          <ChevronDown size={14} />
        </span>
      </div>
    </div>
  );
}
