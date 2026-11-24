import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthView({ configured, loading, error, message, onAuthenticate }) {
  const [mode, setMode] = useState('sign-up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function submit(event) {
    event.preventDefault();
    onAuthenticate({ mode, email: email.trim(), password });
  }

  function toggleMode() {
    setMode((current) => current === 'sign-in' ? 'sign-up' : 'sign-in');
    setPassword('');
    setShowPassword(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-name">Project <strong>Desk</strong></span>
        </div>
        <div className="auth-content" key={mode}>
          <p className="auth-eyebrow">{mode === 'sign-in' ? 'Welcome back' : 'Workspace access'}</p>
          <h1>{mode === 'sign-in' ? 'Sign in to your workspace' : 'Create your workspace account'}</h1>
          <p className="auth-intro">Your projects, extracted tasks, and people stay private to your account.</p>

          {(error || message) && (
            <div className="auth-messages">
              {error && <div className="alert error auth-alert" role="alert">{error}</div>}
              {message && <div className="alert success auth-alert" role="status">{message}</div>}
            </div>
          )}

          <form className="auth-form" onSubmit={submit}>
            <label className="field-label auth-field">
              <span>Email address</span>
              <input
                className="input auth-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={!configured || loading}
              />
            </label>
            <label className="field-label auth-field">
              <span>Password</span>
              <span className="auth-password-wrap">
                <input
                  className="input auth-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  minLength={mode === 'sign-up' ? 8 : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={!configured || loading}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  disabled={!configured || loading}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            <button className="btn btn-ink auth-submit" type="submit" disabled={!configured || loading}>
              {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            <span>{mode === 'sign-in' ? 'New to Project Desk?' : 'Already registered?'}</span>
            <button type="button" className="auth-mode-toggle" onClick={toggleMode} disabled={loading}>
              {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>

        <div className="auth-footnote">
          <span>Private access to your workspace</span>
        </div>
      </section>
    </main>
  );
}
