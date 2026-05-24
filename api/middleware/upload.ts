import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'image/tiff', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm',
];

const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || './uploads',
  filename: (_req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uuid()}-${safeName}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});
