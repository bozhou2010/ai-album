import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import v1Router from './routes/v1/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './config/logger.js';
import { checkDBHealth } from './config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL?.split(',').map(s => s.trim()).filter(Boolean) || false
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Share-Password'],
  maxAge: 86400,
}));

app.use(helmet());
app.use(compression());
app.use(morgan('dev', {
  skip: (req) => req.path === '/api/server/ping',
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

app.use(express.json());

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const thumbnailDir = process.env.THUMBNAIL_DIR || './thumbnails';
app.use('/uploads', express.static(uploadDir));
app.use('/thumbnails', express.static(thumbnailDir));

app.get('/api/server/ping', (_req, res) => res.send('pong'));
app.get('/api/server/health', async (_req, res) => {
  const dbHealthy = await checkDBHealth();
  res.json({ status: dbHealthy ? 'ok' : 'degraded', database: dbHealthy });
});

app.get('/api/versions', (_req, res) => {
  res.json({ current: 'v1', supported: ['v1'], deprecated: [] });
});

app.use('/api/v1', v1Router);

if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../client');
  app.use(express.static(clientPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
