import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError, toApiError } from '../api';
import { useAuth } from '../auth';
import { isBug } from '../bugs';
import { ErrorMessage } from '../components/Feedback';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/rooms';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(toApiError(err));
      setSubmitting(false);
    }
  };

  return (
    <section className="card narrow">
      <h1>Log in</h1>
      <ErrorMessage error={error} testId="login-error" />
      <form onSubmit={handleSubmit} noValidate aria-label="Log in" data-testid="login-form">
        <div className="field">
          {/* BUG A11Y : le champ email perd son label (plus aucun nom accessible). */}
          {!isBug('A11Y') && <label htmlFor="login-email">Email</label>}
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email-input"
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password-input"
          />
        </div>
        <button
          type="submit"
          className="btn"
          disabled={submitting}
          data-testid="login-submit-button"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p>
        No account yet?{' '}
        <Link to="/register" data-testid="login-register-link">
          Create one
        </Link>
      </p>
    </section>
  );
}
