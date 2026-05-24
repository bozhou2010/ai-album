import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { pool } from '../../config/database.js';
import { auth } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import { uploadLimiter } from '../../middleware/rateLimit.js';
import { logger } from '../../config/logger.js';

const router = Router();

const SORT_COLUMNS: Record<string, string> = {
  takenAt: 'taken_at',
  createdAt: 'created_at',
  originalName: 'original_name',
  fileSize: 'file_size',
};

const SORT_DIRECTIONS: Record<string, string> = { asc: 'ASC', desc: 'DESC' };

const photoListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  isFavorite: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  isArchived: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  takenAfter: z.string().datetime().optional(),
  takenBefore: z.string().datetime().optional(),
  sort: z.enum(['takenAt', 'createdAt', 'originalName', 'fileSize']).default('takenAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  fileType: z.enum(['image', 'video']).optional(),
});

const batchActionSchema = z.object({
  photoIds: z.array(z.string()).min(1).max(500),
  action: z.enum(['favorite', 'archive', 'delete', 'add-to-album']),
  albumId: z.string().optional(),
});

router.get('/', auth, async (req: Request, res: Response) => {
  const query = photoListQuerySchema.parse(req.query);
  const userId = req.user!.userId;

  const conditions = ['p.user_id = $1', 'p.deleted_at IS NULL', 'p.is_archived = false'];
  const params: any[] = [userId];
  let paramIdx = 2;

  if (query.isFavorite !== undefined) {
    conditions.push(`p.is_favorite = $${paramIdx++}`);
    params.push(query.isFavorite);
  }
  if (query.isArchived !== undefined) {
    conditions.push(`p.is_archived = $${paramIdx++}`);
    params.push(query.isArchived);
  }
  if (query.takenAfter) {
    conditions.push(`p.taken_at >= $${paramIdx++}`);
    params.push(query.takenAfter);
  }
  if (query.takenBefore) {
    conditions.push(`p.taken_at <= $${paramIdx++}`);
    params.push(query.takenBefore);
  }
  if (query.fileType) {
    conditions.push(`p.file_type = $${paramIdx++}`);
    params.push(query.fileType);
  }

  const sortCol = SORT_COLUMNS[query.sort] || 'taken_at';
  const sortDir = SORT_DIRECTIONS[query.order] || 'DESC';
  const offset = (query.page - 1) * query.limit;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM photos p WHERE ${conditions.join(' AND ')}`,
    params
  );
  const total = Number(countResult.rows[0].count);

  const photosResult = await pool.query(
    `SELECT p.id, p.original_name, p.thumbnail_path, p.mime_type, p.file_type, p.width, p.height, p.taken_at, p.is_favorite, p.is_archived, p.processing_status FROM photos p WHERE ${conditions.join(' AND ')} ORDER BY p.${sortCol} ${sortDir} LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, query.limit, offset]
  );

  res.json({ photos: photosResult.rows, total, page: query.page, limit: query.limit });
});

router.get('/:id', auth, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await pool.query(
    `SELECT p.*, array_agg(DISTINCT t.id) as tag_ids, array_agg(DISTINCT f.person_id) as person_ids FROM photos p LEFT JOIN photo_tags pt ON p.id = pt.photo_id LEFT JOIN tags t ON pt.tag_id = t.id LEFT JOIN faces f ON f.photo_id = p.id WHERE p.id = $1 AND p.user_id = $2 AND p.deleted_at IS NULL GROUP BY p.id`,
    [req.params.id, userId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ statusCode: 404, message: 'Photo not found', error: 'NOT_FOUND' });
  }

  const photo = result.rows[0];

  const prevResult = await pool.query(
    'SELECT id FROM photos WHERE user_id = $1 AND deleted_at IS NULL AND is_archived = FALSE AND taken_at < $2 ORDER BY taken_at DESC LIMIT 1',
    [userId, photo.taken_at]
  );
  const nextResult = await pool.query(
    'SELECT id FROM photos WHERE user_id = $1 AND deleted_at IS NULL AND is_archived = FALSE AND taken_at > $2 ORDER BY taken_at ASC LIMIT 1',
    [userId, photo.taken_at]
  );

  res.json({ photo, prevPhotoId: prevResult.rows[0]?.id || null, nextPhotoId: nextResult.rows[0]?.id || null });
});

