import { Link } from 'react-router-dom';
import { Code2, GitBranch } from 'lucide-react';
import styles from './Footer.module.css';

const CURRENT_YEAR = 2026;

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.row}>
          <div className={styles.brand}>
            <Code2 size={16} />
            <span>CodeArena</span>
          </div>

          <nav className={styles.nav} aria-label="Footer Navigation">
            <Link to="/problems" className={styles.link}>
              Problem Catalogue
            </Link>
            <Link to="/dashboard" className={styles.link}>
              Dashboard
            </Link>
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              System API
            </a>
            <span className={styles.link} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <GitBranch size={12} />
              v1.0.0-alpha
            </span>
          </nav>
        </div>

        <div className={styles.subRow}>
          <div>
            &copy; {CURRENT_YEAR} CodeArena. High-performance coding practice platform.
          </div>
          <div className={styles.statusContainer}>
            <span className={styles.statusDot} />
            <span>Core Services Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
