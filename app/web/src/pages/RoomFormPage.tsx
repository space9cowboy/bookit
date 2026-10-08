import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, apiRequest, toApiError } from '../api';
import { ErrorMessage, Loading } from '../components/Feedback';
import { EQUIPMENT_LABELS } from '../format';
import { EQUIPMENT, type Equipment, type Room } from '../types';

/** Création (/rooms/new) et édition (/rooms/:id/edit) d'une salle — admin. */
export function RoomFormPage() {
  const { id } = useParams();
  const isEdit = id !== undefined;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    apiRequest<Room>(`/rooms/${id}`)
      .then((room) => {
        setName(room.name);
        setCapacity(String(room.capacity));
        setEquipment(room.equipment);
        setIsActive(room.isActive);
      })
      .catch((err) => setError(toApiError(err)))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const toggleEquipment = (item: Equipment, checked: boolean) =>
    setEquipment((current) =>
      checked ? [...current, item] : current.filter((value) => value !== item),
    );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const body = {
      name,
      // null (et non undefined) : un champ vidé doit être refusé, pas ignoré par le PATCH partiel.
      capacity: capacity === '' ? null : Number(capacity),
      equipment,
      isActive,
    };
    try {
      const room = await apiRequest<Room>(isEdit ? `/rooms/${id}` : '/rooms', {
        method: isEdit ? 'PATCH' : 'POST',
        body,
      });
      navigate(`/rooms/${room.id}`, {
        state: { flash: isEdit ? 'Room updated.' : 'Room created.' },
      });
    } catch (err) {
      setError(toApiError(err));
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <section className="card narrow">
      <h1>{isEdit ? 'Edit room' : 'New room'}</h1>
      <ErrorMessage error={error} testId="room-form-error" />
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label={isEdit ? 'Edit room' : 'New room'}
        data-testid="room-form"
      >
        <div className="field">
          <label htmlFor="room-name">Name</label>
          <input
            id="room-name"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="room-name-input"
          />
        </div>
        <div className="field">
          <label htmlFor="room-capacity">Capacity</label>
          <input
            id="room-capacity"
            type="number"
            min={1}
            max={500}
            required
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            data-testid="room-capacity-input"
          />
        </div>
        <fieldset className="field">
          <legend>Equipment</legend>
          {EQUIPMENT.map((item) => (
            <label key={item} className="checkbox">
              <input
                type="checkbox"
                checked={equipment.includes(item)}
                onChange={(e) => toggleEquipment(item, e.target.checked)}
                data-testid={`room-equipment-${item}-checkbox`}
              />
              {EQUIPMENT_LABELS[item]}
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              data-testid="room-active-checkbox"
            />
            Active (can be booked)
          </label>
        </div>
        <div className="form-actions">
          <button
            type="submit"
            className="btn"
            disabled={submitting}
            data-testid="room-submit-button"
          >
            {isEdit ? 'Save changes' : 'Create room'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            data-testid="room-cancel-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
