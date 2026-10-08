import { useLocation } from 'react-router-dom';
import type { ApiError } from '../api';
import type { BookingStatus } from '../types';

/** Erreur API : message + détails de validation. `data-error-code` expose le code API. */
export function ErrorMessage({ error, testId }: { error?: ApiError | null; testId: string }) {
  if (!error) return null;
  return (
    <div
      className="alert alert-error"
      role="alert"
      data-testid={testId}
      data-error-code={error.code}
    >
      <p>{error.message}</p>
      {error.details && error.details.length > 0 && (
        <ul>
          {error.details.map((detail) => (
            <li key={`${detail.path}-${detail.message}`}>
              {detail.path ? `${detail.path}: ` : ''}
              {detail.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Loading() {
  return (
    <p role="status" data-testid="loading">
      Loading…
    </p>
  );
}

/** Message de succès transmis via navigate(..., { state: { flash } }). */
export function FlashMessage() {
  const flash = (useLocation().state as { flash?: string } | null)?.flash;
  if (!flash) return null;
  return (
    <div className="alert alert-success" role="status" data-testid="flash-message">
      {flash}
    </div>
  );
}

export function StatusBadge({ status, testId }: { status: BookingStatus; testId: string }) {
  return (
    <span className={`badge badge-${status}`} data-testid={testId}>
      {status}
    </span>
  );
}
