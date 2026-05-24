import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../../config/database.js';
import { auth } from '../../middleware/auth.js';

const router = Router();

const createAlbumSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});

const updateAlbumSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  coverId: z.string().optional(),
});

const addPhotosSchema = z.object({
  photoIds: z.array(z.string()).min(1).max(500),
});

router.get('/', auth, async (req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT a.*, COUNT(pa.photo_id) as photo_count, (SELECT p.thumbnail_path FROM photos p JOIN photo_albums pa2 ON p.id = pa2.photo_id WHERE pa2.album_id = a.id LIMIT 1) as cover_path FROM albums a LEFT JOIN photo_albums pa ON a.id = pa.album_id WHERE a.user_id = $1 GROUP BY a.id ORDER BY a.created_at DESC`,
    [req.user!.userId]
  );
  res.json({ albums: result.rows });
});

router.post('/', auth, async (req: Request, res: Response) => {
  const data = createAlbumSchema.parse(req.body);
  const result = await pool.query(
    'INSERT INTO albums (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
    [req.user!.userId, data.name, data.description || null]
  );
  res.status(201).json({ album: result.rows[0] });
});

router.get('/:id', auth, async (req: Request, res: Response) => {
  const albumResult = await pool.query('SELECT * FROM albums WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.userId]);
  if (albumResult.rowCount === 0) return res.status(404).json({ statusCode: 404, message: 'Album not found', error: 'NOT_FOUND' });

  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const photosResult = await pool.query(
    `SELECT p.* FROM photos p JOIN photo_albums pa ON p.id = pa.photo_id WHERE pa.album_id = $1 AND p.deleted_at IS NULL ORDER BY p.taken_at DESC LIMIT $2 OFFSET $3`,
    [req.params.id, limit, offset]
  );

  res.json({ album: albumResult.rows[0], photos: photosResult.rows });
});

router.put('/:id', auth, async (req: Request, res: Response) => {
  const data = updateAlbumSchema.parse(req.body);
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name); }
  if (data.description !== undefined) { sets.push(`description = $${idx++}`); params.push(data.description); }

  if (sets.length === 0) return res.status(400).json({ statusCode: 400, message: 'No fields to update', error: 'BAD_REQUEST' });

  params.push(req.params.id, req.user!.userId);
  const result = await pool.query(`UPDATE albums SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx++} AND user_id = $${idx++} RETURNING *`, params);
  if (result.rowCount === 0) return res.status(404).json({ statusCode: 404, message: 'Album not found', error: 'NOT_FOUND' });
  res.json({ album: result.rows[0] });
});

router.delete('/:id', auth, async (req: Request, res: Response) => {
  const result = await pool.query('DELETE FROM albums WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.userId]);
  if (result.rowCount === 0) return res.status(404).json({ statusCode: 404, message: 'Album not found', error: 'NOT_FOUND' });
  res.json({ success: true });
});

router.post('/:id/photos', auth, async (req: Request, res: Response) => {
  const data = addPhotosSchema.parse(req.body);
  const values = data.photoIds.map(pid => `('${pid}', '${req.params.id}')`).join(',');
  await pool.query(`INSERT INTO photo_albums (photo_id, album_id) VALUES ${values} ON CONFLICT DO NOTHING`);
  res.json({ success: true });
});

router.delete('/:id/photos/:photoId', auth, async (req: Request, res: Response) => {
  await pool.query('DELETE FROM photo_albums WHERE album_id = $1 AND photo_id = $2', [req.params.id, req.params.photoId]);
  res.json({ success: true });
});

export default router;
