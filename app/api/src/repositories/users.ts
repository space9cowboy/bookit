import { isUniqueViolation, pool, type Db } from '../db';
import type { Role } from '../domain/bookingRules';
import { conflict } from '../errors';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
}

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: Role;
  password_hash: string;
  created_at: Date;
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  createdAt: row.created_at,
});

export async function findById(id: number, db: Db = pool): Promise<User | null> {
  const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function findByEmailWithPassword(
  email: string,
  db: Db = pool,
): Promise<(User & { passwordHash: string }) | null> {
  const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] ? { ...toUser(rows[0]), passwordHash: rows[0].password_hash } : null;
}

export async function create(
  input: { email: string; name: string; passwordHash: string },
  db: Db = pool,
): Promise<User> {
  try {
    const { rows } = await db.query<UserRow>(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING *`,
      [input.email, input.name, input.passwordHash],
    );
    return toUser(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw conflict('EMAIL_ALREADY_USED', 'An account already exists with this email');
    }
    throw err;
  }
}
