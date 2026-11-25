import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { ensureDemoSeed } from './seeds/seedData.js';

const app = createApp();

async function start() {
  await connectDB();
  if (env.useInMemoryDb) {
    await ensureDemoSeed();
  }

  const server = app.listen(env.port, () => {
    console.log(`[API] Server listening on http://localhost:${env.port}`);
  });

  const shutdown = async () => {
    console.log('[API] Shutting down gracefully...');
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('[API] Failed to start server:', err);
  process.exit(1);
});
