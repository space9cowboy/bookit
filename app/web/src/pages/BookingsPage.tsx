import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { isBug } from '../bugs';
import { ErrorMessage, Loading, StatusBadge } from '../components/Feedback';
import { formatDateTime } from '../format';
import { BOOKING_STATUSES, type Booking } from '../types';
import { useApi } from '../useApi';

export function BookingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [status, setStatus] = useState('');
  const {
    data: bookings,
    error,
    loading,
  } = useApi<Booking[]>(status ? `/bookings?status=${status}` : '/bookings');

  // BUG UI_TOTAL : le compteur affiché est faux de 1.
  const count = (bookings?.length ?? 0) + (isBug('UI_TOTAL') ? 1 : 0);

  return (
    <section>
      <div className="page-header">
        <h1>{isAdmin ? 'All bookings' : 'My bookings'}</h1>
        <Link to="/rooms" className="btn" data-testid="bookings-new-button">
          Book a room
        </Link>
      </div>

      <div className="toolbar">
        <div className="field inline">
          <label htmlFor="bookings-status-filter">Status</label>
          <select
            id="bookings-status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            data-testid="bookings-status-filter"
          >
            <option value="">All</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {bookings && (
          <p className="count" aria-live="polite" data-testid="bookings-count" data-count={count}>
            {count} {count === 1 ? 'booking' : 'bookings'}
          </p>
        )}
      </div>

      <ErrorMessage error={error} testId="bookings-error" />
      {loading && !bookings ? (
        <Loading />
      ) : bookings && bookings.length === 0 ? (
        <p data-testid="bookings-empty">No bookings found.</p>
      ) : (
        bookings && (
          <table className="table" data-testid="bookings-table">
            <caption className="sr-only">{isAdmin ? 'All bookings' : 'My bookings'}</caption>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Room</th>
                {isAdmin && <th scope="col">Booked by</th>}
                <th scope="col">Start</th>
                <th scope="col">End</th>
                <th scope="col">Attendees</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} data-testid={`booking-row-${booking.id}`}>
                  <td>
                    <Link to={`/bookings/${booking.id}`} data-testid={`booking-link-${booking.id}`}>
                      {booking.title}
                    </Link>
                  </td>
                  <td data-testid="booking-room">{booking.roomName}</td>
                  {isAdmin && <td data-testid="booking-user">{booking.userEmail}</td>}
                  <td data-testid="booking-start">{formatDateTime(booking.startAt)}</td>
                  <td data-testid="booking-end">{formatDateTime(booking.endAt)}</td>
                  <td data-testid="booking-attendees">{booking.attendees}</td>
                  <td>
                    <StatusBadge status={booking.status} testId="booking-status" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </section>
  );
}
