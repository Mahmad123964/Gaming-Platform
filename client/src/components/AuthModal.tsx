import React, { useState } from 'react';
import styles from './AuthModal.module.css';
import { getCsrfToken } from '../utils/csrf';

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
  onSuccess: (user: User) => void;
  onLog: (msg: string, type: 'green' | 'yellow' | 'rose' | 'blue' | 'dim') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
  onLog,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetFormState = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetFormState();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        credentials: 'include', // Stores secure HttpOnly cookie
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      onLog(`Player registered successfully: ${data.data.user.displayName} (${data.data.user.email})`, 'green');
      onSuccess(data.data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
      onLog(`Registration rejected: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include', // Stores secure HttpOnly cookie
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(`Rate limit exceeded: ${data.message} (Retry after ${data.retryAfterSeconds}s)`);
        }
        throw new Error(data.message || 'Invalid credentials');
      }

      onLog(`Player authenticated: ${data.data.user.displayName}`, 'green');
      onSuccess(data.data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
      onLog(`Authentication failed: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Password reset request failed');
      }

      setSuccessMsg(data.message);
      onLog(`Password reset requested for ${email}. Genuine email dispatched.`, 'blue');

      // If non-production staging returns dev token preview, populate token input
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
    } catch (err: any) {
      setError(err.message);
      onLog(`Forgot password error: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Password reset failed');
      }

      setSuccessMsg(data.message);
      onLog('Password reset successfully completed. All active sessions invalidated.', 'green');
      setTimeout(() => switchMode('login'), 2000);
    } catch (err: any) {
      setError(err.message);
      onLog(`Password reset rejected: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalGlow} />

        <button className={styles.closeBtn} onClick={onClose} aria-label="Close dialog" id="btnCloseAuthModal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === 'login' && 'Player Sign In'}
            {mode === 'register' && 'Join NexusPlay'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'Create New Password'}
          </h2>
          <p className={styles.subtitle}>
            {mode === 'login' && 'Enter your credentials to enter the Obsidian Arcade.'}
            {mode === 'register' && 'Create your platform player profile and unlock games.'}
            {mode === 'forgot' && 'Enter your verified email to receive a recovery token.'}
            {mode === 'reset' && 'Enter your reset token and new credentials.'}
          </p>
        </div>

        {error && (
          <div className={styles.errorBanner} id="authErrorBanner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className={styles.successBanner} id="authSuccessBanner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form className={styles.form} onSubmit={handleLogin} id="formLogin">
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="loginEmail">Email Address</label>
              <input
                id="loginEmail"
                type="email"
                className={styles.input}
                placeholder="player@nexusplay.gg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="loginPassword">Password</label>
              <input
                id="loginPassword"
                type="password"
                className={styles.input}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading} id="btnSubmitLogin">
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => switchMode('forgot')}
                id="linkForgotPassword"
              >
                Forgot Password?
              </button>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => switchMode('register')}
                id="linkGoToRegister"
              >
                Don't have an account? Sign Up
              </button>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form className={styles.form} onSubmit={handleRegister} id="formRegister">
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="regDisplayName">Gamer Tag / Display Name</label>
              <input
                id="regDisplayName"
                type="text"
                className={styles.input}
                placeholder="ObsidianViper"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <span className={styles.helperText}>2 to 32 characters. Visible on leaderboards.</span>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="regEmail">Email Address</label>
              <input
                id="regEmail"
                type="email"
                className={styles.input}
                placeholder="viper@nexusplay.gg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="regPassword">Password</label>
              <input
                id="regPassword"
                type="password"
                className={styles.input}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className={styles.helperText}>8 to 64 characters, at least 1 letter and 1 number.</span>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading} id="btnSubmitRegister">
              {loading ? 'Creating Account...' : 'Create Player Account'}
            </button>

            <div className={styles.footerActions}>
              <span style={{ color: 'var(--text-muted)' }}>Already a member?</span>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => switchMode('login')}
                id="linkGoToLogin"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form className={styles.form} onSubmit={handleForgot} id="formForgot">
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="forgotEmail">Registered Email Address</label>
              <input
                id="forgotEmail"
                type="email"
                className={styles.input}
                placeholder="player@nexusplay.gg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading} id="btnSubmitForgot">
              {loading ? 'Sending...' : 'Request Reset Token'}
            </button>

            {resetToken && (
              <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => switchMode('reset')}
                  id="linkProceedToReset"
                >
                  Reset Token Received — Click to Set New Password
                </button>
              </div>
            )}

            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => switchMode('login')}
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* RESET PASSWORD FORM */}
        {mode === 'reset' && (
          <form className={styles.form} onSubmit={handleReset} id="formReset">
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="resetToken">Security Reset Token</label>
              <input
                id="resetToken"
                type="text"
                className={styles.input}
                placeholder="64-character token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
              />
              <span className={styles.helperText}>Valid for 15 minutes from generation.</span>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="resetNewPassword">New Password</label>
              <input
                id="resetNewPassword"
                type="password"
                className={styles.input}
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <span className={styles.helperText}>8 to 64 characters, at least 1 letter and 1 number.</span>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading} id="btnSubmitReset">
              {loading ? 'Updating Password...' : 'Reset Password & Revoke Sessions'}
            </button>

            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => switchMode('login')}
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
