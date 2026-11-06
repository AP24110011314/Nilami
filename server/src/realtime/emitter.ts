import { Emitter } from '@socket.io/redis-emitter';
import { getRedisClient } from '../config/redis.js';

let emitter: Emitter | null = null;

export function getEmitter(): Emitter {
  if (!emitter) {
    const redis = getRedisClient();
    emitter = new Emitter(redis);
  }
  return emitter;
}

export function resetEmitter(): void {
  emitter = null;
}
