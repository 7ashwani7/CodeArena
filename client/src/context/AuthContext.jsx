import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const DEMO_USER = {
  _id: 'usr_demo_101',
  username: 'alex_coder',
  name: 'Alex Chen',
  email: 'alex@codearena.dev',
  role: 'user',
  bio: 'Software engineer preparing for full-stack systems and algorithmic interviews.',
  targetRole: 'Full-Stack Software Engineer',
  joinedDate: 'October 2026',
  avatarUrl: '',
  solvedCount: 42,
  stats: {
    easy: { solved: 25, total: 60 },
    medium: { solved: 14, total: 65 },
    hard: { solved: 3, total: 25 },
    acceptanceRate: 74.2
  }
};

export function AuthProvider({ children, initialUser = null, autoRestore = true }) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(autoRestore && initialUser === null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Restore authenticated user on page load/refresh using HTTP-only cookie
  const restoreSession = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setSessionExpired(false);
    } catch (err) {
      setUser(null);
      if (err.code === 'SESSION_EXPIRED' || err.code === 'SESSION_REVOKED') {
        setSessionExpired(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    let isMounted = true;
    if (autoRestore) {
      authService
        .getCurrentUser()
        .then((currentUser) => {
          if (isMounted) {
            setUser(currentUser);
            setSessionExpired(false);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setUser(null);
            if (err.code === 'SESSION_EXPIRED' || err.code === 'SESSION_REVOKED') {
              setSessionExpired(true);
            }
            setLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [autoRestore]);


  /**
   * Log in user with credentials and set user state
   */
  const login = async ({ email, password }) => {
    setLoading(true);
    try {
      const data = await authService.login({ email, password });
      setUser(data.user);
      setSessionExpired(false);
      return { success: true, user: data.user };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register a new user and set user state
   */
  const register = async ({ username, email, password, name }) => {
    setLoading(true);
    try {
      const data = await authService.register({ username, email, password, name });
      setUser(data.user);
      setSessionExpired(false);
      return { success: true, user: data.user };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out, revoke server session, and clear cookies
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout to ensure client state is cleared
    } finally {
      setUser(null);
      setSessionExpired(false);
    }
  };

  /**
   * Helper to sign in with seeded demo credentials
   */
  const loginWithDemoAccount = async (role = 'user') => {
    if (role === 'admin') {
      return login({ email: 'admin@codearena.dev', password: 'AdminPass123!' });
    }
    return login({ email: 'alex@codearena.dev', password: 'DemoPass123!' });
  };

  const updateProfile = (updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      loading,
      sessionExpired,
      login,
      register,
      logout,
      loginWithDemoAccount,
      updateProfile,
      restoreSession
    }),
    [user, loading, sessionExpired, restoreSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
