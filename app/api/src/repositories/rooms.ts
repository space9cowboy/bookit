import { isUniqueViolation, pool, type Db } from '../db';
import { conflict } from '../errors';

export const EQUIPMENT = [
  'screen',
  'projector',
  'whiteboard',
  'videoconference',
  'microphone',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export interface Room {
  id: number;
  name: string;
  capacity: number;
  equipment: Equipment[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RoomRow {
  id: number;
  name: string;
  capacity: number;
  equipment: Equipment[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const toRoom = (row: RoomRow): Room => ({
  id: row.id,
  name: row.name,
  capacity: row.capacity,
  equipment: row.equipment,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const nameTaken = () => conflict('ROOM_NAME_TAKEN', 'A room with this name already exists');

export async function list(filter: { active?: boolean } = {}, db: Db = pool): Promise<Room[]> {
  const { rows } =
    filter.active === undefined
      ? await db.query<RoomRow>('SELECT * FROM rooms ORDER BY id')
      : await db.query<RoomRow>('SELECT * FROM rooms WHERE is_active = $1 ORDER BY id', [
          filter.active,
        ]);
  return rows.map(toRoom);
}

/** `forUpdate` verrouille la ligne : sérialise les créations de réservation sur une même salle. */
export async function findById(
  id: number,
  db: Db = pool,
  opts: { forUpdate?: boolean } = {},
): Promise<Room | null> {
  const { rows } = await db.query<RoomRow>(
    `SELECT * FROM rooms WHERE id = $1${opts.forUpdate ? ' FOR UPDATE' : ''}`,
    [id],
  );
  return rows[0] ? toRoom(rows[0]) : null;
}

export async function create(
  input: { name: string; capacity: number; equipment: Equipment[]; isActive: boolean },
  db: Db = pool,
): Promise<Room> {
  try {
    const { rows } = await db.query<RoomRow>(
      `INSERT INTO rooms (name, capacity, equipment, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.name, input.capacity, input.equipment, input.isActive],
    );
    return toRoom(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) throw nameTaken();
    throw err;
  }
}

export async function update(
  id: number,
  patch: Partial<{ name: string; capacity: number; equipment: Equipment[]; isActive: boolean }>,
  db: Db = pool,
): Promise<Room | null> {
  const columns: Record<string, string> = {
    name: 'name',
    capacity: 'capacity',
    equipment: 'equipment',
    isActive: 'is_active',
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    values.push(value);
    sets.push(`${columns[key]} = $${values.length}`);
  }
  values.push(id);

  try {
    const { rows } = await db.query<RoomRow>(
      `UPDATE rooms SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${values.length}
       RETURNING *`,
      values,
    );
    return rows[0] ? toRoom(rows[0]) : null;
  } catch (err) {
    if (isUniqueViolation(err)) throw nameTaken();
    throw err;
  }
}
