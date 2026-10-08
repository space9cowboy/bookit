import { Router } from 'express';
import { activeBugs } from '../bugs';
import { config } from '../config';
import { pool } from '../db';

export const healthRouter = Router();

// GET /api/health — public. `bugs` permet au framework de vérifier la configuration de la cible.
healthRouter.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up', env: config.nodeEnv, bugs: activeBugs });
  } catch {
    res.status(503).json({ status: 'error', db: 'down', env: config.nodeEnv, bugs: activeBugs });
  }
});
