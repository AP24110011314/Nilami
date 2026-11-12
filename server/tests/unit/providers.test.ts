import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { verifyRazorpaySignature } from '../../src/modules/payments/providers/razorpay.provider.js';
import { S3StorageProvider } from '../../src/lib/storage/s3.storage.js';

describe('Cloud Storage & Razorpay Provider Unit Checks', () => {
  it('verifies valid and rejects invalid Razorpay HMAC-SHA256 signatures', () => {
    const secret = 'rzp_test_secret_24chars00';
    const payload = 'order_test123|pay_test456';
    const validSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    expect(verifyRazorpaySignature(payload, validSig, secret)).toBe(true);
    expect(verifyRazorpaySignature(payload, '0'.repeat(validSig.length), secret)).toBe(false);
    expect(verifyRazorpaySignature(payload, validSig, 'wrong_secret')).toBe(false);
  });

  it('constructs S3 provider safely and falls back in test mode when bucket is placeholder', async () => {
    const s3 = new S3StorageProvider();
    // 1x1 valid PNG pixel buffer
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    const result = await s3.upload(tinyPng, 'pixel.png', 'image/png');
    expect(result.url).toMatch(/^\/uploads\/.+\.webp$/);
    await s3.delete(result.publicId);
  });
});

