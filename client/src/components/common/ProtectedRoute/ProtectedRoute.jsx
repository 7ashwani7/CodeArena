import { useAuth } from '../../../context/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ClockAlert } from 'lucide-react';
import { Button } from '../Button/Button';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, sessionExpired, loginWithDemoAccount } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Verifying session...</p>
      </div>
    );
  }

  if (sessionExpired) {
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
        <ClockAlert size={36} color="var(--color-warning)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Session Expired
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Your security session has expired. Please sign in again to access your dashboard and profile.
        </p>

        <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>
          <Button variant="primary" style={{ width: '100%' }}>
            Sign In Again
          </Button>
        </Link>
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
          Authentication Required
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          This page requires an active user session. Sign in to view your dashboard, submission history, and analytics.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Button
            variant="primary"
            onClick={() => loginWithDemoAccount('user')}
          >
            Quick Sign In with Demo Account
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

  return children;
}

