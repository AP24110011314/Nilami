import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import type { StorageProvider, StorageResult } from './storage.interface.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  public async upload(
    fileBuffer: Buffer,
    _filename: string,
    _mimetype: string,
  ): Promise<StorageResult> {
    const id = crypto.randomUUID();
    const finalFilename = `${id}.webp`;
    const targetPath = path.join(this.uploadDir, finalFilename);

    // Re-encode with sharp: normalize orientation, strip EXIF metadata, compress to webp
    const processedBuffer = await sharp(fileBuffer)
      .rotate() // auto-orient based on EXIF before stripping
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    await fs.promises.writeFile(targetPath, processedBuffer);
    logger.info({ filename: finalFilename, size: processedBuffer.length }, 'File saved locally');

    return {
      url: `/uploads/${finalFilename}`,
      publicId: finalFilename,
    };
  }

  public async delete(publicId: string): Promise<void> {
    const targetPath = path.join(this.uploadDir, path.basename(publicId));
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
      logger.info({ publicId }, 'File deleted locally');
    }
  }
}

