import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../../config/database.js';
import { auth } from '../../middleware/auth.js';

const router = Router();

const updatePersonSchema = z.object({
  name: z.string().max(100).optional(),
  isHidden: z.boolean().optional(),
  birthDate: z.string().nullable().optional(),
});

const mergePersonsSchema = z.object({
  sourceIds: z.array(z.string()).min(1),
  targetId: z.string(),
});

router.get('/', auth, async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM persons WHERE user_id = $1 AND is_hidden = false ORDER BY face_count DESC',
    [req.user!.userId]
  );
  res.json({ persons: result.rows });
});

router.get('/:id', auth, async (req: Request, res: Response) => {
  const personResult = await pool.query('SELECT * FROM persons WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.userId]);
  if (personResult.rowCount === 0) return res.status(404).json({ statusCode: 404, message: 'Person not found', error: 'NOT_FOUND' });

  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const photosResult = await pool.query(
    `SELECT p.* FROM photos p JOIN faces f ON f.photo_id = p.id WHERE f.person_id = $1 AND p.user_id = $2 AND p.deleted_at IS NULL ORDER BY p.taken_at DESC LIMIT $3`,
    [req.params.id, req.user!.userId, limit]
  );

  res.json({ person: personResult.rows[0], photos: photosResult.rows });
});

router.put('/:id', auth, async (req: Request, res: Response) => {
  const data = updatePersonSchema.parse(req.body);
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name); }
  if (data.isHidden !== undefined) { sets.push(`is_hidden = $${idx++}`); params.push(data.isHidden); }
  if (data.birthDate !== undefined) { sets.push(`birth_date = $${idx++}`); params.push(data.birthDate); }

  params.push(req.params.id, req.user!.userId);
  const result = await pool.query(`UPDATE persons SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx++} AND user_id = $${idx++} RETURNING *`, params);
  if (result.rowCount === 0) return res.status(404).json({ statusCode: 404, message: 'Person not found', error: 'NOT_FOUND' });
  res.json({ person: result.rows[0] });
});

router.post('/merge', auth, async (req: Request, res: Response) => {
  const data = mergePersonsSchema.parse(req.body);
  for (const sourceId of data.sourceIds) {
    await pool.query('UPDATE faces SET person_id = $1 WHERE person_id = $2', [data.targetId, sourceId]);
    await pool.query('DELETE FROM persons WHERE id = $1', [sourceId]);
  }
  const targetResult = await pool.query('SELECT COUNT(*) as face_count FROM faces WHERE person_id = $1', [data.targetId]);
  await pool.query('UPDATE persons SET face_count = $1 WHERE id = $2', [targetResult.rows[0].face_count, data.targetId]);
  res.json({ success: true });
});

export default router;
