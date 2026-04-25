import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync, existsSync } from 'fs';

export const HUMAN_UPLOAD_DIR = join(process.cwd(), 'uploads', 'humans');

function ensureDir() {
  if (!existsSync(HUMAN_UPLOAD_DIR)) {
    mkdirSync(HUMAN_UPLOAD_DIR, { recursive: true });
  }
}

export const humanMulterStorage = diskStorage({
  destination: (_req, _file, cb) => {
    ensureDir();
    cb(null, HUMAN_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`);
  },
});

const CV_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const humanMulterOptions = {
  storage: humanMulterStorage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (file.fieldname === 'image') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
        return;
      }
      cb(new Error('La photo doit être une image'), false);
      return;
    }
    if (file.fieldname === 'cv') {
      if (CV_MIMES.has(file.mimetype)) {
        cb(null, true);
        return;
      }
      cb(new Error('Le CV doit être PDF ou Word (.doc, .docx)'), false);
      return;
    }
    cb(new Error('Fichier non supporté'), false);
  },
};
