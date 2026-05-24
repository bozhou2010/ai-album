import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/database.js';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  jti: string;
  authType?: 'jwt' | 'api-key';
  keyPermissions?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ statusCode: 401, message: 'Authentication required', error: 'UNAUTHORIZED' });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as AuthUser;

    const sessionResult = await pool.query(
      'SELECT 1 FROM sessions WHERE id = $1 AND expires_at > NOW()',
      [decoded.jti]
    );

    if (sessionResult.rowCount === 0) {
      return res.status(401).json({ statusCode: 401, message: 'Session revoked', error: 'UNAUTHORIZED' });
    }

    await pool.query('UPDATE sessions SET last_used_at = NOW() WHERE id = $1', [decoded.jti]);

    req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role, jti: decoded.jti };
    next();
  } catch {
    return res.status(401).json({ statusCode: 401, message: 'Authentication required', error: 'UNAUTHORIZED' });
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      req.user = undefined;
      return next();
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as AuthUser;

    const sessionResult = await pool.query(
      'SELECT 1 FROM sessions WHERE id = $1 AND expires_at > NOW()',
      [decoded.jti]
    );

    if (sessionResult.rowCount === 0) {
      req.user = undefined;
      return next();
    }

    req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role, jti: decoded.jti };
    next();
  } catch {
    req.user = undefined;
    next();
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ statusCode: 403, message: 'Admin access required', error: 'FORBIDDEN' });
  }
  next();
}

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ statusCode: 401, message: 'API key required', error: 'UNAUTHORIZED' });
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest();
    const result = await pool.query(
      'SELECT * FROM api_keys WHERE key_hash = $1 AND (expires_at IS NULL OR expires_at > NOW())',
      [keyHash.toString('hex')]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ statusCode: 401, message: 'Invalid or expired API key', error: 'UNAUTHORIZED' });
    }

    const apiKeyRecord = result.rows[0];
    await pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [apiKeyRecord.id]);

    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [apiKeyRecord.user_id]);

    req.user = {
      userId: apiKeyRecord.user_id,
      email: userResult.rows[0].email,
      role: 'user',
      jti: '',
      authType: 'api-key',
      keyPermissions: apiKeyRecord.permissions || [],
    };
    next();
  } catch {
    return res.status(401).json({ statusCode: 401, message: 'Invalid API key', error: 'UNAUTHORIZED' });
  }
}
