import { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function AuthView({ configured, loading, error, message, onAuthenticate }) {
  const [mode, setMode] = useState('sign-up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(event) {
    event.preventDefault();
    onAuthenticate({ mode, email: email.trim(), password });
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand-mark"><ShieldCheck size={19} /></div>
        <p className="auth-eyebrow">Project desk</p>
        <h1>{mode === 'sign-in' ? 'Sign in to your workspace' : 'Create your workspace account'}</h1>
        <p className="auth-intro">Your projects, extracted tasks, and people stay private to your account.</p>

        {!configured && (
          <div className="alert error">
            Supabase is not configured. Add the values from <code>frontend/.env.example</code> and
            <code> backend/.env.example</code>, then restart both servers.
          </div>
        )}
        {error && <div className="alert error" role="alert">{error}</div>}
        {message && <div className="alert success" role="status">{message}</div>}

        <form className="auth-form" onSubmit={submit}>
          <label className="field-label">
            Email
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={!configured || loading}
            />
          </label>
          <label className="field-label">
            Password
            <input
              className="input"
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              minLength={mode === 'sign-up' ? 8 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={!configured || loading}
            />
          </label>
          <button className="btn btn-ink auth-submit" type="submit" disabled={!configured || loading}>
            {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>

        <button
          type="button"
          className="auth-mode-toggle"
          onClick={() => setMode((current) => current === 'sign-in' ? 'sign-up' : 'sign-in')}
          disabled={loading}
        >
          {mode === 'sign-in' ? 'New here? Create an account' : 'Already registered? Sign in'}
        </button>
      </section>
    </main>
  );
}
