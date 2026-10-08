import path from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  // Par défaut : la base exposée par docker compose sur le port hôte 5433.
  DATABASE_URL: z.string().default('postgres://bookit:bookit@localhost:5433/bookit'),
  JWT_SECRET: z.string().min(16).default('dev-only-secret-change-me'),
  // 1 h par défaut. Réduire (ex. 5) permet de tester l'expiration du token.
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(3600),
  // Fichier rejoué par POST /api/test/reset. Fonctionne depuis src/ (tsx) et dist/ (node).
  SEED_SQL_PATH: z.string().default(path.resolve(__dirname, '../../db/02_seed.sql')),
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,
  seedSqlPath: env.SEED_SQL_PATH,
};
