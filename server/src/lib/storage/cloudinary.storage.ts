import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import sharp from 'sharp';
import type { StorageProvider, StorageResult } from './storage.interface.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    if (env.CLOUDINARY_URL) {
      cloudinary.config({
        cloudinary_url: env.CLOUDINARY_URL,
      });
    }
  }

  public async upload(
    fileBuffer: Buffer,
    _filename: string,
    _mimetype: string,
  ): Promise<StorageResult> {
    const processedBuffer = await sharp(fileBuffer)
      .rotate()
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'nilami',
          format: 'webp',
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            logger.error({ error }, 'Cloudinary upload failed');
            reject(error || new Error('Upload failed'));
            return;
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      uploadStream.end(processedBuffer);
    });
  }

  public async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
    logger.info({ publicId }, 'File deleted from Cloudinary');
  }
}

