/**
 * Bugs injectables — pour valider que le framework de test les détecte.
 *
 * Lit la variable d'environnement BUG (vide = aucun bug). Plusieurs bugs
 * peuvent être combinés en les séparant par des virgules : BUG=OVERLAP,SLOW
 *
 * Chaque bug est activé par un `if (isBug('CODE'))` placé au plus près
 * de la règle qu'il casse :
 *
 *   OVERLAP       domain/bookingRules.ts  assertNoOverlap   — chevauchement ignoré
 *   DURATION      domain/bookingRules.ts  assertDuration    — 4 h 01 accepté
 *   CAPACITY      domain/bookingRules.ts  assertCapacity    — capacité non vérifiée
 *   PAST          domain/bookingRules.ts  assertNotInPast   — réservation dans le passé acceptée
 *   CANCEL_DELAY  domain/bookingRules.ts  assertCanCancel   — annulation < 1 h acceptée
 *   AUTH403       domain/bookingRules.ts  canAccessBooking  — accès aux réservations d'autrui
 *   STATUS_CODE   routes/bookings.ts      POST /bookings    — 200 au lieu de 201
 *   SLOW          routes/bookings.ts      GET /bookings     — +800 ms de latence
 *
 * Les bugs front (A11Y, UI_TOTAL) sont dans app/web/src/bugs.ts (VITE_BUG).
 */

export const KNOWN_BUGS = [
  'OVERLAP',
  'DURATION',
  'CAPACITY',
  'PAST',
  'CANCEL_DELAY',
  'AUTH403',
  'STATUS_CODE',
  'SLOW',
] as const;

export type BugCode = (typeof KNOWN_BUGS)[number];

export const activeBugs: string[] = (process.env.BUG ?? '')
  .split(',')
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);

export function isBug(code: BugCode): boolean {
  return activeBugs.includes(code);
}

export function unknownBugs(): string[] {
  return activeBugs.filter((code) => !(KNOWN_BUGS as readonly string[]).includes(code));
}
