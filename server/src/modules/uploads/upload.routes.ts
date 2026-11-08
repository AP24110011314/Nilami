import { Router, type Request, type Response, type NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import { uploadImages } from './upload.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { BadRequestError } from '../../lib/errors.js';

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 6,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Unsupported file type: ${file.mimetype}. Allowed types: jpeg, png, webp`,
          'INVALID_FILE_TYPE',
        ),
      );
    }
  },
});

function handleUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  upload.array('images', 6)(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new BadRequestError('File size exceeds the 5 MB limit', 'FILE_TOO_LARGE'));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new BadRequestError('Maximum 6 files can be uploaded at once', 'TOO_MANY_FILES'));
        }
        return next(new BadRequestError(`Upload error: ${err.message}`, 'UPLOAD_ERROR'));
      }
      return next(err);
    }
    next();
  });
}

uploadRouter.post(
  '/images',
  requireAuth,
  requireRole('seller', 'admin'),
  handleUploadMiddleware,
  uploadImages,
);

