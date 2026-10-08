import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, apiRequest, toApiError } from '../api';
import { useAuth } from '../auth';
import { ErrorMessage, FlashMessage, Loading } from '../components/Feedback';
import { EQUIPMENT_LABELS, localInputToIso } from '../format';
import type { Booking, Room } from '../types';
import { useApi } from '../useApi';

export function RoomDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: room, error, loading } = useApi<Room>(`/rooms/${id}`);

  if (loading && !room) return <Loading />;
  if (error || !room) return <ErrorMessage error={error} testId="room-error" />;

  return (
    <section>
      <div className="page-header">
        <h1 data-testid="room-detail-name">{room.name}</h1>
        {user?.role === 'admin' && (
          <Link
            to={`/rooms/${room.id}/edit`}
            className="btn btn-secondary"
            data-testid="room-edit-button"
          >
            Edit room
          </Link>
        )}
      </div>
      <FlashMessage />

      <dl className="details" data-testid="room-details">
        <dt>Capacity</dt>
        <dd data-testid="room-detail-capacity">{room.capacity}</dd>
        <dt>Equipment</dt>
        <dd data-testid="room-detail-equipment">
          {room.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ') || '—'}
        </dd>
        <dt>Status</dt>
        <dd>
          <span
            className={`badge ${room.isActive ? 'badge-active' : 'badge-inactive'}`}
            data-testid="room-detail-status"
          >
            {room.isActive ? 'active' : 'inactive'}
          </span>
        </dd>
      </dl>

      {room.isActive ? (
        <BookingForm room={room} />
      ) : (
        <p className="alert alert-info" data-testid="room-inactive-message">
          This room is inactive and cannot be booked.
        </p>
      )}
    </section>
  );
}

function BookingForm({ room }: { room: Room }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [attendees, setAttendees] = useState('1');
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const booking = await apiRequest<Booking>('/bookings', {
        method: 'POST',
        body: {
          roomId: room.id,
          title,
          startAt: localInputToIso(startAt),
          endAt: localInputToIso(endAt),
          attendees: attendees === '' ? null : Number(attendees),
        },
      });
      navigate(`/bookings/${booking.id}`, { state: { flash: 'Booking created.' } });
    } catch (err) {
      setError(toApiError(err));
      setSubmitting(false);
    }
  };

  return (
    <section className="card">
      <h2>Book this room</h2>
      <ErrorMessage error={error} testId="booking-form-error" />
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Book this room"
        data-testid="booking-form"
      >
        <div className="field">
          <label htmlFor="booking-title">Title</label>
          <input
            id="booking-title"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="booking-title-input"
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="booking-start">Start time</label>
            <input
              id="booking-start"
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              data-testid="booking-start-input"
            />
          </div>
          <div className="field">
            <label htmlFor="booking-end">End time</label>
            <input
              id="booking-end"
              type="datetime-local"
              required
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              data-testid="booking-end-input"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="booking-attendees">Attendees</label>
          <input
            id="booking-attendees"
            type="number"
            min={1}
            max={room.capacity}
            required
            aria-describedby="booking-attendees-hint"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            data-testid="booking-attendees-input"
          />
          <small id="booking-attendees-hint">Maximum {room.capacity} people.</small>
        </div>
        <button
          type="submit"
          className="btn"
          disabled={submitting}
          data-testid="booking-submit-button"
        >
          {submitting ? 'Booking…' : 'Book'}
        </button>
      </form>
    </section>
  );
}
