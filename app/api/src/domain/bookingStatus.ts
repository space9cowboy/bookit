import { ruleViolation } from '../errors';

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuts qui occupent la salle (pris en compte pour le chevauchement). */
export const ACTIVE_STATUSES: readonly BookingStatus[] = ['pending', 'confirmed'];

/**
 * Machine d'états :
 *
 *   pending ──confirm──▶ confirmed ──complete──▶ completed
 *      │                    │
 *      └──────cancel────────┴──────▶ cancelled
 *
 * cancelled et completed sont terminaux.
 */
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  cancelled: [],
  completed: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** 422 INVALID_STATUS_TRANSITION si la transition n'est pas autorisée. */
export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw ruleViolation(
      'INVALID_STATUS_TRANSITION',
      `Cannot change booking status from '${from}' to '${to}'`,
    );
  }
}
