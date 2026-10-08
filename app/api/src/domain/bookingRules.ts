/**
 * Règles métier des réservations.
 *
 * Fonctions pures (sans accès BDD) : elles reçoivent les données nécessaires
 * et lèvent une AppError si la règle est violée. `now` est injectable.
 *
 * Les bugs injectables (voir ../bugs.ts) sont placés directement dans la règle
 * qu'ils cassent.
 */
import { isBug } from '../bugs';
import { conflict, ruleViolation } from '../errors';
import { ACTIVE_STATUSES, type BookingStatus } from './bookingStatus';

export const MIN_DURATION_MINUTES = 30;
export const MAX_DURATION_MINUTES = 240;
export const CANCEL_NOTICE_MINUTES = 60;

const MINUTE_MS = 60_000;

export type Role = 'user' | 'admin';

export interface Actor {
  id: number;
  role: Role;
}

export interface Slot {
  startAt: Date;
  endAt: Date;
}

export interface ExistingBooking extends Slot {
  id: number;
  status: BookingStatus;
}

// ---------------------------------------------------------------------------
// Règle 1 — Pas de chevauchement sur une même salle.
// Intervalles semi-ouverts [start, end[ : une fin à 10:00 et un début à 10:00
// ne se chevauchent pas. Seules les réservations pending/confirmed comptent.
// ---------------------------------------------------------------------------
export function overlaps(a: Slot, b: Slot): boolean {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

export function assertNoOverlap(candidate: Slot, existing: ExistingBooking[]): void {
  // BUG OVERLAP : le contrôle de chevauchement est ignoré.
  if (isBug('OVERLAP')) return;

  const clash = existing.find(
    (booking) => ACTIVE_STATUSES.includes(booking.status) && overlaps(candidate, booking),
  );
  if (clash) {
    throw conflict('BOOKING_OVERLAP', 'The room is already booked for this time slot');
  }
}

// ---------------------------------------------------------------------------
// Règle 2 — Durée entre 30 min et 4 h incluses.
// ---------------------------------------------------------------------------
export function assertDuration(slot: Slot): void {
  const minutes = (slot.endAt.getTime() - slot.startAt.getTime()) / MINUTE_MS;

  // BUG DURATION : la borne max passe à 4 h 01 (241 min acceptées).
  const maxMinutes = isBug('DURATION') ? MAX_DURATION_MINUTES + 1 : MAX_DURATION_MINUTES;

  if (minutes < MIN_DURATION_MINUTES || minutes > maxMinutes) {
    throw ruleViolation(
      'DURATION_OUT_OF_RANGE',
      `Booking duration must be between ${MIN_DURATION_MINUTES} minutes and ${MAX_DURATION_MINUTES / 60} hours`,
    );
  }
}

// ---------------------------------------------------------------------------
// Règle 3 — Nombre de participants ≤ capacité de la salle.
// ---------------------------------------------------------------------------
export function assertCapacity(attendees: number, room: { capacity: number }): void {
  // BUG CAPACITY : la capacité n'est pas vérifiée.
  if (isBug('CAPACITY')) return;

  if (attendees > room.capacity) {
    throw ruleViolation(
      'CAPACITY_EXCEEDED',
      `This room holds at most ${room.capacity} attendees (requested: ${attendees})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Règle 4 — Pas de réservation dans le passé (début strictement avant now).
// ---------------------------------------------------------------------------
export function assertNotInPast(slot: Slot, now: Date): void {
  // BUG PAST : les réservations dans le passé sont acceptées.
  if (isBug('PAST')) return;

  if (slot.startAt.getTime() < now.getTime()) {
    throw ruleViolation('BOOKING_IN_PAST', 'Cannot book a time slot in the past');
  }
}

// ---------------------------------------------------------------------------
// Règle 5 — Annulation impossible moins d'1 h avant le début (sauf admin).
// Exactement 1 h avant le début : l'annulation est acceptée.
// ---------------------------------------------------------------------------
export function assertCanCancel(booking: Slot, actor: Actor, now: Date): void {
  if (actor.role === 'admin') return;

  // BUG CANCEL_DELAY : l'annulation à moins d'1 h du début est acceptée.
  if (isBug('CANCEL_DELAY')) return;

  const minutesBeforeStart = (booking.startAt.getTime() - now.getTime()) / MINUTE_MS;
  if (minutesBeforeStart < CANCEL_NOTICE_MINUTES) {
    throw ruleViolation(
      'CANCEL_TOO_LATE',
      `A booking cannot be cancelled less than ${CANCEL_NOTICE_MINUTES} minutes before it starts`,
    );
  }
}

// ---------------------------------------------------------------------------
// Règle 6 — Un user ne voit/modifie que ses propres réservations.
// Choix documenté : une réservation d'autrui est traitée comme inexistante
// (404 BOOKING_NOT_FOUND) pour ne pas révéler son existence.
// ---------------------------------------------------------------------------
export function canAccessBooking(booking: { userId: number }, actor: Actor): boolean {
  if (actor.role === 'admin') return true;

  // BUG AUTH403 : un user accède aux réservations des autres.
  if (isBug('AUTH403')) return true;

  return booking.userId === actor.id;
}

// ---------------------------------------------------------------------------
// Règle 7 — Salle inactive = non réservable.
// ---------------------------------------------------------------------------
export function assertRoomBookable(room: { isActive: boolean }): void {
  if (!room.isActive) {
    throw ruleViolation('ROOM_INACTIVE', 'This room is inactive and cannot be booked');
  }
}

// ---------------------------------------------------------------------------
// Complément machine d'états — une réservation ne peut être terminée
// (confirmed → completed) qu'une fois sa fin passée.
// ---------------------------------------------------------------------------
export function assertCanComplete(booking: Slot, now: Date): void {
  if (booking.endAt.getTime() > now.getTime()) {
    throw ruleViolation('BOOKING_NOT_ENDED', 'A booking can only be completed after it ends');
  }
}
