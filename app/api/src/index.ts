import { createApp } from './app';
import { activeBugs, unknownBugs } from './bugs';
import { config } from './config';
import { pool } from './db';

async function waitForDatabase(retries = 20, delayMs = 1000): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt >= retries) throw err;
      console.log(`Database not ready (attempt ${attempt}/${retries}), retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function main() {
  await waitForDatabase();

  if (activeBugs.length) console.warn(`⚠️  Injected bugs enabled: ${activeBugs.join(', ')}`);
  if (unknownBugs().length)
    console.warn(`⚠️  Unknown BUG codes ignored: ${unknownBugs().join(', ')}`);
  if (config.nodeEnv === 'test') console.log('Test routes enabled: POST /api/test/reset');

  const server = createApp().listen(config.port, () => {
    console.log(`BookIt API listening on :${config.port} (NODE_ENV=${config.nodeEnv})`);
  });

  const shutdown = () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
