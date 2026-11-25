import mongoose from 'mongoose';
import { isTransactionSupported } from '../config/db.js';

export async function runWithTransaction(workFn) {
  if (!isTransactionSupported()) {
    return workFn(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await workFn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
