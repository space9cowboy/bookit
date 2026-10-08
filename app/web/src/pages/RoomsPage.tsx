import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { ErrorMessage, FlashMessage, Loading } from '../components/Feedback';
import { EQUIPMENT_LABELS } from '../format';
import type { Room } from '../types';
import { useApi } from '../useApi';

export function RoomsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeOnly, setActiveOnly] = useState(false);
  const {
    data: rooms,
    error,
    loading,
  } = useApi<Room[]>(activeOnly ? '/rooms?active=true' : '/rooms');

  return (
    <section>
      <div className="page-header">
        <h1>Rooms</h1>
        {isAdmin && (
          <Link to="/rooms/new" className="btn" data-testid="rooms-new-button">
            New room
          </Link>
        )}
      </div>
      <FlashMessage />

      <div className="toolbar">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            data-testid="rooms-active-only-checkbox"
          />
          Active rooms only
        </label>
      </div>

      <ErrorMessage error={error} testId="rooms-error" />
      {loading && !rooms ? (
        <Loading />
      ) : rooms && rooms.length === 0 ? (
        <p data-testid="rooms-empty">No rooms found.</p>
      ) : (
        rooms && (
          <table className="table" data-testid="rooms-table">
            <caption className="sr-only">Meeting rooms</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Capacity</th>
                <th scope="col">Equipment</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} data-testid={`room-row-${room.id}`}>
                  <td data-testid="room-name">{room.name}</td>
                  <td data-testid="room-capacity">{room.capacity}</td>
                  <td data-testid="room-equipment">
                    {room.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ') || '—'}
                  </td>
                  <td>
                    <span
                      className={`badge ${room.isActive ? 'badge-active' : 'badge-inactive'}`}
                      data-testid="room-status"
                    >
                      {room.isActive ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <Link
                      to={`/rooms/${room.id}`}
                      aria-label={`View ${room.name}`}
                      data-testid={`room-view-link-${room.id}`}
                    >
                      View
                    </Link>
                    {isAdmin && (
                      <Link
                        to={`/rooms/${room.id}/edit`}
                        aria-label={`Edit ${room.name}`}
                        data-testid={`room-edit-link-${room.id}`}
                      >
                        Edit
                      </Link>
                    )}
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
