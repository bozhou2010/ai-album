import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../../config/database.js';
import { auth, adminOnly } from '../../middleware/auth.js';

const router = Router();

router.use(auth, adminOnly);

router.get('/stats', async (_req: Request, res: Response) => {
  const [photos, videos, users, storage] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM photos WHERE deleted_at IS NULL AND file_type = \'image\''),
    pool.query('SELECT COUNT(*) FROM photos WHERE deleted_at IS NULL AND file_type = \'video\''),
    pool.query('SELECT COUNT(*) FROM users'),
    pool.query('SELECT COALESCE(SUM(storage_used), 0) as total FROM users'),
  ]);

  res.json({
    totalPhotos: Number(photos.rows[0].count),
    totalVideos: Number(videos.rows[0].count),
    totalUsers: Number(users.rows[0].count),
    totalStorage: Number(storage.rows[0].total),
  });
});

router.get('/users', async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const result = await pool.query(
    'SELECT id, email, name, role, storage_used, storage_quota, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  const countResult = await pool.query('SELECT COUNT(*) FROM users');
  res.json({ users: result.rows, total: Number(countResult.rows[0].count) });
});

router.put('/users/:id', async (req: Request, res: Response) => {
  const schema = z.object({ role: z.enum(['user', 'admin']).optional(), storageQuota: z.number().nullable().optional() });
  const data = schema.parse(req.body);
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;
  if (data.role !== undefined) { sets.push(`role = $${idx++}`); params.push(data.role); }
  if (data.storageQuota !== undefined) { sets.push(`storage_quota = $${idx++}`); params.push(data.storageQuota); }
  params.push(req.params.id);
  const result = await pool.query(`UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx++} RETURNING id, email, name, role, storage_quota`, params);
  if (result.rowCount === 0) return res.status(404).json({ statusCode: 404, message: 'User not found', error: 'NOT_FOUND' });
  res.json({ user: result.rows[0] });
});

router.delete('/users/:id', async (req: Request, res: Response) => {
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
