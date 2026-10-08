import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, apiRequest, toApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorMessage, FlashMessage, Loading, StatusBadge } from '../components/Feedback';
import { formatDateTime } from '../format';
import type { Booking } from '../types';
import { useApi } from '../useApi';

type Action = 'cancel' | 'confirm' | 'complete';

const SUCCESS: Record<Action, string> = {
  cancel: 'Booking cancelled.',
  confirm: 'Booking confirmed.',
  complete: 'Booking marked as completed.',
};

export function BookingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: booking, error, loading, setData } = useApi<Booking>(`/bookings/${id}`);

  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<Action | null>(null);

  if (loading && !booking) return <Loading />;
  if (error || !booking) return <ErrorMessage error={error} testId="booking-error" />;

  const run = async (action: Action) => {
    setActionError(null);
    setSuccess(null);
    setPending(action);
    try {
      setData(await apiRequest<Booking>(`/bookings/${booking.id}/${action}`, { method: 'POST' }));
      setSuccess(SUCCESS[action]);
    } catch (err) {
      setActionError(toApiError(err));
    } finally {
      setPending(null);
    }
  };

  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

  return (
    <section>
      <div className="page-header">
        <h1 data-testid="booking-detail-title">{booking.title}</h1>
        <Link to="/bookings" className="btn btn-secondary" data-testid="booking-back-link">
          Back to bookings
        </Link>
      </div>
      {success ? (
        <div className="alert alert-success" role="status" data-testid="booking-action-success">
          {success}
        </div>
      ) : (
        <FlashMessage />
      )}
      <ErrorMessage error={actionError} testId="booking-action-error" />

      <dl className="details" data-testid="booking-details">
        <dt>Status</dt>
        <dd>
          <StatusBadge status={booking.status} testId="booking-detail-status" />
        </dd>
        <dt>Room</dt>
        <dd>
          <Link to={`/rooms/${booking.roomId}`} data-testid="booking-detail-room">
            {booking.roomName}
          </Link>
        </dd>
        <dt>Start</dt>
        <dd data-testid="booking-detail-start">{formatDateTime(booking.startAt)}</dd>
        <dt>End</dt>
        <dd data-testid="booking-detail-end">{formatDateTime(booking.endAt)}</dd>
        <dt>Attendees</dt>
        <dd data-testid="booking-detail-attendees">{booking.attendees}</dd>
        <dt>Booked by</dt>
        <dd data-testid="booking-detail-user">
          {booking.userName} ({booking.userEmail})
        </dd>
        {booking.cancelledAt && (
          <>
            <dt>Cancelled at</dt>
            <dd data-testid="booking-detail-cancelled-at">{formatDateTime(booking.cancelledAt)}</dd>
          </>
        )}
      </dl>

      <div className="form-actions">
        {canCancel && (
          <button
            type="button"
            className="btn btn-danger"
            disabled={pending !== null}
            onClick={() => run('cancel')}
            data-testid="booking-cancel-button"
          >
            {pending === 'cancel' ? 'Cancelling…' : 'Cancel booking'}
          </button>
        )}
        {isAdmin && booking.status === 'pending' && (
          <button
            type="button"
            className="btn"
            disabled={pending !== null}
            onClick={() => run('confirm')}
            data-testid="booking-confirm-button"
          >
            {pending === 'confirm' ? 'Confirming…' : 'Confirm booking'}
          </button>
        )}
        {isAdmin && booking.status === 'confirmed' && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={pending !== null}
            onClick={() => run('complete')}
            data-testid="booking-complete-button"
          >
            {pending === 'complete' ? 'Completing…' : 'Mark as completed'}
          </button>
        )}
      </div>
    </section>
  );
}
