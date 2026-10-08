import { readFile } from 'node:fs/promises';
import { Router } from 'express';
import { config } from '../config';
import { pool } from '../db';

/** Monté uniquement si NODE_ENV=test (voir app.ts). Sinon la route renvoie 404. */
export const testRouter = Router();

// POST /api/test/reset — rejoue app/db/02_seed.sql (TRUNCATE + données de seed).
testRouter.post('/reset', async (_req, res) => {
  const seedSql = await readFile(config.seedSqlPath, 'utf8');
  await pool.query(seedSql);
  res.status(204).end();
});
