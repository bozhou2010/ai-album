import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      statusCode: 400,
      message: 'Validation failed',
      error: 'BAD_REQUEST',
      details: err.flatten(),
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      statusCode: 401,
      message: 'Authentication required',
      error: 'UNAUTHORIZED',
    });
  }

  if (err.name === 'MulterError') {
    const statusCode = (err as any).code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(statusCode).json({
      statusCode,
      message: 'File upload error',
      error: 'UPLOAD_ERROR',
    });
  }

  if ((err as any).statusCode) {
    return res.status((err as any).statusCode).json({
      statusCode: (err as any).statusCode,
      message: err.message,
      error: (err as any).code || 'ERROR',
    });
  }

  logger.error({ err, req: { method: req.method, url: req.url, userId: (req as any).user?.userId } }, 'Request error');

  return res.status(500).json({
    statusCode: 500,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    error: 'INTERNAL_ERROR',
  });
}
