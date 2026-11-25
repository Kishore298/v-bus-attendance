import { connectDB, disconnectDB } from '../config/db.js';
import { ensureDemoSeed } from './seedData.js';

async function run() {
  await connectDB();
  const res = await ensureDemoSeed();
  console.log(res.seeded ? 'Seed completed.' : 'Database already has users; skipped.');
  await disconnectDB();
}

run().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
