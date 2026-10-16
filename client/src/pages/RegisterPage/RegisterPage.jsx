import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/common/Input/Input';
import { Button } from '../../components/common/Button/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import styles from './RegisterPage.module.css';

export function RegisterPage() {
  const { register, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});

  const [serverError, setServerError] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Full name is required.';
    if (!username.trim()) newErrors.username = 'Username is required.';
    else if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      newErrors.username = 'Username must be 3-30 characters alphanumeric or underscore.';
    }

    if (!email.trim()) newErrors.email = 'Email address is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please provide a valid email address.';
    }

    if (!password) newErrors.password = 'Password is required.';
    else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!agreeTerms) {
      newErrors.terms = 'You must agree to the Terms of Service to register.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    try {
      await register({ name, username, email, password });
      toast.success('Account created successfully! Welcome to CodeArena.');
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'DUPLICATE_EMAIL') {
        setErrors((prev) => ({ ...prev, email: 'This email address is already registered.' }));
        setServerError('Email address is already in use.');
      } else if (err.code === 'DUPLICATE_USERNAME') {
        setErrors((prev) => ({ ...prev, username: 'This username is already taken.' }));
        setServerError('Username is already taken. Please choose another.');
      } else if (Array.isArray(err.details)) {
        const fieldErrors = {};
        for (const item of err.details) {
          if (item.field) fieldErrors[item.field] = item.message;
        }
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        setServerError(err.message || 'Validation failed. Please check form fields.');
      } else {
        setServerError(err.message || 'Registration failed. Please try again.');
      }
      toast.error(err.message || 'Registration failed.');
    }
  };


  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>Start practicing algorithmic challenges and tracking your interview readiness.</p>
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
            label="Full Name"
            type="text"
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            autoComplete="name"
          />

          <Input
            label="Username"
            type="text"
            placeholder="adalovelace"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
            autoComplete="username"
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="ada@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          <label className={styles.termsLabel}>
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
            <span>
              I agree to the CodeArena Terms of Service and Privacy Policy.
            </span>
          </label>
          {errors.terms && (
            <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }} role="alert">
              {errors.terms}
            </span>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Create Account
          </Button>
        </form>

        <div className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
