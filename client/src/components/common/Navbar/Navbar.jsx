import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Code2, Sun, Moon, Search, Menu, X, LogOut, User } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../Button/Button';
import styles from './Navbar.module.css';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.leftArea}>
          <Link to="/" className={styles.brand} aria-label="CodeArena Home">
            <div className={styles.brandIcon}>
              <Code2 size={16} strokeWidth={2.5} />
            </div>
            <span className={styles.brandName}>CodeArena</span>
          </Link>

          <nav className={styles.nav} aria-label="Main Navigation">
            <NavLink
              to="/problems"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              Problems
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              Dashboard
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
              >
                Admin
              </NavLink>
            )}
          </nav>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.searchBar}
            onClick={() => navigate('/problems')}
            aria-label="Search problems"
          >
            <Search size={14} />
            <span>Search problems...</span>
            <span className={styles.kbd}>/</span>
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {isAuthenticated ? (
            <div className={styles.userMenu}>
              <Link to="/profile" title="View profile" aria-label="View profile">
                <div className={styles.avatar}>
                  {user?.name ? user.name[0].toUpperCase() : <User size={14} />}
                </div>
              </Link>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Sign up
                </Button>
              </Link>
            </div>
          )}

          <button
            type="button"
            className={styles.mobileMenuBtn}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div
        className={`${styles.mobileDrawer} ${
          mobileOpen ? styles.mobileDrawerOpen : ''
        }`}
      >
        <NavLink
          to="/problems"
          className={styles.navLink}
          onClick={() => setMobileOpen(false)}
        >
          Problems
        </NavLink>
        <NavLink
          to="/dashboard"
          className={styles.navLink}
          onClick={() => setMobileOpen(false)}
        >
          Dashboard
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/admin"
            className={styles.navLink}
            onClick={() => setMobileOpen(false)}
          >
            Admin Panel
          </NavLink>
        )}
        {isAuthenticated && (
          <NavLink
            to="/profile"
            className={styles.navLink}
            onClick={() => setMobileOpen(false)}
          >
            My Profile ({user?.username})
          </NavLink>
        )}
      </div>
    </header>
  );
}
