import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Info } from 'lucide-react';
import { Input } from '../../components/common/Input/Input';
import { Button } from '../../components/common/Button/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { login, loginWithDemoAccount, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const redirectPath = new URLSearchParams(location.search).get('redirect') || '/dashboard';

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email address or username is required.';
    if (!password) newErrors.password = 'Password is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    try {
      await login({ email, password });
      toast.success('Signed in successfully');
      navigate(redirectPath);
    } catch (err) {
      const message = err.message || 'Invalid email or password';
      setServerError(message);
      toast.error(message);
    }
  };

  const handleDemoLogin = async (role = 'user') => {
    setServerError('');
    try {
      await loginWithDemoAccount(role);
      toast.success(
        role === 'admin'
          ? 'Signed in as Administrator (admin)'
          : 'Signed in as demo engineer (Alex Chen)'
      );
      navigate(redirectPath);
    } catch (err) {
      const msg = err.message || 'Demo authentication failed';
      setServerError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Sign in to CodeArena</h1>
          <p className={styles.subtitle}>Enter your credentials to access your problems & dashboard.</p>
        </div>

        {serverError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-danger, #ef4444)',
              fontSize: '0.875rem'
            }}
            role="alert"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Email or Username"
            type="text"
            placeholder="developer@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="username"
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="current-password"
          />

          <div className={styles.rowBetween}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <span
              className={styles.link}
              style={{ cursor: 'pointer' }}
              onClick={() => toast.info('Password recovery connects via verified email reset')}
            >
              Forgot password?
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            style={{ width: '100%', marginTop: '0.25rem' }}
          >
            Sign In
          </Button>
        </form>

        <div className={styles.divider}>or quick sign-in</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Button
            type="button"
            variant="secondary"
            icon={<LogIn size={15} />}
            onClick={() => handleDemoLogin('user')}
            style={{ width: '100%' }}
          >
            Sign In as User (Alex Chen)
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => handleDemoLogin('admin')}
            style={{ width: '100%', fontSize: '0.8125rem' }}
          >
            Sign In as Administrator
          </Button>
        </div>

        <div className={styles.demoBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
            <Info size={13} />
            <strong>Authentication Security</strong>
          </div>
          <span>
            Sessions are protected with HTTP-only cookies, SameSite enforcement, and bcrypt password hashing.
          </span>
        </div>

        <div className={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" className={styles.link}>
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

