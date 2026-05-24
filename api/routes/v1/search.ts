import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../../config/database.js';
import { auth } from '../../middleware/auth.js';
import { searchLimiter } from '../../middleware/rateLimit.js';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  mode: z.enum(['smart', 'text', 'ocr', 'semantic', 'face', 'hybrid']).default('smart'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isFavorite: z.enum(['true', 'false']).optional(),
  isArchived: z.enum(['true', 'false']).optional(),
  personId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
});

router.get('/', auth, searchLimiter, async (req: Request, res: Response) => {
  const query = searchQuerySchema.parse(req.query);
  const userId = req.user!.userId;

  await pool.query(
    'INSERT INTO search_history (user_id, query, search_mode, result_count) VALUES ($1, $2, $3, 0)',
    [userId, query.q, query.mode]
  );

  const conditions = ['p.user_id = $1', 'p.deleted_at IS NULL', 'p.is_archived = false'];
  const params: any[] = [userId];
  let paramIdx = 2;

  if (query.mode === 'text' || query.mode === 'smart') {
    conditions.push(`(p.original_name ILIKE $${paramIdx} OR p.location_name ILIKE $${paramIdx})`);
    params.push(`%${query.q}%`);
    paramIdx++;
  }

  if (query.mode === 'ocr' || query.mode === 'smart') {
    conditions.push(`p.ocr_text ILIKE $${paramIdx}`);
    params.push(`%${query.q}%`);
    paramIdx++;
  }

  if (query.personId) {
    conditions.push(`EXISTS (SELECT 1 FROM faces f WHERE f.photo_id = p.id AND f.person_id = $${paramIdx})`);
    params.push(query.personId);
    paramIdx++;
  }

  if (query.tagId) {
    conditions.push(`EXISTS (SELECT 1 FROM photo_tags pt WHERE pt.photo_id = p.id AND pt.tag_id = $${paramIdx})`);
    params.push(query.tagId);
    paramIdx++;
  }

  const result = await pool.query(
    `SELECT p.id, p.original_name, p.thumbnail_path, p.mime_type, p.file_type, p.width, p.height, p.taken_at, p.is_favorite, p.is_archived, p.processing_status, p.ocr_text FROM photos p WHERE ${conditions.join(' OR ')} ORDER BY p.taken_at DESC LIMIT $${paramIdx}`,
    [...params, query.limit]
  );

  const searchResults = result.rows.map(row => ({
    photo: {
      id: row.id,
      originalName: row.original_name,
      thumbnailPath: row.thumbnail_path,
      mimeType: row.mime_type,
      fileType: row.file_type,
      width: row.width,
      height: row.height,
      takenAt: row.taken_at,
      isFavorite: row.is_favorite,
      isArchived: row.is_archived,
      processingStatus: row.processing_status,
    },
    score: 1.0,
    matchType: query.mode === 'smart' ? 'hybrid' : query.mode,
    highlights: row.ocr_text ? [{ field: 'ocr_text', snippet: row.ocr_text.substring(0, 200) }] : [],
  }));

  await pool.query(
    'UPDATE search_history SET result_count = $1 WHERE user_id = $2 AND query = $3 ORDER BY created_at DESC LIMIT 1',
    [searchResults.length, userId, query.q]
  );

  res.json({ results: searchResults, total: searchResults.length, query: query.q, mode: query.mode });
});

router.get('/history', auth, async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const result = await pool.query(
    'SELECT id, query, search_mode, result_count, created_at FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [req.user!.userId, limit]
  );
  res.json({ history: result.rows });
});

router.delete('/history', auth, async (req: Request, res: Response) => {
  await pool.query('DELETE FROM search_history WHERE user_id = $1', [req.user!.userId]);
  res.json({ success: true });
});

export default router;
