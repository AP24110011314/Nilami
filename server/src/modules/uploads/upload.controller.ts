import type { Request, Response } from 'express';
import { getStorageProvider, type StorageResult } from '../../lib/storage/index.js';
import { BadRequestError } from '../../lib/errors.js';

export async function uploadImages(req: Request, res: Response): Promise<void> {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    throw new BadRequestError('No image files provided', 'NO_FILES_PROVIDED');
  }

  if (files.length > 6) {
    throw new BadRequestError('Maximum 6 images allowed per upload', 'TOO_MANY_FILES');
  }

  const storage = getStorageProvider();
  const results: StorageResult[] = [];

  for (const file of files) {
    try {
      const result = await storage.upload(file.buffer, file.originalname, file.mimetype);
      results.push(result);
    } catch (error) {
      throw new BadRequestError(
        error instanceof Error ? error.message : 'Invalid image file or processing failed',
        'IMAGE_PROCESSING_FAILED',
      );
    }
  }

  res.status(201).json({ images: results });
}

