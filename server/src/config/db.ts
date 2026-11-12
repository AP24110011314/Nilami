import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDB(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  try {
    const hasDbInUri = /^mongodb(?:\+srv)?:\/\/[^/]+\/[^?]+/.test(env.MONGODB_URI);
    const conn = await mongoose.connect(
      env.MONGODB_URI,
      hasDbInUri ? undefined : { dbName: env.MONGODB_DB_NAME },
    );
    const sanitizedUri = env.MONGODB_URI.replace(/:[^:@]+@/, ':****@');
    logger.info({ uri: sanitizedUri, db: conn.connection.name }, 'MongoDB connected');
    return conn;
  } catch (error) {
    logger.error({ error }, 'MongoDB connection error');
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
}

