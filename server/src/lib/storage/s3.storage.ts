import crypto from 'node:crypto';
import sharp from 'sharp';
import type { StorageProvider, StorageResult } from './storage.interface.js';
import { LocalStorageProvider } from './local.storage.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

function hmacSha256(key: crypto.BinaryLike | crypto.KeyObject, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function encodeS3Key(key: string): string {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export class S3StorageProvider implements StorageProvider {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly publicBaseUrl: string;
  private localFallback: LocalStorageProvider | null = null;

  constructor() {
    this.accessKeyId = env.AWS_ACCESS_KEY_ID.trim();
    this.secretAccessKey = env.AWS_SECRET_ACCESS_KEY.trim();
    this.region = (env.AWS_REGION || 'ap-south-1').trim();
    this.bucket = env.AWS_S3_BUCKET.trim();
    this.endpoint = env.AWS_S3_ENDPOINT.trim();
    this.publicBaseUrl = env.AWS_S3_PUBLIC_URL.trim();
  }

  private isConfigured(): boolean {
    return Boolean(
      this.accessKeyId &&
        this.secretAccessKey &&
        this.bucket &&
        this.bucket !== 'your_bucket_name',
    );
  }

  private getFallback(): LocalStorageProvider {
    if (!this.localFallback) {
      this.localFallback = new LocalStorageProvider();
    }
    return this.localFallback;
  }

  private buildRequestTarget(key: string): { host: string; canonicalUri: string; url: string } {
    const encodedKey = encodeS3Key(key);
    if (this.endpoint) {
      const parsed = new URL(this.endpoint);
      const basePath = parsed.pathname.replace(/\/$/, '');
      const canonicalUri = `${basePath}/${encodeURIComponent(this.bucket)}/${encodedKey}`;
      return {
        host: parsed.host,
        canonicalUri,
        url: `${parsed.origin}${canonicalUri}`,
      };
    }

    const host = `${this.bucket}.s3.${this.region}.amazonaws.com`;
    const canonicalUri = `/${encodedKey}`;
    return {
      host,
      canonicalUri,
      url: `https://${host}${canonicalUri}`,
    };
  }

  private signHeaders(
    method: 'PUT' | 'DELETE',
    key: string,
    payload: Buffer | string,
    contentType?: string,
  ): { url: string; headers: Record<string, string> } {
    const { host, canonicalUri, url } = this.buildRequestTarget(key);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(payload);

    const headerEntries: Array<[string, string]> = [
      ['host', host],
      ['x-amz-content-sha256', payloadHash],
      ['x-amz-date', amzDate],
    ];
    if (contentType) {
      headerEntries.push(['content-type', contentType]);
    }
    headerEntries.sort(([a], [b]) => a.localeCompare(b));

    const canonicalHeaders = headerEntries.map(([k, v]) => `${k}:${v}\n`).join('');
    const signedHeaders = headerEntries.map(([k]) => k).join(';');
    const canonicalRequest = [
      method,
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');

    const kDate = hmacSha256(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = hmacSha256(kDate, this.region);
    const kService = hmacSha256(kRegion, 's3');
    const kSigning = hmacSha256(kService, 'aws4_request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authorization =
      `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      Authorization: authorization,
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    return { url, headers };
  }

  public async upload(
    fileBuffer: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<StorageResult> {
    if (!this.isConfigured()) {
      if (env.NODE_ENV === 'production') {
        throw new Error('AWS S3 storage is selected but AWS_S3_BUCKET/credentials are incomplete');
      }
      logger.warn(
        { bucket: this.bucket || '(unset)' },
        'AWS S3 bucket is placeholder/unconfigured; falling back to local storage in non-production',
      );
      return this.getFallback().upload(fileBuffer, filename, mimetype);
    }

    const processedBuffer = await sharp(fileBuffer)
      .rotate()
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const key = `auctions/${crypto.randomUUID()}.webp`;
    const { url, headers } = this.signHeaders('PUT', key, processedBuffer, 'image/webp');

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: new Uint8Array(processedBuffer),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`S3 upload failed (${response.status}): ${bodyText.slice(0, 200)}`);
      }

      const publicUrl = this.publicBaseUrl
        ? `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`
        : url;

      logger.info({ key, bucket: this.bucket, size: processedBuffer.length }, 'File uploaded to S3');
      return {
        url: publicUrl,
        publicId: key,
      };
    } catch (error) {
      if (env.NODE_ENV === 'production') {
        throw error;
      }
      logger.warn(
        { error: error instanceof Error ? error.message : String(error), bucket: this.bucket },
        'AWS S3 upload failed; falling back to local storage in non-production',
      );
      return this.getFallback().upload(fileBuffer, filename, mimetype);
    }
  }

  public async delete(publicId: string): Promise<void> {
    if (!this.isConfigured() || !publicId.includes('/')) {
      await this.getFallback().delete(publicId);
      return;
    }

    const { url, headers } = this.signHeaders('DELETE', publicId, '');
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok && response.status !== 404) {
      const bodyText = await response.text();
      logger.warn(
        { publicId, status: response.status, body: bodyText.slice(0, 200) },
        'S3 object deletion returned non-OK status',
      );
      return;
    }

    logger.info({ publicId, bucket: this.bucket }, 'File deleted from S3');
  }
}

