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

  it('normalizes Atlas Cloud mongodb+srv URIs by removing accidental replicaSet=rs0 and defaulting db path', () => {
    const config = validateEnv({
      MONGODB_URI: 'mongodb+srv://user:pass@cluster0.mongodb.net/nilami?replicaSet=rs0',
    });
    expect(config.MONGODB_URI).toBe('mongodb+srv://user:pass@cluster0.mongodb.net/nilami');

    const rootOnlyConfig = validateEnv({
      MONGODB_URI: 'mongodb+srv://user:pass@cluster0.mongodb.net?retryWrites=true',
    });
    expect(rootOnlyConfig.MONGODB_URI).toBe(
      'mongodb+srv://user:pass@cluster0.mongodb.net/nilami?retryWrites=true',
    );
  });

  it('accepts s3 storage driver and razorpay payment provider configuration', () => {
    const config = validateEnv({
      STORAGE_DRIVER: 's3',
      AWS_REGION: 'ap-south-1',
      AWS_S3_BUCKET: 'nilami-assets',
      PAYMENT_PROVIDER: 'razorpay',
      RAZORPAY_KEY_ID: 'rzp_test_123456',
      RAZORPAY_KEY_SECRET: 'secret_123456',
    });

    expect(config.STORAGE_DRIVER).toBe('s3');
    expect(config.AWS_REGION).toBe('ap-south-1');
    expect(config.PAYMENT_PROVIDER).toBe('razorpay');
    expect(config.RAZORPAY_KEY_ID).toBe('rzp_test_123456');
  });
});

