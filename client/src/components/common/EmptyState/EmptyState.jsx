import { Inbox } from 'lucide-react';
import { Button } from '../Button/Button';
import styles from './EmptyState.module.css';

export function EmptyState({
  icon = <Inbox size={32} />,
  title = 'No items found',
  description = 'There are no results matching your current filters or criteria.',
  actionLabel,
  onAction
}) {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
