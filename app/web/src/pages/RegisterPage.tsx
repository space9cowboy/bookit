import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError, toApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorMessage } from '../components/Feedback';

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user && !submitting) return <Navigate to="/rooms" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate('/rooms', { replace: true, state: { flash: 'Your account has been created.' } });
    } catch (err) {
      setError(toApiError(err));
      setSubmitting(false);
    }
  };

  return (
    <section className="card narrow">
      <h1>Create an account</h1>
      <ErrorMessage error={error} testId="register-error" />
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Create an account"
        data-testid="register-form"
      >
        <div className="field">
          <label htmlFor="register-name">Full name</label>
          <input
            id="register-name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="register-name-input"
          />
        </div>
        <div className="field">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="register-email-input"
          />
        </div>
        <div className="field">
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-describedby="register-password-hint"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="register-password-input"
          />
          <small id="register-password-hint">At least 8 characters.</small>
        </div>
        <button
          type="submit"
          className="btn"
          disabled={submitting}
          data-testid="register-submit-button"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p>
        Already registered?{' '}
        <Link to="/login" data-testid="register-login-link">
          Log in
        </Link>
      </p>
    </section>
  );
}
