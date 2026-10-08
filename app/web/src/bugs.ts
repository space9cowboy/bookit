/**
 * Bugs front injectables — lus depuis VITE_BUG au moment du build
 * (en Docker : `VITE_BUG=A11Y docker compose up --build web`).
 * Plusieurs bugs peuvent être combinés : VITE_BUG=A11Y,UI_TOTAL
 *
 *   A11Y      pages/LoginPage.tsx     — le champ email du login perd son label
 *   UI_TOTAL  pages/BookingsPage.tsx  — le compteur de réservations est faux de 1
 *
 * Les bugs API sont dans app/api/src/bugs.ts (variable BUG).
 */

export type FrontBugCode = 'A11Y' | 'UI_TOTAL';

export const activeBugs: string[] = (import.meta.env.VITE_BUG ?? '')
  .split(',')
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);

export function isBug(code: FrontBugCode): boolean {
  return activeBugs.includes(code);
}
