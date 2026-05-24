import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../../config/database.js';
import { auth, optionalAuth } from '../../middleware/auth.js';

const router = Router();

const createShareLinkSchema = z.object({
  albumId: z.string().optional(),
  photoId: z.string().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  allowDownload: z.boolean().default(true),
  allowUpload: z.boolean().default(false),
  password: z.string().max(100).optional(),
});

router.post('/links', auth, async (req: Request, res: Response) => {
  const data = createShareLinkSchema.parse(req.body);
  const token = crypto.randomBytes(32).toString('hex');
  let passwordHash = null;
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, 10);
  }

  const result = await pool.query(
    'INSERT INTO share_links (album_id, photo_id, user_id, token, password_hash, expires_at, allow_download, allow_upload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
    [data.albumId || null, data.photoId || null, req.user!.userId, token, passwordHash, data.expiresAt || null, data.allowDownload, data.allowUpload]
  );

  res.status(201).json({ shareLink: result.rows[0] });
});

router.get('/links', auth, async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM share_links WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user!.userId]
  );
  res.json({ shareLinks: result.rows });
});

router.delete('/links/:id', auth, async (req: Request, res: Response) => {
  await pool.query('DELETE FROM share_links WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.userId]);
  res.json({ success: true });
});

router.get('/view/:token', optionalAuth, async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM share_links WHERE token = $1', [req.params.token]);
  if (result.rowCount === 0) return res.status(404).json({ statusCode: 404, message: 'Share link not found', error: 'NOT_FOUND' });

  const shareLink = result.rows[0];
  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return res.status(410).json({ statusCode: 410, message: 'Share link expired', error: 'GONE' });
  }

  if (shareLink.password_hash) {
    const password = req.headers['x-share-password'] as string || req.query.password as string;
    if (!password) return res.status(401).json({ statusCode: 401, message: 'Password required', error: 'PASSWORD_REQUIRED' });
    const valid = await bcrypt.compare(password, shareLink.password_hash);
    if (!valid) return res.status(401).json({ statusCode: 401, message: 'Invalid password', error: 'INVALID_PASSWORD' });
  }

  let photos: any[] = [];
  if (shareLink.album_id) {
    const photosResult = await pool.query(
      `SELECT p.id, p.original_name, p.thumbnail_path, p.mime_type, p.file_type, p.width, p.height, p.taken_at FROM photos p JOIN photo_albums pa ON p.id = pa.photo_id WHERE pa.album_id = $1 AND p.deleted_at IS NULL ORDER BY p.taken_at DESC`,
      [shareLink.album_id]
    );
    photos = photosResult.rows;
  } else if (shareLink.photo_id) {
    const photoResult = await pool.query(
      'SELECT id, original_name, thumbnail_path, mime_type, file_type, width, height, taken_at FROM photos WHERE id = $1 AND deleted_at IS NULL',
      [shareLink.photo_id]
    );
    photos = photoResult.rows;
  }

  res.json({ shareLink: { id: shareLink.id, allowDownload: shareLink.allow_download, allowUpload: shareLink.allow_upload, expiresAt: shareLink.expires_at }, photos });
});

export default router;
