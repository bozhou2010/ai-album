import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../../config/database.js';
import { auth } from '../../middleware/auth.js';

const router = Router();

const createTagSchema = z.object({ name: z.string().min(1).max(100) });

router.get('/', auth, async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT t.*, COUNT(pt.photo_id) as photo_count FROM tags t LEFT JOIN photo_tags pt ON t.id = pt.tag_id WHERE t.user_id = $1 GROUP BY t.id ORDER BY t.name',
    [req.user!.userId]
  );
  res.json({ tags: result.rows });
});

router.post('/', auth, async (req: Request, res: Response) => {
  const data = createTagSchema.parse(req.body);
  const result = await pool.query(
    'INSERT INTO tags (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id, name) DO NOTHING RETURNING *',
    [req.user!.userId, data.name]
  );
  if (result.rowCount === 0) return res.status(409).json({ statusCode: 409, message: 'Tag already exists', error: 'CONFLICT' });
  res.status(201).json({ tag: result.rows[0] });
});

router.delete('/:id', auth, async (req: Request, res: Response) => {
  await pool.query('DELETE FROM tags WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.userId]);
  res.json({ success: true });
});

router.post('/:id/photos/:photoId', auth, async (req: Request, res: Response) => {
  await pool.query('INSERT INTO photo_tags (photo_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.photoId, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id/photos/:photoId', auth, async (req: Request, res: Response) => {
  await pool.query('DELETE FROM photo_tags WHERE tag_id = $1 AND photo_id = $2', [req.params.id, req.params.photoId]);
  res.json({ success: true });
});

export default router;
