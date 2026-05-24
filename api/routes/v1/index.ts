import { Router } from 'express';
import authRoutes from './auth.js';
import photoRoutes from './photos.js';
import searchRoutes from './search.js';
import albumRoutes from './albums.js';
import personRoutes from './persons.js';
import tagRoutes from './tags.js';
import shareRoutes from './share.js';
import adminRoutes from './admin.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/photos', photoRoutes);
router.use('/search', searchRoutes);
router.use('/albums', albumRoutes);
router.use('/persons', personRoutes);
router.use('/tags', tagRoutes);
router.use('/share', shareRoutes);
router.use('/admin', adminRoutes);

export default router;
