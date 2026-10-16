import { useAuth } from '../../../context/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { ShieldX, ShieldAlert } from 'lucide-react';
import { Button } from '../Button/Button';

export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading, loginWithDemoAccount } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Verifying administrative permissions...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          maxWidth: '460px',
          margin: '5rem auto',
          padding: '2.5rem 2rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center'
        }}
      >
        <ShieldAlert size={36} color="var(--color-warning)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Admin Sign-In Required
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          This administration section requires elevated administrative credentials.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Button
            variant="primary"
            onClick={() => loginWithDemoAccount('admin')}
          >
            Sign In with Seeded Admin Account
          </Button>

          <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>
            <Button variant="outline" style={{ width: '100%' }}>
              Go to Login Page
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div
        style={{
          maxWidth: '460px',
          margin: '5rem auto',
          padding: '2.5rem 2rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--color-danger-subtle, rgba(239, 68, 68, 0.2))',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center'
        }}
      >
        <ShieldX size={36} color="var(--color-danger)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          403 — Access Denied
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Your current account does not have administrator privileges to access this area.
        </p>

        <Link to="/dashboard">
          <Button variant="primary" style={{ width: '100%' }}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return children;
}
