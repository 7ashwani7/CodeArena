import mongoose from 'mongoose';
import { env } from './env.js';

const READY_STATE_MAP = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

/**
 * Connect to MongoDB Atlas or local MongoDB instance.
 * In development, if the database cannot be reached immediately,
 * we log a clear diagnostic warning without crashing the entire process.
 */
export async function connectDB() {
  const options = {
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of hanging
    autoIndex: env.isDevelopment
  };

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, options);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database] MongoDB Connection Error: ${error.message}`);
    if (env.isProduction) {
      // In production, database connection failure is critical
      throw error;
    }
    console.warn('[Database] Running in development mode without active MongoDB. Configure MONGODB_URI in .env to connect to MongoDB Atlas.');
    return null;
  }
}

/**
 * Disconnect from MongoDB gracefully.
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB connection closed gracefully.');
  }
}

/**
 * Retrieve current connection state for health checks.
 */
export function getDBStatus() {
  const stateCode = mongoose.connection.readyState;
  return {
    readyState: stateCode,
    status: READY_STATE_MAP[stateCode] || 'unknown',
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
}

// Event listeners for connection lifecycle
mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] MongoDB reconnected.');
});
