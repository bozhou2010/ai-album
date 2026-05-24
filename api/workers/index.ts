import dotenv from 'dotenv';
dotenv.config();

import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { pool } from '../config/database.js';

const thumbnailQueue = new Queue('thumbnail-generation', { connection: redis.duplicate() });
const metadataQueue = new Queue('metadata-extraction', { connection: redis.duplicate() });

const thumbnailWorker = new Worker('thumbnail-generation', async (job) => {
  const { photoId, filePath, userId } = job.data;
  logger.info({ photoId }, 'Processing thumbnail');

  try {
    const thumbnailDir = path.join(process.env.THUMBNAIL_DIR || './thumbnails', userId);
    fs.mkdirSync(thumbnailDir, { recursive: true });

    const thumbnailFilename = `${path.basename(filePath, path.extname(filePath))}.webp`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

    await sharp(filePath, { failOn: 'none' })
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);

    await pool.query(
      'UPDATE photos SET thumbnail_path = $1, processing_status = \'thumbnailing\' WHERE id = $2',
      [thumbnailPath, photoId]
    );

    await metadataQueue.add('metadata-extraction', { photoId, filePath, userId, thumbnailPath });
    logger.info({ photoId }, 'Thumbnail generated');
  } catch (err) {
    logger.error({ err, photoId }, 'Thumbnail generation failed');
    await pool.query('UPDATE photos SET processing_status = \'failed\' WHERE id = $1', [photoId]);
    throw err;
  }
}, { connection: redis.duplicate(), concurrency: 4 });

const metadataWorker = new Worker('metadata-extraction', async (job) => {
  const { photoId, filePath } = job.data;
  logger.info({ photoId }, 'Extracting metadata');

  try {
    const exifr = (await import('exifr')).default;
    const metadata = await exifr.parse(filePath, {
      tiff: true,
      exif: true,
      gps: true,
      icc: false,
      iptc: true,
      xmp: true,
    });

    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (metadata?.DateTimeOriginal) {
      updates.push(`taken_at = $${idx++}`);
      params.push(metadata.DateTimeOriginal);
    }
    if (metadata?.width) {
      updates.push(`width = $${idx++}`);
      params.push(metadata.width);
    }
    if (metadata?.height) {
      updates.push(`height = $${idx++}`);
      params.push(metadata.height);
    }
    if (metadata?.latitude) {
      updates.push(`latitude = $${idx++}`);
      params.push(metadata.latitude);
    }
    if (metadata?.longitude) {
      updates.push(`longitude = $${idx++}`);
      params.push(metadata.longitude);
    }
    if (metadata?.duration) {
      updates.push(`duration = $${idx++}`);
      params.push(Math.round(metadata.duration));
    }

    if (updates.length > 0) {
      params.push(photoId);
      await pool.query(`UPDATE photos SET ${updates.join(', ')}, processing_status = 'metadata' WHERE id = $${idx}`, params);
    } else {
      await pool.query('UPDATE photos SET processing_status = \'metadata\' WHERE id = $1', [photoId]);
    }

    logger.info({ photoId }, 'Metadata extracted');
  } catch (err) {
    logger.error({ err, photoId }, 'Metadata extraction failed');
    await pool.query('UPDATE photos SET processing_status = \'failed\' WHERE id = $1', [photoId]);
    throw err;
  }
}, { connection: redis.duplicate(), concurrency: 2 });

export { thumbnailQueue, metadataQueue };

logger.info('Workers started');
