import { withTransaction } from '../db';
import {
  assertCanCancel,
  assertCanComplete,
  assertCapacity,
  assertDuration,
  assertNoOverlap,
  assertNotInPast,
  assertRoomBookable,
  canAccessBooking,
  type Actor,
} from '../domain/bookingRules';
import { assertTransition } from '../domain/bookingStatus';
import { notFound } from '../errors';
import * as bookingsRepo from '../repositories/bookings';
import type { Booking, BookingFilter } from '../repositories/bookings';
import * as roomsRepo from '../repositories/rooms';

const bookingNotFound = () => notFound('BOOKING_NOT_FOUND', 'Booking not found');

export async function listBookings(actor: Actor, filter: BookingFilter): Promise<Booking[]> {
  // Un user ne voit que ses réservations, quel que soit le filtre userId demandé.
  const userId = actor.role === 'admin' ? filter.userId : actor.id;
  return bookingsRepo.list({ ...filter, userId });
}

export async function getBooking(actor: Actor, id: number): Promise<Booking> {
  const booking = await bookingsRepo.findById(id);
  // Règle 6 : la réservation d'un autre user est présentée comme inexistante (404).
  if (!booking || !canAccessBooking(booking, actor)) throw bookingNotFound();
  return booking;
}

export async function createBooking(
  actor: Actor,
  input: { roomId: number; title: string; startAt: Date; endAt: Date; attendees: number },
  now = new Date(),
): Promise<Booking> {
  return withTransaction(async (db) => {
    // Verrou sur la salle : deux créations concurrentes sont sérialisées.
    const room = await roomsRepo.findById(input.roomId, db, { forUpdate: true });
    if (!room) throw notFound('ROOM_NOT_FOUND', 'Room not found');

    const slot = { startAt: input.startAt, endAt: input.endAt };
    // Ordre des contrôles = ordre de priorité des erreurs renvoyées.
    assertRoomBookable(room); //                 7 — ROOM_INACTIVE (422)
    assertNotInPast(slot, now); //               4 — BOOKING_IN_PAST (422)
    assertDuration(slot); //                     2 — DURATION_OUT_OF_RANGE (422)
    assertCapacity(input.attendees, room); //    3 — CAPACITY_EXCEEDED (422)
    const existing = await bookingsRepo.listActiveNear(room.id, slot, db);
    assertNoOverlap(slot, existing); //          1 — BOOKING_OVERLAP (409)

    return bookingsRepo.insert({ ...input, userId: actor.id }, db);
  });
}

export async function cancelBooking(actor: Actor, id: number, now = new Date()): Promise<Booking> {
  const booking = await getBooking(actor, id); // 404 si inaccessible (règle 6)
  assertTransition(booking.status, 'cancelled');
  assertCanCancel(booking, actor, now); //       5 — CANCEL_TOO_LATE (422)
  return bookingsRepo.updateStatus(id, 'cancelled');
}

/** Admin uniquement (contrôlé par la route). */
export async function confirmBooking(id: number): Promise<Booking> {
  const booking = await bookingsRepo.findById(id);
  if (!booking) throw bookingNotFound();
  assertTransition(booking.status, 'confirmed');
  return bookingsRepo.updateStatus(id, 'confirmed');
}

/** Admin uniquement (contrôlé par la route). */
export async function completeBooking(id: number, now = new Date()): Promise<Booking> {
  const booking = await bookingsRepo.findById(id);
  if (!booking) throw bookingNotFound();
  assertTransition(booking.status, 'completed');
  assertCanComplete(booking, now);
  return bookingsRepo.updateStatus(id, 'completed');
}
