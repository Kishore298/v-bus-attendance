import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;
let supportsTransactions = false;

export function isTransactionSupported() {
  return supportsTransactions;
}

export async function connectDB(customUri = null) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  let uri = customUri || env.mongoUri;

  if (!customUri && env.useInMemoryDb && env.nodeEnv !== 'production') {
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    uri = memoryServer.getUri();
    supportsTransactions = true;
    console.log('[DB] Started in-memory MongoDB replica set for local development');
  }

  await mongoose.connect(uri);

  if (!supportsTransactions) {
    try {
      const admin = mongoose.connection.db.admin();
      const info = await admin.command({ hello: 1 });
      supportsTransactions = Boolean(info.setName || info.msg === 'isdbgrid');
    } catch {
      supportsTransactions = false;
    }
  }

  console.log(`[DB] Connected to MongoDB (transactions: ${supportsTransactions ? 'enabled' : 'standalone fallback'})`);
  return mongoose.connection;
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
