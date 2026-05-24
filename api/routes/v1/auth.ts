import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { z } from 'zod';
import { pool } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { auth } from '../../middleware/auth.js';
import { passwordResetLimiter } from '../../middleware/rateLimit.js';
import { logger } from '../../config/logger.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

function generateToken(userId: string, email: string, role: string, jti: string): string {
  return jwt.sign({ userId, email, role, jti }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
    algorithm: 'HS256',
  });
}

async function createSession(userId: string, deviceInfo?: string): Promise<string> {
  const jti = uuid();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO sessions (id, user_id, device_info, expires_at) VALUES ($1, $2, $3, $4)',
    [jti, userId, deviceInfo || null, expiresAt]
  );
  return jti;
}

router.post('/register', async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [data.email]);
  if (existing.rowCount! > 0) {
    return res.status(409).json({ statusCode: 409, message: 'Email already registered', error: 'CONFLICT' });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const userCount = await pool.query('SELECT COUNT(*) FROM users');
  const role = Number(userCount.rows[0].count) === 0 ? 'admin' : 'user';

  const result = await pool.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
    [data.email, passwordHash, data.name, role]
  );

  const user = result.rows[0];
  const jti = await createSession(user.id);
  const token = generateToken(user.id, user.email, user.role, jti);

  res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
});

router.post('/login', async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);

  const result = await pool.query('SELECT id, email, name, role, password_hash, otp_enabled FROM users WHERE email = $1', [data.email]);
  if (result.rowCount === 0) {
    return res.status(401).json({ statusCode: 401, message: 'Invalid credentials', error: 'UNAUTHORIZED' });
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(data.password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ statusCode: 401, message: 'Invalid credentials', error: 'UNAUTHORIZED' });
  }

  if (user.otp_enabled) {
    return res.status(200).json({ require2FA: true, tempToken: generateToken(user.id, user.email, user.role, 'pending-2fa') });
  }

  const jti = await createSession(user.id, req.headers['user-agent']);
  const token = generateToken(user.id, user.email, user.role, jti);

  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
});

router.get('/me', auth, async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT id, email, name, role, storage_used, locale, otp_enabled, avatar_path, storage_quota, created_at FROM users WHERE id = $1',
    [req.user!.userId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ statusCode: 404, message: 'User not found', error: 'NOT_FOUND' });
  }

  res.json({ user: result.rows[0] });
});

router.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response) => {
  const data = forgotPasswordSchema.parse(req.body);

  const result = await pool.query('SELECT id, email, name FROM users WHERE email = $1', [data.email]);

  if (result.rowCount! > 0) {
    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 12);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    logger.info({ resetUrl }, 'Password reset URL generated');
  }

  res.json({ message: '如果该邮箱已注册，重置邮件已发送' });
});

router.post('/reset-password', async (req: Request, res: Response) => {
  const data = resetPasswordSchema.parse(req.body);

  const tokens = await pool.query(
    'SELECT id, user_id, token_hash FROM password_reset_tokens WHERE used_at IS NULL AND expires_at > NOW()'
  );

  let matchedToken: any = null;
  for (const row of tokens.rows) {
    const valid = await bcrypt.compare(data.token, row.token_hash);
    if (valid) {
      matchedToken = row;
      break;
    }
  }

  if (!matchedToken) {
    return res.status(400).json({ statusCode: 400, message: '无效或过期的重置链接', error: 'BAD_REQUEST' });
  }

  await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [matchedToken.id]);

  const newPasswordHash = await bcrypt.hash(data.newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, matchedToken.user_id]);
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [matchedToken.user_id]);

  res.json({ success: true });
});

router.post('/change-password', auth, async (req: Request, res: Response) => {
  const data = changePasswordSchema.parse(req.body);

  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user!.userId]);
  const valid = await bcrypt.compare(data.oldPassword, result.rows[0].password_hash);
  if (!valid) {
    return res.status(401).json({ statusCode: 401, message: 'Current password is incorrect', error: 'UNAUTHORIZED' });
  }

  const newHash = await bcrypt.hash(data.newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user!.userId]);
  await pool.query('DELETE FROM sessions WHERE user_id = $1 AND id != $2', [req.user!.userId, req.user!.jti]);

  res.json({ success: true });
});

router.post('/logout-all', auth, async (req: Request, res: Response) => {
  await pool.query('DELETE FROM sessions WHERE user_id = $1 AND id != $2', [req.user!.userId, req.user!.jti]);
  res.json({ success: true });
});

router.get('/sessions', auth, async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT id, device_info, last_used_at, created_at, expires_at FROM sessions WHERE user_id = $1 AND expires_at > NOW() ORDER BY last_used_at DESC',
    [req.user!.userId]
  );
  res.json({ sessions: result.rows });
});

router.delete('/sessions/:id', auth, async (req: Request, res: Response) => {
  await pool.query('DELETE FROM sessions WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.userId]);
  res.json({ success: true });
});

export default router;
