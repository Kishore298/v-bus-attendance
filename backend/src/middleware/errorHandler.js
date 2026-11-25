import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  if (err.code === 11000) {
    statusCode = 409;
    const keys = Object.keys(err.keyPattern || {});
    message = keys.length
      ? `Duplicate record conflict on: ${keys.join(', ')}`
      : 'Duplicate record already exists';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Database validation error';
    details = Object.values(err.errors || {}).map((e) => ({
      path: e.path,
      message: e.message,
    }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier format for ${err.path}`;
  }

  if (statusCode >= 500 && env.nodeEnv !== 'test') {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
}