router.post('/upload', auth, uploadLimiter, upload.array('files', 50), async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ statusCode: 400, message: 'No files uploaded', error: 'BAD_REQUEST' });
  }

  const userResult = await pool.query('SELECT storage_quota, storage_used FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  if (user.storage_quota && user.storage_used + totalSize > user.storage_quota) {
    return res.status(413).json({ statusCode: 413, message: 'Storage quota exceeded', error: 'QUOTA_EXCEEDED' });
  }

  const photos: any[] = [];
  const skippedDuplicates: any[] = [];

  for (const file of files) {
    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const existing = await pool.query(
      'SELECT id FROM photos WHERE user_id = $1 AND file_hash = $2 AND deleted_at IS NULL',
      [userId, fileHash]
    );

    if (existing.rowCount! > 0) {
      skippedDuplicates.push({ originalName: file.originalname, existingPhotoId: existing.rows[0].id });
      fs.unlinkSync(file.path);
      continue;
    }

    const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
    const now = new Date();
    const monthDir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const ext = path.extname(file.originalname) || (fileType === 'image' ? '.jpg' : '.mp4');
    const newFilename = `${crypto.randomUUID()}${ext}`;
    const userDir = path.join(process.env.UPLOAD_DIR || './uploads', userId, monthDir);
    fs.mkdirSync(userDir, { recursive: true });
    const newPath = path.join(userDir, newFilename);
    fs.renameSync(file.path, newPath);

    const result = await pool.query(
      `INSERT INTO photos (user_id, filename, original_name, file_path, mime_type, file_type, file_size, file_hash, processing_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
      [userId, newFilename, file.originalname, newPath, file.mimetype, fileType, file.size, fileHash]
    );

    await pool.query('UPDATE users SET storage_used = storage_used + $1 WHERE id = $2', [file.size, userId]);
    photos.push(result.rows[0]);
  }

  res.status(201).json({ photos, skippedDuplicates });
});

router.delete('/:id', auth, async (req: Request, res: Response) => {
  const result = await pool.query(
    'UPDATE photos SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
    [req.params.id, req.user!.userId]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ statusCode: 404, message: 'Photo not found', error: 'NOT_FOUND' });
  }
  res.json({ success: true });
});

router.delete('/:id/permanent', auth, async (req: Request, res: Response) => {
  const photoResult = await pool.query(
    'SELECT file_path, thumbnail_path, file_size FROM photos WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.userId]
  );
  if (photoResult.rowCount === 0) {
    return res.status(404).json({ statusCode: 404, message: 'Photo not found', error: 'NOT_FOUND' });
  }

  const photo = photoResult.rows[0];
  await pool.query('DELETE FROM photos WHERE id = $1', [req.params.id]);

  try { if (photo.file_path) fs.unlinkSync(photo.file_path); } catch {}
  try { if (photo.thumbnail_path) fs.unlinkSync(photo.thumbnail_path); } catch {}

  await pool.query('UPDATE users SET storage_used = GREATEST(0, storage_used - $1) WHERE id = $2', [photo.file_size, req.user!.userId]);
  res.json({ success: true });
});

router.post('/:id/restore', auth, async (req: Request, res: Response) => {
  const result = await pool.query(
    'UPDATE photos SET deleted_at = NULL WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL RETURNING *',
    [req.params.id, req.user!.userId]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ statusCode: 404, message: 'Photo not found', error: 'NOT_FOUND' });
  }
  res.json({ photo: result.rows[0] });
});

router.post('/batch', auth, async (req: Request, res: Response) => {
  const data = batchActionSchema.parse(req.body);
  const userId = req.user!.userId;
  let count = 0;

  switch (data.action) {
    case 'favorite':
      const favResult = await pool.query('UPDATE photos SET is_favorite = true WHERE id = ANY($1) AND user_id = $2', [data.photoIds, userId]);
      count = favResult.rowCount || 0;
      break;
    case 'archive':
      const archResult = await pool.query('UPDATE photos SET is_archived = true WHERE id = ANY($1) AND user_id = $2', [data.photoIds, userId]);
      count = archResult.rowCount || 0;
      break;
    case 'delete':
      const delResult = await pool.query('UPDATE photos SET deleted_at = NOW() WHERE id = ANY($1) AND user_id = $2', [data.photoIds, userId]);
      count = delResult.rowCount || 0;
      break;
    case 'add-to-album':
      if (!data.albumId) return res.status(400).json({ statusCode: 400, message: 'albumId required', error: 'BAD_REQUEST' });
      const values = data.photoIds.map(pid => `('${pid}', '${data.albumId}')`).join(',');
      const albumResult = await pool.query(`INSERT INTO photo_albums (photo_id, album_id) VALUES ${values} ON CONFLICT DO NOTHING`);
      count = albumResult.rowCount || 0;
      break;
  }

  res.json({ success: true, count });
});

router.put('/:id/favorite', auth, async (req: Request, res: Response) => {
  const { isFavorite } = req.body;
  const result = await pool.query('UPDATE photos SET is_favorite = $1 WHERE id = $2 AND user_id = $3 RETURNING *', [isFavorite, req.params.id, req.user!.userId]);
  if (result.rowCount === 0) return res.status(404).json({ statusCode: 404, message: 'Photo not found', error: 'NOT_FOUND' });
  res.json({ photo: result.rows[0] });
});

router.put('/:id/archive', auth, async (req: Request, res: Response) => {
  const { isArchived } = req.body;
  const result = await pool.query('UPDATE photos SET is_archived = $1 WHERE id = $2 AND user_id = $3 RETURNING *', [isArchived, req.params.id, req.user!.userId]);
  if (result.rowCount === 0) return res.status(404).json({ statusCode: 404, message: 'Photo not found', error: 'NOT_FOUND' });
  res.json({ photo: result.rows[0] });
});

router.get('/:id/download', auth, async (req: Request, res: Response) => {
  const result = await pool.query('SELECT file_path, original_name, mime_type FROM photos WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.userId]);
  if (result.rowCount === 0) return res.status(404).json({ statusCode: 404, message: 'Photo not found', error: 'NOT_FOUND' });
  const photo = result.rows[0];
  res.download(photo.file_path, photo.original_name);
});

router.get('/:id/status', auth, async (req: Request, res: Response) => {
  const result = await pool.query('SELECT processing_status FROM photos WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.userId]);
  if (result.rowCount === 0) return res.status(404).json({ statusCode: 404, message: 'Photo not found', error: 'NOT_FOUND' });
  res.json({ photoId: req.params.id, stage: result.rows[0].processing_status, progress: result.rows[0].processing_status === 'completed' ? 100 : 50 });
});

router.get('/favorites/list', auth, async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const result = await pool.query('SELECT * FROM photos WHERE user_id = $1 AND is_favorite = true AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3', [req.user!.userId, limit, offset]);
  const countResult = await pool.query('SELECT COUNT(*) FROM photos WHERE user_id = $1 AND is_favorite = true AND deleted_at IS NULL', [req.user!.userId]);
  res.json({ photos: result.rows, total: Number(countResult.rows[0].count) });
});

router.get('/trash/list', auth, async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const result = await pool.query('SELECT * FROM photos WHERE user_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT $2 OFFSET $3', [req.user!.userId, limit, offset]);
  const countResult = await pool.query('SELECT COUNT(*) FROM photos WHERE user_id = $1 AND deleted_at IS NOT NULL', [req.user!.userId]);
  res.json({ photos: result.rows, total: Number(countResult.rows[0].count) });
});

router.delete('/trash/empty', auth, async (req: Request, res: Response) => {
  const photos = await pool.query('SELECT id, file_path, thumbnail_path, file_size FROM photos WHERE user_id = $1 AND deleted_at IS NOT NULL', [req.user!.userId]);
  let totalSize = 0;
  for (const photo of photos.rows) {
    try { if (photo.file_path) fs.unlinkSync(photo.file_path); } catch {}
    try { if (photo.thumbnail_path) fs.unlinkSync(photo.thumbnail_path); } catch {}
    totalSize += Number(photo.file_size);
  }
  await pool.query('DELETE FROM photos WHERE user_id = $1 AND deleted_at IS NOT NULL', [req.user!.userId]);
  await pool.query('UPDATE users SET storage_used = GREATEST(0, storage_used - $1) WHERE id = $2', [totalSize, req.user!.userId]);
  res.json({ success: true, count: photos.rowCount });
});

export default router;
