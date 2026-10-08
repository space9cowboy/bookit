const pad = (n: number) => String(n).padStart(2, '0');

/** Affichage stable "YYYY-MM-DD HH:mm" dans le fuseau du navigateur. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Valeur d'un <input type="datetime-local"> (heure locale) → ISO 8601 UTC. Vide/invalide → "". */
export function localInputToIso(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export const EQUIPMENT_LABELS: Record<string, string> = {
  screen: 'Screen',
  projector: 'Projector',
  whiteboard: 'Whiteboard',
  videoconference: 'Video conference',
  microphone: 'Microphone',
};
