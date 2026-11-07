import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDB(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    const sanitizedUri = env.MONGODB_URI.replace(/:[^:@]+@/, ':****@');
    logger.info({ uri: sanitizedUri }, 'MongoDB connected');
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

