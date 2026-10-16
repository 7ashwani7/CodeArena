import { Link } from 'react-router-dom';
import { Home, ListFilter } from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.container}>
      <div className={styles.errorCode}>404</div>
      <h1 className={styles.title}>Page Not Found</h1>
      <p className={styles.description}>
        The route you requested could not be located on CodeArena. It may have moved or been deprecated.
      </p>

      <div className={styles.actions}>
        <Link to="/problems">
          <Button variant="primary" icon={<ListFilter size={15} />}>
            Problem Catalogue
          </Button>
        </Link>
        <Link to="/">
          <Button variant="outline" icon={<Home size={15} />}>
            Home Overview
          </Button>
        </Link>
      </div>
    </div>
  );
}
