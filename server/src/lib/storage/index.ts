import { env } from '../../config/env.js';
import type { StorageProvider } from './storage.interface.js';
import { LocalStorageProvider } from './local.storage.js';
import { CloudinaryStorageProvider } from './cloudinary.storage.js';

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!storageInstance) {
    if (env.STORAGE_DRIVER === 'cloudinary' && env.CLOUDINARY_URL) {
      storageInstance = new CloudinaryStorageProvider();
    } else {
      storageInstance = new LocalStorageProvider();
    }
  }
  return storageInstance;
}

export * from './storage.interface.js';
