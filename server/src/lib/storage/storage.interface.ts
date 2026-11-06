export interface StorageResult {
  url: string;
  publicId: string;
}

export interface StorageProvider {
  upload(fileBuffer: Buffer, filename: string, mimetype: string): Promise<StorageResult>;
  delete(publicId: string): Promise<void>;
}

