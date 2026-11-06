import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

async function seed() {
  if (env.NODE_ENV === 'production') {
    logger.error('Cannot run seed script in production!');
    process.exit(1);
  }

  logger.info('Seed script placeholder for Phase 2');
  process.exit(0);
}

void seed();
