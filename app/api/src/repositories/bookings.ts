import { pool, type Db } from '../db';
import type { Slot } from '../domain/bookingRules';
import type { BookingStatus } from '../domain/bookingStatus';

export interface Booking {
  id: number;
  roomId: number;
  roomName: string;
  userId: number;
  userEmail: string;
  userName: string;
  title: string;
  startAt: Date;
  endAt: Date;
  attendees: number;
  status: BookingStatus;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BookingRow {
  id: number;
  room_id: number;
  room_name: string;
  user_id: number;
  user_email: string;
  user_name: string;
  title: string;
  start_at: Date;
  end_at: Date;
  attendees: number;
  status: BookingStatus;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const toBooking = (row: BookingRow): Booking => ({
  id: row.id,
  roomId: row.room_id,
  roomName: row.room_name,
  userId: row.user_id,
  userEmail: row.user_email,
  userName: row.user_name,
  title: row.title,
  startAt: row.start_at,
  endAt: row.end_at,
  attendees: row.attendees,
  status: row.status,
  cancelledAt: row.cancelled_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const SELECT_BOOKING = `
  SELECT b.*, r.name AS room_name, u.email AS user_email, u.name AS user_name
  FROM bookings b
  JOIN rooms r ON r.id = b.room_id
  JOIN users u ON u.id = b.user_id`;

export interface BookingFilter {
  userId?: number;
  roomId?: number;
  status?: BookingStatus;
}

export async function list(filter: BookingFilter = {}, db: Db = pool): Promise<Booking[]> {
  const where: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    where.push(`${sql} = $${values.length}`);
  };
  if (filter.userId !== undefined) add('b.user_id', filter.userId);
  if (filter.roomId !== undefined) add('b.room_id', filter.roomId);
  if (filter.status !== undefined) add('b.status', filter.status);

  const { rows } = await db.query<BookingRow>(
    `${SELECT_BOOKING}
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY b.start_at, b.id`,
    values,
  );
  return rows.map(toBooking);
}

export async function findById(id: number, db: Db = pool): Promise<Booking | null> {
  const { rows } = await db.query<BookingRow>(`${SELECT_BOOKING} WHERE b.id = $1`, [id]);
  return rows[0] ? toBooking(rows[0]) : null;
}

/**
 * Réservations pending/confirmed de la salle qui touchent ou recoupent le créneau.
 * Préfiltre volontairement large (bornes incluses) : la décision exacte
 * (bords qui se touchent = pas de chevauchement) est prise par
 * domain/bookingRules.ts#assertNoOverlap.
 */
export async function listActiveNear(roomId: number, slot: Slot, db: Db = pool) {
  const { rows } = await db.query<Pick<BookingRow, 'id' | 'start_at' | 'end_at' | 'status'>>(
    `SELECT id, start_at, end_at, status FROM bookings
     WHERE room_id = $1
       AND status IN ('pending', 'confirmed')
       AND start_at <= $3 AND end_at >= $2`,
    [roomId, slot.startAt, slot.endAt],
  );
  return rows.map((row) => ({
    id: row.id,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
  }));
}

export async function insert(
  input: {
    roomId: number;
    userId: number;
    title: string;
    startAt: Date;
    endAt: Date;
    attendees: number;
  },
  db: Db = pool,
): Promise<Booking> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO bookings (room_id, user_id, title, start_at, end_at, attendees, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING id`,
    [input.roomId, input.userId, input.title, input.startAt, input.endAt, input.attendees],
  );
  return (await findById(rows[0].id, db)) as Booking;
}

export async function updateStatus(
  id: number,
  status: BookingStatus,
  db: Db = pool,
): Promise<Booking> {
  await db.query(
    `UPDATE bookings
     SET status = $2::booking_status,
         cancelled_at = CASE WHEN $2::booking_status = 'cancelled' THEN now() ELSE cancelled_at END,
         updated_at = now()
     WHERE id = $1`,
    [id, status],
  );
  return (await findById(id, db)) as Booking;
}
