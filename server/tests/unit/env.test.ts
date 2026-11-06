import { describe, it, expect } from 'vitest';
import { validateEnv } from '../../src/config/env.js';

describe('Environment Configuration', () => {
  it('validates default environment successfully', () => {
    const config = validateEnv({
      PORT: '4000',
      CLIENT_URL: 'http://localhost:5173',
      MONGODB_URI: 'mongodb://127.0.0.1:27018/nilami?replicaSet=rs0',
      REDIS_URL: 'redis://127.0.0.1:6380',
    });

    expect(config.PORT).toBe(4000);
    expect(config.CLIENT_URL).toBe('http://localhost:5173');
    expect(config.NODE_ENV).toBe('development');
  });

  it('strictly rejects PORT 5000 (macOS AirPlay Receiver)', () => {
    expect(() => {
      validateEnv({
        PORT: '5000',
      });
    }).toThrow(/PORT cannot be 5000 or 7000/);
  });

  it('strictly rejects PORT 7000 (macOS AirPlay Receiver)', () => {
    expect(() => {
      validateEnv({
        PORT: '7000',
      });
    }).toThrow(/PORT cannot be 5000 or 7000/);
  });
});
