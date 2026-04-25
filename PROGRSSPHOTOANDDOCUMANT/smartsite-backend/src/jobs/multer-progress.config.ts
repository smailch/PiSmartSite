import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

export const PROGRESS_UPLOAD_DIR = join(process.cwd(), 'uploads', 'progress');

export const progressFileStorage = diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PROGRESS_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`);
  },
});

export const progressMulterOptions = {
  storage: progressFileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image files are allowed'), false);
  },
};
