
# AI相册APP 实施规格文档

> 本文档目标：消除所有开发决策点，使AI能够完全自主地按文档实现完整产品。

## 1. Development Environment

### 1.1 Prerequisites
- Node.js 20.x LTS
- npm 10.x
- Docker + Docker Compose (用于本地PostgreSQL和Redis)

### 1.2 package.json
```json
{
  "name": "ai-album",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:client": "vite",
    "dev:server": "tsx watch api/index.ts",
    "dev:worker": "tsx watch api/workers/index.ts",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "tsc -p tsconfig.server.json",
    "start": "node dist/api/index.js",
    "start:worker": "node dist/api/workers/index.js",
    "migrate": "tsx api/migrate.ts",
    "check": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "helmet": "^8.0.0",
    "multer": "^1.4.5-lts.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "pg": "^8.13.0",
    "bullmq": "^5.34.0",
    "ioredis": "^5.4.1",
    "sharp": "^0.33.2",
    "exifr": "^7.1.3",
    "uuid": "^10.0.0",
    "zod": "^3.23.8",
    "dotenv": "^16.4.5",
    "morgan": "^1.10.0",
    "compression": "^1.7.4",
    "nodemailer": "^6.9.16",
    "express-rate-limit": "^7.4.1",
    "chokidar": "^4.0.1",
    "fluent-ffmpeg": "^2.1.3",
    "archiver": "^7.0.1",
    "prom-client": "^15.1.3",
    "cockatiel": "^3.2.1",
    "node-pg-migrate": "^7.7.0",
    "otpauth": "^9.3.6",
    "pino": "^9.5.0",
    "pino-pretty": "^12.1.0",
    "fast-xml-parser": "^4.5.1",
    "stripe": "^17.0.0",
    "handlebars": "^4.7.8",
    "react-i18next": "^15.1.0",
    "i18next": "^24.2.0",
    "i18next-browser-languagedetector": "^8.0.2",
    "blurhash": "^2.0.5",
    "react-blurhash": "^0.3.0",
    "leaflet": "^1.9.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "zustand": "^5.0.0",
    "axios": "^1.7.7",
    "lucide-react": "^0.460.0",
    "react-hot-toast": "^2.4.1",
    "date-fns": "^4.1.0",
    "@tanstack/react-virtual": "^3.10.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.17",
    "@types/multer": "^1.4.12",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/bcryptjs": "^2.4.6",
    "@types/pg": "^8.11.10",
    "@types/uuid": "^10.0.0",
    "@types/morgan": "^1.9.9",
    "@types/compression": "^1.7.5",
    "@types/nodemailer": "^6.4.16",
    "@types/fluent-ffmpeg": "^2.1.27",
    "@types/archiver": "^6.0.2",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/leaflet": "^1.9.14",
    "@vitejs/plugin-react": "^4.3.3",
    "vite": "^5.4.10",
    "typescript": "^5.6.3",
    "tailwindcss": "^3.4.14",
    "postcss": "^8.4.47",
    "autoprefixer": "^10.4.20",
    "tsx": "^4.19.2",
    "concurrently": "^9.1.0",
    "vitest": "^2.1.5",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.2",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.6.3",
    "eslint": "^9.15.0"
  }
}
```

### 1.3 tsconfig.json (Frontend)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["src", "shared"]
}
```

### 1.4 tsconfig.server.json (Backend)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["api", "shared"],
  "exclude": ["node_modules", "dist", "src"]
}
```

### 1.5 vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/thumbnails': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
  },
  // PWA: 将public/目录下的manifest.json和sw.js原样复制
  // icons目录: public/icons/icon-192.png, public/icons/icon-512.png
});
```

### 1.6 tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#4361ee',
          600: '#3b52cc',
          700: '#3730a3',
          800: '#312e81',
          900: '#1a1a2e',
          950: '#101014',
        },
        accent: {
          400: '#f472b6',
          500: '#f72585',
          600: '#e01f78',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          700: '#1e1e2e',
          800: '#181825',
          900: '#11111b',
          950: '#0a0a0f',
        },
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
```

### 1.7 postcss.config.js
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 1.8 .env (Development)
```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://aialbum:aialbum@localhost:5432/aialbum
REDIS_URL=redis://localhost:6379

JWT_SECRET=dev-secret-key-not-for-production
JWT_EXPIRES_IN=7d

UPLOAD_DIR=./uploads
THUMBNAIL_DIR=./thumbnails
MAX_FILE_SIZE=200mb

ML_SERVICE_URL=http://localhost:3001
ML_BATCH_SIZE=16

STORAGE_TYPE=local
# STORAGE_TYPE=s3  # Phase 4: 启用S3存储
# S3_ENDPOINT=
# S3_BUCKET=
# S3_ACCESS_KEY=
# S3_SECRET_KEY=
# S3_REGION=

OCR_LANGUAGES=chi_sim+eng
CLIP_MODEL=XLM-Roberta-Large-Vit-B-16Plus
FACE_MODEL=buffalo_l

ADMIN_EMAIL=admin@aialbum.com

FRONTEND_URL=http://localhost:5173

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@aialbum.com

TRASH_RETENTION_DAYS=30
```

### 1.9 vite-env.d.ts
```typescript
/// <reference types="vite/client" />
```

### 1.10 docker-compose.dev.yml (本地开发)
```yaml
name: ai-album-dev

services:
  postgres:
    image: pgvector/pgvector:pg15
    container_name: ai-album-dev-postgres
    environment:
      POSTGRES_DB: aialbum
      POSTGRES_USER: aialbum
      POSTGRES_PASSWORD: aialbum
    ports:
      - "5432:5432"
    volumes:
      - pgdata-dev:/var/lib/postgresql/data
    command: >
      postgres
      -c shared_buffers=128MB
      -c effective_cache_size=384MB
      -c work_mem=8MB
      -c random_page_cost=1.1
    restart: unless-stopped

  valkey:
    image: valkey/valkey:9-alpine
    container_name: ai-album-dev-valkey
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  pgdata-dev:
```

## 2. Backend Implementation Spec

### 2.1 Express App Setup (api/index.ts)
```typescript
// 执行顺序:
// 1. dotenv.config()
// 2. app.use(cors({
//      origin: process.env.NODE_ENV === 'production'
//        ? process.env.FRONTEND_URL?.split(',').map(s => s.trim()).filter(Boolean) || false
//        : 'http://localhost:5173',
//      credentials: true,
//      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Share-Password'],
//      maxAge: 86400
//    }))
//    安全: 生产环境origin严格限制为FRONTEND_URL配置的域名列表, 不使用'*'
//    开发环境允许localhost:5173(Vite dev server)
// 3. app.use(helmet())
// 4. app.use(compression())
// 5. app.use(morgan('dev', {
//      skip: (req) => req.path === '/api/server/ping',
//      stream: { write: (msg) => logger.info(msg.trim()) }
//    }))
//    安全: morgan仅记录请求方法/URL/状态码/响应时间, 不记录请求体(含密码/token)
//    健康检查端点跳过日志避免刷屏
// 6. app.use(express.json())
// 7. 静态文件: app.use('/uploads', express.static(UPLOAD_DIR))
// 8. 静态文件: app.use('/thumbnails', express.static(THUMBNAIL_DIR))
// 9. 前端静态文件: app.use(express.static(path.join(__dirname, '../public')))
//    SPA fallback: app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')))
//    注意: 仅对非/api路径应用SPA fallback
// 9. SSE端点: app.use('/api/events', eventsRouter) (需认证)
// 10. API路由注册 (api/routes/index.ts):
//     import { Router } from 'express'
//     const router = Router()
//     router.use('/auth', authRouter)                    // 公开: login/register + 认证: forgot-password/reset-password + oauth
//     router.use('/photos', authMiddleware, photosRouter) // 需认证
//     router.use('/persons', authMiddleware, personsRouter)
//     router.use('/albums', authMiddleware, albumsRouter)
//     router.use('/tags', authMiddleware, tagsRouter)
//     router.use('/search', authMiddleware, searchRouter)
//     router.use('/share-links', authMiddleware, shareRouter)
//     router.use('/partners', authMiddleware, partnersRouter)
//     router.use('/libraries', authMiddleware, adminOnly, librariesRouter) // 需Admin
//     router.use('/stacks', authMiddleware, stacksRouter)
//     router.use('/import', authMiddleware, importRouter)
//     router.use('/api-keys', authMiddleware, apiKeysRouter)
//     router.use('/admin', authMiddleware, adminOnly, adminRouter)         // 需Admin
//     router.use('/settings', authMiddleware, settingsRouter)
//     router.use('/monitoring', authMiddleware, adminOnly, monitoringRouter) // 需Admin
//     router.use('/smart-albums', authMiddleware, smartAlbumsRouter)
//     router.use('/year-in-review', authMiddleware, yearInReviewRouter)
//     router.use('/duplicates', authMiddleware, duplicatesRouter)
//     router.use('/shared-libraries', authMiddleware, sharedLibrariesRouter)
//     router.use('/activity-logs', authMiddleware, activityLogsRouter)
//     router.use('/data-export', authMiddleware, dataExportRouter)
//     router.use('/photos', authMiddleware, pickScoreRouter)   // P2: /photos/picks, /photos/:id/pick-score
//     router.use('/migration', authMiddleware, adminOnly, migrationRouter) // P2: immich迁移
//     router.use('/sessions', authMiddleware, sessionsRouter) // 会话管理
//     router.use('/notifications', authMiddleware, notificationsRouter) // 通知
//     router.use('/activities', authMiddleware, activitiesRouter) // 相册活动/评论
//     router.use('/server', serverInfoRouter) // ping公开, info需认证, stats/version/check需admin
//     router.use('/subscriptions', authMiddleware, subscriptionsRouter) // Phase5: plans公开(单独注册), 其余需认证
//     router.get('/subscriptions/plans', subscriptionsPlansHandler) // Phase5: 计划列表(公开,无需认证)
//     router.post('/subscriptions/webhook', webhookHandler) // Phase5: Stripe Webhook(无需认证,验签保护)
//     router.use('/branding', brandingRouter) // Phase5: GET公开, PUT/POST需admin(路由内部校验)
//     router.use('/admin/tenants', authMiddleware, adminOnly, tenantsRouter) // Phase5: 租户管理
//     router.use('/admin/feedback', authMiddleware, adminOnly, feedbackAdminRouter) // Phase5: 反馈管理
//     router.use('/invitations', authMiddleware, invitationsRouter) // Phase5: 邀请奖励
//     router.use('/feedback', feedbackRouter) // Phase5: 反馈提交(限流保护, 可选认证)
//     router.use('/setup', setupRouter)  // 公开: 仅未配置时可访问(首次安装后自动禁用)
//     export default router
//     app.use('/api', router)
// 11. SPA fallback:
//     生产模式: if (req.accepts('html') && req.method === 'GET' && !req.path.startsWith('/api'))
//       res.sendFile(path.join(__dirname, '../client/index.html'))
//     开发模式: 不需要SPA fallback (vite dev server处理)
// 12. 错误处理中间件 (最后)
// 13. 监听 PORT
//
// 外部库文件服务:
//   照片下载端点 /api/photos/:id/download 使用 res.sendFile(photo.file_path)
//   可直接发送外部库路径的文件，无需额外静态路由
//   缩略图始终存储在THUMBNAIL_DIR，通过 /thumbnails/ 静态路由提供
```

### 2.2 Database Connection (api/config/database.ts)
```typescript
// 使用 pg 库的 Pool 连接池
// Pool配置 (详见arch.md 9.1):
//   connectionString: process.env.DATABASE_URL
//   max: Number(process.env.DB_POOL_MAX) || 15  // 最大连接数, 可配置
//   min: 2                         // 最小空闲连接数
//   idleTimeoutMillis: 30000       // 空闲连接超时30秒
//   connectionTimeoutMillis: 5000  // 连接超时5秒
//   maxUses: 7500                  // 单连接最大使用次数后回收
//   allowExitOnIdle: false

// 导出 pool 实例 (直接使用pool.query/pool.connect)
// 导出 queryWithRetry(text, params) - 带重试的查询(详见arch.md 11.4)
// 导出 getClient() => Promise<PoolClient> (用于事务)
// 导出 checkDBHealth() => Promise<boolean> (健康检查)

// pgvector类型注册 (必须在Pool创建后执行):
//   import { types } from 'pg'
//   const VECTOR_TYPE_ID = 11449 // PostgreSQL vector类型的OID
//   types.setTypeParser(VECTOR_TYPE_ID, (val) => JSON.parse(val))
//   注意: 实际OID可能因安装而异，可通过以下SQL查询:
//     SELECT oid FROM pg_type WHERE typname = 'vector'
//   写入向量时使用: $1::vector 格式
//   读取向量时: pg返回字符串如"[0.1,0.2,...]"，需JSON.parse转为数组
```

### 2.3 Redis Connection (api/config/redis.ts)
```typescript
// 使用 ioredis (详见arch.md 9.2)
// new Redis(process.env.REDIS_URL, {
//   maxRetriesPerRequest: 3,
//   retryStrategy(times) { return Math.min(times * 200, 5000); },
//   reconnectOnError(err) { return err.message.includes('READONLY'); },
//   enableReadyCheck: true,
//   lazyConnect: true,
// })
// 导出 redis 实例
// 导出 publishSSE(userId, event, data) - SSE跨容器通信
```

### 2.4 Auth Middleware (api/middleware/auth.ts)
```typescript
// auth(req, res, next):
//   1. 从 req.headers.authorization 提取 Bearer token
//      或从 req.headers['x-api-key'] 提取API Key (见apiKeyAuth)
//   2. jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
//      注意: 必须指定algorithms防止算法混淆攻击(如none算法或RS256公钥攻击)
//   3. 验证失败返回 401
//   4. 成功: 解码得到 { userId, email, role, jti }
//   5. 验证session存在: SELECT 1 FROM sessions WHERE id = decoded.jti AND expires_at > NOW()
//      不存在 -> 401 "Session已撤销"
//   6. UPDATE sessions SET last_used_at = NOW() WHERE id = decoded.jti (可选: 滑动过期)
//   7. req.user = { userId, email, role, jti: decoded.jti }
//   8. next()
//
// JWT Payload:
//   { userId: string, email: string, role: 'user'|'admin', jti: string }
//   jti: session ID (UUID), 用于会话撤销和单设备登出
//   JWT签名算法: HS256 (对称密钥, JWT_SECRET至少32字节随机)
//   JWT过期: 7天 (可配置JWT_EXPIRES_IN)
//
// 批量失效(退出所有设备): DELETE FROM sessions WHERE user_id = $1 AND id != $2
// 单设备登出: DELETE FROM sessions WHERE id = $1

// optionalAuth(req, res, next):
//   同上，但token不存在时不报错，req.user = null

// adminOnly(req, res, next):
//   在auth之后使用
//   req.user.role !== 'admin' 返回 403

// apiKeyAuth(req, res, next):
//   1. 从 req.headers['x-api-key'] 提取API Key
//   2. hash key: crypto.createHash('sha256').update(key).digest()
//   3. SELECT * FROM api_keys WHERE key_hash = $1 AND (expires_at IS NULL OR expires_at > NOW())
//   4. 未找到或已过期 -> 401
//   5. UPDATE api_keys SET last_used_at = NOW() WHERE id = $1
//   6. req.user = { userId: api_key.user_id, role: 'user', authType: 'api-key', keyPermissions: api_key.permissions }
//   7. next()
// 安全: API Key不具备admin权限, 且受permissions字段限制可访问的API范围
```

### 2.5 Upload Middleware (api/middleware/upload.ts)
```typescript
// 使用 multer
// storage: multer.diskStorage({
//   destination: UPLOAD_DIR,
//   filename: (req, file, cb) => {
//     const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')
//     cb(null, `${uuid()}-${safeName}`)
//   }
// })
// limits: { fileSize: 200 * 1024 * 1024 }  // 200MB
// fileFilter: 允许 image/jpeg, image/png, image/webp, image/heic, image/heif,
//                     image/tiff, image/gif, video/mp4, video/quicktime, video/webm
// 安全: path.basename防止路径遍历, 文件名过滤防止特殊字符注入
// 导出: upload.array('files', 50)  // 最多50个文件
```

**文件命名规则和目录结构:**
```
上传目录 (UPLOAD_DIR):
  {UPLOAD_DIR}/
    {userId}/
      {yyyy-MM}/
        {uuid}.{ext}
  示例: /uploads/abc123/2024-01/550e8400-e29b-41d4-a716-446655440000.jpg

缩略图目录 (THUMBNAIL_DIR):
  {THUMBNAIL_DIR}/
    {userId}/
      {yyyy-MM}/
        {uuid}.webp
  示例: /thumbnails/abc123/2024-01/550e8400-e29b-41d4-a716-446655440000.webp

编辑版本目录:
  {UPLOAD_DIR}/
    {userId}/
      {yyyy-MM}/
        {uuid}_v{versionNumber}.{ext}
  示例: /uploads/abc123/2024-01/550e8400-e29b-41d4-a716-446655440000_v2.jpg

命名规则:
  - UUID使用crypto.randomUUID()生成
  - 扩展名保留原始扩展名(jpg/png/webp/heic/mp4/mov等)
  - HEIC/HEIF上传后转换为JPEG存储，缩略图统一使用WebP格式
  - 视频缩略图: 使用ffmpeg截取第1帧，生成WebP缩略图
  - 文件路径存入photos.file_path和photos.thumbnail_path
  - 目录按userId和月份组织，避免单目录文件过多

上传处理流程:
  1. multer接收文件 → 保存到临时目录
  2. 计算SHA-256: crypto.createHash('sha256').update(buffer).digest('hex')
  3. 检查重复: SELECT id FROM photos WHERE user_id = $1 AND file_hash = $2 AND deleted_at IS NULL
  4. 重复则跳过，返回已有照片信息
  5. 不重复则:
     a. 确定目标目录: {UPLOAD_DIR}/{userId}/{yyyy-MM}/
     b. 生成文件名: {uuid}.{ext}
     c. 移动文件到目标路径
     d. INSERT INTO photos (user_id, filename, original_name, file_path, mime_type, file_type, file_size, file_hash, ...)
     e. 设置processing_status = 'pending'
     f. 添加thumbnail-generation BullMQ job
     g. 返回照片信息
```

### 2.6 Error Handler Middleware (api/middleware/errorHandler.ts)
```typescript
// (err, req, res, next):
//   if (err instanceof ZodError) -> 400, { statusCode: 400, message: 'Validation failed', error: 'BAD_REQUEST', details: err.flatten() }
//   if (err.name === 'UnauthorizedError') -> 401, { statusCode: 401, message: 'Authentication required', error: 'UNAUTHORIZED' }
//   if (err.name === 'MulterError') -> 400/413, { statusCode: 400/413, message: 'File upload error', error: 'UPLOAD_ERROR' }
//   if (err.statusCode) -> 使用err.statusCode, { statusCode, message: err.message, error: err.code || 'ERROR' }
//   else -> 500, { statusCode: 500, message: 'Internal server error', error: 'INTERNAL_ERROR' }
//
// 安全规则(防止信息泄露):
//   1. 生产环境(NODE_ENV=production)绝不暴露堆栈跟踪(err.stack)
//   2. 绝不在响应中暴露SQL查询语句、数据库错误详情、文件路径
//   3. 数据库错误(PG error)统一返回 'Internal server error', 不暴露表名/列名/约束名
//   4. 未知错误记录到日志(logger.error), 但只返回通用500给客户端
//   5. 开发环境(NODE_ENV=development)可返回err.message辅助调试, 但不返回stack
//
// 日志记录:
//   logger.error({ err, req: { method: req.method, url: req.url, userId: req.user?.userId } }, 'Request error')
//   不记录请求体中的密码、token等敏感字段
```

### 2.6.1 Rate Limit Middleware (api/middleware/rateLimit.ts)
```typescript
// 使用 express-rate-limit
// 
// 通用API限流:
//   rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false })
//
// 上传接口限流:
//   rateLimit({ windowMs: 60 * 1000, max: 10 })
//
// 搜索接口限流:
//   rateLimit({ windowMs: 60 * 1000, max: 30 })
//
// 密码重置限流:
//   rateLimit({ windowMs: 15 * 60 * 1000, max: 3 })  // 15分钟3次
//
// 应用位置: 各路由文件中按需使用
```

### 2.6.2 Plan Limits Middleware (api/middleware/planLimits.ts) (Phase 5)
```typescript
// AI功能配额检查中间件
//
// const PLAN_LIMITS: Record<string, PlanLimits> = {
//   free:    { ocrLangs: ['en'], clipMax: 1000, faceCluster: false, faceMax: 0, apiCalls: 1000 },
//   basic:   { ocrLangs: ['ch','en','ja'], clipMax: -1, faceCluster: true, faceMax: 5, apiCalls: 10000 },
//   pro:     { ocrLangs: '*', clipMax: -1, faceCluster: true, faceMax: -1, apiCalls: 50000 },
//   enterprise: { ocrLangs: '*', clipMax: -1, faceCluster: true, faceMax: -1, apiCalls: -1 },
// }
//
// async function planLimits(req: Request, res: Response, next: NextFunction):
//   1. 获取当前用户: req.user
//   2. 查询活跃订阅:
//      SELECT s.*, sp.name as plan_name FROM subscriptions s
//      JOIN subscription_plans sp ON s.plan_id = sp.id
//      WHERE s.user_id = $1 AND s.status IN ('active', 'trialing')
//   3. 确定计划: subscription?.plan_name || 'free'
//   4. 获取限制: PLAN_LIMITS[plan]
//   5. 检查具体功能:
//      a. OCR: 检查ocrLangs是否包含请求的语言
//      b. CLIP: 检查用户已处理照片数 < clipMax (clipMax=-1表示无限)
//      c. Face Cluster: 检查faceCluster是否为true
//      d. API Calls: 检查本月API调用次数 < apiCalls
//   6. 超限 -> 403 { message: 'Plan limit exceeded', error: 'PLAN_LIMIT', limit, current, plan }
//   7. 通过 -> next()
//
// 使用方式:
//   router.post('/photos/upload', authMiddleware, planLimits, uploadHandler)
//   router.post('/search/semantic', authMiddleware, planLimits, searchHandler)
//   router.post('/persons/cluster', authMiddleware, planLimits, clusterHandler)
//
// API调用计数:
//   每次API调用时: INCR api_calls:{userId}:{yyyyMM} EX 2592000 (30天过期)
//   检查时: GET api_calls:{userId}:{yyyyMM}
```

### 2.6.3 Tenant Isolation Middleware (api/middleware/tenantIsolation.ts) (Phase 5)
```typescript
// 多租户隔离中间件
//
// async function tenantIsolation(req: Request, res: Response, next: NextFunction):
//   1. 从请求域名获取租户: const domain = req.hostname
//   2. 查询租户: SELECT id, plan_id, settings FROM tenants WHERE domain = $1 AND deleted_at IS NULL
//   3. 无租户:
//      a. 如果是默认域名(DEFAULT_DOMAIN): 跳过租户隔离, next()
//      b. 非默认域名: 404 { message: 'Tenant not found' }
//   4. 找到租户:
//      a. req.tenantId = tenant.id
//      b. req.tenantSettings = tenant.settings
//      c. next()
//
// 数据查询自动注入租户条件:
//   在BaseRepository中自动添加 WHERE tenant_id = $1:
//   class BaseRepository {
//     protected addTenantFilter(query: string, params: any[]): [string, any[]] {
//       if (this.tenantId) {
//         query = query.replace('WHERE', `WHERE tenant_id = $${params.length + 1} AND`)
//         params.push(this.tenantId)
//       }
//       return [query, params]
//     }
//   }
//
// 租户缓存:
//   Redis缓存: SET tenant:domain:{domain} {id,plan_id,settings} EX 3600
//   品牌变更时清除缓存: DEL tenant:domain:{domain}
//
// 使用方式:
//   app.use(tenantIsolation) // 在所有API路由之前
```

### 2.6.2 Email Service (api/services/email.service.ts)

> **框架**: nodemailer + Handlebars模板引擎
> **安装**: `npm install nodemailer handlebars`
> **模板目录**: api/templates/email/

```typescript
// api/services/email.service.ts

import nodemailer from 'nodemailer';
import { compile } from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../config/logger';

type TemplateName = 
  | 'password-reset'
  | 'welcome'
  | 'share-invite'
  | 'subscription-receipt'
  | 'subscription-expiring'
  | 'subscription-cancelled'
  | 'data-export-ready'
  | 'feedback-response'
  | 'security-alert'
  | 'invitation';

interface TemplateContext {
  appName: string;
  appUrl: string;
  year: number;
  [key: string]: any;
}

const TEMPLATES_DIR = join(__dirname, '../../api/templates/email');

function loadTemplate(name: TemplateName, locale: string = 'zh'): HandlebarsTemplateDelegate {
  const path = join(TEMPLATES_DIR, `${name}/${locale}.html`);
  const defaultPath = join(TEMPLATES_DIR, `${name}/zh.html`);
  const source = readFileSync(existsSync(path) ? path : defaultPath, 'utf-8');
  return compile(source);
}

export async function sendEmail(options: {
  to: string;
  template: TemplateName;
  subject: string;
  context: Record<string, any>;
  locale?: string;
  attachments?: Array<{ filename: string; content: Buffer | string }>;
}): Promise<void> {
  const template = loadTemplate(options.template, options.locale);
  const html = template({
    appName: 'AI Album',
    appUrl: process.env.FRONTEND_URL || 'http://localhost',
    year: new Date().getFullYear(),
    ...options.context,
  });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_HOST
      ? { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@ai-album.local',
    to: options.to,
    subject: `[AI Album] ${options.subject}`,
    html,
    attachments: options.attachments,
  });

  logger.info({ to: options.to, template: options.template }, 'Email sent');
}
```

#### 邮件基础布局模板 (api/templates/email/base.html)

```html
<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f7; color: #1d1d1f; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; padding: 32px 0; }
    .header h1 { font-size: 24px; font-weight: 700; color: #1d1d1f; margin: 0; }
    .card { background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .button { display: inline-block; padding: 14px 36px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; margin: 24px 0; }
    .button:hover { background: #1d4ed8; }
    .footer { text-align: center; padding: 32px 0; color: #86868b; font-size: 12px; }
    .footer a { color: #86868b; }
    .divider { border-top: 1px solid #e5e5ea; margin: 32px 0; }
    .code { font-family: 'SF Mono', 'Menlo', monospace; font-size: 28px; letter-spacing: 4px; text-align: center; color: #2563eb; padding: 16px; background: #f0f4ff; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{appName}}</h1>
    </div>
    <div class="card">
      {{> @partial-block }}
    </div>
    <div class="footer">
      <p>此邮件由 AI Album 自动发送，请勿回复。</p>
      <p>&copy; {{year}} AI Album. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

#### 模板列表及内容规格

```typescript
// === 1. password-reset (api/templates/email/password-reset/zh.html) ===
// Subject: "密码重置"
// Context: { userName, resetUrl, expiresIn }
// 内容:
//   <h2>密码重置请求</h2>
//   <p>{{userName}}，您好！</p>
//   <p>我们收到了您的密码重置请求。点击下方按钮重置密码（{{expiresIn}}内有效）：</p>
//   <a class="button" href="{{resetUrl}}">重置密码</a>
//   <p>或复制以下链接到浏览器：</p>
//   <p style="color:#86868b;word-break:break-all">{{resetUrl}}</p>
//   <p style="color:#86868b;">如果您没有请求重置密码，请忽略此邮件。</p>

// === 2. welcome (api/templates/email/welcome/zh.html) ===
// Subject: "欢迎加入AI Album！"
// Context: { userName, loginUrl, features: string[] }
// 内容:
//   <h2>欢迎加入 AI Album！🎉</h2>
//   <p>{{userName}}，您好！</p>
//   <p>您的账户已创建成功。AI Album 帮助你智能管理每一张照片：</p>
//   <ul>
//     <li>📸 手机照片自动备份</li>
//     <li>🔍 AI智能搜索与分类</li>
//     <li>👤 人脸上传自动聚类</li>
//     <li>🔒 数据完全自控，隐私安全</li>
//   </ul>
//   <a class="button" href="{{loginUrl}}">开始使用</a>

// === 3. share-invite (api/templates/email/share-invite/zh.html) ===
// Subject: "{{senderName}} 邀请你查看共享照片"
// Context: { senderName, senderEmail, shareUrl, passwordRequired, message?, photoCount }
// 内容:
//   <h2>{{senderName}} 与你分享 {{photoCount}} 张照片</h2>
//   {{#if message}}<p style="font-style:italic;color:#86868b;">"{{message}}"</p>{{/if}}
//   {{#if passwordRequired}}<p>此分享已设置密码保护，点击后需要输入密码。</p>{{/if}}
//   <a class="button" href="{{shareUrl}}">查看照片</a>
//   <p style="color:#86868b;">链接有效期取决于发送者设置。</p>

// === 4. subscription-receipt (api/templates/email/subscription-receipt/zh.html) ===
// Subject: "订阅确认 - {{planName}}"
// Context: { userName, planName, amount, period, nextBillingDate, invoiceUrl }
// 内容:
//   <h2>订阅确认</h2>
//   <p>{{userName}}，您好！</p>
//   <p>您的 {{planName}} 订阅已确认。</p>
//   <table style="width:100%;border-collapse:collapse;margin:24px 0;">
//     <tr><td style="padding:8px;border:1px solid #e5e5ea;">方案</td><td style="padding:8px;border:1px solid #e5e5ea;">{{planName}}</td></tr>
//     <tr><td style="padding:8px;border:1px solid #e5e5ea;">金额</td><td style="padding:8px;border:1px solid #e5e5ea;">¥{{amount}}/{{period}}</td></tr>
//     <tr><td style="padding:8px;border:1px solid #e5e5ea;">下期账单</td><td style="padding:8px;border:1px solid #e5e5ea;">{{nextBillingDate}}</td></tr>
//   </table>
//   <a class="button" href="{{invoiceUrl}}">查看账单</a>

// === 5. subscription-expiring (api/templates/email/subscription-expiring/zh.html) ===
// Subject: "订阅即将到期提醒"
// Context: { userName, planName, expiryDate, renewalUrl }
// 内容:
//   <h2>订阅即将到期</h2>
//   <p>{{userName}}，您好！</p>
//   <p>您的 {{planName}} 方案将于 {{expiryDate}} 到期。</p>
//   <p>到期后部分功能将无法使用，请及时续费。</p>
//   <a class="button" href="{{renewalUrl}}">立即续费</a>

// === 6. subscription-cancelled (api/templates/email/subscription-cancelled/zh.html) ===
// Subject: "订阅已取消"
// Context: { userName, planName, effectiveDate }
// 内容:
//   <h2>订阅已取消</h2>
//   <p>{{userName}}，您好！</p>
//   <p>您的 {{planName}} 订阅已取消，将于 {{effectiveDate}} 生效。</p>
//   <p>在此之前您仍可使用所有功能。如有需要，可随时重新订阅。</p>

// === 7. data-export-ready (api/templates/email/data-export-ready/zh.html) ===
// Subject: "数据导出完成"
// Context: { userName, downloadUrl, expiresIn }
// 内容:
//   <h2>数据导出完成</h2>
//   <p>{{userName}}，您好！</p>
//   <p>您的数据导出已完成，点击下方按钮下载（{{expiresIn}}内有效）：</p>
//   <a class="button" href="{{downloadUrl}}">下载数据</a>
//   <p style="color:#ff3b30;">⚠️ 此链接仅能使用一次，下载后自动失效。</p>

// === 8. feedback-response (api/templates/email/feedback-response/zh.html) ===
// Subject: "关于您反馈的回复"
// Context: { userName, originalFeedback, adminResponse, issueUrl? }
// 内容:
//   <h2>反馈回复</h2>
//   <p>{{userName}}，您好！</p>
//   <p>关于您的反馈：</p>
//   <blockquote style="background:#f5f5f7;padding:12px;border-radius:8px;color:#86868b;">{{originalFeedback}}</blockquote>
//   <p>管理员回复：</p>
//   <p>{{adminResponse}}</p>
//   {{#if issueUrl}}<a class="button" href="{{issueUrl}}">查看详情</a>{{/if}}

// === 9. security-alert (api/templates/email/security-alert/zh.html) ===
// Subject: "安全提醒"
// Context: { userName, alertType, ip, location, time, actionUrl }
// 内容:
//   <h2>🔐 安全提醒</h2>
//   <p>{{userName}}，您好！</p>
//   <p>我们检测到 {{alertType}}：</p>
//   <table style="width:100%;border-collapse:collapse;margin:24px 0;">
//     <tr><td style="padding:8px;border:1px solid #e5e5ea;">IP地址</td><td style="padding:8px;border:1px solid #e5e5ea;">{{ip}}</td></tr>
//     <tr><td style="padding:8px;border:1px solid #e5e5ea;">位置</td><td style="padding:8px;border:1px solid #e5e5ea;">{{location}}</td></tr>
//     <tr><td style="padding:8px;border:1px solid #e5e5ea;">时间</td><td style="padding:8px;border:1px solid #e5e5ea;">{{time}}</td></tr>
//   </table>
//   <p style="color:#ff3b30;">如果这不是您本人的操作，请立即：</p>
//   <a class="button" href="{{actionUrl}}" style="background:#dc2626;">保护账户</a>

// === 10. invitation (api/templates/email/invitation/zh.html) ===
// Subject: "{{inviterName}} 邀请你加入 AI Album"
// Context: { inviterName, registerUrl, invitationCode }
// 内容:
//   <h2>加入 AI Album</h2>
//   <p>您好！</p>
//   <p>{{inviterName}} 邀请你加入 AI Album，一起管理和分享照片。</p>
//   <p>注册时使用以下邀请码可获额外奖励：</p>
//   <div class="code">{{invitationCode}}</div>
//   <a class="button" href="{{registerUrl}}">立即注册</a>
```

#### 开发模式邮件处理

```typescript
// 当 SMTP_HOST 未配置时（开发模式），邮件内容输出到控制台
// 在 api/config/logger.ts 中配置:
// if (!process.env.SMTP_HOST) {
//   logger.info({ to, templateName, context }, '[DEV EMAIL]');
//   // 同时将邮件HTML写入临时文件，方便开发调试:
//   // writeFileSync(`./tmp/emails/${templateName}-${Date.now()}.html`, html)
// }
```
```

### 2.7 API Validation Schemas (Zod)

```typescript
// === auth.ts ===
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

// === photos.ts ===
const photoListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  isFavorite: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  isArchived: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  takenAfter: z.string().datetime().optional(),
  takenBefore: z.string().datetime().optional(),
  sort: z.enum(['takenAt', 'originalName', 'fileSize', 'createdAt']).default('takenAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  fileType: z.enum(['image', 'video']).optional(),
});

const batchActionSchema = z.object({
  photoIds: z.array(z.string()).min(1).max(500),
  action: z.enum(['favorite', 'archive', 'delete', 'add-to-album']),
  albumId: z.string().optional(),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

const reprocessBodySchema = z.object({
  stages: z.array(z.enum(['ocr', 'clip', 'face'])).min(1),
});

// === search.ts ===
const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  mode: z.enum(['smart', 'text', 'ocr', 'semantic', 'face', 'hybrid']).default('smart'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isFavorite: z.enum(['true', 'false']).optional(),
  isArchived: z.enum(['true', 'false']).optional(),
  personId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
});

// === albums.ts ===
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

const addUsersSchema = z.object({
  userIds: z.array(z.string()).min(1).max(50),
});

// === persons.ts ===
const updatePersonSchema = z.object({
  name: z.string().max(100).optional(),
  isHidden: z.boolean().optional(),
  birthDate: z.string().date().nullable().optional(),
});

const mergePersonsSchema = z.object({
  sourceIds: z.array(z.string()).min(1),
  targetId: z.string(),
});

// === share.ts ===
const createShareLinkSchema = z.object({
  albumId: z.string().optional(),
  photoId: z.string().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  allowDownload: z.boolean().default(true),
  allowUpload: z.boolean().default(false),
  password: z.string().max(100).optional(),
});

// === tags.ts ===
const createTagSchema = z.object({
  name: z.string().min(1).max(100),
});

// === admin.ts ===
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  role: z.enum(['user', 'admin']).default('user'),
});

const updateUserSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  storageQuota: z.number().nullable().optional(),
});

// === libraries.ts ===
const createLibrarySchema = z.object({
  name: z.string().min(1).max(255),
  importPath: z.string().min(1).max(500),
  exclusionPatterns: z.array(z.string()).default([]),
});

const updateLibrarySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  importPath: z.string().min(1).max(500).optional(),
  exclusionPatterns: z.array(z.string()).optional(),
});

// === stacks.ts ===
const setPrimaryPhotoSchema = z.object({
  photoId: z.string().min(1),
});

// === smart-albums.ts ===
const createCustomSmartAlbumSchema = z.object({
  name: z.string().min(1).max(100),
  samplePhotoIds: z.array(z.string().min(1)).min(3).max(10),
});

const updateThresholdSchema = z.object({
  threshold: z.number().min(0.1).max(0.9),
});

const classifyPhotoSchema = z.object({
  photoId: z.string().min(1),
});

// === year-in-review.ts ===
const generateShareCardSchema = z.object({
  template: z.enum(['minimal', 'magazine', 'collage']),
});

const updateExclusionsSchema = z.object({
  personIds: z.array(z.string().min(1)).optional(),
  dateRanges: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
});

// === duplicates.ts ===
const resolveDuplicateSchema = z.object({
  groupId: z.string().min(1),
  keepId: z.string().min(1),
  action: z.enum(['delete_others']),
});

const resolveBatchSchema = z.object({
  resolutions: z.array(resolveDuplicateSchema).min(1).max(50),
});

// === shared-libraries.ts ===
const createSharedLibrarySchema = z.object({
  name: z.string().min(1).max(255),
});

const inviteMemberSchema = z.object({
  userId: z.string().min(1),
});

const updateRulesSchema = z.object({
  rules: z.array(z.object({
    type: z.enum(['person', 'date_range', 'location', 'all']),
    value: z.string().min(1),
  })).min(1),
});

// === activity-logs.ts ===
const activityLogQuerySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// === 2FA ===
const enable2faSchema = z.object({
  password: z.string().min(1),
});

const verify2faSchema = z.object({
  code: z.string().length(6),
});

const login2faSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  code: z.string().length(6),
});

// === auth.ts (补充) ===
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

// === photos.ts (补充) ===
const editPhotoSchema = z.object({
  operation: z.enum(['crop', 'rotate', 'flip', 'filter']),
  params: z.object({
    crop: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }).optional(),
    rotate: z.number().min(0).max(360).optional(),
    flip: z.enum(['horizontal', 'vertical']).optional(),
    filter: z.enum(['grayscale', 'sepia', 'blur', 'sharpen', 'brightness', 'contrast']).optional(),
    filterValue: z.number().min(0).max(100).optional(),
  }),
});

// === shared-libraries.ts (补充) ===
const updateSharedLibrarySchema = z.object({
  name: z.string().min(1).max(100),
});

// === data-export.ts ===
const dataExportSchema = z.object({
  include: z.array(z.enum(['photos', 'albums', 'tags', 'persons'])).min(1),
});

// === setup.ts ===
const setupAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

const setupStorageSchema = z.object({
  uploadLocation: z.string().min(1),
  thumbnailLocation: z.string().min(1),
});

const setupSmtpSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  user: z.string().optional(),
  pass: z.string().optional(),
  from: z.string().email(),
});

const pickScoreQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  albumId: z.string().uuid().optional(),
  personId: z.string().uuid().optional(),
});

const batchPickScoreSchema = z.object({
  albumId: z.string().uuid().optional(),
  force: z.boolean().default(false),
});

const immichMigrationSchema = z.object({
  pgHost: z.string().min(1),
  pgPort: z.coerce.number().default(5432),
  pgDatabase: z.string().default('immich'),
  pgUser: z.string(),
  pgPassword: z.string(),
  uploadPath: z.string(),
  mode: z.enum(['copy', 'reference']).default('copy'),
});

// === sessions.ts ===
const createSessionSchema = z.object({
  deviceInfo: z.string().max(500).optional(),
});

const deleteSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

// === notifications.ts ===
const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  type: z.enum(['system', 'share', 'processing', 'subscription', 'security']).optional(),
});

const markNotificationReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

const updateNotificationSettingSchema = z.object({
  enableEmail: z.boolean().optional(),
  enableInApp: z.boolean().optional(),
  types: z.object({
    system: z.boolean().optional(),
    share: z.boolean().optional(),
    processing: z.boolean().optional(),
    subscription: z.boolean().optional(),
    security: z.boolean().optional(),
  }).optional(),
});

// === activities.ts ===
const createActivitySchema = z.object({
  albumId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
  type: z.enum(['comment', 'like']),
  comment: z.string().max(2000).optional(),
});

const activityQuerySchema = z.object({
  albumId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
  type: z.enum(['comment', 'like']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// === system-config.ts ===
const updateSystemConfigSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
});

const batchUpdateSystemConfigSchema = z.object({
  configs: z.array(z.object({
    key: z.string().min(1).max(100),
    value: z.unknown(),
  })).min(1).max(50),
});

// === server-info.ts ===
const serverPingSchema = z.object({});

// === subscriptions.ts (Phase 5) ===
const createCheckoutSchema = z.object({
  planId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const cancelSubscriptionSchema = z.object({
  reason: z.string().max(500).optional(),
});

const webhookEventSchema = z.object({
  type: z.string().min(1),
  data: z.record(z.unknown()),
});

// === tenants.ts (Phase 5) ===
const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().max(255).optional(),
  planId: z.string().uuid().optional(),
  settings: z.record(z.unknown()).default({}),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  domain: z.string().max(255).optional(),
  planId: z.string().uuid().optional(),
  settings: z.record(z.unknown()).optional(),
});

const tenantResourceQuerySchema = z.object({
  tenantId: z.string().uuid(),
  period: z.enum(['day', 'week', 'month']).default('month'),
});

// === branding.ts (Phase 5) ===
const updateBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  appName: z.string().min(1).max(50).optional(),
  loginTitle: z.string().max(100).optional(),
  loginDescription: z.string().max(500).optional(),
  loginBackgroundUrl: z.string().url().optional(),
  emailHeaderLogoUrl: z.string().url().optional(),
  emailFooterText: z.string().max(500).optional(),
  hideVersionInfo: z.boolean().optional(),
  faviconUrl: z.string().url().optional(),
});

// === invitations.ts (Phase 5) ===
const createInvitationSchema = z.object({
  maxUses: z.number().int().min(1).max(100).default(1),
  rewardStorageBytes: z.number().int().min(0).default(1073741824),
  expiresAt: z.string().datetime().optional(),
});

// === feedback.ts (Phase 5) ===
const submitFeedbackSchema = z.object({
  category: z.enum(['bug', 'feature', 'improvement', 'other']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  screenshotUrl: z.string().url().optional(),
  userEmail: z.string().email().optional(),
});
```

### 2.8 Route Implementations

#### auth.ts
```
POST /api/auth/register
  1. validate registerSchema
  2. check email not exists -> 409 if exists
  3. hash password with bcryptjs (salt rounds: 12)
  4. INSERT INTO users
  5. first user gets role='admin' (check user count)
  6. generate JWT ({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' })
  7. return { user: { id, email, name, role }, token }

POST /api/auth/login
  1. validate loginSchema
  2. SELECT * FROM users WHERE email = $1
  3. not found -> 401
  4. bcryptjs.compare(password, password_hash) -> 401 if mismatch
  5. generate JWT
  6. return { user, token }

GET /api/auth/me
  1. auth middleware
  2. SELECT id, email, name, role, storage_used, locale FROM users WHERE id = $1
  3. return { user }

POST /api/auth/forgot-password
  1. validate forgotPasswordSchema
  2. rateLimit (15分钟3次)
  3. SELECT id, email FROM users WHERE email = $1
  4. 无论用户是否存在，都返回相同信息 "如果该邮箱已注册，重置邮件已发送" (安全)
  5. 如果用户存在:
     a. 生成 crypto.randomBytes(32).toString('hex') 作为token
     b. bcrypt.hash(token, 12) 存储 hash
     c. INSERT INTO password_reset_tokens (user_id, token_hash, expires_at=NOW()+1hour)
     d. 发送邮件: {重置URL = FRONTEND_URL/reset-password?token=xxx}
     e. 开发模式: console.log(resetUrl)
  6. return { message: "如果该邮箱已注册，重置邮件已发送" }

POST /api/auth/reset-password
  1. validate resetPasswordSchema
  2. SELECT * FROM password_reset_tokens WHERE used_at IS NULL AND expires_at > NOW()
  3. bcrypt.compare(token, token_hash) 找到匹配的token
  4. 未找到 -> 400 "无效或过期的重置链接"
  5. UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1
  6. hash new password with bcrypt (salt rounds: 12)
  7. UPDATE users SET password_hash = $1 WHERE id = $2; DELETE FROM sessions WHERE user_id = $2 AND id != $3 (保留当前session)
  8. return { success: true }

POST /api/auth/logout-all
  1. auth middleware
  2. DELETE FROM sessions WHERE user_id = $1 AND id != $2 (保留当前session)
  3. return { success: true }
  4. JWT验证中间件检查session存在性: SELECT 1 FROM sessions WHERE id = jti AND expires_at > NOW()

GET /api/auth/oauth/github
  1. 构建GitHub OAuth URL:
     https://github.com/login/oauth/authorize?client_id=GITHUB_CLIENT_ID&redirect_uri=${FRONTEND_URL}/oauth/callback/github&scope=user:email&state=${randomState}
  2. 将state存入Redis: SET oauth:state:{state} 1 EX 600 (10分钟有效)
  3. 302重定向到GitHub授权页

GET /api/auth/oauth/github/callback?code=xxx&state=xxx
  1. 验证state: GET oauth:state:{state} from Redis, 不存在则401
  2. 删除state: DEL oauth:state:{state}
  3. 用code换取access_token:
     POST https://github.com/login/oauth/access_token
     { client_id, client_secret, code }
     Accept: application/json
  4. 用access_token获取用户信息:
     GET https://api.github.com/user
     Authorization: Bearer {access_token}
  5. 用access_token获取用户邮箱(如果GitHub邮箱未公开):
     GET https://api.github.com/user/emails
  6. 查找或创建用户:
     a. SELECT * FROM users WHERE email = $1
     b. 如果用户存在: 生成JWT, 返回 { user, token }
     c. 如果用户不存在:
        - INSERT INTO users (email, name, password_hash=随机, role='user', avatar_path=github_avatar_url)
        - 生成JWT, 返回 { user, token }
  7. 302重定向到前端: ${FRONTEND_URL}/oauth/success?token={jwt}

GET /api/auth/oauth/google
  1. 构建Google OAuth URL:
     https://accounts.google.com/o/oauth2/v2/auth?client_id=GOOGLE_CLIENT_ID&redirect_uri=${FRONTEND_URL}/oauth/callback/google&response_type=code&scope=openid email profile&state=${randomState}
  2. 将state存入Redis: SET oauth:state:{state} 1 EX 600
  3. 302重定向到Google授权页

GET /api/auth/oauth/google/callback?code=xxx&state=xxx
  1. 验证state
  2. 用code换取tokens:
     POST https://oauth2.googleapis.com/token
     { client_id, client_secret, code, redirect_uri, grant_type='authorization_code' }
  3. 解析id_token获取用户信息 (使用jsonwebtoken验证):
     payload = jwt.verify(id_token, { algorithms: ['RS256'] }) // Google公钥
     email = payload.email, name = payload.name, picture = payload.picture
  4. 查找或创建用户 (同GitHub步骤6)
  5. 302重定向到前端: ${FRONTEND_URL}/oauth/success?token={jwt}

前端OAuth回调页 (/oauth/callback/:provider):
  1. 页面加载时从URL获取code和state
  2. 调用 GET /api/auth/oauth/:provider/callback?code=xxx&state=xxx
  3. 后端302重定向到 /oauth/success?token=xxx
  4. 前端从URL获取token, 保存到localStorage
  5. 跳转到首页

前端OAuth成功页 (/oauth/success):
  1. 从URL参数获取token
  2. localStorage.setItem('token', token)
  3. 调用 api.auth.getMe() 获取用户信息
  4. 跳转到首页
```

#### photos.ts
```
GET /api/photos
  1. auth middleware
  2. validate photoListQuerySchema
  3. SELECT * FROM photos WHERE user_id = $1 AND deleted_at IS NULL AND is_archived = false
     + optional filters (is_favorite, taken_after, taken_before, file_type)
     ORDER BY ${sortColumn} ${sortDirection}
     LIMIT $limit OFFSET ($page-1)*$limit
     安全: sort和order参数通过Zod enum白名单验证(仅允许takenAt/createdAt/originalName/fileSize和asc/desc),
     映射为数据库列名时使用白名单映射表, 不直接拼接用户输入:
     const SORT_COLUMNS = { takenAt: 'taken_at', createdAt: 'created_at', originalName: 'original_name', fileSize: 'file_size' }
     const SORT_DIRECTIONS = { asc: 'ASC', desc: 'DESC' }
  4. SELECT COUNT(*) FROM photos WHERE same filters
  5. return { photos, total, page, limit }

GET /api/photos/:id
  1. auth middleware
  2. SELECT p.*, array_agg(DISTINCT t.id) as tag_ids, array_agg(DISTINCT f.person_id) as person_ids
     FROM photos p
     LEFT JOIN photo_tags pt ON p.id = pt.photo_id
     LEFT JOIN tags t ON pt.tag_id = t.id
     LEFT JOIN faces f ON f.photo_id = p.id
     WHERE p.id = $1 AND p.user_id = $2 AND p.deleted_at IS NULL
     GROUP BY p.id
  3. not found -> 404
  4. 查询相邻照片(用于详情页左右切换):
     SELECT id FROM photos WHERE user_id = $1 AND deleted_at IS NULL AND is_archived = FALSE
       AND taken_at < photo.taken_at ORDER BY taken_at DESC LIMIT 1 -> prevPhotoId
     SELECT id FROM photos WHERE user_id = $1 AND deleted_at IS NULL AND is_archived = FALSE
       AND taken_at > photo.taken_at ORDER BY taken_at ASC LIMIT 1 -> nextPhotoId
  5. return { photo, prevPhotoId, nextPhotoId }

POST /api/photos/upload
  1. auth middleware
  2. 检查存储配额: if user.storage_quota && user.storage_used + totalSize > user.storage_quota -> 413
  3. upload.array('files', 50) middleware
  4. for each file:
     a. compute SHA-256 hash of file
     b. check if hash exists for this user -> if duplicate: add to skippedDuplicates array, continue to next file
     c. determine file_type: 'image' or 'video' based on mimeType
     d. INSERT INTO photos (user_id, filename, original_name, file_path, mime_type, file_type, file_size, file_hash, processing_status='pending')
     e. add BullMQ jobs in sequence:
        - thumbnail-generation job
        - metadata-extraction job (depends on thumbnail)
     f. UPDATE users SET storage_used = storage_used + file_size WHERE id = userId
     g. metadata完成后自动触发: ocr, clip, face, geocode, stack-detect jobs
  5. return { photos: [...], skippedDuplicates: [{ originalName, existingPhotoId }] }

DELETE /api/photos/:id
  1. auth middleware
  2. UPDATE photos SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
  3. not found -> 404
  4. return { success: true }

DELETE /api/photos/:id/permanent
  1. auth middleware
  2. SELECT file_path, thumbnail_path, file_size FROM photos WHERE id = $1 AND user_id = $2
  3. not found -> 404
  4. DELETE FROM photos WHERE id = $1 (CASCADE)
  5. unlink file_path and thumbnail_path from filesystem
  6. UPDATE users SET storage_used = GREATEST(0, storage_used - file_size) WHERE id = userId
  7. return { success: true }

POST /api/photos/:id/restore
  1. auth middleware
  2. UPDATE photos SET deleted_at = NULL WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL
  3. not found -> 404
  4. return { photo }

POST /api/photos/batch
  1. auth middleware
  2. validate batchActionSchema
  3. switch(action):
     'favorite': UPDATE photos SET is_favorite = true WHERE id IN photoIds AND user_id = $1
     'archive': UPDATE photos SET is_archived = true WHERE id IN photoIds AND user_id = $1
     'delete': UPDATE photos SET deleted_at = NOW() WHERE id IN photoIds AND user_id = $1
     'add-to-album': INSERT INTO photo_albums (photo_id, album_id) for each photoId
  4. return { success: true, count: affected_rows }

POST /api/photos/batch-download
  1. auth middleware
  2. validate z.object({ photoIds: z.array(z.string()).min(1).max(500), size: z.enum(['original', 'thumbnail']).default('original') })
  3. 查询照片: SELECT id, file_path, thumbnail_path, original_name FROM photos WHERE id IN photoIds AND user_id = $1
  4. 使用archiver(zip)打包:
     a. 创建zip: archiver('zip', { zlib: { level: 5 } })
     b. 对每张照片: 读取文件(size=original用file_path, size=thumbnail用thumbnail_path)
     c. 添加到zip: zip.file(readStream, { name: original_name })
     d. zip.finalize()
  5. 设置响应头: Content-Type: application/zip, Content-Disposition: attachment; filename="photos.zip"
  6. pipe到res

PUT /api/photos/:id/edit
  1. auth middleware
  2. validate editSchema:
     z.object({
       operation: z.enum(['crop', 'rotate', 'flip-h', 'flip-v', 'brightness', 'contrast', 'saturation', 'filter']),
       params: z.object({}).passthrough()  // 具体参数因operation而异
     })
     - crop: { x, y, width, height }
     - rotate: { angle: 90 | 180 | 270 }
     - flip-h/flip-v: {} (无参数)
     - brightness/contrast/saturation: { value: -100 to 100 }
     - filter: { name: 'grayscale' | 'sepia' | 'vintage' | 'cool' | 'warm' | 'dramatic' }
  3. 保存当前版本到photo_versions:
     a. SELECT MAX(version_number) FROM photo_versions WHERE photo_id = $1
     b. INSERT INTO photo_versions (photo_id, file_path, operation, params, version_number)
  4. 执行编辑操作(sharp):
     a. 读取当前文件: sharp(currentFilePath)
     b. 根据operation应用变换:
        - crop: .extract({ left: x, top: y, width, height })
        - rotate: .rotate(angle)
        - flip-h: .flip()
        - flip-v: .flop()
        - brightness: .modulate({ brightness: 1 + value/100 })
        - contrast: .linear(1 + value/100, -(128 * value/100))
        - saturation: .modulate({ saturation: 1 + value/100 })
        - filter:
          - grayscale: .grayscale()
          - sepia: .tint({ r: 112, g: 66, b: 20 })
          - vintage: .modulate({ brightness: 1.1, saturation: 0.7 }).tint({ r: 112, g: 66, b: 20 })
          - cool: .modulate({ brightness: 1.05 }).tint({ r: 0, g: 50, b: 100 })
          - warm: .modulate({ brightness: 1.05 }).tint({ r: 100, g: 50, b: 0 })
          - dramatic: .modulate({ brightness: 1.2, saturation: 1.3 }).linear(1.2, -(128 * 0.2))
     c. 保存到新文件: edited-{photoId}-{timestamp}.jpg
     d. UPDATE photos SET file_path = newFilePath WHERE id = $1
  5. return { photo }

POST /api/photos/:id/edit/undo
  1. auth middleware
  2. SELECT * FROM photo_versions WHERE photo_id = $1 ORDER BY version_number DESC LIMIT 1
  3. if no version: return 400 "没有可撤销的编辑"
  4. UPDATE photos SET file_path = version.file_path WHERE id = $1
  5. DELETE FROM photo_versions WHERE id = version.id
  6. return { photo }

PUT /api/photos/:id/favorite
  1. auth middleware
  2. UPDATE photos SET is_favorite = $1 WHERE id = $2 AND user_id = $3
  3. return { photo }

PUT /api/photos/:id/archive
  1. auth middleware
  2. UPDATE photos SET is_archived = $1 WHERE id = $2 AND user_id = $3
  3. return { photo }

GET /api/photos/:id/download
  1. auth middleware
  2. SELECT file_path, original_name, mime_type FROM photos WHERE id = $1 AND user_id = $2
  3. res.download(file_path, original_name)

GET /api/photos/:id/status
  1. auth middleware
  2. SELECT processing_status FROM photos WHERE id = $1 AND user_id = $2
  3. return ProcessingStatus

POST /api/photos/:id/reprocess
  1. auth middleware
  2. validate reprocessBodySchema
  3. for each stage in stages:
     add corresponding BullMQ job
  4. UPDATE photos SET processing_status = 'pending'
  5. return { job: 'queued' }

GET /api/photos/favorites
  1. auth middleware
  2. SELECT * FROM photos WHERE user_id = $1 AND is_favorite = true
     ORDER BY created_at DESC LIMIT $limit OFFSET $offset
  3. return { photos, total }

GET /api/photos/archived
  1. auth middleware
  2. SELECT * FROM photos WHERE user_id = $1 AND is_archived = true AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT $limit OFFSET $offset
  3. return { photos, total }

GET /api/photos/trash
  1. auth middleware
  2. SELECT * FROM photos WHERE user_id = $1 AND deleted_at IS NOT NULL
     ORDER BY deleted_at DESC LIMIT $limit OFFSET $offset
  3. return { photos, total }

DELETE /api/photos/trash/empty
  1. auth middleware
  2. SELECT id, file_path, thumbnail_path, file_size FROM photos WHERE user_id = $1 AND deleted_at IS NOT NULL
  3. for each photo: unlink files, accumulate file_size
  4. DELETE FROM photos WHERE user_id = $1 AND deleted_at IS NOT NULL
  5. UPDATE users SET storage_used = GREATEST(0, storage_used - total_size) WHERE id = userId
  6. return { success: true, count }

GET /api/photos/memories
  1. auth middleware
  2. SELECT * FROM photos WHERE user_id = $1
     AND DATE_PART('month', taken_at) = DATE_PART('month', NOW())
     AND DATE_PART('day', taken_at) = DATE_PART('day', NOW())
     AND DATE_PART('year', taken_at) < DATE_PART('year', NOW())
     ORDER BY taken_at DESC
  3. return { memories: [{ yearsAgo, photos }] }
```

#### search.ts
```
GET /api/search
  1. auth middleware
  2. validate searchQuerySchema
  3. if mode includes 'semantic' or 'hybrid' or (mode === 'smart' and query.length > 3):
     a. 调用ML Service文本向量化: POST ML_SERVICE_URL/api/ml/clip/embed-text { text: query }
     b. 获取640维文本向量textEmbedding
     c. 失败时降级为text+ocr搜索
  4. if mode === 'smart' (默认):
     a. 查询用户人物名: SELECT name FROM persons WHERE user_id = $1 AND name IS NOT NULL
     b. 判断查询意图:
        - 查询匹配人物名 -> mode = 'hybrid', 额外face权重
        - 查询长度 ≤ 3 -> mode = 'text+ocr' (跳过语义搜索，节省时间)
        - 查询长度 > 3 -> mode = 'hybrid'
     c. 执行对应搜索
  4. else: 按指定mode执行搜索
  5. INSERT INTO search_history (user_id, query, search_mode, result_count)
  6. return { results, total, appliedMode }

GET /api/search/suggest
  1. auth middleware
  2. 并行查询:
     a. SELECT name FROM persons WHERE user_id = $1 AND name ILIKE $2 LIMIT 3
     b. SELECT DISTINCT location_name FROM photos WHERE user_id = $1 AND location_name ILIKE $2 LIMIT 3
     c. SELECT name FROM tags WHERE user_id = $1 AND name ILIKE $2 LIMIT 3
     d. SELECT DISTINCT query FROM search_history WHERE user_id = $1 AND query ILIKE $2 LIMIT 5
  3. 合并去重, return { suggestions: [{ text, type: 'person'|'location'|'tag'|'history' }] }

GET /api/search/history
  1. auth middleware
  2. SELECT * FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50
  3. return { history }

DELETE /api/search/history/:id
  1. auth middleware
  2. DELETE FROM search_history WHERE id = $1 AND user_id = $2
  3. return { success: true }
```

#### persons.ts
```
GET /api/persons
  1. auth middleware
  2. SELECT id, name, feature_face_path, face_count, is_hidden FROM persons
     WHERE user_id = $1 AND is_hidden = false
     ORDER BY face_count DESC

GET /api/persons/:id
  1. auth middleware
  2. SELECT * FROM persons WHERE id = $1 AND user_id = $2

GET /api/persons/:id/photos
  1. auth middleware
  2. SELECT p.* FROM photos p
     JOIN faces f ON f.photo_id = p.id
     WHERE f.person_id = $1 AND p.user_id = $2
     ORDER BY p.taken_at DESC
     LIMIT $limit OFFSET $offset

PUT /api/persons/:id
  1. auth middleware
  2. validate updatePersonSchema
  3. UPDATE persons SET ... WHERE id = $1 AND user_id = $2

POST /api/persons/merge
  1. auth middleware
  2. validate mergePersonsSchema
  3. UPDATE faces SET person_id = targetId WHERE person_id IN sourceIds
  4. DELETE FROM persons WHERE id IN sourceIds
  5. UPDATE persons SET face_count = (SELECT COUNT(*) FROM faces WHERE person_id = targetId) WHERE id = targetId

PUT /api/persons/:id/feature-face
  1. auth middleware
  2. validate z.object({ faceId: z.string() })
  3. SELECT f.*, p.file_path FROM faces f JOIN photos p ON f.photo_id = p.id WHERE f.id = $1 AND f.person_id IN (SELECT id FROM persons WHERE user_id = $2)
  4. not found -> 404
  5. 使用sharp从原图裁剪人脸区域 (x1,y1,x2,y2 + 20% padding)
  6. 保存到 THUMBNAIL_DIR/faces/{personId}.jpg
  7. UPDATE persons SET feature_face_path = $1 WHERE id = $2
  8. return { person }
```

#### tags.ts
```
GET /api/tags
  1. auth middleware
  2. SELECT t.*, COUNT(pt.photo_id) as photo_count
     FROM tags t LEFT JOIN photo_tags pt ON t.id = pt.tag_id
     WHERE t.user_id = $1
     GROUP BY t.id ORDER BY t.name

POST /api/tags
  1. auth middleware
  2. validate createTagSchema
  3. check name not exists for this user -> 409 if exists
  4. INSERT INTO tags (user_id, name) VALUES ($1, $2) RETURNING *

PUT /api/photos/:id/tags
  1. auth middleware
  2. validate z.object({ tagIds: z.array(z.string()).min(1).max(50) })
  3. Verify photo belongs to user
  4. Verify all tags belong to user
  5. DELETE FROM photo_tags WHERE photo_id = $1 (清除旧标签)
  6. INSERT INTO photo_tags (photo_id, tag_id) VALUES ... (添加新标签)
  7. return { photo }

GET /api/tags/:id/photos
  1. auth middleware
  2. Verify tag belongs to user
  3. SELECT p.* FROM photos p
     JOIN photo_tags pt ON p.id = pt.photo_id
     WHERE pt.tag_id = $1 AND p.user_id = $2 AND p.deleted_at IS NULL
     ORDER BY p.taken_at DESC NULLS LAST
     LIMIT $limit OFFSET $offset
  4. SELECT COUNT(*) FROM photo_tags pt JOIN photos p ON p.id = pt.photo_id
     WHERE pt.tag_id = $1 AND p.user_id = $2 AND p.deleted_at IS NULL
  5. return { photos, total }
```

#### stacks.ts
```
GET /api/stacks
  1. auth middleware
  2. SELECT s.*, array_agg(ps.photo_id) as photo_ids
     FROM stacks s JOIN photo_stacks ps ON s.id = ps.stack_id
     WHERE s.user_id = $1
     GROUP BY s.id

GET /api/stacks/:id
  1. auth middleware
  2. SELECT s.*, array_agg(ps.photo_id) as photo_ids
     FROM stacks s JOIN photo_stacks ps ON s.id = ps.stack_id
     WHERE s.id = $1 AND s.user_id = $2
     GROUP BY s.id

DELETE /api/stacks/:id
  1. auth middleware
  2. DELETE FROM photo_stacks WHERE stack_id = $1
  3. DELETE FROM stacks WHERE id = $1 AND user_id = $2

PUT /api/stacks/:id/primary
  1. auth middleware
  2. validate setPrimaryPhotoSchema
  3. UPDATE stacks SET primary_photo_id = $1 WHERE id = $2 AND user_id = $3
```

#### albums.ts
```
GET /api/albums
  1. auth middleware
  2. SELECT a.*, COUNT(pa.photo_id) as photo_count
     FROM albums a LEFT JOIN photo_albums pa ON a.id = pa.album_id
     WHERE a.user_id = $1 OR a.is_shared = true
     GROUP BY a.id ORDER BY a.created_at DESC

POST /api/albums
  1. auth middleware
  2. validate createAlbumSchema
  3. INSERT INTO albums

GET /api/albums/:id
  1. auth middleware (or optionalAuth for shared albums)
  2. SELECT a.*, array_agg(p.id) as photo_ids
     FROM albums a LEFT JOIN photo_albums pa ON a.id = pa.album_id LEFT JOIN photos p ON pa.photo_id = p.id
     WHERE a.id = $1
     GROUP BY a.id

PUT /api/albums/:id
  1. auth middleware
  2. validate updateAlbumSchema
  3. UPDATE albums SET ... WHERE id = $1 AND user_id = $2

DELETE /api/albums/:id
  1. auth middleware
  2. DELETE FROM albums WHERE id = $1 AND user_id = $2

PUT /api/albums/:id/photos
  1. auth middleware
  2. validate addPhotosSchema
  3. INSERT INTO photo_albums (photo_id, album_id) VALUES ...
  4. UPDATE album start_date/end_date

PUT /api/albums/:id/users
  1. auth middleware
  2. validate addUsersSchema
  3. Mark album as is_shared = true

DELETE /api/albums/:id/photos
  1. auth middleware
  2. validate z.object({ photoIds: z.array(z.string()).min(1).max(500) })
  3. DELETE FROM photo_albums WHERE album_id = $1 AND photo_id IN photoIds
  4. UPDATE album start_date/end_date
  5. return { album }
```

#### share.ts
```
POST /api/share-links
  1. auth middleware
  2. validate createShareLinkSchema
  3. Generate random token (crypto.randomBytes(16).toString('hex'))
  4. Hash password if provided
  5. INSERT INTO share_links (album_id, photo_id, token, expires_at, allow_download, allow_upload, password_hash)

GET /api/share-links
  1. auth middleware
  2. SELECT * FROM share_links WHERE album_id IN (user's albums) OR photo_id IN (user's photos)

DELETE /api/share-links/:id
  1. auth middleware
  2. Verify ownership, DELETE

GET /api/share/:token
  1. optionalAuth (不强制登录)
  2. SELECT * FROM share_links WHERE token = $1
  3. If not found: 404
  4. If expires_at < NOW(): 410 Gone (链接已过期)
  5. If password_hash IS NOT NULL:
     a. 检查请求头 x-share-password 或 query ?password=xxx
     b. 如果未提供密码: 401 { requiresPassword: true }
     c. 如果密码错误: 403 { message: "密码错误" }
     d. 如果密码正确: comparePassword(password, password_hash)
  6. If album_id: SELECT p.* FROM photos p JOIN album_photos ap ON p.id = ap.photo_id WHERE ap.album_id = $1
  7. If photo_id: SELECT * FROM photos WHERE id = $1
  8. If allow_download is false: 隐藏下载按钮
  9. If allow_upload is true: 显示上传按钮 (POST /api/share/:token/upload)
  10. Return { link, photos }

POST /api/share/:token/upload
  1. optionalAuth
  2. SELECT * FROM share_links WHERE token = $1 AND allow_upload = true
  3. If not found or allow_upload=false: 403
  4. upload.single('file') middleware
  5. 保存文件, INSERT INTO photos (user_id = link owner's user_id)
  6. 添加thumbnail-generation和metadata-extraction jobs
  7. return { photo }
```

#### admin.ts
```
GET /api/admin/users
  1. auth + adminOnly middleware
  2. SELECT id, email, name, role, storage_used, storage_quota, created_at FROM users

POST /api/admin/users
  1. auth + adminOnly
  2. validate createUserSchema
  3. INSERT INTO users

PUT /api/admin/users/:id
  1. auth + adminOnly
  2. validate updateUserSchema
  3. UPDATE users

DELETE /api/admin/users/:id
  1. auth + adminOnly
  2. 不能删除自己 -> 400
  3. 检查是否为最后一个Admin -> 400 "不能删除最后一个管理员"
  4. SELECT file_path, thumbnail_path FROM photos WHERE user_id = $1
  5. unlink all user files
  6. DELETE FROM users WHERE id = $1 (CASCADE删除关联数据)
  7. return { success: true }

GET /api/admin/jobs
  1. auth + adminOnly
  2. For each queue in QUEUES:
     BullMQ.Queue.getJobCounts() -> { active, waiting, completed, failed }
     BullMQ.Queue.isPaused()
  3. return { queues }

PUT /api/admin/jobs/:name/pause
  1. auth + adminOnly
  2. BullMQ.Queue.pause()

PUT /api/admin/jobs/:name/resume
  1. auth + adminOnly
  2. BullMQ.Queue.resume()

POST /api/admin/jobs/:name/retry-failed
  1. auth + adminOnly
  2. BullMQ.Job.retry() for each failed job
```

#### libraries.ts
```
GET /api/libraries
  1. auth + adminOnly middleware
  2. SELECT * FROM external_libraries WHERE user_id = $1

POST /api/libraries
  1. auth + adminOnly middleware
  2. validate createLibrarySchema
  3. 验证importPath目录存在 (fs.access)
  4. INSERT INTO external_libraries

PUT /api/libraries/:id
  1. auth + adminOnly middleware
  2. validate updateLibrarySchema
  3. UPDATE external_libraries

DELETE /api/libraries/:id
  1. auth + adminOnly middleware
  2. 标记该库的所有照片为orphan (不删除文件)
  3. DELETE FROM external_libraries

POST /api/libraries/:id/scan
  1. auth + adminOnly middleware
  2. 添加library-scan BullMQ job
  3. return { job: 'queued' }
```

#### partners.ts
```
POST /api/partners
  1. auth middleware
  2. validate z.object({ partnerId: z.string() })
  3. 检查目标用户存在 -> 404
  4. 检查不能添加自己为伙伴 -> 400
  5. 检查不重复添加 -> 409
  6. INSERT INTO partner_sharing (shared_by_user_id, shared_with_user_id)
  7. return { partner }

GET /api/partners
  1. auth middleware
  2. SELECT ps.*, u.name, u.email FROM partner_sharing ps
     JOIN users u ON u.id = ps.shared_by_user_id
     WHERE ps.shared_with_user_id = $1
     UNION
     SELECT ps.*, u.name, u.email FROM partner_sharing ps
     JOIN users u ON u.id = ps.shared_with_user_id
     WHERE ps.shared_by_user_id = $1
  3. return { partners }

DELETE /api/partners/:id
  1. auth middleware
  2. DELETE FROM partner_sharing WHERE id = $1
     AND (shared_by_user_id = $2 OR shared_with_user_id = $2)
  3. return { success: true }

PUT /api/partners/:id
  1. auth middleware
  2. validate z.object({ inTimeline: z.boolean() })
  3. UPDATE partner_sharing SET in_timeline = $1
     WHERE id = $2 AND shared_with_user_id = $3
  4. return { partner }
```

#### settings.ts
```
GET /api/settings
  1. auth middleware
  2. SELECT locale FROM users WHERE id = $1
  3. return { settings: { locale, ocrLanguages: process.env.OCR_LANGUAGES?.split('+') } }

PUT /api/settings
  1. auth middleware
  2. validate z.object({ locale: z.enum(['zh', 'en']).optional() })
  3. UPDATE users SET locale = $1 WHERE id = $2
  4. return { settings }

DELETE /api/settings/account
  1. auth middleware
  2. validate deleteAccountSchema { password }
  3. bcryptjs.compare(password, user.password_hash) -> 401 if mismatch
  4. 删除用户的所有数据:
     a. SELECT file_path, thumbnail_path FROM photos WHERE user_id = $1
     b. unlink all files
     c. DELETE FROM photos WHERE user_id = $1 (CASCADE)
     d. DELETE FROM persons WHERE user_id = $1
     e. DELETE FROM albums WHERE user_id = $1
     f. DELETE FROM tags WHERE user_id = $1
     g. DELETE FROM search_history WHERE user_id = $1
     h. DELETE FROM api_keys WHERE user_id = $1
     i. DELETE FROM partner_sharing WHERE shared_by_user_id = $1 OR shared_with_user_id = $1
     j. DELETE FROM users WHERE id = $1
  5. return { success: true }
```

#### api-keys.ts
```
POST /api/api-keys
  1. auth middleware
  2. validate z.object({ name: z.string().min(1).max(100), permissions: z.array(z.string()).default([]) })
  3. 生成API Key: crypto.randomBytes(32).toString('hex')
  4. Hash Key: crypto.createHash('sha256').update(key).digest('hex')
  5. INSERT INTO api_keys (user_id, name, key_hash, permissions)
  6. return { apiKey: { id, name, key, permissions, createdAt } }
     注意: key只在创建时返回一次，之后无法查看

GET /api/api-keys
  1. auth middleware
  2. SELECT id, name, permissions, last_used_at, created_at FROM api_keys WHERE user_id = $1
  3. return { keys }

DELETE /api/api-keys/:id
  1. auth middleware
  2. DELETE FROM api_keys WHERE id = $1 AND user_id = $2
  3. return { success: true }
```

#### admin.ts (补充config端点)
```
GET /api/admin/config
  1. auth + adminOnly
  2. return {
       config: {
         defaultStorageQuota: 10737418240,
         ocrLanguages: process.env.OCR_LANGUAGES,
         clipModel: process.env.CLIP_MODEL,
         faceModel: process.env.FACE_MODEL,
         maxFileSize: '200mb',
         trashRetentionDays: process.env.TRASH_RETENTION_DAYS || 30,
         smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
         mlStatus: await getMLStatus()
       }
     }

PUT /api/admin/config
  1. auth + adminOnly
  2. validate z.object({ defaultStorageQuota: z.number().optional() })
  3. 更新系统配置 (存储在环境变量或config表中)
  4. return { config }
```

#### import.ts (数据导入)
```
POST /api/import/upload
  1. auth + adminOnly middleware
  2. upload.single('file') middleware (ZIP文件, 最大2GB)
  3. 解压ZIP到临时目录
  4. 检测导入类型:
     a. Google Photos Takeout: 查找metadata.json文件
     b. immich导出: 查找immich-export标记文件
     c. 普通目录结构: 直接扫描图片文件
  5. 创建import job (BullMQ)
  6. return { jobId }

GET /api/import/:jobId/status
  1. auth + adminOnly middleware
  2. 查询BullMQ job状态
  3. return { status: 'waiting'|'active'|'completed'|'failed', progress: { total, imported, skipped, failed } }

POST /api/import/directory
  1. auth + adminOnly middleware
  2. validate z.object({ path: z.string().min(1), recursive: z.boolean().default(true) })
  3. 验证目录存在 (fs.access)
  4. 创建import job
  5. return { job: 'queued' }

// Import Worker逻辑:
// 1. 扫描目录/解压后的文件
// 2. 对每个图片文件:
//    a. 计算hash, 检查重复
//    b. 读取Google Photos metadata.json (如果存在): 提取takenAt, description, location
//    c. INSERT INTO photos
//    d. 添加thumbnail/metadata/ocr/clip/face jobs
// 3. 更新进度: job.updateProgress({ total, imported, skipped, failed })
```

#### stats & health
```
GET /api/stats
  1. auth middleware
  2. SELECT
       COUNT(*) FILTER (WHERE file_type = 'image') as total_photos,
       COUNT(*) FILTER (WHERE file_type = 'video') as total_videos,
       COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) as monthly_new,
       SUM(file_size) as storage_used,
       COUNT(*) FILTER (WHERE processing_status = 'pending') as processing_queue,
       COUNT(*) FILTER (WHERE ocr_text IS NOT NULL) as ocr_completed,
       COUNT(*) FILTER (WHERE clip_embedding IS NOT NULL) as clip_completed,
       COUNT(*) FILTER (WHERE id IN (SELECT DISTINCT photo_id FROM faces)) as face_completed
     FROM photos WHERE user_id = $1 AND deleted_at IS NULL
  3. return Stats

GET /api/server/ping
  1. return 'pong'
```

#### events.ts (SSE实时推送)
```
GET /api/events
  1. auth middleware (从query参数?token=xxx或header获取token)
  2. 设置SSE headers:
     res.writeHead(200, {
       'Content-Type': 'text/event-stream',
       'Cache-Control': 'no-cache',
       'Connection': 'keep-alive',
       'X-Accel-Buffering': 'no'  // Nginx不缓冲
     })
  3. 存储连接: sseConnections.set(userId, res)
  4. 如果该用户已有连接: 关闭旧连接
  5. 心跳: setInterval(() => res.write('event: ping\ndata: {}\n\n'), 30000)
  6. req.on('close', () => sseConnections.delete(userId))
  7. 不返回HTTP响应体，保持长连接

// SSE推送函数 (跨容器通信方案):
// Workers运行在server容器(PM2管理的worker进程)，SSE连接也在server容器(api进程)，可通过Redis Pub/Sub跨进程通信
// 使用Redis Pub/Sub桥接:
//
// api/config/redis.ts 新增:
//   export async function publishSSE(userId: string, event: string, data: any) {
//     await redis.publish('sse:notify', JSON.stringify({ userId, event, data }))
//   }
//
// api/index.ts 启动时订阅:
//   const subscriber = new Redis(process.env.REDIS_URL)
//   subscriber.subscribe('sse:notify')
//   subscriber.on('message', (_channel, message) => {
//     const { userId, event, data } = JSON.parse(message)
//     const conn = sseConnections.get(userId)
//     if (conn) conn.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
//   })
//
// Worker完成时推送 (在Worker进程中调用):
//   thumbnail worker完成: publishSSE(userId, 'processing-progress', { photoId, stage: 'thumbnailing' })
//   ocr worker完成: publishSSE(userId, 'processing-progress', { photoId, stage: 'ocr' })
//   clip worker完成: publishSSE(userId, 'processing-progress', { photoId, stage: 'clip' })
//   face worker完成: publishSSE(userId, 'processing-complete', { photoId, stage: 'completed' })
//   任意worker失败: publishSSE(userId, 'processing-failed', { photoId, stage, error })
```

#### photos.ts (移动端备份API)
```
POST /api/photos/mobile-upload
  1. auth middleware
  2. upload.single('file') middleware
  3. 额外字段: deviceAssetId, deviceId, fileCreatedAt, livePhotoVideoId(可选)
  4. 计算文件hash (SHA-256)
  5. 检查重复: SELECT id FROM photos WHERE file_hash = $1 AND user_id = $2
  6. 如果重复: return 200 { photo: existingPhoto, skipped: true }
  7. 保存文件到 UPLOAD_DIR
  8. INSERT INTO photos (user_id, filename, original_name, file_path, mime_type,
     file_type, file_size, file_hash, device_asset_id, device_id, live_photo_video_id,
     taken_at, processing_status='pending')
  9. 添加thumbnail-generation和metadata-extraction jobs
  10. return 201 { photo }

GET /api/photos/existing
  1. auth middleware
  2. validate z.object({ hashes: z.string() })  // 逗号分隔的SHA-256列表
  3. SELECT id, file_hash FROM photos WHERE file_hash = ANY($1) AND user_id = $2
  4. return { existing: [file_hash1, file_hash2, ...] }

POST /api/photos/mobile-upload-batch
  1. auth middleware
  2. upload.array('files', 50) middleware
  3. 对每个文件执行mobile-upload相同逻辑
  4. return { photos: [...], skippedDuplicates: [...] }

GET /api/photos/device-albums
  1. auth middleware
  2. SELECT id, name, cover_path, is_shared FROM albums WHERE user_id = $1 ORDER BY name
  3. return { albums }  // 用于移动端Album Sync匹配同名相册
```

#### photos.ts (LivePhoto API)
```
GET /api/photos/:id/video
  1. auth middleware
  2. SELECT live_photo_video_id FROM photos WHERE id = $1 AND user_id = $2
  3. 如果无live_photo_video_id: return 404
  4. SELECT file_path FROM photos WHERE id = $1  // 视频文件
  5. res.sendFile(videoFilePath)

POST /api/photos/live-photo-pair
  1. auth middleware
  2. validate z.object({ photoId: z.string(), videoId: z.string() })
  3. 验证photoId和videoId都属于当前用户
  4. 验证photoId是image类型，videoId是video类型
  5. UPDATE photos SET live_photo_video_id = $1 WHERE id = $2 AND user_id = $3
  6. return { photo }
```

#### monitoring.ts (监控API)
```
GET /api/metrics
  1. auth middleware + adminOnly middleware
  2. 收集Prometheus格式指标:
     - http_requests_total (counter)
     - http_request_duration_seconds (histogram)
     - bullmq_queue_waiting (gauge per queue)
     - bullmq_queue_active (gauge per queue)
     - bullmq_queue_completed (counter per queue)
     - bullmq_queue_failed (counter per queue)
     - pg_pool_total (gauge)
     - pg_pool_idle (gauge)
     - pg_pool_waiting (gauge)
     - storage_used_bytes (gauge)
     - ml_inference_duration_seconds (histogram per model)
  3. res.type('text/plain').send(metrics)

GET /api/server/info
  1. auth middleware + adminOnly middleware
  2. 检查各服务状态:
     - PostgreSQL: SELECT 1
     - Redis/Valkey: redis.ping()
     - ML Service: fetch(ML_SERVICE_URL/health)
     - 磁盘空间: df -h /app/uploads
  3. 检查ML模型状态:
     - OCR模型是否已下载
     - CLIP模型是否已下载
     - Face模型是否已下载
  4. return { status, services: { postgres, redis, ml }, mlModels: { ocr, clip, face }, storage: { total, used, available } }
```

#### auth.ts (补充change-password)
```
POST /api/auth/change-password
  1. auth middleware
  2. validate z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(8).max(128) })
  3. SELECT password_hash FROM users WHERE id = $1
  4. bcryptjs.compare(oldPassword, password_hash) -> 401 if mismatch
  5. hash newPassword with bcrypt (salt rounds: 12)
  6. UPDATE users SET password_hash = $1 WHERE id = $2
  7. return { success: true }
  注意: 不删除sessions，旧token仍可用（用户可在设置页手动logout-all删除所有其他session）
```

#### photos.ts (补充grouped-by-date)
```
GET /api/photos/grouped/date
  1. auth middleware
  2. 可选查询参数: ?year=2024&month=12
  3. SELECT DATE(taken_at) as date, COUNT(*) as count
     FROM photos
     WHERE user_id = $1 AND deleted_at IS NULL AND is_archived = FALSE
       AND taken_at IS NOT NULL
       AND (year filter if provided) AND (month filter if provided)
     GROUP BY DATE(taken_at)
     ORDER BY date DESC
  4. return { groups: [{ date, count }] }
```

#### smart-albums.ts
```
GET /api/smart-albums
  1. auth middleware
  2. SELECT id, name, category_key, photo_count, cover_path, is_custom FROM smart_albums WHERE user_id = $1
  3. return { albums }

GET /api/smart-albums/:id
  1. auth middleware
  2. SELECT * FROM smart_albums WHERE id = $1 AND user_id = $2
  3. not found -> 404
  4. return { album }

GET /api/smart-albums/:id/photos
  1. auth middleware
  2. validate pagination query
  3. SELECT p.* FROM photos p JOIN smart_album_photos sap ON sap.photo_id = p.id WHERE sap.smart_album_id = $1 AND p.deleted_at IS NULL ORDER BY sap.similarity DESC LIMIT $2 OFFSET $3
  4. return { photos, total }

POST /api/smart-albums/custom
  1. auth middleware
  2. validate createCustomSmartAlbumSchema
  3. SELECT clip_embedding FROM photos WHERE id = ANY($1) AND user_id = $2
  4. 计算样本照片的平均向量作为center_vector
  5. INSERT INTO smart_albums (user_id, name, category_key, center_vector, is_custom=TRUE)
  6. 触发分类: 添加smart-album-classify job for all user photos
  7. return { album }

PUT /api/smart-albums/:id/threshold
  1. auth middleware
  2. validate updateThresholdSchema
  3. UPDATE smart_albums SET threshold = $1 WHERE id = $2 AND user_id = $3
  4. 触发重新分类: 添加smart-album-classify job
  5. return { album }

PUT /api/smart-albums/:id/recalculate
  1. auth middleware
  2. SELECT * FROM smart_albums WHERE id = $1 AND user_id = $2
  3. not found -> 404
  4. DELETE FROM smart_album_photos WHERE album_id = $1
  5. 添加smart-album-classify job { albumId, userId }
  6. return { album, message: 'Recalculation started' }

POST /api/smart-albums/classify
  1. auth middleware
  2. validate classifyPhotoSchema
  3. 添加smart-album-classify job { photoId, userId }
  4. return { jobId }
```

#### year-in-review.ts
```
GET /api/year-in-review
  1. auth middleware
  2. SELECT id, year, share_card_generated FROM year_in_reviews WHERE user_id = $1 ORDER BY year DESC
  3. return { reviews }

GET /api/year-in-review/:year
  1. auth middleware
  2. validate year is valid number
  3. SELECT * FROM year_in_reviews WHERE user_id = $1 AND year = $2
  4. not found -> 404
  5. 解析JSONB字段: top_person_data, travel_footprint, stats
  6. 获取关联照片详情: SELECT * FROM photos WHERE id = ANY(top_photo_ids)
  7. return YearInReview

POST /api/year-in-review/:year/generate
  1. auth middleware
  2. 添加year-in-review job { userId, year }
  3. return { jobId }

POST /api/year-in-review/:year/share-card
  1. auth middleware
  2. validate generateShareCardSchema
  3. 获取年度回顾数据
  4. 使用sharp生成分享卡片图片:
     - minimal: 简洁数据+Top 3照片
     - magazine: 杂志风格排版+Top 6照片
     - collage: 拼图风格+Top 12照片
  5. 保存到 THUMBNAIL_DIR/year-in-review/{userId}-{year}.png
  6. UPDATE year_in_reviews SET share_card_generated = TRUE
  7. return { imageUrl }

PUT /api/year-in-review/:year/exclusions
  1. auth middleware
  2. validate updateExclusionsSchema
  3. UPDATE year_in_reviews SET exclusions = $1 WHERE user_id = $2 AND year = $3
  4. 触发重新生成: 添加year-in-review job
  5. return { review }
```

#### duplicates.ts
```
GET /api/duplicates
  1. auth middleware
  2. validate query: ?type=exact|similar&page&limit
  3. 从Redis缓存获取: GET duplicates:{userId}
  4. if no cache: return { groups: [], total: 0, message: '请先执行扫描' }
  5. 分页返回分组数据
  6. return { groups: DuplicateGroup[], total }

POST /api/duplicates/scan
  1. auth middleware
  2. 检查是否已有扫描任务进行中
  3. 添加duplicate-detect job { userId, type: 'all' }
  4. return { jobId }

GET /api/duplicates/scan/status
  1. auth middleware
  2. 检查BullMQ job状态
  3. return { status: 'waiting'|'active'|'completed'|'failed', progress }

POST /api/duplicates/resolve
  1. auth middleware
  2. validate resolveDuplicateSchema
  3. 获取group中除keepId外的所有照片
  4. 将其他照片移入回收站: UPDATE photos SET deleted_at = NOW() WHERE id = ANY($1)
  5. 从Redis缓存中移除该group
  6. 记录活动日志
  7. return { success: true }

POST /api/duplicates/resolve-batch
  1. auth middleware
  2. validate resolveBatchSchema
  3. for each resolution: 执行resolve逻辑
  4. return { success: true, count: resolutions.length }
```

#### shared-libraries.ts
```
GET /api/shared-libraries
  1. auth middleware
  2. SELECT sl.*, (SELECT COUNT(*) FROM shared_library_members WHERE library_id = sl.id) as member_count
     FROM shared_libraries sl
     WHERE sl.created_by = $1 OR sl.id IN (SELECT library_id FROM shared_library_members WHERE user_id = $1)
  3. return { libraries }

POST /api/shared-libraries
  1. auth middleware
  2. validate createSharedLibrarySchema
  3. INSERT INTO shared_libraries (name, created_by)
  4. INSERT INTO shared_library_members (library_id, user_id, role='owner')
  5. return { library }

GET /api/shared-libraries/:id
  1. auth middleware
  2. 验证用户是成员: SELECT * FROM shared_library_members WHERE library_id = $1 AND user_id = $2
  3. not member -> 403
  4. SELECT sl.*, members, rules FROM shared_libraries sl JOIN ...
  5. return { library }

PUT /api/shared-libraries/:id
  1. auth middleware
  2. validate updateSharedLibrarySchema { name: z.string().min(1).max(100) }
  3. 验证调用者是owner
  4. UPDATE shared_libraries SET name = $1 WHERE id = $2
  5. return { library }

DELETE /api/shared-libraries/:id
  1. auth middleware
  2. 验证调用者是owner
  3. withTransaction:
     a. DELETE FROM shared_library_photos WHERE library_id = $1
     b. DELETE FROM shared_library_rules WHERE library_id = $1
     c. DELETE FROM shared_library_members WHERE library_id = $1
     d. DELETE FROM shared_libraries WHERE id = $1
  4. return { success: true }

POST /api/shared-libraries/:id/members
  1. auth middleware
  2. validate inviteMemberSchema
  3. 验证调用者是owner
  4. 验证目标用户存在
  5. INSERT INTO shared_library_members (library_id, user_id, role='member')
  6. 通知被邀请用户: publishSSE(targetUserId, 'shared-library-invite', { libraryId, libraryName })
  7. return { member }

DELETE /api/shared-libraries/:id/members/:userId
  1. auth middleware
  2. 验证调用者是owner或本人
  3. 不能移除owner
  4. DELETE FROM shared_library_members WHERE library_id = $1 AND user_id = $2
  5. DELETE FROM shared_library_photos WHERE added_by = $2 AND library_id = $1
  6. return { success: true }

PUT /api/shared-libraries/:id/rules
  1. auth middleware
  2. validate updateRulesSchema
  3. 验证调用者是owner
  4. DELETE FROM shared_library_rules WHERE library_id = $1
  5. INSERT INTO shared_library_rules for each rule
  6. 触发同步: 添加shared-library-sync job { libraryId }
  7. return { library }

GET /api/shared-libraries/:id/photos
  1. auth middleware
  2. 验证用户是成员
  3. SELECT p.* FROM photos p JOIN shared_library_photos slp ON slp.photo_id = p.id
     WHERE slp.library_id = $1 AND p.deleted_at IS NULL
     ORDER BY p.taken_at DESC LIMIT $2 OFFSET $3
  4. return { photos, total }

POST /api/shared-libraries/:id/sync
  1. auth middleware
  2. 验证调用者是owner
  3. 添加shared-library-sync job { libraryId }
  4. return { jobId }
```

#### activity-logs.ts
```
GET /api/activity-logs
  1. auth middleware + adminOnly
  2. validate activityLogQuerySchema
  3. SELECT * FROM activity_logs WHERE filters ORDER BY created_at DESC LIMIT $1 OFFSET $2
  4. return { logs, total }

GET /api/activity-logs/me
  1. auth middleware
  2. validate query (action, startDate, endDate, page, limit)
  3. SELECT * FROM activity_logs WHERE user_id = $1 AND filters ORDER BY created_at DESC LIMIT $2 OFFSET $3
  4. return { logs, total }
```

**活动日志记录点:**
- auth: login, logout, logout-all, change-password, password-reset
- photos: upload, delete, permanent-delete, restore, favorite, archive, edit
- albums: create, update, delete, add-photos, remove-photos
- share: create-link, delete-link, share-upload
- partners: add, remove
- shared-libraries: create, invite, remove-member, update-rules
- settings: update, delete-account
- admin: create-user, update-user, delete-user, update-config

#### auth.ts (补充2FA)
```
POST /api/auth/2fa/enable
  1. auth middleware
  2. validate enable2faSchema (需密码确认)
  3. 验证密码正确
  4. 生成TOTP密钥: crypto.randomBytes(20) -> base32编码
  5. 生成10个恢复码: crypto.randomBytes(20) per code -> hex编码
  6. 生成QR Code URL: otpauth://totp/AIAlbum:{email}?secret={secret}&issuer=AIAlbum
  7. UPDATE users SET two_factor_secret = $1, two_factor_enabled = FALSE, two_factor_recovery_codes = $2
  8. return { secret, qrCodeUrl, recoveryCodes }
  注意: 此时2FA尚未启用，需用户验证一次后才启用

POST /api/auth/2fa/verify
  1. auth middleware
  2. validate verify2faSchema
  3. 使用otpauth库验证TOTP码
  4. if valid: UPDATE users SET two_factor_enabled = TRUE
  5. return { success: true }

POST /api/auth/2fa/disable
  1. auth middleware
  2. validate enable2faSchema (需密码确认)
  3. 验证密码正确
  4. UPDATE users SET two_factor_secret = NULL, two_factor_enabled = FALSE, two_factor_recovery_codes = NULL
  5. return { success: true }

POST /api/auth/login/2fa
  1. validate login2faSchema
  2. 验证邮箱密码(同login流程)
  3. if user.two_factor_enabled:
     a. 验证TOTP码
     b. if code matches recovery code: 标记该恢复码已使用，从数组移除
     c. if invalid: return 401 "无效的验证码"
  4. generate JWT
  5. return { user, token }
```

#### data-export.ts
```
POST /api/data-export
  1. auth middleware
  2. validate dataExportSchema
  3. 检查是否有正在进行的导出任务
  4. 添加data-export job { userId, include }
  5. return { jobId }

GET /api/data-export/status
  1. auth middleware
  2. 检查BullMQ job状态
  3. if completed: return { status: 'completed', downloadUrl: '/api/data-export/download' }
  4. return { status, progress }

GET /api/data-export/download
  1. auth middleware
  2. 检查导出文件是否存在
  3. res.download(exportFilePath, `ai-album-export-${userId}-${date}.zip`)

data-export.worker.ts:
  1. 创建临时目录
  2. if include has 'photos':
     a. SELECT * FROM photos WHERE user_id = $1 AND deleted_at IS NULL
     b. 复制原始文件到 photos/ 子目录
     c. 生成 metadata.json (包含所有照片的元数据)
  3. if include has 'albums':
     a. 导出相册结构和照片关联
     b. 生成 albums.json
  4. if include has 'tags':
     a. 导出标签和照片关联
     b. 生成 tags.json
  5. if include has 'persons':
     a. 导出人物和照片关联
     b. 生成 persons.json
  6. 使用archiver打包为ZIP
  7. 保存到 /app/exports/{userId}-{timestamp}.zip
  8. 完成后通知: publishSSE(userId, 'data-export-complete', { downloadUrl })
```

#### setup.ts
```
GET /api/setup/status
  1. 无需认证
  2. SELECT value FROM system_config WHERE key = 'setup_completed'
  3. if value = 'true': return { isSetup: true }
  4. return { isSetup: false }

POST /api/setup/admin
  1. 无需认证(仅未配置时可访问)
  2. 检查setup_completed = false，否则返回403
  3. validate setupAdminSchema
  4. 检查是否已有用户(不应有)
  5. INSERT INTO users (email, password_hash, name, role='admin')
  6. UPDATE system_config SET value = 'true' WHERE key = 'setup_completed'
  7. generate JWT
  8. return { user, token }

PUT /api/setup/storage
  1. auth middleware + adminOnly
  2. validate setupStorageSchema
  3. 验证目录存在且可写
  4. UPDATE system_config SET value = json WHERE key = 'storage_config'

PUT /api/setup/smtp
  1. auth middleware + adminOnly
  2. validate setupSmtpSchema
  3. 测试SMTP连接
  4. UPDATE system_config SET value = json WHERE key = 'smtp_config'

GET /api/setup/ml-status
  1. auth middleware
  2. 调用ML Service: GET http://ml:3001/health
  3. 检查模型文件是否存在
  4. return { models: { ocr: { loaded, size }, clip: { loaded, size }, face: { loaded, size } }, progress }
```

#### pick-score.ts (P2 Feature: 精选照片评分)
```
GET /api/photos/picks
  1. auth middleware
  2. validate pickScoreQuerySchema: z.object({ limit: z.coerce.number().min(1).max(100).default(20), albumId: z.string().uuid().optional(), personId: z.string().uuid().optional() })
  3. 构建查询:
     SELECT id, filename, original_name, pick_score, thumbnail_path, taken_at
     FROM photos WHERE user_id = $1 AND deleted_at IS NULL AND pick_score IS NOT NULL
     [AND album filter if albumId provided via JOIN photo_albums]
     [AND person filter if personId provided via JOIN faces]
     ORDER BY pick_score DESC NULLS LAST LIMIT $2
  4. return photos[]

POST /api/photos/:id/pick-score
  1. auth middleware + verifyOwnership
  2. 调用ML Service计算pick score:
     POST http://ml:3001/api/ml/pick-score
     { photo_id, thumbnail_path }
  3. ML Service处理:
     a. 加载缩略图: sharp(thumbnail_path)
     b. 计算clarity_score: 使用Laplacian方差(拉普拉斯算子卷积后求方差)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        clarity = cv2.Laplacian(gray, cv2.CV_64F).var()
        clarity_score = min(clarity / 500.0, 1.0)  // 归一化到0-1
     c. 计算composition_score: 使用三分法规则
        h, w = img.shape[:2]
        third_x, third_y = w // 3, h // 3
        edges = cv2.Canny(gray, 50, 150)
        composition = (np.sum(edges[:, third_x-5:third_x+5]) + np.sum(edges[third_y-5:third_y+5, :])) / np.sum(edges + 1)
        composition_score = min(composition * 10, 1.0)
     d. 计算expression_score: 如果有人脸则基于人脸表情丰富度
        检测人脸数量和表情关键点, expression = min(face_count * 0.3, 1.0)
        如果无人脸: expression_score = 0.5 (中性)
     e. pick_score = clarity_score * 0.4 + composition_score * 0.3 + expression_score * 0.3
     f. return { pick_score: float, clarity: clarity_score, composition: composition_score, expression: expression_score }
  4. UPDATE photos SET pick_score = $1 WHERE id = $2
  5. return { pickScore, details }

POST /api/photos/batch-pick-score
  1. auth middleware
  2. validate: z.object({ albumId: z.string().uuid().optional(), force: z.boolean().default(false) })
  3. 查询需要评分的照片:
     SELECT id, thumbnail_path FROM photos
     WHERE user_id = $1 AND deleted_at IS NULL AND (pick_score IS NULL OR $2 = true)
     [AND album filter]
     LIMIT 1000
  4. for each photo: 添加pick-score job到BullMQ队列
  5. return { queued: count }
```

#### xmp-sidecar.ts (P2 Feature: XMP Sidecar解析)
```
POST /api/photos/:id/xmp
  1. auth middleware + verifyOwnership
  2. 查找XMP文件:
     a. 照片路径: /uploads/{userId}/{yyyy-MM}/{uuid}.{ext}
     b. XMP路径: 同目录下 {uuid}.xmp 或 {original_name}.xmp
     c. if !fs.existsSync(xmpPath): return 404 { message: 'XMP file not found' }
  3. 读取并解析XMP:
     a. xmpContent = fs.readFileSync(xmpPath, 'utf-8')
     b. 使用fast-xml-parser解析:
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
        const result = parser.parse(xmpContent)
     c. 提取关键字段:
        - rating: result.xmpmeta.RDF.Description['@_xmp:Rating'] (0-5)
        - description: result.xmpmeta.RDF.Description['@_dc:description'] 或 ['@_xmp:Description']
        - tags: result.xmpmeta.RDF.Description['@_dc:subject'] 或 Bag结构中的li元素
        - gps: result.xmpmeta.RDF.Description['@_exif:GPSLatitude'] + Longitude
        - taken_at: result.xmpmeta.RDF.Description['@_xmp:CreateDate']
        - orientation: result.xmpmeta.RDF.Description['@_tiff:Orientation']
  4. 更新照片:
     UPDATE photos SET
       rating = COALESCE($1, rating),
       description = COALESCE($2, description),
       latitude = COALESCE($3, latitude),
       longitude = COALESCE($4, longitude)
     WHERE id = $5
  5. if tags存在: 创建/关联标签
     for each tag in xmpTags:
       a. INSERT INTO tags (name) ON CONFLICT (name) DO NOTHING
       b. INSERT INTO photo_tags (photo_id, tag_id) ON CONFLICT DO NOTHING
  6. return { updated: { rating, description, tags, gps } }

POST /api/photos/batch-xmp-import
  1. auth middleware
  2. 查找用户所有有XMP sidecar但未导入的照片:
     a. 扫描UPLOAD_DIR下所有.xmp文件
     b. 匹配对应的照片文件
     c. 过滤已导入的(photos.description IS NULL AND photos.rating IS NULL)
  3. 为每个匹配的照片添加xmp-import job
  4. return { queued: count }
```

#### immich-migration.ts (P2 Feature: immich迁移)
```
GET /api/migration/immich/status
  1. auth middleware + adminOnly
  2. SELECT * FROM system_config WHERE key = 'immich_migration_status'
  3. return { status, progress, totalPhotos, migratedPhotos, errors }

POST /api/migration/immich/start
  1. auth middleware + adminOnly
  2. validate immichMigrationSchema: z.object({
       pgHost: z.string().min(1), pgPort: z.coerce.number().default(5432),
       pgDatabase: z.string().default('immich'), pgUser: z.string(), pgPassword: z.string(),
       uploadPath: z.string(), mode: z.enum(['copy', 'reference']).default('copy')
     })
  3. 测试immich数据库连接:
     const immichPool = new Pool({ host, port, database, user, password })
     await immichPool.query('SELECT 1')
  4. 创建迁移状态记录:
     INSERT INTO system_config (key, value) VALUES ('immich_migration_status', json)
  5. 添加immich-migration job到BullMQ队列
  6. return { migrationId }

immich-migration Worker处理:
  1. 连接immich PostgreSQL数据库
  2. 迁移用户:
     SELECT email, name, password AS password_hash FROM immich.users
     for each: INSERT INTO users ... ON CONFLICT (email) DO UPDATE
  3. 迁移照片:
     SELECT * FROM immich.assets WHERE type = 'IMAGE'
     for each asset:
       a. 映射用户ID: immich.userId -> 本地userId
       b. if mode === 'copy':
          复制文件到本地UPLOAD_DIR/{userId}/{yyyy-MM}/{uuid}.{ext}
       c. if mode === 'reference':
          直接引用immich文件路径, 设置library_id指向外部库
       d. INSERT INTO photos (user_id, filename, original_name, file_path, mime_type,
          file_type, file_size, file_hash, taken_at, latitude, longitude,
          is_favorite, description, rating, processing_status='pending')
       e. 添加thumbnail + metadata jobs
  4. 迁移相册:
     SELECT * FROM immich.albums
     for each: INSERT INTO albums (user_id, name, description, cover_photo_id)
     迁移相册-照片关联: INSERT INTO photo_albums
  5. 迁移人脸:
     SELECT * FROM immich.person
     for each: INSERT INTO persons (user_id, name, feature_face_path)
     SELECT * FROM immich.face_detection
     for each: INSERT INTO faces (photo_id, person_id, bbox, confidence, embedding)
  6. 更新迁移状态: UPDATE system_config SET value = json WHERE key = 'immich_migration_status'
  7. 完成后通知: publishSSE(adminId, 'migration-complete', { totalPhotos, migratedPhotos, errors })

GET /api/migration/immich/preview
  1. auth middleware + adminOnly
  2. validate immichMigrationSchema (同start)
  3. 连接immich数据库, 统计:
     SELECT COUNT(*) FROM immich.assets WHERE type = 'IMAGE' -> photoCount
     SELECT COUNT(*) FROM immich.assets WHERE type = 'VIDEO' -> videoCount
     SELECT COUNT(*) FROM immich.albums -> albumCount
     SELECT COUNT(*) FROM immich.person -> personCount
     SELECT COUNT(*) FROM immich.users -> userCount
  4. return { photoCount, videoCount, albumCount, personCount, userCount, estimatedSize }
```

#### sessions.ts (会话管理 - 参考immich Sessions)
```
GET /api/sessions
  1. auth middleware
  2. SELECT id, user_id, token_hash, device_info, ip_address, created_at, last_active_at
     FROM sessions WHERE user_id = $1 ORDER BY last_active_at DESC
  3. 当前会话通过JWT中的jti claim识别，标记为current=true
  4. return { sessions: Session[] }

DELETE /api/sessions/:id
  1. auth middleware
  2. 验证session属于当前用户: SELECT * FROM sessions WHERE id = $1 AND user_id = $2
  3. 不属于 -> 403
  4. 不能删除当前会话 -> 400 "Cannot delete current session"
  5. DELETE FROM sessions WHERE id = $1
  6. return { success: true }

DELETE /api/sessions (删除所有其他会话)
  1. auth middleware
  2. 获取当前会话jti: const currentJti = req.user.jti
  3. DELETE FROM sessions WHERE user_id = $1 AND token_hash != (SELECT token_hash FROM sessions WHERE id = $2)
  4. return { deletedCount }
```

#### notifications.ts (通知系统 - 参考immich Notifications)
```
GET /api/notifications
  1. auth middleware
  2. validate notificationQuerySchema
  3. SELECT * FROM notifications WHERE user_id = $1
     [AND type = $2] [AND read_at IS NULL] ORDER BY created_at DESC LIMIT $3 OFFSET $4
  4. return PaginatedResponse<Notification>

PUT /api/notifications/read
  1. auth middleware
  2. validate markNotificationReadSchema: { ids: string[] }
  3. UPDATE notifications SET read_at = NOW() WHERE id = ANY($1) AND user_id = $2
  4. return { updatedCount }

PUT /api/notifications/read-all
  1. auth middleware
  2. UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL
  3. return { updatedCount }

GET /api/notifications/unread-count
  1. auth middleware
  2. SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL
  3. return { count }

GET /api/notifications/settings
  1. auth middleware
  2. SELECT * FROM notification_settings WHERE user_id = $1
  3. return NotificationSettings

PUT /api/notifications/settings
  1. auth middleware
  2. validate updateNotificationSettingSchema
  3. INSERT INTO notification_settings (user_id, ...) ON CONFLICT (user_id) DO UPDATE SET ...
  4. return NotificationSettings
```

#### activities.ts (相册活动/评论 - 参考immich Activities)
```
GET /api/activities
  1. auth middleware
  2. validate activityQuerySchema: { albumId, assetId?, type?, page, limit }
  3. 验证用户有权访问该相册:
     SELECT 1 FROM album_users WHERE album_id = $1 AND user_id = $2
     UNION SELECT 1 FROM albums WHERE id = $1 AND user_id = $2
  4. 无权限 -> 403
  5. SELECT a.*, u.name, u.email FROM activities a JOIN users u ON a.user_id = u.id
     WHERE a.album_id = $1 [AND a.asset_id = $2] [AND a.type = $3]
     ORDER BY a.created_at ASC LIMIT $4 OFFSET $5
  6. return Activity[]

POST /api/activities
  1. auth middleware
  2. validate createActivitySchema: { albumId, assetId?, type, comment? }
  3. 验证用户有权访问该相册(同上)
  4. type='like'时检查是否已点赞:
     SELECT id FROM activities WHERE album_id = $1 AND user_id = $2 AND type = 'like'
     [AND asset_id = $3]
     已存在 -> 409 "Already liked"
  5. type='comment'时comment必填 -> 400
  6. INSERT INTO activities (album_id, asset_id, user_id, type, comment) VALUES (...)
  7. 发布SSE通知给相册其他成员
  8. return Activity

DELETE /api/activities/:id
  1. auth middleware
  2. SELECT * FROM activities WHERE id = $1
  3. 不存在 -> 404
  4. 仅活动创建者或相册owner或Admin可删除:
     if (activity.user_id !== req.user.id && !isAdmin && !isAlbumOwner) -> 403
  5. DELETE FROM activities WHERE id = $1
  6. return 204

GET /api/activities/statistics
  1. auth middleware
  2. albumId (required), assetId (optional)
  3. SELECT
       COUNT(*) FILTER (WHERE type = 'comment') as comments,
       COUNT(*) FILTER (WHERE type = 'like') as likes
     FROM activities WHERE album_id = $1 [AND asset_id = $2]
  4. return { comments, likes }
```

#### system-config.ts (系统配置 - 参考immich System Config)
```
GET /api/admin/config
  1. auth middleware + adminOnly
  2. SELECT key, value, updated_at FROM system_config ORDER BY key
  3. return SystemConfig[]

GET /api/admin/config/:key
  1. auth middleware + adminOnly
  2. SELECT value FROM system_config WHERE key = $1
  3. 不存在 -> 404
  4. return { key, value }

PUT /api/admin/config
  1. auth middleware + adminOnly
  2. validate batchUpdateSystemConfigSchema: { configs: [{key, value}] }
  3. for each config:
     INSERT INTO system_config (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
  4. 记录审计日志: INSERT INTO activity_logs (user_id, action, resource, details)
  5. return { updatedCount }

GET /api/admin/config/defaults
  1. auth middleware + adminOnly
  2. 返回所有配置项的默认值(硬编码在代码中)
  3. return { defaults: Record<string, unknown> }
```

**系统配置项定义 (system_config表存储):**
| key | 默认值 | 说明 |
|-----|--------|------|
| passwordLogin.enabled | true | 是否允许密码登录 |
| oauth.enabled | false | 是否启用OAuth |
| oauth.providers | [] | OAuth提供商配置 |
| storage.template | "{year}/{month}/{day}" | 存储路径模板 |
| trash.enabled | true | 是否启用回收站 |
| trash.retentionDays | 30 | 回收站保留天数 |
| ocr.enabled | true | 是否启用OCR |
| ocr.languages | ["chi_sim","eng"] | OCR默认语言 |
| clip.enabled | true | 是否启用CLIP |
| clip.model | "XLM-Roberta-Large-Vit-B-16Plus" | CLIP模型 |
| face.enabled | true | 是否启用人脸识别 |
| face.minScore | 0.7 | 人脸检测最低置信度 |
| face.maxDistance | 0.4 | 人脸聚类最大距离 |
| notifications.email.enabled | false | 是否启用邮件通知 |
| notifications.email.from | "noreply@aialbum.com" | 通知邮件发件人 |
| map.enabled | true | 是否启用地图功能 |
| map.defaultCenter | [39.9042, 116.4074] | 地图默认中心(北京) |
| map.tileUrl | "" | 地图瓦片服务URL |
| newVersionCheck.enabled | true | 是否启用版本更新检查 |
| publicSignup.enabled | true | 是否允许公开注册 |

#### server-info.ts (服务器信息 - 参考immich Server Info)
```
GET /api/server/ping
  1. 无需认证
  2. return { res: "pong" }

GET /api/server/info
  1. auth middleware (需认证)
  2. return {
       version: process.env.npm_package_version || '0.1.0',
       database: { postgresUp: true },
       redis: { up: true },
       mlService: { up: true/false },
       storage: { total, used, available },
       usage: { totalPhotos, totalVideos, totalUsers, totalStorageUsed }
     }
  注意: 不暴露nodeVersion、database.version/size、redis.usedMemory等内部细节(防止信息泄露)

GET /api/server/stats
  1. auth middleware + adminOnly
  2. SELECT COUNT(*) FROM photos, users, albums, etc.
  3. SELECT pg_database_size(current_database())
  4. return { photos, videos, users, albums, storageUsed, dbSize }

GET /api/server/version
  1. auth middleware (需认证)
  2. return { version, updateAvailable, changelog }
  注意: 不暴露latestVersion给普通用户(仅Admin可见)

POST /api/server/version/check
  1. auth middleware + adminOnly
  2. 查询GitHub API: GET https://api.github.com/repos/{owner}/{repo}/releases/latest
  3. 比较版本号
  4. 更新system_config: version_check.last_checked, version_check.latest_version
  5. return { current, latest, updateAvailable }
```

#### subscriptions.ts (Phase 5: 订阅管理)
```
GET /api/subscriptions/plans
  1. 无需认证(公开)
  2. SELECT * FROM subscription_plans ORDER BY price_monthly
  3. return SubscriptionPlan[]

POST /api/subscriptions/checkout
  1. auth middleware
  2. validate createCheckoutSchema: { planId, successUrl, cancelUrl }
  3. 获取计划详情: SELECT * FROM subscription_plans WHERE id = $1
  4. 创建或获取Stripe客户:
     a. 查询用户是否已有stripe_customer_id
     b. 无则: stripe.customers.create({ email: user.email, metadata: { userId: user.id } })
     c. UPDATE users SET stripe_customer_id = $1 WHERE id = $2
  5. 创建Checkout Session:
     stripe.checkout.sessions.create({
       customer: stripeCustomerId,
       mode: 'subscription',
       line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
       success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
       cancel_url: cancelUrl,
       subscription_data: { trial_period_days: 14, metadata: { userId: user.id, planId: plan.id } },
       allow_promotion_codes: true,
     })
  6. return { checkoutUrl: session.url }

POST /api/subscriptions/webhook
  1. 验证Stripe签名: stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  2. 签名无效 -> 400
  3. 按event.type处理:
     a. checkout.session.completed:
        - 从metadata获取userId和planId
        - INSERT INTO subscriptions (user_id, plan_id, status='active', stripe_subscription_id, ...)
        - UPDATE users SET storage_quota = plan.storage_bytes
        - 发布SSE通知: 'subscription-activated'
     b. customer.subscription.updated:
        - UPDATE subscriptions SET status, current_period_start/end WHERE stripe_subscription_id = $1
     c. customer.subscription.deleted:
        - UPDATE subscriptions SET status = 'canceled'
        - 降级配额: UPDATE users SET storage_quota = 5368709120 (5GB免费)
        - 发布SSE通知: 'subscription-canceled'
     d. invoice.paid:
        - INSERT INTO invoices (user_id, subscription_id, amount, status='paid', stripe_invoice_id, pdf_url)
        - 发送邮件通知
     e. invoice.payment_failed:
        - UPDATE subscriptions SET status = 'past_due'
        - 发送邮件提醒
  4. return { received: true }

GET /api/subscriptions/current
  1. auth middleware
  2. SELECT s.*, sp.name as plan_name, sp.storage_bytes, sp.ai_features
     FROM subscriptions s JOIN subscription_plans sp ON s.plan_id = sp.id
     WHERE s.user_id = $1 AND s.status IN ('active', 'trialing', 'past_due')
     ORDER BY s.created_at DESC LIMIT 1
  3. 无订阅 -> return { plan: 'free', limits: PLAN_LIMITS.free }
  4. return { subscription, plan, limits: PLAN_LIMITS[plan.name] }

POST /api/subscriptions/cancel
  1. auth middleware
  2. validate cancelSubscriptionSchema: { reason? }
  3. 获取当前活跃订阅
  4. 无订阅 -> 404
  5. 设置期末取消:
     stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true })
     UPDATE subscriptions SET cancel_at_period_end = true
  6. 记录取消原因: INSERT INTO subscription_cancellation_reasons (subscription_id, reason)
  7. return { cancelAtPeriodEnd: true, currentPeriodEnd }

POST /api/subscriptions/portal
  1. auth middleware
  2. 获取用户stripe_customer_id
  3. 创建Customer Portal Session:
     stripe.billingPortal.sessions.create({
       customer: stripeCustomerId,
       return_url: FRONTEND_URL + '/settings/subscription',
     })
  4. return { portalUrl: session.url }

GET /api/subscriptions/invoices
  1. auth middleware
  2. SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20
  3. return Invoice[]
```

#### tenants.ts (Phase 5: 多租户管理)
```
POST /api/admin/tenants
  1. auth middleware + adminOnly
  2. validate createTenantSchema: { name, domain?, planId?, settings? }
  3. 检查domain唯一性(如果提供): SELECT 1 FROM tenants WHERE domain = $1 -> 409
  4. INSERT INTO tenants (name, domain, plan_id, settings) VALUES (...)
  5. 创建默认品牌配置: INSERT INTO tenant_branding (tenant_id) VALUES ($1)
  6. return Tenant

GET /api/admin/tenants
  1. auth middleware + adminOnly
  2. SELECT t.*, sp.name as plan_name FROM tenants t LEFT JOIN subscription_plans sp ON t.plan_id = sp.id
     ORDER BY t.created_at DESC
  3. return Tenant[]

PUT /api/admin/tenants/:id
  1. auth middleware + adminOnly
  2. validate updateTenantSchema
  3. UPDATE tenants SET name = $1, domain = $2, ... WHERE id = $3
  4. return Tenant

GET /api/admin/tenants/:id/resources
  1. auth middleware + adminOnly
  2. validate tenantResourceQuerySchema
  3. 查询租户资源使用:
     SELECT
       (SELECT COUNT(*) FROM users WHERE tenant_id = $1) as user_count,
       (SELECT COUNT(*) FROM photos WHERE tenant_id = $1) as photo_count,
       (SELECT COALESCE(SUM(file_size), 0) FROM photos WHERE tenant_id = $1) as storage_used,
       (SELECT COUNT(*) FROM api_keys WHERE user_id IN (SELECT id FROM users WHERE tenant_id = $1)) as api_key_count
  4. return TenantResourceUsage

DELETE /api/admin/tenants/:id
  1. auth middleware + adminOnly
  2. 确认租户存在: SELECT * FROM tenants WHERE id = $1 -> 404
  3. 检查租户下无活跃用户(或强制删除):
     SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = 'admin'
  4. 软删除: UPDATE tenants SET deleted_at = NOW() WHERE id = $1
  5. 或硬删除(含所有关联数据):
     DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE tenant_id = $1)
     DELETE FROM faces WHERE person_id IN (SELECT id FROM persons WHERE user_id IN (...))
     ...级联删除...
     DELETE FROM tenants WHERE id = $1
  6. return { success: true }

POST /api/admin/tenants/:id/export
  1. auth middleware + adminOnly
  2. 添加tenant-export job到BullMQ队列
  3. Worker: 导出租户所有数据为JSON+ZIP
  4. return { exportId, status: 'pending' }
```

#### branding.ts (Phase 5: 白标/品牌定制)
```
GET /api/branding
  1. 无需认证(公开)
  2. 根据请求域名查找租户: SELECT tenant_id FROM tenants WHERE domain = $1
  3. 无租户 -> 返回默认品牌配置
  4. SELECT * FROM tenant_branding WHERE tenant_id = $1
  5. return TenantBranding

PUT /api/admin/branding
  1. auth middleware + adminOnly
  2. validate updateBrandingSchema
  3. 获取当前租户: SELECT tenant_id FROM users WHERE id = $1
  4. UPDATE tenant_branding SET primary_color = $1, app_name = $2, ... WHERE tenant_id = $3
  5. 清除品牌缓存: DEL branding:{tenantId}
  6. return TenantBranding

POST /api/admin/branding/logo
  1. auth middleware + adminOnly
  2. multer接收文件(限制: 2MB, image/png+image/svg+xml)
  3. 保存到 uploads/branding/{tenantId}/logo.{ext}
  4. 生成多种尺寸: sharp().resize(32,32) -> favicon, sharp().resize(192,192) -> app-icon
  5. UPDATE tenant_branding SET logo_url = $1, favicon_url = $2 WHERE tenant_id = $3
  6. return { logoUrl, faviconUrl }

POST /api/admin/branding/login-background
  1. auth middleware + adminOnly
  2. multer接收文件(限制: 5MB, image/jpeg+image/png+image/webp)
  3. 保存到 uploads/branding/{tenantId}/login-bg.{ext}
  4. sharp().resize(1920,1080,{fit:'cover'}) -> 优化尺寸
  5. UPDATE tenant_branding SET login_background_url = $1 WHERE tenant_id = $2
  6. return { loginBackgroundUrl }
```

#### invitations.ts (Phase 5: 邀请奖励)
```
POST /api/invitations
  1. auth middleware
  2. validate createInvitationSchema: { maxUses, rewardStorageBytes, expiresAt? }
  3. 生成邀请码: crypto.randomBytes(8).toString('base64url')
  4. INSERT INTO invitations (code, created_by, max_uses, reward_storage_bytes, expires_at) VALUES (...)
  5. return { code, inviteUrl: `${FRONTEND_URL}/invite/${code}` }

GET /api/invitations
  1. auth middleware
  2. SELECT * FROM invitations WHERE created_by = $1 ORDER BY created_at DESC
  3. return Invitation[]

POST /api/invitations/:code/redeem
  1. auth middleware
  2. SELECT * FROM invitations WHERE code = $1 AND (expires_at IS NULL OR expires_at > NOW())
  3. 不存在或过期 -> 404 "Invalid or expired invitation"
  4. 检查使用次数: current_uses >= max_uses -> 410 "Invitation fully redeemed"
  5. 检查是否已使用: SELECT 1 FROM invitation_uses WHERE invitation_id = $1 AND user_id = $2 -> 409
  6. UPDATE invitations SET current_uses = current_uses + 1 WHERE id = $1
  7. INSERT INTO invitation_uses (invitation_id, user_id) VALUES ($1, $2)
  8. 奖励双方存储空间:
     UPDATE users SET storage_quota = storage_quota + $1 WHERE id IN ($2, $3)
  9. 发送通知给邀请人
  10. return { rewardStorageBytes }
```

#### feedback.ts (Phase 5: 反馈收集)
```
POST /api/feedback
  1. auth middleware (可选,允许匿名)
  2. validate submitFeedbackSchema: { category, title, description, screenshotUrl?, userEmail? }
  3. INSERT INTO feedback (user_id, category, title, description, screenshot_url, user_email)
     VALUES (...)
  4. 如果是bug: 发送邮件通知Admin
  5. return { id, message: "Thank you for your feedback" }

GET /api/admin/feedback
  1. auth middleware + adminOnly
  2. SELECT f.*, u.name, u.email FROM feedback f LEFT JOIN users u ON f.user_id = u.id
     ORDER BY f.created_at DESC LIMIT 50
  3. return Feedback[]

PUT /api/admin/feedback/:id/status
  1. auth middleware + adminOnly
  2. UPDATE feedback SET status = $1 WHERE id = $2
  3. return { success: true }
```

### 2.9 Worker Implementation (api/workers/index.ts)
```typescript
// 入口:
// 1. 连接Redis和PostgreSQL
// 2. 注册所有Worker (共15个):
//    - new Worker('thumbnail-generation', thumbnailProcessor, { concurrency: 4, connection })
//    - new Worker('metadata-extraction', metadataProcessor, { concurrency: 2, connection })
//    - new Worker('ocr-processing', ocrProcessor, { concurrency: 1, connection })
//    - new Worker('clip-embedding', clipProcessor, { concurrency: 1, connection })
//    - new Worker('face-detection', faceProcessor, { concurrency: 1, connection })
//    - new Worker('face-cluster', faceClusterProcessor, { concurrency: 1, connection })
//    - new Worker('geocoding', geocodeProcessor, { concurrency: 2, connection })
//    - new Worker('smart-album-classify', smartAlbumClassifyProcessor, { concurrency: 2, connection })
//    - new Worker('duplicate-detect', duplicateDetectProcessor, { concurrency: 1, connection })
//    - new Worker('shared-library-sync', sharedLibrarySyncProcessor, { concurrency: 1, connection })
//    - new Worker('year-in-review', yearInReviewProcessor, { concurrency: 1, connection })
//    - new Worker('stack-detect', stackDetectProcessor, { concurrency: 2, connection })
//    - new Worker('library-scan', libraryScanProcessor, { concurrency: 1, connection })
//    - new Worker('import-upload', importUploadProcessor, { concurrency: 1, connection })
//    - new Worker('trash-cleanup', trashCleanupProcessor, { connection })
//    - new Worker('data-export', dataExportProcessor, { concurrency: 1, connection })
//    - new Worker('pick-score', pickScoreProcessor, { concurrency: 2, connection })
//    - new Worker('xmp-import', xmpImportProcessor, { concurrency: 2, connection })
// 3. 注册定时任务 (Repeatable Jobs):
//    - trash-cleanup: new Queue('trash-cleanup').add('cleanup', {}, { repeat: { pattern: '0 3 * * *' } }) // 每天凌晨3点
//    - year-in-review: new Queue('year-in-review').add('auto-generate', {}, { repeat: { pattern: '0 8 1 12 *' } }) // 每年12月1日8点
//    - storage-quota-check: new Queue('storage-quota-check').add('check', {}, { repeat: { pattern: '0 4 * * *' } }) // 每天凌晨4点
// 4. Worker事件处理:
//    on('completed') -> 更新photo processing_status
//    on('failed') -> 更新photo processing_status='failed', 记录error
// 5. Job链: metadata完成后自动触发ocr/clip/face/geocode
// 6. 优雅关闭:
//    process.on('SIGTERM', async () => {
//      logger.info('SIGTERM received, shutting down gracefully...')
//      const workers = [thumbnailWorker, metadataWorker, ...]
//      await Promise.all(workers.map(w => w.close(true))) // true = 等待当前job完成
//      await pool.end()
//      await redis.quit()
//      process.exit(0)
//    })
//    process.on('SIGINT', () => process.emit('SIGTERM'))
```

### 2.10 Worker Processors

#### thumbnail.worker.ts
```typescript
// 输入: ThumbnailJob { photoId, filePath, mimeType }
// 处理:
//   if mimeType starts with 'image/':
//     1. sharp(filePath)
//     2. .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
//     3. .jpeg({ quality: 80 })
//     4. .toFile(thumbnailPath)  // THUMBNAIL_DIR/{photoId}.jpg
//     5. 同时生成小缩略图: .resize(200, 200) 用于列表展示
//   if mimeType starts with 'video/':
//     1. 使用fluent-ffmpeg提取第1帧:
//        ffmpeg(filePath).screenshots({ timestamps: ['50%'], filename: `${photoId}.jpg`, folder: THUMBNAIL_DIR })
//     2. sharp(thumbnailPath).resize(800, 800, { fit: 'inside' }).jpeg({ quality: 80 }).toFile(finalThumbnail)
//     3. 使用fluent-ffmpeg获取视频时长:
//        ffmpeg(filePath).ffprobe((err, data) => { duration = data.format.duration })
//     4. UPDATE photos SET duration = $1 WHERE id = $2
//   5. UPDATE photos SET thumbnail_path = $1 WHERE id = $2
```

#### metadata.worker.ts
```typescript
// 输入: MetadataJob { photoId, filePath }
// 处理:
//   1. exifr.parse(filePath, { tiff: true, exif: true, gps: true })
//   2. 提取: width, height, takenAt (DateTimeOriginal), latitude, longitude
//   3. UPDATE photos SET width, height, taken_at, latitude, longitude, processing_status='metadata'
//   4. 如果有GPS坐标, 添加geocoding job
//   5. 检查file_type: 仅image类型添加AI处理jobs
//      SELECT file_type FROM photos WHERE id = $1
//      if file_type === 'image':
//        a. 添加ocr-processing job
//        b. 添加clip-embedding job
//        c. 添加face-detection job
//      if file_type === 'video':
//        a. 跳过OCR/CLIP/Face (视频仅生成缩略图和元数据)
//        b. UPDATE photos SET processing_status='completed'
//   6. 添加stack-detect job (image和video都执行)
```

#### geocode.worker.ts
```typescript
// 输入: GeocodeJob { photoId, latitude, longitude }
// 处理:
//   1. 查询离线GeoNames数据库 (简化版: 使用pg内置的坐标分组)
//   2. 或调用本地Nominatim (如果部署了)
//   3. 简化方案: 使用预导入的GeoNames城市数据表
//   4. UPDATE photos SET location_name = $1 WHERE id = $2
```

#### ocr.worker.ts
```typescript
// 输入: OcrJob { photoId, filePath, languages }
// 处理:
//   1. POST ML_SERVICE_URL/api/ml/ocr { image_path, languages }
//   2. UPDATE photos SET ocr_text = $1 WHERE id = $2
//   3. 失败时: UPDATE photos SET processing_status 保持不变, 记录错误
```

#### clip.worker.ts
```typescript
// 输入: ClipJob { photoId, filePath }
// 处理:
//   1. POST ML_SERVICE_URL/api/ml/clip/embed-image { image_path }
//   2. UPDATE photos SET clip_embedding = $1 WHERE id = $2
//   3. 使用pg的vector类型: UPDATE photos SET clip_embedding = $1::vector WHERE id = $2
```

#### face.worker.ts
```typescript
// 输入: FaceJob { photoId, filePath }
// 处理:
//   1. POST ML_SERVICE_URL/api/ml/face/detect { image_path }
//   2. if no faces detected: UPDATE photos SET processing_status='completed' WHERE id = $1, return
//   3. for each face:
//     INSERT INTO faces (photo_id, x1, y1, x2, y2, embedding)
//     embedding使用$1::vector格式 (512维)
//   4. 聚类: 获取该用户所有未分配person的人脸embedding
//     SELECT f.id, f.embedding FROM faces f
//     JOIN photos p ON f.photo_id = p.id
//     WHERE p.user_id = $1 AND f.person_id IS NULL
//   5. POST ML_SERVICE_URL/api/ml/face/cluster { face_ids, embeddings }
//   6. for each cluster:
//     a. INSERT INTO persons (user_id, name, face_count) VALUES ($1, NULL, count) RETURNING id
//     b. UPDATE faces SET person_id = $1 WHERE id IN face_ids
//     c. 为person生成特征人脸图片:
//        - 选择聚类中confidence最高的face
//        - 使用sharp从原图裁剪人脸区域 (x1,y1,x2,y2 + 20% padding)
//        - 保存到 THUMBNAIL_DIR/faces/{personId}.jpg
//        - UPDATE persons SET feature_face_path = $1 WHERE id = $2
//   7. UPDATE photos SET processing_status='completed' WHERE id = $1
//   8. 视频文件跳过人脸检测 (file_type = 'video')
```

#### trash-cleanup.worker.ts
```typescript
// 定时任务: 通过BullMQ Repeatable Job每天凌晨3点触发
// 注册: queue.add('cleanup', {}, { repeat: { pattern: '0 3 * * *' } })
// 处理:
//   1. SELECT id, file_path, thumbnail_path, file_size FROM photos
//      WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days'
//   2. for each photo: unlink files, accumulate file_size
//   3. DELETE FROM photos WHERE id IN (expired photo ids)
//   4. UPDATE users SET storage_used = GREATEST(0, storage_used - total_size) WHERE id IN affected user ids
//   5. 记录清理日志
```

#### library-scan.worker.ts
```
// 输入: LibraryScanJob { libraryId }
// 处理:
//   1. SELECT * FROM external_libraries WHERE id = $1
//   2. 递归扫描 import_path 目录
//   3. 排除 exclusion_patterns 匹配的文件
//   4. 对于每个新文件:
//     a. 计算文件hash
//     b. 检查是否已存在 (file_hash + user_id)
//     c. INSERT INTO photos (library_id = libraryId, file_type by mime)
//     d. 添加thumbnail-generation和metadata-extraction jobs
//   5. 对于数据库中有但目录中不存在的文件:
//     a. 标记为orphan (不删除，仅标记)
//   6. UPDATE external_libraries SET last_scanned_at = NOW() WHERE id = $1
```

#### stack-detect.worker.ts (自动堆叠检测)
```
// 触发时机: 照片上传完成后 (metadata worker完成后)
// 输入: StackDetectJob { userId, photoId }
// 处理:
//   1. 获取刚上传的照片信息:
//      SELECT original_name, taken_at, file_hash FROM photos WHERE id = $1
//   2. 查找可能的堆叠候选:
//      a. RAW+JPEG配对:
//         SELECT id FROM photos WHERE user_id = $1
//           AND taken_at BETWEEN (taken_at - INTERVAL '5 seconds') AND (taken_at + INTERVAL '5 seconds')
//           AND (
//             (original_name LIKE '%.CR2' AND $2 LIKE '%.JPG') OR
//             (original_name LIKE '%.NEF' AND $2 LIKE '%.JPG') OR
//             (original_name LIKE '%.ARW' AND $2 LIKE '%.JPG') OR
//             (original_name LIKE '%.DNG' AND $2 LIKE '%.JPG') OR
//             ($2 LIKE '%.CR2' AND original_name LIKE '%.JPG') OR
//             ($2 LIKE '%.NEF' AND original_name LIKE '%.JPG') OR
//             ($2 LIKE '%.ARW' AND original_name LIKE '%.JPG') OR
//             ($2 LIKE '%.DNG' AND original_name LIKE '%.JPG')
//           )
//           AND id NOT IN (SELECT photo_id FROM photo_stacks)
//      b. 连拍检测:
//         SELECT id FROM photos WHERE user_id = $1
//           AND taken_at BETWEEN (taken_at - INTERVAL '2 seconds') AND (taken_at + INTERVAL '2 seconds')
//           AND id != $1
//           AND id NOT IN (SELECT photo_id FROM photo_stacks)
//           ORDER BY taken_at
//   3. 如果找到候选照片:
//      a. 检查是否已有stack包含这些照片
//      b. 如果没有: INSERT INTO stacks (user_id, primary_photo_id)
//         primary_photo_id选择: JPEG优先于RAW, 最小id优先
//      c. INSERT INTO photo_stacks (photo_id, stack_id) for each photo
//   4. 如果没有候选: 不创建stack
```

#### import.worker.ts
```typescript
// 输入: ImportJob { type: 'zip'|'directory', path: string, userId: string, libraryId?: string }
// 触发: POST /api/import/upload (ZIP) 或 POST /api/import/directory
//
// 处理:
//   1. if type === 'zip':
//      a. 解压ZIP到临时目录: /tmp/import-{jobId}/
//      b. 检测导入类型:
//         - Google Photos Takeout: 查找 **/metadata.json 文件
//         - immich导出: 查找 immich-export 标记文件
//         - 普通目录: 直接扫描图片文件
//   2. if type === 'directory':
//      a. 直接使用path作为扫描目录
//   3. 递归扫描目录，收集所有支持的图片/视频文件
//   4. 对每个文件:
//      a. 计算SHA-256 hash
//      b. 检查重复: SELECT id FROM photos WHERE file_hash = $1 AND user_id = $2
//      c. 如果重复: skipped++, continue
//      d. 读取Google Photos metadata.json (如果存在):
//         - 提取 photoTakenTime, description, geoData
//      e. INSERT INTO photos (user_id, filename, original_name, file_path, mime_type,
//         file_type, file_size, file_hash, taken_at, latitude, longitude, library_id,
//         processing_status='pending')
//      f. 添加thumbnail-generation和metadata-extraction jobs
//      g. imported++
//   5. 更新进度: job.updateProgress({ total, imported, skipped, failed })
//   6. 清理临时目录 (if type === 'zip')
//   7. 完成后通过publishSSE通知用户: publishSSE(userId, 'processing-complete', { message: `导入完成: ${imported}张成功, ${skipped}张跳过` })
```

#### smart-album-classify.worker.ts
```typescript
// 触发时机: clip.worker.ts完成后自动触发
// 输入: SmartAlbumClassifyJob { photoId, userId }
// 处理:
//   1. SELECT clip_embedding FROM photos WHERE id = $1
//   2. if clip_embedding is NULL: return (无CLIP向量，跳过分类)
//   3. SELECT id, name, category_key, center_vector, threshold FROM smart_albums WHERE user_id = $1
//   4. if no smart_albums exist for user:
//      a. 初始化预定义分类:
//         INSERT INTO smart_albums (user_id, name, category_key, threshold) for each predefined category
//         预定义类别: pets, food, architecture, nature, vehicles, sports, travel, portrait, flowers, sky_sunset, beach, mountain, snow, documents
//      b. 重新查询smart_albums
//   5. for each smart_album:
//      a. if center_vector is NULL: 跳过 (尚未有足够样本计算中心向量)
//      b. 计算余弦相似度: 1 - (clip_embedding <=> center_vector)
//      c. if similarity > threshold:
//         INSERT INTO smart_album_photos (photo_id, smart_album_id, similarity)
//         UPDATE smart_albums SET photo_count = photo_count + 1 WHERE id = $1
//   6. if no category matched: 标记为"未分类"
//   7. 通过publishSSE通知: publishSSE(userId, 'smart-album-classified', { photoId, categories })

// **center_vector初始化逻辑 (关键):**
// 预定义类别的center_vector通过以下方式初始化:
//
// 方案A: 使用CLIP文本向量作为初始center_vector (推荐)
//   当用户首次触发智能分类时，为每个预定义类别生成文本向量:
//   const categoryTextMap = {
//     'pets': 'photos of cats dogs and pets',
//     'food': 'photos of food meals and dishes',
//     'architecture': 'photos of buildings and architecture',
//     'nature': 'photos of nature landscapes and scenery',
//     'vehicles': 'photos of cars and vehicles',
//     'sports': 'photos of sports and athletic activities',
//     'travel': 'photos of travel and tourism',
//     'portrait': 'photos of people portraits',
//     'flowers': 'photos of flowers and plants',
//     'sky_sunset': 'photos of sky sunset and sunrise',
//     'beach': 'photos of beach and ocean',
//     'mountain': 'photos of mountains and hiking',
//     'snow': 'photos of snow and winter',
//     'documents': 'photos of documents and text'
//   }
//   for each category:
//     const result = await mlClient.clipEmbedText(categoryTextMap[category_key])
//     UPDATE smart_albums SET center_vector = $1::vector WHERE id = $2
//
// 方案B: 自定义类别的center_vector计算
//   当用户创建自定义智能相册并选择3-10张样本照片时:
//   1. 获取所有样本照片的CLIP向量:
//      SELECT clip_embedding FROM photos WHERE id = ANY($samplePhotoIds)
//   2. 计算平均向量: center_vector = mean(all_clip_embeddings)
//   3. UPDATE smart_albums SET center_vector = $1::vector WHERE id = $2
//
// center_vector动态更新 (可选, 提高分类精度):
//   当一个类别积累了50+张照片后，可以重新计算center_vector:
//   SELECT AVG(clip_embedding) FROM photos p JOIN smart_album_photos sap ON p.id = sap.photo_id
//   WHERE sap.smart_album_id = $1 AND p.clip_embedding IS NOT NULL
//   UPDATE smart_albums SET center_vector = $1::vector WHERE id = $2
```

#### duplicate-detect.worker.ts
```typescript
// 触发: 用户手动触发 POST /api/duplicates/scan
// 输入: DuplicateDetectJob { userId, type: 'exact'|'similar'|'all' }
// 处理:
//   1. if type includes 'exact':
//      a. SELECT file_hash, array_agg(id) as photo_ids FROM photos
//         WHERE user_id = $1 AND deleted_at IS NULL AND file_hash IS NOT NULL
//         GROUP BY file_hash HAVING COUNT(*) > 1
//      b. 每组相同hash的照片为一个exact duplicate group
//      c. 自动推荐保留: 最高分辨率(width*height最大)或最新的照片
//   2. if type includes 'similar':
//      a. 获取所有有CLIP向量的照片:
//         SELECT id, clip_embedding FROM photos WHERE user_id = $1 AND deleted_at IS NULL AND clip_embedding IS NOT NULL
//      b. 对每对照片计算CLIP向量余弦相似度
//      c. 使用pgvector: SELECT id FROM photos WHERE user_id = $1 AND clip_embedding <=> (SELECT clip_embedding FROM photos WHERE id = $2) < 0.1 AND id != $2
//      d. 相似度>0.9的归为similar duplicate group
//      e. 自动推荐保留: 最高分辨率或最新照片
//   3. 将结果存储到Redis缓存 (key: duplicates:{userId}, TTL: 1小时)
//   4. 更新扫描进度: job.updateProgress()
//   5. 完成后通知: publishSSE(userId, 'duplicate-scan-complete', { groupCount })
```

#### shared-library-sync.worker.ts
```typescript
// 触发: 规则变更时 / 新照片上传后
// 输入: SharedLibrarySyncJob { libraryId, ruleId? }
// 处理:
//   1. SELECT * FROM shared_libraries WHERE id = $1
//   2. SELECT * FROM shared_library_rules WHERE library_id = $1
//   3. if ruleId specified: only process that rule
//   4. for each rule:
//      a. type='all': SELECT id FROM photos WHERE user_id IN (member user ids) AND deleted_at IS NULL
//      b. type='person': SELECT p.id FROM photos p JOIN faces f ON f.photo_id = p.id JOIN persons pr ON pr.id = f.person_id WHERE pr.name = rule.value AND p.user_id IN (member ids)
//      c. type='date_range': SELECT id FROM photos WHERE taken_at BETWEEN start AND end AND user_id IN (member ids)
//      d. type='location': SELECT id FROM photos WHERE location_name ILIKE '%rule.value%' AND user_id IN (member ids)
//   5. for each matched photo not already in library:
//      INSERT INTO shared_library_photos (library_id, photo_id, added_by, matched_rule_id)
//   6. for photos no longer matching rules:
//      DELETE FROM shared_library_photos WHERE library_id = $1 AND photo_id NOT IN (matched ids)
//   7. 完成后通知所有成员: publishSSE for each member
```

#### year-in-review.worker.ts
```typescript
// 触发: 12月1日定时 / 用户手动触发
// 输入: YearInReviewJob { userId, year }
// 处理:
//   1. 计算年度统计数据:
//      a. 总照片数/视频数: SELECT COUNT(*) FROM photos WHERE user_id = $1 AND taken_at BETWEEN year-01-01 AND year-12-31
//      b. 存储使用: SELECT SUM(file_size) FROM photos WHERE user_id = $1 AND taken_at BETWEEN ...
//      c. 最常使用相机: SELECT EXIF->'Make'+'Model', COUNT(*) ... GROUP BY ... ORDER BY COUNT DESC LIMIT 1
//   2. 年度精选(Top 10):
//      a. 优先收藏照片: SELECT id FROM photos WHERE user_id = $1 AND is_favorite = TRUE AND taken_at BETWEEN ... ORDER BY taken_at LIMIT 20
//      b. 不足10张则补充高分辨率照片
//   3. 最常出现人物:
//      a. SELECT pr.name, COUNT(*) as cnt FROM persons pr JOIN faces f ON f.person_id = pr.id JOIN photos p ON f.photo_id = p.id WHERE p.user_id = $1 AND p.taken_at BETWEEN ... GROUP BY pr.id ORDER BY cnt DESC LIMIT 5
//   4. 旅行足迹:
//      a. SELECT location_name, COUNT(*), EXTRACT(MONTH FROM taken_at) as month FROM photos WHERE user_id = $1 AND location_name IS NOT NULL AND taken_at BETWEEN ... GROUP BY location_name, month ORDER BY COUNT DESC
//   5. 月度精选:
//      a. for each month: SELECT id FROM photos WHERE user_id = $1 AND taken_at BETWEEN month-start AND month-end AND is_favorite = TRUE ORDER BY file_size DESC LIMIT 1
//   6. UPSERT INTO year_in_reviews (user_id, year, top_photo_ids, top_person_data, travel_footprint, monthly_pick_ids, stats)
//   7. 完成后通知: publishSSE(userId, 'year-in-review-ready', { year })
```

#### face-cluster.worker.ts
```typescript
// 触发: face-detection.worker.ts完成后自动触发 (检测到人脸时)
// 输入: FaceClusterJob { userId, photoId, faceIds: string[] }
// 处理:
//   1. 获取新检测到的人脸向量:
//      SELECT id, embedding FROM faces WHERE id = ANY($1) AND embedding IS NOT NULL
//   2. 获取该用户所有未聚类的人脸向量 (person_id IS NULL):
//      SELECT id, embedding FROM faces f JOIN photos p ON f.photo_id = p.id
//      WHERE p.user_id = $1 AND f.person_id IS NULL AND f.embedding IS NOT NULL
//   3. 如果未聚类人脸数 < 2: 跳过聚类 (至少需要2个样本)
//   4. 调用ML Service: POST /api/ml/face/cluster
//      { face_ids: allUnclusteredFaceIds, embeddings: allUnclusteredEmbeddings }
//   5. 处理聚类结果:
//      for each cluster in result.clusters:
//        a. 检查是否与已有person匹配:
//           SELECT pr.id FROM persons pr JOIN faces f ON f.person_id = pr.id
//           WHERE pr.user_id = $1 AND f.id = ANY(cluster.face_ids) AND f.person_id IS NOT NULL
//           LIMIT 1
//        b. 如果匹配已有person:
//           UPDATE faces SET person_id = $matchedPersonId WHERE id = ANY(cluster.face_ids) AND person_id IS NULL
//           UPDATE persons SET face_count = (SELECT COUNT(*) FROM faces WHERE person_id = $matchedPersonId) WHERE id = $matchedPersonId
//        c. 如果是新聚类: INSERT INTO persons (user_id, name, face_count) VALUES ($1, NULL, count) RETURNING id
//        d. UPDATE faces SET person_id = $personId WHERE id = ANY($cluster.faceIds)
//        e. 更新person的face_count: UPDATE persons SET face_count = (SELECT COUNT(*) FROM faces WHERE person_id = $1) WHERE id = $1
//        f. 为person生成特征照: 从该聚类中选择正面最清晰的人脸照片
//           SELECT f.photo_id FROM faces f WHERE f.person_id = $1 ORDER BY f.confidence DESC LIMIT 1
//           使用sharp裁剪人脸区域, 保存到 {THUMBNAIL_DIR}/faces/{personId}.jpg
//           UPDATE persons SET feature_face_path = $1 WHERE id = $2
//   6. 完成后无需SSE通知 (人脸聚类是后台异步过程)
```

#### import-upload.worker.ts
```typescript
// 触发: 用户通过Data Import API上传ZIP或选择目录导入
// 输入: ImportUploadJob { userId, type: 'zip'|'directory', path: string, libraryId?: string }
// 处理:
//   1. if type === 'zip':
//      a. 解压ZIP到临时目录: /tmp/import-{uuid}/
//      b. 扫描临时目录中的所有支持格式的文件
//   2. if type === 'directory':
//      a. 扫描指定目录中的所有支持格式的文件
//   3. 过滤支持的文件类型: image/jpeg, image/png, image/webp, image/heic, image/avif, video/mp4, video/quicktime, video/webm
//   4. for each file:
//      a. 计算SHA-256 hash
//      b. 检查重复: SELECT id FROM photos WHERE file_hash = $1 AND user_id = $2
//      c. 如果重复: skipped++, continue
//      d. 读取Google Photos metadata.json (如果存在):
//         - 提取 photoTakenTime, description, geoData
//      e. INSERT INTO photos (user_id, filename, original_name, file_path, mime_type,
//         file_type, file_size, file_hash, taken_at, latitude, longitude, library_id,
//         processing_status='pending')
//      f. 添加thumbnail-generation和metadata-extraction jobs
//      g. imported++
//   5. 更新进度: job.updateProgress({ total, imported, skipped, failed })
//   6. 清理临时目录 (if type === 'zip')
//   7. 完成后通过publishSSE通知用户: publishSSE(userId, 'processing-complete', { message: `导入完成: ${imported}张成功, ${skipped}张跳过` })
```

#### storage-quota-check.worker.ts
```typescript
// 触发: 每天凌晨4点定时执行
// 输入: StorageQuotaCheckJob { } (无参数, 检查所有用户)
// 处理:
//   1. SELECT id, storage_used, storage_quota, email, name FROM users WHERE storage_quota IS NOT NULL
//   2. for each user:
//      a. 计算实际存储使用: SELECT SUM(file_size) FROM photos WHERE user_id = $1 AND deleted_at IS NULL
//      b. if 实际使用 !== storage_used: UPDATE users SET storage_used = $1 WHERE id = $2 (修正偏差)
//      c. if storage_used > storage_quota * 0.9:
//         - 发送存储空间不足邮件 (如果SMTP已配置)
//         - publishSSE(userId, 'storage-quota-warning', { used: storage_used, quota: storage_quota, percentage: Math.round(storage_used/storage_quota*100) })
//      d. if storage_used > storage_quota:
//         - 标记用户为超限状态 (可在上传时检查)
//   3. 完成后记录日志: logger.info('Storage quota check completed')
```

### 2.11 ML Client (api/ml/client.ts)
```typescript
// axios实例:
//   baseURL: process.env.ML_SERVICE_URL
//   timeout: 120000  // ML推理可能较慢
//   无需认证 (内网通信)

// 方法:
//   ocr(imagePath: string, languages: string[]) -> POST /api/ml/ocr
//   ocrBatch(items: {imagePath: string, languages: string[]}[]) -> POST /api/ml/ocr/batch
//   clipEmbedImage(imagePath: string) -> POST /api/ml/clip/embed-image
//   clipEmbedBatch(imagePaths: string[]) -> POST /api/ml/clip/embed-batch
//   clipEmbedText(text: string) -> POST /api/ml/clip/embed-text
//   faceDetect(imagePath: string) -> POST /api/ml/face/detect
//   faceDetectBatch(imagePaths: string[]) -> POST /api/ml/face/detect-batch
//   faceCluster(faceIds: string[]) -> POST /api/ml/face/cluster
//   health() -> GET /health
// 批处理API详见arch.md 9.3, 单次最多处理ML_BATCH_SIZE(16)张照片
```

### 2.12 Base Repository (api/repositories/base.repository.ts)
```typescript
// class BaseRepository<T> {
//   protected pool: Pool
//   protected tableName: string
//
//   async findById(id: string): Promise<T | null>
//     SELECT * FROM ${tableName} WHERE id = $1
//
//   async findAll(filters, page, limit): Promise<{ items: T[], total: number }>
//     SELECT * FROM ${tableName} WHERE filters LIMIT $limit OFFSET $offset
//     SELECT COUNT(*) FROM ${tableName} WHERE filters
//
//   async create(data: Partial<T>): Promise<T>
//     INSERT INTO ${tableName} (...) VALUES (...) RETURNING *
//
//   async update(id: string, data: Partial<T>): Promise<T>
//     UPDATE ${tableName} SET ... WHERE id = $1 RETURNING *
//
//   async delete(id: string): Promise<boolean>
//     DELETE FROM ${tableName} WHERE id = $1
// }
```

### 2.12.1 具体Repository实现规格

**命名规范**: 文件名 `{entity}.repository.ts`，类名 `{Entity}Repository`，方法名 camelCase
**返回类型**: 查询单个返回 `T | null`，查询列表返回 `{ items: T[], total: number }`，增删改返回 `T`

#### UserRepository (api/repositories/user.repository.ts)
```typescript
// class UserRepository extends BaseRepository<User> {
//   tableName = 'users'
//
//   async findByEmail(email: string): Promise<User | null>
//     SELECT * FROM users WHERE email = $1
//
//   async updateStorageUsed(id: string, bytes: number): Promise<User>
//     UPDATE users SET storage_used = storage_used + $2 WHERE id = $1 RETURNING *
//
//   async incrementTokenVersion(id: string): Promise<void>
//     DELETE FROM sessions WHERE user_id = $1 AND id != $2
//
//   async updatePassword(id: string, passwordHash: string): Promise<void>
//     UPDATE users SET password_hash = $2 WHERE id = $1
//
//   async setTwoFactorSecret(id: string, secret: string | null, enabled: boolean): Promise<void>
//     UPDATE users SET two_factor_secret = $2, two_factor_enabled = $3 WHERE id = $1
// }
```

#### PhotoRepository (api/repositories/photo.repository.ts)
```typescript
// class PhotoRepository extends BaseRepository<Photo> {
//   tableName = 'photos'
//
//   async findByHash(userId: string, fileHash: string): Promise<Photo | null>
//     SELECT * FROM photos WHERE user_id = $1 AND file_hash = $2 AND deleted_at IS NULL
//
//   async findByUserId(userId: string, filters: PhotoFilters, page: number, limit: number): Promise<{ items: Photo[], total: number }>
//     动态构建WHERE: user_id, deleted_at IS NULL, is_favorite, is_archived, taken_at范围
//     ORDER BY taken_at DESC NULLS LAST
//
//   async findFavorites(userId: string, page: number, limit: number): Promise<{ items: Photo[], total: number }>
//     WHERE user_id = $1 AND is_favorite = true AND deleted_at IS NULL
//
//   async findArchived(userId: string, page: number, limit: number): Promise<{ items: Photo[], total: number }>
//     WHERE user_id = $1 AND is_archived = true AND deleted_at IS NULL
//
//   async findTrashed(userId: string, page: number, limit: number): Promise<{ items: Photo[], total: number }>
//     WHERE user_id = $1 AND deleted_at IS NOT NULL
//
//   async softDelete(id: string): Promise<Photo>
//     UPDATE photos SET deleted_at = NOW() WHERE id = $1 RETURNING *
//
//   async restore(id: string): Promise<Photo>
//     UPDATE photos SET deleted_at = NULL WHERE id = $1 RETURNING *
//
//   async permanentDelete(id: string): Promise<boolean>
//     DELETE FROM photos WHERE id = $1 AND deleted_at IS NOT NULL
//
//   async updateProcessingStatus(id: string, status: string): Promise<void>
//     UPDATE photos SET processing_status = $2 WHERE id = $1
//
//   async findExpiredTrash(days: number): Promise<Photo[]>
//     SELECT * FROM photos WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '1 day' * $1
//     安全: days参数使用$1参数化传递, 不拼接SQL
//
//   async findGroupedByDate(userId: string, year?: number, month?: number): Promise<DateGroup[]>
//     SELECT DATE(taken_at) as date, COUNT(*), array_agg(id) as photo_ids
//     FROM photos WHERE user_id = $1 AND deleted_at IS NULL
//     GROUP BY DATE(taken_at) ORDER BY date DESC
//
//   async checkStorageQuota(userId: string): Promise<{ used: number, quota: number | null }>
//     SELECT storage_used, storage_quota FROM users WHERE id = $1
// }
```

#### PersonRepository (api/repositories/person.repository.ts)
```typescript
// class PersonRepository extends BaseRepository<Person> {
//   tableName = 'persons'
//
//   async findByUserId(userId: string, page: number, limit: number): Promise<{ items: Person[], total: number }>
//     WHERE user_id = $1 AND is_hidden = false ORDER BY face_count DESC
//
//   async merge(sourceIds: string[], targetId: string): Promise<Person>
//     withTransaction:
//       UPDATE faces SET person_id = $targetId WHERE person_id = ANY($sourceIds)
//       UPDATE persons SET face_count = (SELECT COUNT(*) FROM faces WHERE person_id = $targetId) WHERE id = $targetId
//       DELETE FROM persons WHERE id = ANY($sourceIds)
//       RETURN updated person
// }
```

#### AlbumRepository (api/repositories/album.repository.ts)
```typescript
// class AlbumRepository extends BaseRepository<Album> {
//   tableName = 'albums'
//
//   async addPhotos(albumId: string, photoIds: string[]): Promise<void>
//     INSERT INTO photo_albums (photo_id, album_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
//     批量插入，跳过已存在的
//
//   async removePhotos(albumId: string, photoIds: string[]): Promise<void>
//     DELETE FROM photo_albums WHERE album_id = $1 AND photo_id = ANY($2)
//
//   async updatePhotoCount(albumId: string): Promise<void>
//     UPDATE albums SET photo_count = (SELECT COUNT(*) FROM photo_albums WHERE album_id = $1) WHERE id = $1
// }
```

#### ShareLinkRepository (api/repositories/share-link.repository.ts)
```typescript
// class ShareLinkRepository extends BaseRepository<ShareLink> {
//   tableName = 'share_links'
//
//   async findByToken(token: string): Promise<ShareLink | null>
//     SELECT * FROM share_links WHERE token = $1 AND (expires_at IS NULL OR expires_at > NOW())
//
//   async findByUserId(userId: string): Promise<ShareLink[]>
//     SELECT sl.*, a.name as album_name FROM share_links sl LEFT JOIN albums a ON sl.album_id = a.id
//     WHERE sl.album_id IN (SELECT id FROM albums WHERE user_id = $1)
//        OR sl.photo_id IN (SELECT id FROM photos WHERE user_id = $1)
// }
```

**所有Repository必须遵循的规则:**
1. 所有SQL查询使用参数化 ($1, $2)，绝不拼接SQL
2. 涉及多表操作必须使用 withTransaction (见5.3节)
3. 返回数据库行时将snake_case字段转换为camelCase (使用下方映射函数)
4. 分页查询必须同时返回 total 和 items
5. 软删除查询必须加 `deleted_at IS NULL` 条件

**snake_case → camelCase 映射工具函数 (api/utils/caseMapper.ts):**
```typescript
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function mapRowToCamel<T extends Record<string, any>>(row: Record<string, any>): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }
  return result as T;
}

export function mapRowsToCamel<T extends Record<string, any>>(rows: Record<string, any>[]): T[] {
  return rows.map(row => mapRowToCamel<T>(row));
}

// 使用示例:
// const user = mapRowToCamel<User>(dbRow)
// dbRow = { id: '...', user_name: 'test', created_at: '...' }
// user  = { id: '...', userName: 'test', createdAt: '...' }
```

### 2.13 Config Files

#### api/config/env.ts
```typescript
// 环境变量验证和导出
// 使用zod验证所有必需的环境变量
//
// const envSchema = z.object({
//   NODE_ENV: z.enum(['development', 'production']).default('development'),
//   PORT: z.coerce.number().default(3000),
//   DATABASE_URL: z.string().min(1),
//   REDIS_URL: z.string().min(1),
//   JWT_SECRET: z.string().min(10),
//   JWT_EXPIRES_IN: z.string().default('7d'),
//   UPLOAD_DIR: z.string().default('./uploads'),
//   THUMBNAIL_DIR: z.string().default('./thumbnails'),
//   MAX_FILE_SIZE: z.string().default('200mb'),
//   ML_SERVICE_URL: z.string().default('http://localhost:3001'),
//   OCR_LANGUAGES: z.string().default('chi_sim+eng'),
//   CLIP_MODEL: z.string().default('XLM-Roberta-Large-Vit-B-16Plus'),
//   FACE_MODEL: z.string().default('buffalo_l'),
//   ADMIN_EMAIL: z.string().optional(),
//   FRONTEND_URL: z.string().default('http://localhost:5173'),
//   SMTP_HOST: z.string().optional(),
//   SMTP_PORT: z.coerce.number().default(587),
//   SMTP_SECURE: z.enum(['true', 'false']).default('false'),
//   SMTP_USER: z.string().optional(),
//   SMTP_PASS: z.string().optional(),
//   SMTP_FROM: z.string().default('noreply@aialbum.com'),
//   TRASH_RETENTION_DAYS: z.coerce.number().default(30),
//   GITHUB_CLIENT_ID: z.string().optional(),
//   GITHUB_CLIENT_SECRET: z.string().optional(),
//   GOOGLE_CLIENT_ID: z.string().optional(),
//   GOOGLE_CLIENT_SECRET: z.string().optional(),
//   STRIPE_SECRET_KEY: z.string().optional(),
//   STRIPE_PUBLISHABLE_KEY: z.string().optional(),
//   STRIPE_WEBHOOK_SECRET: z.string().optional(),
//   DEFAULT_DOMAIN: z.string().optional(),
//   ENABLE_MULTI_TENANT: z.enum(['true', 'false']).default('false'),
// })
//
// export const env = envSchema.parse(process.env)
// 开发模式: 缺少非必需变量不报错，使用默认值
// 生产模式: 缺少必需变量(DATABASE_URL, REDIS_URL, JWT_SECRET)抛出错误
```

#### api/config/sse.ts
```typescript
// SSE连接管理 + Redis Pub/Sub桥接
//
// const sseConnections = new Map<string, ServerResponse>()  // userId -> res
//
// export function addConnection(userId: string, res: ServerResponse):
//   1. 如果该用户已有连接: 关闭旧连接
//   2. sseConnections.set(userId, res)
//   3. res.on('close', () => sseConnections.delete(userId))
//
// export function sendSSE(userId: string, event: string, data: any):
//   const conn = sseConnections.get(userId)
//   if (conn) conn.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
//
// export function startSubscriber(redis: Redis):
//   const subscriber = new Redis(redis.options)
//   subscriber.subscribe('sse:notify')
//   subscriber.on('message', (_channel, message) => {
//     const { userId, event, data } = JSON.parse(message)
//     sendSSE(userId, event, data)
//   })
```

### 2.14 Utility Files

#### api/utils/hash.ts
```typescript
// import crypto from 'crypto'
//
// export function hashFile(filePath: string): Promise<string>
//   1. 创建sha256 hash: crypto.createHash('sha256')
//   2. fs.createReadStream(filePath).pipe(hash)
//   3. return hash.digest('hex')
//   用途: 上传文件重复检测 (计算SHA-256)
//
// export function hashApiKey(key: string): string
//   crypto.createHash('sha256').update(key).digest('hex')
//   用途: API Key存储时hash
//
// export function hashPassword(password: string): Promise<string>
//   bcryptjs.hash(password, 12)
//   用途: 用户密码hash
//
// export function comparePassword(password: string, hash: string): Promise<boolean>
//   bcryptjs.compare(password, hash)
//   用途: 密码验证
//
// export function generateToken(bytes: number = 32): string
//   crypto.randomBytes(bytes).toString('hex')
//   用途: 分享链接token、密码重置token生成
```

#### api/utils/storage.ts
```typescript
// import fs from 'fs/promises'
// import path from 'path'
// import { env } from '../config/env'
//
// export async function ensureUploadDir(): Promise<void>
//   创建 UPLOAD_DIR 和 THUMBNAIL_DIR 目录 (如果不存在)
//   创建子目录: faces/ (人脸特征照), thumbnails/small/ (小缩略图)
//
// export function getUploadPath(filename: string): string
//   path.join(env.UPLOAD_DIR, filename)
//
// export function getThumbnailPath(photoId: string): string
//   path.join(env.THUMBNAIL_DIR, `${photoId}.jpg`)
//
// export function getSmallThumbnailPath(photoId: string): string
//   path.join(env.THUMBNAIL_DIR, 'small', `${photoId}.jpg`)
//
// export function getFacePath(personId: string): string
//   path.join(env.THUMBNAIL_DIR, 'faces', `${personId}.jpg`)
//
// export async function deleteFile(filePath: string): Promise<void>
//   try { await fs.unlink(filePath) } catch { /* 文件可能已删除 */ }
//
// export async function getFileSize(filePath: string): Promise<number>
//   (await fs.stat(filePath)).size
//
// export function isImageFile(mimeType: string): boolean
//   mimeType.startsWith('image/')
//
// export function isVideoFile(mimeType: string): boolean
//   mimeType.startsWith('video/')
//
// export function getFileType(mimeType: string): 'image' | 'video'
//   isVideoFile(mimeType) ? 'video' : 'image'
```

### 2.15 External Library File Watcher
```typescript
// 外部库文件监听 (使用chokidar)
// 在Worker入口 (api/workers/index.ts) 中启动
//
// import chokidar from 'chokidar'
//
// function startLibraryWatcher():
//   1. 查询所有 is_watched=true 的外部库: SELECT * FROM external_libraries WHERE is_watched = true
//   2. 对每个库创建chokidar watcher:
//      chokidar.watch(library.import_path, {
//        ignored: library.exclusion_patterns,
//        ignoreInitial: true,  // 忽略初始扫描(由library-scan worker处理)
//        awaitWriteFinish: { stabilityThreshold: 5000 }  // 等待文件写入完成
//      })
//   3. watcher.on('add', (filePath) => handleNewFile(library.id, filePath))
//   4. watcher.on('unlink', (filePath) => handleFileRemoved(library.id, filePath))
//
// function handleNewFile(libraryId: string, filePath: string):
//   1. 检查文件类型是否支持 (mimeType检查)
//   2. 计算文件hash, 检查重复
//   3. INSERT INTO photos (library_id, file_path, ...)
//   4. 添加thumbnail/metadata jobs
//
// function handleFileRemoved(libraryId: string, filePath: string):
//   1. 查找对应的photo记录: SELECT id FROM photos WHERE file_path = $1 AND library_id = $2
//   2. 标记为orphan (不删除记录, 仅标记)
//   3. UPDATE photos SET processing_status = 'failed' WHERE id = $1
```

## 3. Frontend Implementation Spec

### 3.1 API Client (src/utils/api.ts)
```typescript
// axios实例:
//   baseURL: '/api'
//   timeout: 30000
//   headers: { 'Content-Type': 'application/json' }

// 请求拦截器:
//   if (authStore.getState().token) {
//     config.headers.Authorization = `Bearer ${token}`
//   }

// 响应拦截器:
//   if (response.status === 401) {
//     authStore.getState().logout()
//     window.location.href = '/login'
//   }
//   return response.data

// 导出方法:
//   auth: { register, login, getMe, changePassword, forgotPassword, resetPassword, logoutAll }
//   photos: { list, get, upload, mobileUpload, mobileUploadBatch, checkExisting, delete, permanentDelete, restore, favorite, archive, download, getStatus, reprocess, listFavorites, listArchived, listTrash, emptyTrash, batchAction, batchDownload, editPhoto, undoEdit, getMemories, getLivePhotoVideo, pairLivePhoto }
//   search: { search, suggest, getHistory, deleteHistory }
//   persons: { list, get, getPhotos, update, merge, setFeatureFace }
//   albums: { list, create, get, update, delete, addPhotos, removePhotos, addUsers }
//   tags: { list, create, addToPhoto, getPhotos }
//   share: { create, list, delete, getByToken }
//   admin: { listUsers, createUser, updateUser, deleteUser, getJobs, pauseQueue, resumeQueue, retryFailed, getConfig, updateConfig }
//   import: { uploadZip, getImportStatus, importDirectory }
//   events: { connect (SSE) }
//   stats: { getStats }
//   health: { check }
//   smartAlbums: { list, get, getPhotos, createCustom, updateThreshold, classify }
//   yearInReview: { list, get, generate, generateShareCard, updateExclusions }
//   duplicates: { list, scan, getScanStatus, resolve, resolveBatch }
//   sharedLibraries: { list, create, get, update, delete, inviteMember, removeMember, updateRules, getPhotos, sync }
//   activityLogs: { list, listMe }
//   twoFactor: { enable, verify, disable }
//   dataExport: { request, getStatus, download }
//   setup: { getStatus, createAdmin, configureStorage, configureSmtp, getMLStatus }
//   version: { check }
```

### 3.2 Router Configuration (src/App.tsx)
```typescript
// BrowserRouter
// Routes:
//   /login -> LoginPage (public, redirect to / if authenticated)
//   /register -> RegisterPage (public)
//   /forgot-password -> ForgotPasswordPage (public)
//   /reset-password -> ResetPasswordPage (public, requires token query param)
//   /onboarding -> OnboardingPage (protected, 仅localStorage无onboarding_completed时显示)
//   / -> HomePage (protected)
//   /explore -> ExplorePage (protected)
//   /album -> AlbumPage (protected)
//   /album/:id -> AlbumDetailPage (protected)
//   /map -> MapPage (protected)
//   /photo/:id -> PhotoDetailPage (protected)
//   /upload -> UploadPage (protected)
//   /search -> SearchPage (protected)
//   /favorites -> FavoritesPage (protected)
//   /archive -> ArchivePage (protected)
//   /trash -> TrashPage (protected)
//   /sharing -> SharingPage (protected)
//   /admin -> AdminPage (protected, adminOnly)
//   /settings -> SettingsPage (protected)
//   /share/:token -> SharedPage (public)
//   /smart-albums -> SmartAlbumPage (protected)
//   /smart-albums/:id -> SmartAlbumDetailPage (protected)
//   /year-in-review -> YearInReviewPage (protected)
//   /year-in-review/:year -> YearInReviewPage (protected)
//   /duplicates -> DuplicatePage (protected)
//   /shared-libraries -> SharedLibraryPage (protected)
//   /activity-logs -> ActivityLogPage (protected, adminOnly for full, user for /me)
//   /setup -> SetupWizardPage (public, only when setup_completed=false)
//   /2fa-setup -> 2FA setup flow (within SettingsPage)
//   /oauth/callback/:provider -> OAuthCallbackPage (public, handles GitHub/Google OAuth redirect)
//   /oauth/success -> OAuthSuccessPage (public, extracts token from URL and logs in)
//   /notifications -> NotificationPage (protected)
//   /settings/sessions -> SessionManagementPage (protected)
//   /pricing -> PricingPage (public)
//   /settings/subscription -> SubscriptionPage (protected)
//   /admin/branding -> AdminBrandingPage (protected, adminOnly)
//   /admin/tenants -> AdminTenantsPage (protected, adminOnly)
//   /admin/feedback -> AdminFeedbackPage (protected, adminOnly)
//   /invite/:code -> 注册页+自动兑换邀请码 (public)

// Layout组件包裹protected路由:
//   <Sidebar /> + <main className="ml-0 md:ml-64">
//   <Header /> 包含搜索栏
//   <MobileNav /> 仅在移动端显示

// 路由守卫:
//   未认证 -> 重定向到 /login
//   非admin访问 /admin -> 重定向到 /

// 全局快捷键 (在Layout组件中注册):
//   / -> 聚焦搜索框
//   ? -> 显示快捷键帮助弹窗
//   Esc -> 关闭当前弹窗/退出编辑模式
//   Ctrl/Cmd + U -> 打开上传页
//   左右箭头(详情页) -> 切换照片
```

### 3.2.1 Route Guards (src/components/guards/)

#### ProtectedRoute — 认证守卫

```typescript
// src/components/guards/ProtectedRoute.tsx
// 用途: 包裹所有需要登录才能访问的路由
// 逻辑:
//   1. 从authStore读取isAuthenticated和isLoading
//   2. isLoading=true时显示全屏Spinner(避免闪烁)
//   3. isAuthenticated=false时 <Navigate to="/login" state={{ from: location }} replace />
//   4. isAuthenticated=true时渲染 <Outlet /> (子路由)
//   5. 登录后自动跳回原页面: login成功后读取location.state?.from并导航

// 使用方式:
// <Route element={<ProtectedRoute />}>
//   <Route path="/" element={<HomePage />} />
//   <Route path="/explore" element={<ExplorePage />} />
//   ...
// </Route>

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
```

#### AdminRoute — 管理员守卫

```typescript
// src/components/guards/AdminRoute.tsx
// 用途: 包裹仅管理员可访问的路由 (/admin/*)
// 逻辑:
//   1. 先执行ProtectedRoute的所有检查(认证)
//   2. 从authStore读取user.role
//   3. role !== 'admin'时 <Navigate to="/" replace />
//   4. 可选: 显示Toast "需要管理员权限"

export const AdminRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    toast.error('需要管理员权限');
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
```

#### PublicOnlyRoute — 仅未登录可访问

```typescript
// src/components/guards/PublicOnlyRoute.tsx
// 用途: 登录/注册页，已登录用户不应再访问
// 逻辑:
//   1. isAuthenticated=true时 <Navigate to="/" replace />
//   2. isAuthenticated=false时渲染 <Outlet />

export const PublicOnlyRoute: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
```

#### SetupRoute — 初始化向导守卫

```typescript
// src/components/guards/SetupRoute.tsx
// 用途: 首次部署配置向导页，仅在setup_completed=false时可访问
// 逻辑:
//   1. 调用GET /api/server/setup-status检查系统是否已初始化
//   2. setup_completed=true时 <Navigate to="/login" replace />
//   3. setup_completed=false时渲染 <SetupWizardPage />

export const SetupRoute: React.FC = () => {
  const { data, isLoading } = useQuery(['setup-status'], () =>
    api.server.getSetupStatus()
  );

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  if (data?.setupCompleted) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
```

#### 路由守卫层级结构

```typescript
// src/App.tsx 最终路由结构
<BrowserRouter>
  <Routes>
    {/* 公开路由 - 仅未登录 */}
    <Route element={<PublicOnlyRoute />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Route>

    {/* 初始化向导 - 仅未配置 */}
    <Route element={<SetupRoute />}>
      <Route path="/setup" element={<SetupWizardPage />} />
    </Route>

    {/* 公开分享 - 无需登录 */}
    <Route path="/share/:token" element={<SharedPage />} />
    <Route path="/invite/:code" element={<RegisterPage />} />
    <Route path="/privacy" element={<PrivacyPage />} />
    <Route path="/terms" element={<TermsPage />} />
    <Route path="/welcome" element={<MarketingPage />} />
    <Route path="/pricing" element={<PricingPage />} />

    {/* OAuth回调 - 特殊处理 */}
    <Route path="/oauth/callback/:provider" element={<OAuthCallbackPage />} />

    {/* 认证路由 - 需要登录 */}
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/albums" element={<AlbumsPage />} />
        <Route path="/albums/:id" element={<AlbumDetailPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/photos/:id" element={<PhotoDetailPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/sharing" element={<SharingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/smart-albums" element={<SmartAlbumsPage />} />
        <Route path="/smart-albums/:id" element={<SmartAlbumDetailPage />} />
        <Route path="/year-in-review" element={<YearInReviewPage />} />
        <Route path="/year-in-review/:year" element={<YearInReviewPage />} />
        <Route path="/duplicates" element={<DuplicatesPage />} />
        <Route path="/shared-libraries" element={<SharedLibraryPage />} />
        <Route path="/notifications" element={<NotificationPage />} />
        <Route path="/settings/sessions" element={<SessionManagementPage />} />
        <Route path="/settings/subscription" element={<SubscriptionPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>

      {/* 管理员路由 */}
      <Route element={<AdminRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/config" element={<AdminConfigPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/tenants" element={<AdminTenantsPage />} />
          <Route path="/admin/jobs" element={<AdminJobsPage />} />
          <Route path="/admin/branding" element={<AdminBrandingPage />} />
          <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
        </Route>
      </Route>
    </Route>

    {/* 404 - 兜底 */}
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
</BrowserRouter>
```

### 3.2.2 Error Boundary (src/components/errors/)

#### 全局Error Boundary

```typescript
// src/components/errors/GlobalErrorBoundary.tsx
// 用途: 捕获React组件树中未处理的JavaScript错误，防止整个应用白屏
// 放置位置: App.tsx最外层，包裹<BrowserRouter>
//
// 错误捕获策略:
//   1. 渲染错误 → 显示全屏错误页面(品牌化)
//   2. 提供重试按钮(重新渲染组件树)
//   3. 错误日志上报(可选: 发送到/api/events)
//   4. 不捕获: 事件处理器错误、异步代码错误、服务端渲染错误
//
// 全屏错误页面设计:
//   - 品牌色背景(#101014)
//   - 插图: 损坏的照片图标(品牌色线条)
//   - 主文案: "出了点问题"
//   - 副文案: "应用遇到了意外错误，请尝试刷新页面"
//   - 按钮1: "刷新页面" (window.location.reload())
//   - 按钮2: "返回首页" (navigate('/'))
//   - 错误详情折叠面板(仅开发环境显示stack trace)

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GlobalErrorBoundary]', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
```

#### 页面级Error Boundary

```typescript
// src/components/errors/PageErrorBoundary.tsx
// 用途: 包裹每个页面组件，单个页面崩溃不影响其他页面和导航
// 放置位置: 每个Route的element外层
//
// 页面级错误页面设计(区别于全局):
//   - 不全屏，在AppLayout主内容区内显示
//   - 保留侧边栏和顶部导航(用户可导航到其他页面)
//   - 主文案: "页面加载失败"
//   - 副文案: "此页面遇到了问题，其他页面不受影响"
//   - 按钮1: "重试" (重新渲染当前页面)
//   - 按钮2: "返回首页"
//
// 使用方式:
// <Route path="/explore" element={
//   <PageErrorBoundary>
//     <ExplorePage />
//   </PageErrorBoundary>
// } />

export class PageErrorBoundary extends React.Component<
  { children: React.ReactNode; pageName?: string },
  ErrorBoundaryState
> {
  // 同GlobalErrorBoundary逻辑，但渲染PageErrorFallback
}
```

#### API错误处理层

```typescript
// src/utils/api.ts — Axios拦截器统一处理API错误
// 用途: 在API Client层统一处理HTTP错误，减少组件内重复错误处理代码
//
// 响应拦截器逻辑:
//   1. 2xx → 直接返回response.data
//   2. 401 → 清除authStore → 弹出"登录已过期"模态框 → 跳转/login
//      (排除: /auth/login, /auth/register, /auth/refresh 等端点)
//   3. 403 → Toast (error) "权限不足"
//   4. 404 → Toast (error) "请求的资源不存在"
//   5. 409 → Toast (warning) "数据冲突，请刷新后重试"
//   6. 429 → Toast (warning) "操作过于频繁，请稍后再试"
//   7. 500 → Toast (error) "服务器错误，请稍后重试"
//   8. 503 → 显示全屏维护页面
//   9. 网络错误(无响应) → 顶部红色横幅"网络连接已断开"
//   10. 超时 → Toast (error) "请求超时"
//
// 错误响应格式(服务端统一):
//   { error: { code: string, message: string, details?: unknown } }
//
// 拦截器实现:
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      networkStore.setOffline(true);
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const message = data?.error?.message || '未知错误';

    switch (status) {
      case 401:
        if (!error.config.url?.includes('/auth/')) {
          authStore.logout();
          toast.error('登录已过期，请重新登录');
        }
        break;
      case 403:
        toast.error('权限不足');
        break;
      case 404:
        toast.error('请求的资源不存在');
        break;
      case 409:
        toast.warning('数据冲突，请刷新后重试');
        break;
      case 429:
        toast.warning('操作过于频繁，请稍后再试');
        break;
      case 503:
        window.location.href = '/maintenance';
        break;
      default:
        if (status >= 500) {
          toast.error('服务器错误，请稍后重试');
        }
    }

    return Promise.reject(error);
  }
);
```

#### Error Boundary层级结构

```
<GlobalErrorBoundary>                    ← 捕获整个应用崩溃
  <BrowserRouter>
    <NetworkStatusBanner />              ← 网络断开横幅
    <SessionExpiredModal />              ← 401模态框
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <PageErrorBoundary>            ← 每个页面独立捕获
            <HomePage />
          </PageErrorBoundary>
          <PageErrorBoundary>
            <ExplorePage />
          </PageErrorBoundary>
          ...
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
</GlobalErrorBoundary>
```

### 3.3 Zustand Stores

#### authStore.ts
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

// login:
//   1. api.auth.login(email, password)
//   2. set({ user, token, isAuthenticated: true })
//   3. localStorage.setItem('token', token)

// logout:
//   1. set({ user: null, token: null, isAuthenticated: false })
//   2. localStorage.removeItem('token')

// loadUser (app启动时):
//   1. 从localStorage读取token
//   2. if token: api.auth.getMe() -> set({ user, isAuthenticated: true })
//   3. else: set({ isAuthenticated: false })
```

#### photoStore.ts
```typescript
interface PhotoState {
  photos: Photo[];
  total: number;
  currentPage: number;
  isLoading: boolean;
  selectedPhotoId: string | null;
  fetchPhotos: (page?: number) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
  selectPhoto: (id: string | null) => void;
}
```

#### searchStore.ts
```typescript
interface SearchState {
  query: string;
  mode: 'smart' | 'text' | 'ocr' | 'semantic' | 'face' | 'hybrid';
  appliedMode: string | null;
  results: SearchResult[];
  total: number;
  isLoading: boolean;
  history: SearchHistory[];
  suggestions: { text: string; type: string }[];
  search: (query: string, mode?: string) => Promise<void>;
  setMode: (mode: SearchState['mode']) => void;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  loadSuggestions: (query: string) => Promise<void>;
}
```

#### uiStore.ts
```typescript
interface UIState {
  sidebarOpen: boolean;
  theme: 'dark' | 'light' | 'system';
  effectiveTheme: 'dark' | 'light';
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
}

// 初始值: sidebarOpen = true (desktop), false (mobile)
// theme: 读取localStorage, 默认 'dark'
// effectiveTheme: 根据theme计算:
//   if theme === 'system': window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
//   else: theme
// setTheme:
//   1. 更新localStorage
//   2. 计算effectiveTheme
//   3. document.documentElement.classList.toggle('dark', effectiveTheme === 'dark')
//   4. document.documentElement.classList.toggle('light', effectiveTheme === 'light')
//   5. 监听系统主题变化: matchMedia.addEventListener('change', handler)
//   6. 更新<meta name="theme-content">标签
```

#### notificationStore.ts
```typescript
interface NotificationState {
  connected: boolean;
  unreadCount: number;
  notifications: AppNotification[];
  connect: (token: string) => void;
  disconnect: () => void;
  markAllRead: () => void;
}

interface AppNotification {
  id: string;
  type: 'processing-progress' | 'processing-complete' | 'processing-failed';
  photoId: string;
  stage: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

// connect(token):
//   1. new EventSource(`/api/events?token=${token}`)
//   2. es.addEventListener('processing-progress', handler)
//   3. es.addEventListener('processing-complete', handler)
//   4. es.addEventListener('processing-failed', handler)
//   5. es.addEventListener('ping', () => set({ connected: true }))
//   6. es.onerror: set({ connected: false }), 3秒后自动重连
//   7. processing-complete事件:
//      - 添加到notifications
//      - unreadCount++
//      - 如果document.hidden: 发送浏览器通知(Notification API)
//        Notification.requestPermission() -> new Notification('AI Album', { body: message })

// disconnect():
//   es.close()

// markAllRead():
//   notifications.forEach(n => n.read = true), unreadCount = 0
```

### 3.3.1 Custom Hooks

#### useAuth.ts
```typescript
// 封装authStore的便捷hook
// export function useAuth() {
//   const { user, isAuthenticated, isLoading, login, logout, register, loadUser } = useAuthStore()
//   return { user, isAuthenticated, isLoading, login, logout, register, loadUser }
// }
//
// 使用: const { user, login } = useAuth()
```

#### usePhotos.ts
```typescript
// 照片列表管理hook
// export function usePhotos(options?: { page?: number, limit?: number, isFavorite?: boolean, isArchived?: boolean, sort?: string, order?: string }) {
//   const [photos, setPhotos] = useState<Photo[]>([])
//   const [total, setTotal] = useState(0)
//   const [isLoading, setIsLoading] = useState(false)
//   const pageRef = useRef(options?.page ?? 1)
//
//   const fetchPhotos = useCallback(async (page?: number) => {
//     setIsLoading(true)
//     const res = await api.photos.list({ page: page ?? pageRef.current, limit: options?.limit ?? 50, ...options })
//     if (page === 1 || pageRef.current === 1) setPhotos(res.photos)
//     else setPhotos(prev => [...prev, ...res.photos])
//     setTotal(res.total)
//     setIsLoading(false)
//   }, [options])
//
//   useEffect(() => { fetchPhotos() }, [fetchPhotos])
//
//   const loadMore = useCallback(() => {
//     pageRef.current++
//     fetchPhotos(pageRef.current)
//   }, [fetchPhotos])
//
//   return { photos, total, isLoading, fetchPhotos, loadMore }
// }
```

#### useSearch.ts
```typescript
// 搜索功能hook (带防抖)
// export function useSearch() {
//   const store = useSearchStore()
//   const debouncedSearch = useMemo(
//     () => debounce((query: string) => store.search(query), 300),
//     [store.search]
//   )
//   return { ...store, debouncedSearch }
// }
```

#### useUpload.ts
```typescript
// 上传管理hook
// export function useUpload() {
//   const [files, setFiles] = useState<File[]>([])
//   const [uploading, setUploading] = useState(false)
//   const [results, setResults] = useState<{ file: string, status: 'uploading'|'processing'|'completed'|'failed', progress: number }[]>([])
//
//   const addFiles = (newFiles: FileList | File[]) => {
//     const filtered = Array.from(newFiles).filter(f =>
//       f.size <= 200 * 1024 * 1024 &&  // 200MB
//       SUPPORTED_MIME_TYPES.includes(f.type)
//     )
//     setFiles(prev => [...prev, ...filtered])
//   }
//
//   const upload = async () => {
//     setUploading(true)
//     const formData = new FormData()
//     files.forEach(f => formData.append('files', f))
//     const res = await api.photos.upload(formData)
//     // 返回上传结果，SSE跟踪后续处理进度
//     setUploading(false)
//     return res
//   }
//
//   const clear = () => { setFiles([]); setResults([]) }
//
//   return { files, uploading, results, addFiles, upload, clear }
// }
```

#### useInfiniteScroll.ts
```typescript
// 无限滚动hook
// export function useInfiniteScroll(callback: () => void, options?: { threshold?: number }) {
//   const observer = useRef<IntersectionObserver | null>(null)
//   const sentinelRef = useCallback((node: HTMLElement | null) => {
//     if (observer.current) observer.current.disconnect()
//     observer.current = new IntersectionObserver(entries => {
//       if (entries[0].isIntersecting) callback()
//     }, { threshold: options?.threshold ?? 0.1 })
//     if (node) observer.current.observe(node)
//   }, [callback])
//   return sentinelRef
// }
//
// 使用:
//   const sentinelRef = useInfiniteScroll(loadMore)
//   // 在列表底部: <div ref={sentinelRef} />
```

### 3.4 Page Specifications

#### LoginPage
```
布局: 居中卡片, 深色背景带微妙渐变
表单字段:
  - Email (type=email, required)
  - Password (type=password, required, min=8)
  - "记住我" checkbox
按钮: "登录" (primary-500, full width)
链接: "没有账户？注册" -> /register
链接: "忘记密码？" -> /forgot-password
分隔线: "或" (水平线+文字)
OAuth按钮 (如果配置了OAuth):
  - GitHub登录按钮 (带GitHub图标, glass样式)
  - Google登录按钮 (带Google图标, glass样式)
  - 点击后跳转: /api/auth/oauth/github 或 /api/auth/oauth/google
错误: toast提示
成功: redirect to /
```

#### ForgotPasswordPage
```
布局: 居中卡片
表单字段:
  - Email (type=email, required)
按钮: "发送重置链接" (primary-500, full width)
成功: 显示"如果该邮箱已注册，重置邮件已发送"
链接: "返回登录" -> /login
开发模式: 重置链接显示在页面上(不依赖SMTP)
```

#### ResetPasswordPage
```
布局: 居中卡片
URL: /reset-password?token=xxx
表单字段:
  - 新密码 (type=password, required, min=8)
  - 确认新密码 (type=password, must match)
按钮: "重置密码" (primary-500, full width)
token无效/过期: 显示"链接已过期" + 重新申请链接
成功: redirect to /login + toast"密码已重置"
```

#### RegisterPage
```
布局: 居中卡片
表单字段:
  - Name (required, max=100)
  - Email (type=email, required)
  - Password (type=password, required, min=8)
  - Confirm Password (type=password, must match)
按钮: "注册" (primary-500, full width)
链接: "已有账户？登录" -> /login
成功: 如果localStorage无onboarding_completed -> redirect to /onboarding, 否则 -> /
```

#### OnboardingPage
```
布局: 全屏居中卡片, 深色渐变背景
步骤指示器: 顶部3个圆点 (1/3, 2/3, 3/3), 当前步骤高亮accent色

Step 1 欢迎页:
  插图: 相册图标(大尺寸, accent色)
  标题: "欢迎使用 AI Album"
  描述: "你的智能相册，隐私安全、智能搜索、轻松管理"
  三个特性卡片(水平排列):
    - 🔒 隐私安全: "数据存储在你自己的服务器"
    - 🔍 智能搜索: "用自然语言搜索照片内容"
    - 👥 人脸识别: "自动识别和归类人物"
  按钮: "开始使用" (primary-500)

Step 2 上传引导:
  插图: 上传图标
  标题: "上传你的第一批照片"
  描述: "支持JPG、PNG、HEIC等格式，拖拽或点击上传"
  迷你拖拽区域: 与上传页相同风格但更小
  链接: "跳过，稍后上传" (text-secondary)
  按钮: "下一步"

Step 3 AI功能介绍:
  轮播卡片(3张, 水平滑动):
    卡片1: "智能搜索" - "试试搜索'海边的日落'，AI会理解你的意思"
    卡片2: "人脸识别" - "上传含人脸的照片，系统自动识别归类"
    卡片3: "文字识别" - "照片中的文字也能被搜索到"
  按钮: "开始体验" (accent-500)

完成: localStorage.setItem('onboarding_completed', 'true')
跳转: redirect to /
Admin用户: 额外显示"配置系统"提示卡片(SMTP/存储配额/外部库)
```

#### HomePage
```
布局:
  顶部: Header (搜索栏 + 排序下拉 + 用户头像)
  主体: 照片网格 (Masonry, 3-5列响应式)
  右下角: FAB上传按钮 (accent-500)

排序下拉:
  - 拍摄时间 (默认, 降序)
  - 上传时间 (降序)
  - 文件名 (升序)
  - 文件大小 (降序)

回忆区域: 如果有memories, 顶部显示水平滚动卡片 "X年前的今天"

照片网格:
  - 使用 @tanstack/react-virtual 虚拟滚动
  - 每张照片: 缩略图 + hover显示日期
  - 视频照片: 缩略图上显示播放图标和时长
  - 点击: 打开PhotoDetailPage
  - 右键/长按: 弹出菜单 (收藏/归档/删除)

批量操作:
  - 右上角"多选"按钮进入多选模式
  - 多选模式: 点击照片勾选, 底部显示操作栏
  - 操作栏: 全选 | 取消 | 收藏 | 归档 | 删除 | 加入相册
  - 操作前确认对话框

无限滚动:
  - IntersectionObserver监听底部
  - 触发fetchPhotos(nextPage)
```

#### PhotoDetailPage
```
布局:
  全屏大图 (object-contain, 黑色背景)
  视频文件: 显示HTML5 video播放器 (controls, autoplay=false)
  顶部: 返回按钮 + 操作按钮 (收藏/下载/分享/编辑/删除)
  底部: 可拉起的信息面板

编辑模式 (点击编辑按钮进入):
  顶部工具栏:
    - 裁剪 (crop图标) -> 进入裁剪模式，显示裁剪框
    - 旋转 (rotate图标) -> 每次顺时针90度
    - 翻转 (flip图标) -> 下拉: 水平翻转/垂直翻转
    - 调整 (sliders图标) -> 亮度/对比度/饱和度滑块
    - 滤镜 (palette图标) -> 预设滤镜网格(灰度/复古/冷色/暖色/戏剧)
    - 撤销 (undo图标) -> 恢复上一版本
    - 保存 (check图标) -> 保存编辑
    - 取消 (x图标) -> 退出编辑模式
  编辑区域: 实时预览编辑效果
  保存: 调用 PUT /api/photos/:id/edit, 原图保留在photo_versions

信息面板 (底部抽屉):
  - 基本信息: 文件名, 大小, 分辨率, 拍摄时间
  - 位置: 地点名称 + 小地图 (如果GPS存在)
  - OCR文本: 可折叠, 一键复制
  - 人脸: 识别到的人脸列表
  - 标签: 当前标签 + 添加标签

键盘导航:
  - 左右箭头: 切换上一张/下一张
  - Escape: 返回
  - F: 收藏
  - E: 进入编辑模式
```

#### UploadPage
```
布局:
  大拖拽区域 (虚线边框, 居中)
  或点击选择文件

上传列表:
  每个文件显示:
    - 缩略图
    - 文件名 + 大小
    - 进度条 (上传进度)
    - AI处理状态: pending -> thumbnailing -> ocr -> clip -> face -> completed
    - 每个阶段用不同颜色圆点表示

底部: 上传按钮 + 清空按钮
```

#### SearchPage
```
布局:
  顶部: 大搜索框 (智能搜索, 默认模式)
  搜索框下方: "高级筛选" 折叠按钮 (chevron图标)
  高级筛选面板(折叠):
    - 搜索模式: pill按钮组 (智能/文本/OCR/语义/人脸/混合)
    - 时间范围: 开始日期-结束日期
    - 筛选: 收藏/归档/人物选择/标签选择
  主体: 搜索结果网格

搜索建议:
  输入时下拉显示:
    - 人物名 (带人物图标)
    - 地点名 (带地图图标)
    - 标签名 (带标签图标)
    - 搜索历史 (带时钟图标)

搜索结果:
  每张照片角标显示匹配类型 (文本/OCR/语义/人脸)
  hover显示匹配分数
  顶部显示"使用了XX搜索模式"提示

搜索历史: 搜索框聚焦时显示历史记录(最近10条)
```

#### ExplorePage
```
布局: 标签页切换 (人物/地点/标签)

人物标签页:
  圆形头像网格 (4-6列响应式)
  hover显示名字和照片数
  点击进入PersonDetailPage

地点标签页:
  左侧: 地点列表 (按照片数排序)
  右侧: Leaflet地图 (标记聚类)

标签标签页:
  标签云/列表, 点击进入该标签的照片
```

#### MapPage
```
全屏Leaflet地图:
  - OpenStreetMap瓦片
  - 照片按GPS坐标聚类标记 (MarkerCluster)
  - 点击标记弹出照片缩略图
  - 侧边栏: 时间筛选器
```

#### AlbumPage
```
布局:
  顶部: "创建相册"按钮
  主体: 相册封面网格 (2-4列响应式)
  每个相册卡片: 封面图 + 名称 + 照片数 + 日期范围

AlbumDetailPage:
  顶部: 相册名称 + 编辑/分享/删除按钮
  主体: 照片网格
  底部: "添加照片"按钮
```

#### AdminPage
```
布局: 标签页切换 (用户管理/任务队列/系统配置)

用户管理:
  表格: 邮箱/名称/角色/存储用量/创建时间/操作
  操作: 编辑角色/存储配额, 删除

任务队列:
  每个队列一张卡片:
    队列名称 + 状态 (运行中/暂停)
    进度条: active/waiting/completed/failed
    操作: 暂停/恢复/重试失败
```

#### SettingsPage
```
布局: 左侧导航 + 右侧内容

导航项:
  - 账户: 修改密码, 修改昵称, 退出所有设备, 删除账户
  - 存储: 用量图表, 存储模板
  - AI配置: OCR语言, 搜索模式默认值, 处理并发数
  - 语言: 界面语言切换(中文/英文)
  - API密钥: 创建/删除密钥列表

删除账户:
  1. 显示警告"所有数据将被永久删除"
  2. 需输入当前密码确认
  3. 确认后调用 DELETE /api/settings/account
  4. 成功后清除本地token, 跳转登录页
```

#### TrashPage
```
布局: 照片网格 + 顶部操作栏

顶部操作栏:
  - "回收站"标题
  - "清空回收站"按钮(红色, 需二次确认)
  - 提示"照片将在30天后自动永久删除"

照片网格:
  - 与首页相同的网格布局
  - 每张照片显示剩余天数
  - hover显示操作按钮: 恢复/永久删除
  - 永久删除需二次确认

空状态: "回收站是空的"
```

#### FavoritesPage
```
布局:
  顶部: "收藏"标题 + 照片计数
  主体: 照片网格 (与首页相同的Masonry布局)

照片网格:
  - 调用 GET /api/photos/favorites
  - 无限滚动加载
  - 点击照片打开PhotoDetailPage
  - 右键/长按: 取消收藏/归档/删除

空状态: "收藏你的第一张照片" + "浏览照片"按钮 -> /
```

#### ArchivePage
```
布局:
  顶部: "归档"标题 + 照片计数
  主体: 照片网格 (与首页相同的Masonry布局)

照片网格:
  - 调用 GET /api/photos/archived
  - 无限滚动加载
  - 点击照片打开PhotoDetailPage
  - 右键/长按: 取消归档/删除

空状态: "没有归档的照片"
```

#### SharingPage
```
布局: 标签页切换 (分享链接/伙伴共享)

分享链接标签页:
  顶部: "创建分享链接"按钮
  列表: 每行显示:
    - 分享类型 (照片/相册)
    - 目标名称
    - 过期时间 (如果设置)
    - 是否有密码保护 (锁图标)
    - 创建时间
    - 操作: 复制链接/删除
  空状态: "还没有分享链接"

伙伴共享标签页:
  顶部: "添加伙伴"按钮 (弹出用户搜索框)
  列表: 每行显示:
    - 伙伴头像+名称+邮箱
    - 共享方向 (我共享的/共享给我的)
    - 是否在时间线显示 (toggle开关)
    - 操作: 取消共享
  空状态: "还没有伙伴共享"
```

#### SharedPage
```
布局: 全屏照片浏览（无需登录）
URL: /share/:token

流程:
  1. 页面加载时调用 GET /api/share/:token
  2. 如果需要密码: 显示密码输入框
  3. 如果链接过期: 显示"链接已过期"提示
  4. 成功: 显示分享的照片/相册

内容:
  - 如果是单张照片: 大图展示
  - 如果是相册: 照片网格 + 相册名称
  - 底部: "由AI Album提供"文字
  - 如果allowDownload=true: 显示下载按钮
  - 密码保护: 显示密码输入表单 + "提交"按钮

样式: 深色背景, 照片居中, 简洁布局
```

#### PersonDetailPage
```
布局:
  顶部: 人物头像 + 名称(可编辑) + 照片计数 + 操作按钮(合并/隐藏)
  主体: 该人物的照片网格 (与首页相同的Masonry布局)

操作:
  - 编辑名称: 点击名称变为输入框, Enter保存
  - 合并人物: 弹出选择器, 选择目标人物
  - 隐藏人物: 确认后设置isHidden=true, 从探索页消失
  - 设置特征照: 点击某张照片的人脸, 设为feature_face_path

照片网格:
  - 无限滚动加载
  - 点击照片打开PhotoDetailPage
```

#### AlbumDetailPage
```
URL: /album/:id

布局:
  顶部: 相册名称 + 描述(可编辑) + 操作按钮
  操作按钮:
    - 编辑(名称/描述/封面)
    - 分享(生成分享链接)
    - 添加照片(打开照片选择器)
    - 幻灯片(play图标, 进入全屏幻灯片模式)
    - 下载(download图标, 批量下载相册照片为ZIP)
    - 删除相册(确认对话框)

主体: 照片网格 (与首页相同)

封面设置:
  - 默认封面: 相册中最新照片
  - 可手动设置: 点击照片 -> "设为封面"

共享相册:
  - 显示协作者列表
  - 创建者可添加/移除协作者
  - 协作者可添加照片,不可删除相册

空相册: 显示"添加照片"引导

幻灯片模式:
  - 全屏显示照片
  - 底部控制栏: 上一张/下一张/播放暂停/速度(3s/5s/10s)/退出
  - 自动播放: 按相册顺序循环
  - 手动: 左右箭头或滑动翻页
  - ESC退出

批量下载:
  - 点击下载按钮 -> 选择尺寸(原始/缩略图) -> 调用 POST /api/photos/batch-download
  - 下载进度: 浏览器原生下载进度
```

#### SmartAlbumPage
```
URL: /smart-albums

布局:
  顶部: 标题"智能分类" + 描述"AI自动分类你的照片"
  主体: 分类卡片网格 (2-3列)

每个分类卡片:
  - 封面照片 (该分类中相似度最高的照片)
  - 分类名称 (如"宠物"、"食物"、"自然")
  - 照片计数徽标
  - 自定义分类标识 (is_custom=true时显示)
  - 点击进入SmartAlbumDetailPage

底部: "创建自定义分类"按钮
  - 弹出对话框: 输入分类名称 + 选择3-10张样本照片
  - 创建后自动触发全量分类

空状态: "上传更多照片以启用智能分类"
```

#### SmartAlbumDetailPage
```
URL: /smart-albums/:id

布局:
  顶部: 分类名称 + 照片计数 + 操作按钮
  操作按钮:
    - 调整阈值 (slider, 0.1-0.9)
    - 重新分类
    - 删除分类 (仅自定义分类可删除)

主体: 照片网格 (按相似度排序, 最相似的在前)

每张照片:
  - 右下角显示相似度百分比
  - 可手动移出分类 (右键菜单 -> "从此分类移除")

空分类: "该分类暂无照片，尝试降低分类阈值"
```

#### YearInReviewPage
```
URL: /year-in-review 或 /year-in-review/:year

布局: 全屏沉浸式滚动

年度回顾内容:
  1. 封面: 年份数字 + "年度回顾" + 用户头像
  2. 年度精选: Top 10照片横向滚动展示
  3. 人物回顾: 最常出现的人物头像 + 照片数
  4. 旅行足迹: 年度旅行地图 (Leaflet)
  5. 月度精选: 12张月度最佳照片网格
  6. 拍摄统计: 数据可视化图表 (柱状图/饼图)
     - 总照片数/视频数
     - 存储使用量
     - 最常使用的相机/镜头
     - 按月拍摄分布

底部操作:
  - "生成分享卡片"按钮 -> 选择模板 -> 生成图片 -> 保存/分享
  - "查看其他年份"下拉选择

隐私设置:
  - "编辑排除项"按钮 -> 选择排除的人物/时间范围

年度回顾列表页 (/year-in-review):
  - 按年份倒序显示回顾卡片
  - 每张卡片: 年份 + 封面照片 + 简要统计
```

#### DuplicatePage
```
URL: /duplicates

布局:
  顶部: 标题"重复照片管理" + "扫描"按钮 + 扫描状态指示器
  筛选: Tab切换 (完全重复/相似照片/全部)

扫描状态:
  - 未扫描: 显示"点击扫描检测重复照片"
  - 扫描中: 进度条 + "正在扫描..."
  - 扫描完成: 显示分组数量统计

重复分组列表:
  每组:
    - 相似度百分比标签 (100%=完全重复)
    - 照片横向滚动展示
    - 推荐保留的照片标记"推荐"徽标 (最高分辨率/最新)
    - 操作: "保留此张"按钮 (其他移入回收站)

底部工具栏 (多选模式):
  - "保留每组推荐项"一键操作
  - "删除所有重复项"批量操作
  - 选中计数显示

空状态: "没有发现重复照片"
```

#### SharedLibraryPage
```
URL: /shared-libraries

布局:
  顶部: 标题"共享图库" + "创建共享图库"按钮

图库列表:
  每个图库卡片:
    - 图库名称
    - 成员头像列表 (最多显示5个, 超出显示+N)
    - 照片计数
    - 我的角色 (owner/member标识)
    - 点击进入图库详情

图库详情:
  顶部: 图库名称 + 成员管理 + 规则配置
  成员管理:
    - 成员列表 (头像+名称+角色)
    - "邀请成员"按钮 (搜索用户)
    - Owner可移除成员
  规则配置:
    - 当前规则列表 (人物/时间范围/地点/全部)
    - "添加规则"按钮
    - 规则类型选择 + 值输入
    - "同步"按钮 (触发规则同步)
  照片网格:
    - 所有成员的共享照片
    - 按时间倒序排列
    - 标注照片来源 (哪位成员的照片)

空状态: "邀请家庭成员加入共享图库"
```

#### SetupWizardPage
```
URL: /setup (仅setup_completed=false时可访问)

布局: 居中卡片式向导，步骤指示器

Step 1 - 欢迎页:
  - AI Album Logo + "欢迎使用AI Album"
  - "开始配置"按钮
  - 跳过则使用默认配置

Step 2 - 创建管理员:
  - 邮箱输入
  - 密码输入 (8位以上，含大小写数字)
  - 昵称输入
  - "下一步"按钮
  - 验证: 邮箱格式、密码强度

Step 3 - 存储配置:
  - 上传目录路径 (默认/app/uploads)
  - 缩略图目录路径 (默认/app/thumbnails)
  - "浏览"按钮 (仅桌面端)
  - "下一步"按钮

Step 4 - 邮件配置 (可选):
  - SMTP主机/端口/用户名/密码/发件人
  - "跳过"按钮 (跳过则密码重置不可用)
  - "测试连接"按钮
  - "下一步"按钮

Step 5 - ML模型下载:
  - 三个模型下载进度条:
    - PaddleOCR (中文OCR)
    - XLM-Roberta-Large-Vit-B-16Plus (CLIP多语言)
    - InsightFace buffalo_l (人脸识别)
  - 每个模型显示: 大小 + 下载进度 + 状态
  - "后台下载，先进入系统"按钮
  - "完成"按钮 (所有模型下载完成后)

完成后自动跳转到首页
```

#### 2FA Settings (在SettingsPage内)
```
位置: 设置页 -> 安全 -> 两步验证

启用2FA流程:
  1. 点击"启用两步验证"
  2. 输入密码确认身份
  3. 显示QR码 + 密钥文本 (手动输入)
  4. 打开验证器APP扫描QR码
  5. 输入6位验证码验证
  6. 显示10个恢复码 (警告: 请妥善保存，仅显示一次)
  7. 确认已保存恢复码 -> 2FA启用

禁用2FA流程:
  1. 点击"禁用两步验证"
  2. 输入密码确认
  3. 2FA已禁用

登录设备管理:
  - 活跃会话列表 (设备名/IP/最后活跃时间)
  - "撤销"按钮 (除当前会话外)
  - "撤销所有其他会话"按钮
```

#### ActivityLogPage
```
URL: /activity-logs
权限: Admin查看全部 / 普通用户查看自己的(/activity-logs/me)

布局:
  - 顶部: 筛选栏
    - 操作类型下拉: login, upload, delete, share, edit, settings (多选)
    - 日期范围: 开始日期 - 结束日期 (DatePicker)
    - Admin额外: 用户筛选下拉
  - 主体: 活动日志列表 (按时间倒序)
    - 每条记录: [时间] [用户头像+名称] [操作图标+描述] [资源类型+ID]
    - 操作图标: 🔐登录 📤上传 🗑删除 🔗分享 ✏️编辑 ⚙️设置
    - 分页: 每页20条

数据加载:
  - 加载: GET /api/activity-logs?action=...&startDate=...&endDate=...&page=1&limit=20
  - 普通用户: GET /api/activity-logs/me?action=...&startDate=...&endDate=...&page=1&limit=20
  - 筛选变更时重新加载

空状态: "暂无活动记录"
```

#### OAuthCallbackPage
```
URL: /oauth/callback/:provider (github 或 google)
权限: 公开

布局: 居中加载指示器

逻辑:
  1. 页面加载时从URL参数获取code和state
  2. 如果缺少code或state: 显示"授权失败" + 返回登录页按钮
  3. 调用后端回调: window.location.href = `/api/auth/oauth/${provider}/callback?code=${code}&state=${state}`
  4. 后端处理完成后302重定向到 /oauth/success?token=xxx
  5. 此页面仅作为中间跳转, 用户不会停留太久

错误处理:
  - 授权被拒绝: 显示"授权已取消" + 返回登录页按钮
  - 网络错误: 显示"连接失败" + 重试按钮
```

#### OAuthSuccessPage
```
URL: /oauth/success?token=xxx
权限: 公开

布局: 居中加载指示器 + "正在登录..."

逻辑:
  1. 从URL参数获取token
  2. if token不存在: 重定向到 /login
  3. localStorage.setItem('token', token)
  4. 调用 api.auth.getMe() 获取用户信息
  5. 更新authStore: set({ user, token, isAuthenticated: true })
  6. if localStorage无onboarding_completed: redirect to /onboarding
  7. else: redirect to /

错误处理:
  - token无效: 清除localStorage, 重定向到 /login + toast"登录失败"
  - 网络错误: 显示重试按钮
```

#### NotificationPage (通知中心)
```
URL: /notifications
权限: 需认证

布局: 左侧通知列表 + 右侧通知详情(可选)

通知列表:
  - 顶部: "全部已读"按钮 + 筛选下拉(type: 全部/系统/分享/处理/订阅/安全)
  - 每条通知: 图标(按type) + 标题 + 摘要 + 时间 + 未读标记(蓝点)
  - 点击通知: 标记已读 + 跳转到相关页面
  - 无限滚动加载

通知类型图标:
  - system: Bell
  - share: Share2
  - processing: Cpu
  - subscription: CreditCard
  - security: Shield

通知设置(右上角齿轮图标):
  - 弹出面板: 邮件通知开关 + 应用内通知开关 + 各类型开关
  - PUT /api/notifications/settings

数据源: notificationStore
  - notifications: Notification[]
  - unreadCount: number
  - fetchNotifications()
  - markAsRead(ids)
  - markAllAsRead()
  - updateSettings(settings)

实时更新: SSE事件 'notification' -> prepend到列表
```

#### SessionManagementPage (会话管理 - 参考immich)
```
URL: /settings/sessions
权限: 需认证

布局: 垂直列表

会话列表:
  - 每条: 设备图标 + 设备信息 + IP地址 + 最后活跃时间 + 当前会话标记
  - 当前会话: 绿色"当前设备"标签, 不可删除
  - 其他会话: 红色"撤销"按钮
  - 底部: "撤销所有其他会话"按钮(红色, 需确认)

数据源: GET /api/sessions
操作:
  - DELETE /api/sessions/:id -> 撤销单个会话
  - DELETE /api/sessions -> 撤销所有其他会话
```

#### PricingPage (定价页 - Phase 5)
```
URL: /pricing
权限: 公开

布局: 居中3列卡片(免费/基础/专业) + 企业联系

每个计划卡片:
  - 计划名称 + 月费
  - 存储空间
  - AI功能列表(✓/✗标记)
  - 用户数限制
  - API调用限制
  - "选择计划"按钮(免费: "当前计划"/其他: "升级")

对比表格(卡片下方):
  - 行: 存储空间/OCR语言/CLIP上限/人脸聚类/人脸上限/API调用/用户数
  - 列: 免费/基础/专业/企业

数据源: GET /api/subscriptions/plans
```

#### SubscriptionPage (订阅管理 - Phase 5)
```
URL: /settings/subscription
权限: 需认证

布局: 顶部当前计划 + 底部发票历史

当前计划区域:
  - 计划名称 + 状态标签(active=绿/trialing=蓝/past_due=红/canceled=灰)
  - 当前周期: 开始日期 - 结束日期
  - 存储使用: 进度条(已用/总量)
  - AI功能使用: OCR调用次数/CLIP处理张数/人脸聚类数
  - 操作按钮:
    - "管理订阅" -> POST /api/subscriptions/portal -> 跳转Stripe Portal
    - "取消订阅" -> 确认弹窗 -> POST /api/subscriptions/cancel
    - "升级计划" -> 跳转 /pricing

试用提示(如trialing):
  - "专业版试用还剩X天" + 黄色进度条
  - "立即订阅"按钮

发票历史:
  - 表格: 日期/金额/状态/操作(下载PDF)

数据源: GET /api/subscriptions/current, GET /api/subscriptions/invoices
```

#### AdminBrandingPage (品牌定制 - Phase 5)
```
URL: /admin/branding
权限: Admin

布局: 左侧预览 + 右侧配置表单

预览区域:
  - 实时预览登录页效果
  - 品牌色变化时CSS变量实时更新

配置表单:
  - 品牌Logo: 拖拽上传区域 + 当前Logo预览 + "删除"按钮
  - 应用名称: 文本输入 + 实时预览
  - 品牌主色: 颜色选择器 + HEX输入
  - 登录页标题: 文本输入
  - 登录页描述: 文本区域
  - 登录页背景: 图片上传 + 预览
  - 邮件Logo: 图片上传
  - 邮件页脚: 文本区域
  - 隐藏版本信息: 开关
  - "保存"按钮

操作:
  - PUT /api/admin/branding
  - POST /api/admin/branding/logo
  - POST /api/admin/branding/login-background
```

#### AdminTenantsPage (租户管理 - Phase 5)
```
URL: /admin/tenants
权限: Admin

布局: 顶部统计卡片 + 租户列表 + 创建弹窗

统计卡片:
  - 总租户数 + 活跃租户数 + 总存储使用 + 总用户数

租户列表(表格):
  - 列: 名称/域名/计划/用户数/存储使用/创建时间/操作
  - 操作: 编辑/资源详情/导出/删除
  - 搜索框: 按名称/域名搜索

创建租户弹窗:
  - 名称(必填) + 域名(可选) + 计划(下拉) + "创建"按钮

租户资源详情弹窗:
  - 用户数/照片数/存储使用/API Key数
  - 趋势图(按日/周/月)

数据源: GET /api/admin/tenants, GET /api/admin/tenants/:id/resources
```

#### AdminFeedbackPage (反馈管理 - Phase 5)
```
URL: /admin/feedback
权限: Admin

布局: 顶部筛选 + 反馈列表

筛选: 类型(bug/feature/improvement/other) + 状态(open/in_progress/resolved/closed)

反馈列表:
  - 每条: 类型图标 + 标题 + 提交者 + 时间 + 状态标签
  - 点击展开: 完整描述 + 截图(如有) + 操作按钮(更改状态)
```

#### FeedbackWidget (反馈收集组件 - Phase 5)
```
位置: 全局右下角浮动按钮
权限: 所有已登录用户(可配置允许匿名)

组件:
  - 圆形按钮(Feedback图标) + hover显示"反馈"
  - 点击弹出反馈表单:
    - 类型选择: Bug/功能建议/改进/其他
    - 标题输入
    - 描述输入(文本区域)
    - 截图上传(可选, 拖拽)
    - "提交"按钮
  - 提交成功: toast "感谢您的反馈!" + 关闭表单

操作: POST /api/feedback
```

### 3.5 Shared Types (shared/types.ts)
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  avatarPath: string | null;
  storageQuota: number | null;
  storageUsed: number;
  locale: 'zh' | 'en';
  otpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  filePath: string;
  thumbnailPath: string | null;
  mimeType: string;
  fileType: 'image' | 'video';
  fileSize: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  ocrText: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  processingStatus: 'pending' | 'thumbnailing' | 'metadata' | 'ocr' | 'clip' | 'face' | 'completed' | 'failed';
  fileHash: string | null;
  deletedAt: string | null;
  libraryId: string | null;
  livePhotoVideoId: string | null;
  deviceAssetId: string | null;
  deviceId: string | null;
  pickScore: number | null;
  rating: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoListItem extends Pick<Photo, 'id' | 'userId' | 'filename' | 'thumbnailPath' | 'mimeType' | 'fileType' | 'width' | 'height' | 'duration' | 'takenAt' | 'isFavorite' | 'isArchived' | 'processingStatus' | 'pickScore' | 'rating' | 'livePhotoVideoId'> {
  blurhash: string | null;
  thumbnailUrl: string;
}

export interface PhotoDetail extends Photo {
  tags: Tag[];
  people: Person[];
  albums: Album[];
  exif: ExifData | null;
  sharedWith: string[];
}

export interface ExifData {
  make: string | null;
  model: string | null;
  lensModel: string | null;
  fNumber: number | null;
  exposureTime: string | null;
  iso: number | null;
  focalLength: number | null;
  software: string | null;
}

export interface Person {
  id: string;
  userId: string;
  name: string | null;
  featureFacePath: string | null;
  faceCount: number;
  isHidden: boolean;
  birthDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Album {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverPath: string | null;
  photoCount: number;
  isShared: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  photoCount: number;
  createdAt: string;
}

export interface SearchResult {
  photo: Photo;
  score: number;
  matchType: 'text' | 'ocr' | 'semantic' | 'face' | 'hybrid';
  highlights: { field: string; snippet: string }[];
}

export interface SearchHistory {
  id: string;
  query: string;
  searchMode: string;
  resultCount: number;
  createdAt: string;
}

export interface ShareLink {
  id: string;
  albumId: string | null;
  photoId: string | null;
  token: string;
  expiresAt: string | null;
  allowDownload: boolean;
  allowUpload: boolean;
  hasPassword: boolean;
  createdAt: string;
}

export interface JobQueue {
  name: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  isPaused: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: Record<string, string[]>;
}

export interface ExternalLibrary {
  id: string;
  userId: string;
  name: string;
  importPath: string;
  exclusionPatterns: string[];
  isWatched: boolean;
  lastScannedAt: string | null;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Stack {
  id: string;
  userId: string;
  primaryPhotoId: string;
  photoIds: string[];
  photoCount: number;
  createdAt: string;
}

export interface SmartAlbum {
  id: string;
  userId: string;
  name: string;
  categoryKey: string;
  threshold: number;
  photoCount: number;
  coverPath: string | null;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SharedLibrary {
  id: string;
  name: string;
  createdBy: string;
  members: SharedLibraryMember[];
  rules: SharedLibraryRule[];
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SharedLibraryMember {
  id: string;
  libraryId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface SharedLibraryRule {
  id: string;
  libraryId: string;
  type: 'person' | 'date_range' | 'location' | 'all';
  value: string;
}

export interface DuplicateGroup {
  id: string;
  photos: Photo[];
  similarity: number;
  type: 'exact' | 'similar';
  recommendedKeepId: string;
}

export interface YearInReview {
  id: string;
  userId: string;
  year: number;
  topPhotoIds: string[];
  topPersons: { personId: string; personName: string; count: number }[];
  travelFootprint: { locationName: string; count: number; month: number }[];
  monthlyPickIds: string[];
  stats: { totalPhotos: number; totalVideos: number; storageUsed: number; topCamera: string; topLens: string };
  exclusions: { personIds?: string[]; dateRanges?: { start: string; end: string }[] };
  shareCardGenerated: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  recoveryCodes: string[];
}

export interface DataExportStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl: string | null;
}

export interface SetupStatus {
  isSetup: boolean;
}

export interface MLModelStatus {
  ocr: { loaded: boolean; size: string };
  clip: { loaded: boolean; size: string };
  face: { loaded: boolean; size: string };
}

export interface VersionInfo {
  current: string;
  latest: string;
  changelog: string;
  updateAvailable: boolean;
}

export interface Face {
  id: string;
  personId: string | null;
  photoId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  embedding: number[] | null;
  createdAt: string;
}

export interface PartnerSharing {
  id: string;
  sharedByUserId: string;
  sharedWithUserId: string;
  inTimeline: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  permissions: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface PhotoVersion {
  id: string;
  photoId: string;
  filePath: string;
  operation: string;
  params: string | null;
  versionNumber: number;
  createdAt: string;
}

export interface SystemConfig {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface SmartAlbumPhoto {
  photoId: string;
  smartAlbumId: string;
  similarity: number;
  createdAt: string;
}

export interface SharedLibraryPhoto {
  id: string;
  libraryId: string;
  photoId: string;
  addedBy: string;
  createdAt: string;
}

export interface PickScoreResult {
  pickScore: number;
  clarity: number;
  composition: number;
  expression: number;
}

export interface XmpMetadata {
  rating: number | null;
  description: string | null;
  tags: string[];
  latitude: number | null;
  longitude: number | null;
  takenAt: string | null;
  orientation: number | null;
}

export interface ImmichMigrationStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  totalPhotos: number;
  migratedPhotos: number;
  errors: string[];
}

export interface ImmichPreview {
  photoCount: number;
  videoCount: number;
  albumCount: number;
  personCount: number;
  userCount: number;
  estimatedSize: number;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'system' | 'share' | 'processing' | 'subscription' | 'security';
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationSettings {
  userId: string;
  enableEmail: boolean;
  enableInApp: boolean;
  types: {
    system: boolean;
    share: boolean;
    processing: boolean;
    subscription: boolean;
    security: boolean;
  };
}

export interface Activity {
  id: string;
  albumId: string;
  assetId: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'comment' | 'like';
  comment: string | null;
  createdAt: string;
}

export interface ActivityStatistics {
  comments: number;
  likes: number;
}

export interface ServerInfo {
  version: string;
  database: { postgresUp: boolean };
  redis: { up: boolean };
  mlService: { up: boolean; modelsLoaded: { ocr: boolean; clip: boolean; face: boolean } };
  storage: { total: number; used: number; available: number };
  usage: { totalPhotos: number; totalVideos: number; totalUsers: number; totalStorageUsed: number };
}

export interface ServerStats {
  photos: number;
  videos: number;
  users: number;
  albums: number;
  storageUsed: number;
  dbSize: number;
}

export interface VersionInfo {
  current: string;
  latest: string;
  updateAvailable: boolean;
  changelog: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceMonthly: number;
  storageBytes: number;
  aiFeatures: Record<string, unknown>;
  maxUsers: number;
  apiCallsMonthly: number;
  stripePriceId: string | null;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'void';
  stripeInvoiceId: string | null;
  pdfUrl: string | null;
  createdAt: string;
}

export interface PlanLimits {
  ocrLangs: string[] | '*';
  clipMax: number;
  faceCluster: boolean;
  faceMax: number;
  apiCalls: number;
}

export interface CurrentSubscription {
  subscription: Subscription | null;
  plan: string;
  limits: PlanLimits;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  planId: string | null;
  planName: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
}

export interface TenantBranding {
  id: string;
  tenantId: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  loginBackgroundUrl: string | null;
  loginTitle: string | null;
  loginDescription: string | null;
  emailHeaderLogoUrl: string | null;
  emailFooterText: string | null;
  hideVersionInfo: boolean;
  appName: string;
  createdAt: string;
}

export interface TenantResourceUsage {
  userCount: number;
  photoCount: number;
  storageUsed: number;
  apiKeyCount: number;
}

export interface Invitation {
  id: string;
  code: string;
  createdBy: string;
  maxUses: number;
  currentUses: number;
  rewardStorageBytes: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface Feedback {
  id: string;
  userId: string | null;
  userName: string | null;
  category: 'bug' | 'feature' | 'improvement' | 'other';
  title: string;
  description: string;
  screenshotUrl: string | null;
  userEmail: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
}
```

### 3.6 i18n国际化框架 (react-i18next)

> **重要性**: 商业产品必须支持多语言。本系统默认支持中文(zh)和英文(en)，扩展新语言只需添加翻译文件。

#### 3.6.1 框架选型与配置

```typescript
// 安装: npm install react-i18next i18next i18next-browser-languagedetector

// src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zh from './locales/zh.json';
import en from './locales/en.json';

export const SUPPORTED_LOCALES = ['zh', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'zh';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { zh: { translation: zh }, en: { translation: en } },
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'locale',
      caches: ['localStorage'],
    },
  });

export default i18n;
```

#### 3.6.2 翻译文件结构 (JSON分层命名)

```json
// src/i18n/locales/zh.json — 中文翻译
{
  "common": {
    "appName": "AI Album",
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "confirm": "确认",
    "loading": "加载中...",
    "loadMore": "加载更多",
    "noResults": "暂无数据",
    "retry": "重试",
    "copy": "复制",
    "copied": "已复制",
    "close": "关闭",
    "back": "返回",
    "next": "下一步",
    "previous": "上一步",
    "search": "搜索",
    "upload": "上传",
    "download": "下载",
    "share": "分享",
    "edit": "编辑",
    "favorite": "收藏",
    "unfavorite": "取消收藏",
    "archive": "归档",
    "unarchive": "取消归档",
    "restore": "恢复",
    "permanentDelete": "永久删除",
    "selectAll": "全选",
    "deselectAll": "取消全选",
    "selected": "已选择 {{count}} 项",
    "bytes": "{{size}} B",
    "kilobytes": "{{size}} KB",
    "megabytes": "{{size}} MB",
    "gigabytes": "{{size}} GB",
    "dateFormat": "YYYY年MM月DD日",
    "dateTimeFormat": "YYYY年MM月DD日 HH:mm",
    "today": "今天",
    "yesterday": "昨天"
  },
  "auth": {
    "login": "登录",
    "register": "注册",
    "email": "邮箱",
    "password": "密码",
    "name": "昵称",
    "forgotPassword": "忘记密码？",
    "resetPassword": "重置密码",
    "sendResetEmail": "发送重置邮件",
    "newPassword": "新密码",
    "confirmPassword": "确认密码",
    "loginWithGithub": "使用GitHub登录",
    "loginWithGoogle": "使用Google登录",
    "logout": "退出登录",
    "logoutAll": "退出所有设备",
    "changePassword": "修改密码",
    "oldPassword": "旧密码",
    "enable2FA": "启用两步验证",
    "disable2FA": "关闭两步验证",
    "twoFactorCode": "验证码",
    "recoveryCodes": "恢复码",
    "invalidCredentials": "邮箱或密码错误",
    "emailRegistered": "该邮箱已被注册",
    "resetEmailSent": "如果该邮箱已注册，重置邮件已发送",
    "resetLinkExpired": "重置链接已过期，请重新申请",
    "passwordResetSuccess": "密码重置成功，请使用新密码登录",
    "passwordChanged": "密码修改成功，请重新登录",
    "sessionRevoked": "会话已失效，请重新登录"
  },
  "photos": {
    "title": "照片",
    "timeline": "时间线",
    "detail": "照片详情",
    "uploadPhotos": "上传照片",
    "dragDropHint": "拖拽照片到此处或点击选择",
    "maxFilesHint": "单次最多上传50个文件，单文件最大200MB",
    "uploadProgress": "已上传 {{uploaded}}/{{total}}",
    "uploadSuccess": "上传成功",
    "uploadFailed": "上传失败",
    "duplicateDetected": "检测到重复照片，已跳过",
    "originalName": "原始文件名",
    "fileSize": "文件大小",
    "resolution": "分辨率",
    "takenAt": "拍摄时间",
    "camera": "相机型号",
    "lens": "镜头",
    "aperture": "光圈",
    "shutterSpeed": "快门速度",
    "iso": "ISO",
    "gpsCoordinates": "GPS坐标",
    "ocrText": "OCR文字",
    "noExif": "无元数据",
    "noOcrText": "未识别到文字",
    "processing": "AI处理中",
    "processingDone": "AI处理完成",
    "processingFailed": "AI处理失败",
    "reprocess": "重新处理",
    "storageQuotaExceeded": "存储空间不足",
    "storageUsage": "已使用 {{used}} / {{total}}",
    "deleteConfirm": "确定要删除此照片吗？照片将移入回收站，30天后自动清除。",
    "permanentDeleteConfirm": "此操作不可撤销，确定要永久删除吗？",
    "batchDeleteConfirm": "确定要删除选中的 {{count}} 张照片吗？",
    "favorited": "已收藏",
    "unfavorited": "已取消收藏",
    "archived": "已归档",
    "unarchived": "已取消归档",
    "movedToTrash": "已移入回收站",
    "restored": "已恢复",
    "editOperations": "编辑操作",
    "crop": "裁剪",
    "rotate": "旋转",
    "flipHorizontal": "水平翻转",
    "flipVertical": "垂直翻转",
    "filter": "滤镜",
    "undo": "撤销",
    "redo": "重做",
    "saveEdit": "保存编辑",
    "editSaved": "编辑已保存"
  },
  "search": {
    "placeholder": "搜索照片、人物、地点...",
    "noResults": "未找到匹配的照片",
    "searchSuggestions": "试试搜索人名、地点或描述性词语",
    "searchHistory": "搜索历史",
    "clearHistory": "清除历史",
    "modeText": "文本",
    "modeOcr": "OCR",
    "modeSemantic": "语义",
    "modeFace": "人脸",
    "modeHybrid": "混合",
    "resultCount": "找到 {{count}} 张照片"
  },
  "albums": {
    "title": "相册",
    "createAlbum": "创建相册",
    "albumName": "相册名称",
    "albumDescription": "相册描述",
    "addPhotos": "添加照片",
    "editAlbum": "编辑相册",
    "deleteAlbum": "删除相册",
    "deleteAlbumConfirm": "删除相册不会删除其中的照片",
    "albumCover": "相册封面",
    "slideShow": "幻灯片",
    "batchDownload": "批量下载",
    "emptyAlbum": "空相册",
    "addMembers": "添加成员",
    "memberCanAdd": "成员可添加照片"
  },
  "persons": {
    "title": "人物",
    "namePerson": "为人物命名",
    "unnamed": "未命名",
    "hide": "隐藏",
    "unhide": "显示",
    "merge": "合并人物",
    "mergeConfirm": "确定将选中的人物合并到此人物吗？",
    "photosWith": "共 {{count}} 张照片",
    "selectFeature": "选择特征照片",
    "birthDate": "生日",
    "noFaces": "未检测到人脸"
  },
  "share": {
    "title": "分享",
    "createShareLink": "创建分享链接",
    "shareLink": "分享链接",
    "copyLink": "复制链接",
    "linkCopied": "链接已复制",
    "expiresIn": "过期时间",
    "setExpiry": "设置过期时间",
    "passwordProtect": "密码保护",
    "setPassword": "设置密码",
    "allowDownload": "允许下载",
    "allowUpload": "允许上传",
    "shareLinkExpired": "链接已过期",
    "enterPassword": "请输入访问密码",
    "wrongPassword": "密码错误",
    "deleteShareLink": "删除分享链接",
    "partnerSharing": "伙伴共享",
    "sharedLibraries": "共享图库",
    "createSharedLibrary": "创建共享图库",
    "inviteMembers": "邀请成员",
    "setRules": "设置共享规则",
    "ruleTypePerson": "包含指定人物的照片",
    "ruleTypeLocation": "包含指定地点的照片",
    "ruleTypeDateRange": "指定日期范围的照片",
    "ruleTypeAll": "全部照片"
  },
  "settings": {
    "title": "设置",
    "profile": "个人资料",
    "storage": "存储",
    "language": "语言",
    "theme": "主题",
    "themeDark": "暗色",
    "themeLight": "亮色",
    "themeSystem": "跟随系统",
    "notifications": "通知",
    "notificationEmail": "邮件通知",
    "notificationInApp": "应用内通知",
    "security": "安全",
    "apiKeys": "API密钥",
    "createApiKey": "创建API密钥",
    "apiKeyName": "密钥名称",
    "apiKeyCreated": "密钥创建成功，以下密钥仅显示一次：",
    "apiKeyCopied": "密钥已复制，请妥善保存",
    "deleteAccount": "删除账户",
    "deleteAccountConfirm": "此操作将永久删除您的账户和所有数据，不可恢复。请输入密码确认。",
    "accountDeleted": "账户已删除",
    "dataExport": "导出数据",
    "exportRequested": "导出请求已提交，处理完成后将发送下载链接",
    "exportProcessing": "正在导出数据...",
    "exportComplete": "数据导出完成",
    "about": "关于",
    "version": "版本"
  },
  "mobile": {
    "serverUrl": "服务器地址",
    "connect": "连接",
    "connecting": "连接中...",
    "connectionFailed": "连接失败，请检查地址和网络",
    "autoBackup": "自动备份",
    "backupPhotos": "备份照片",
    "backupProgress": "备份中 {{current}}/{{total}}",
    "backupComplete": "备份完成",
    "backupOnWifi": "仅WiFi备份",
    "freeUpSpace": "释放空间",
    "freeUpSpaceHint": "将已备份的照片从设备中删除",
    "spaceFreed": "已释放 {{size}}",
    "offlineIndicator": "离线模式 - 仅显示已缓存内容",
    "readOnlyMode": "只读模式",
    "readOnlyHint": "只读模式下无法编辑或删除照片"
  },
  "admin": {
    "title": "管理",
    "users": "用户管理",
    "createUser": "创建用户",
    "userRole": "角色",
    "storageQuota": "存储配额",
    "unlimited": "无限",
    "jobQueues": "任务队列",
    "pauseQueue": "暂停",
    "resumeQueue": "恢复",
    "retryFailed": "重试失败任务",
    "systemConfig": "系统配置",
    "externalLibraries": "外部库",
    "serverInfo": "服务器信息",
    "serverStats": "服务器统计",
    "modelStatus": "模型状态",
    "migration": "数据迁移",
    "immichImport": "从Immich导入"
  },
  "errors": {
    "generic": "出了点问题，请稍后重试",
    "networkError": "网络连接失败，请检查网络",
    "serverError": "服务器错误，请稍后重试",
    "unauthorized": "请先登录",
    "forbidden": "无权限访问",
    "notFound": "资源不存在",
    "validationFailed": "输入数据有误，请检查",
    "rateLimited": "操作过于频繁，请稍后重试",
    "fileTooLarge": "文件大小超过限制",
    "unsupportedFormat": "不支持的文件格式",
    "uploadFailed": "上传失败，请重试"
  },
  "marketing": {
    "heroTitle": "你的智能相册",
    "heroSubtitle": "AI驱动，隐私安全，智慧管理你的每一张照片",
    "featureAiSearch": "AI智能搜索",
    "featureAiSearchDesc": "自然语言搜索、OCR文字识别、人脸聚类，让查找照片从未如此简单",
    "featurePrivacy": "隐私安全",
    "featurePrivacyDesc": "数据完全存储在你的服务器上，无需担心隐私泄露",
    "featureBackup": "自动备份",
    "featureBackupDesc": "手机照片自动备份，释放设备空间",
    "featureShare": "轻松分享",
    "featureShareDesc": "创建分享链接、伙伴共享、共享图库，多种方式分享美好瞬间",
    "ctaStart": "开始使用",
    "ctaSelfHost": "自主部署",
    "ctaPricing": "查看定价"
  }
}
```

```json
// src/i18n/locales/en.json — 英文翻译 (仅展示结构与zh.json对应的部分键)
{
  "common": {
    "appName": "AI Album",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm",
    "loading": "Loading...",
    "loadMore": "Load More",
    "noResults": "No Results",
    "retry": "Retry",
    "copy": "Copy",
    "copied": "Copied",
    "close": "Close",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "search": "Search",
    "upload": "Upload",
    "download": "Download",
    "share": "Share",
    "edit": "Edit",
    "favorite": "Favorite",
    "unfavorite": "Unfavorite",
    "selectAll": "Select All",
    "selected": "{{count}} Selected",
    "today": "Today",
    "yesterday": "Yesterday"
  },
  "search": {
    "placeholder": "Search photos, people, places...",
    "noResults": "No matching photos found",
    "searchSuggestions": "Try searching for names, places, or descriptive words" 
  }
  // ... 所有键与zh.json结构完全一致，仅值翻译为英文
  // AI开发时按zh.json的结构逐个翻译所有键值
}
```

#### 3.6.3 翻译键命名规范

```
格式: {模块}.{子模块}.{语义描述}
示例:
  auth.login                  - 认证模块的登录按钮文案
  photos.uploadSuccess        - 照片模块的上传成功提示
  search.modeSemantic         - 搜索模块的语义搜索模式标签
  settings.themeDark          - 设置模块的暗色主题选项
  errors.networkError         - 错误模块的网络错误提示

规则:
  1. 全部小写，单词间用点分隔
  2. 模块名与API路由模块名一致(auth/photos/search/albums/...)
  3. 避免过深层级(最多3级: module.subgroup.key)
  4. 动态内容使用双大括号插值: {{variableName}}
  5. 复数形式在英文文件中使用i18next的复数后缀(_zero/_one/_other)
```

#### 3.6.4 使用规范

```tsx
// React组件中使用:
import { useTranslation } from 'react-i18next';

function PhotoGrid() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t('photos.title')}</h1>
      <button>{t('photos.uploadPhotos')}</button>
      <p>{t('photos.dragDropHint')}</p>
      {isEmpty && <EmptyState message={t('common.noResults')} />}
      <p>{t('common.selected', { count: 5 })}</p>
    </div>
  );
}

// Zod验证错误消息的国际化:
// 使用后端locale参数，错误消息在API层根据用户locale返回对应语言
// 前端Zod校验错误消息使用i18next翻译
```

#### 3.6.5 语言切换流程

```
1. 用户在设置页选择语言(zh/en)
2. 前端: i18next.changeLanguage(newLocale)
3. 前端: localStorage.setItem('locale', newLocale)
4. 后端: PUT /api/settings/locale { locale: newLocale }
   → UPDATE users SET locale = $1 WHERE id = $2
5. 后续API请求携带Accept-Language header
6. 后端错误消息根据header返回对应语言
```

#### 3.6.6 新语言添加流程

```
1. 创建 src/i18n/locales/{langCode}.json
2. 复制 zh.json 作为模板，翻译所有值
3. 在 src/i18n/config.ts 中注册: import {langCode} from './locales/{langCode}.json'
4. 添加到 resources 和 SUPPORTED_LOCALES
5. 在schema中更新locale枚举值
```
```

---
## 4. CSS Design System

### 4.1 Global Styles (src/index.css)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

@layer base {
  :root {
    --color-bg: #101014;
    --color-surface: #181825;
    --color-surface-hover: #1e1e2e;
    --color-border: #2a2a3c;
    --color-text: #e2e8f0;
    --color-text-secondary: #94a3b8;
    --color-text-muted: #64748b;
    --color-primary: #4361ee;
    --color-primary-hover: #818cf8;
    --color-accent: #f72585;
    --color-success: #10b981;
    --color-warning: #f59e0b;
    --color-error: #ef4444;
  }

  :root.light {
    --color-bg: #f8fafc;
    --color-surface: #ffffff;
    --color-surface-hover: #f1f5f9;
    --color-border: #e2e8f0;
    --color-text: #1e293b;
    --color-text-secondary: #475569;
    --color-text-muted: #94a3b8;
    --color-primary: #4361ee;
    --color-primary-hover: #3b52cc;
    --color-accent: #f72585;
    --color-success: #059669;
    --color-warning: #d97706;
    --color-error: #dc2626;
  }

  body {
    @apply bg-[var(--color-bg)] text-[var(--color-text)] font-body antialiased;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  h1, h2, h3, h4 {
    @apply font-display;
  }

  :focus-visible {
    @apply outline-2 outline-offset-2 outline-primary-500;
  }

  .skip-to-content {
    @apply sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded;
  }

  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: var(--color-surface);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}

@layer components {
  .glass {
    @apply bg-white/5 backdrop-blur-md border border-white/10;
  }
  .glass-hover {
    @apply hover:bg-white/10 hover:border-white/20 transition-all duration-200;
  }
}
```

### 4.2 Component Patterns
```
按钮:
  Primary: bg-primary-500 hover:bg-primary-400 text-white rounded-lg px-4 py-2 font-medium transition-colors
  Secondary: glass glass-hover rounded-lg px-4 py-2
  Danger: bg-error/10 hover:bg-error/20 text-error rounded-lg px-4 py-2

输入框:
  bg-surface-800 border border-surface-border rounded-lg px-3 py-2
  focus:ring-2 focus:ring-primary-500 focus:border-primary-500
  placeholder:text-text-muted

卡片:
  glass rounded-xl overflow-hidden
  hover:scale-[1.02] transition-transform duration-200

标签页:
  flex gap-1 bg-surface-800 rounded-lg p-1
  active: bg-primary-500 text-white rounded-md px-3 py-1.5
  inactive: text-text-secondary hover:text-text rounded-md px-3 py-1.5

进度条:
  h-1.5 bg-surface-800 rounded-full overflow-hidden
  fill: bg-primary-500 rounded-full transition-all duration-300

Toast:
  使用 react-hot-toast
  success: bg-success/20 border-success/30 text-success
  error: bg-error/20 border-error/30 text-error
```

## 5. Developer Guide (初中级程序员必读)

### 5.1 统一错误处理规范

#### 5.1.1 API错误响应格式 (所有API必须遵循)
```typescript
// 成功响应: 直接返回数据对象 (不包裹在data字段中)
res.status(200).json({ photos, total, page, limit })  // 列表
res.status(200).json({ photo })                        // 单个资源
res.status(200).json({ success: true })                // 操作确认

// 创建成功:
res.status(201).json({ user, token })                  // 注册
res.status(201).json({ photo })                        // 创建资源

// 错误响应 (统一格式):
res.status(4xx/5xx).json({
  error: {
    code: "ERROR_CODE",          // 大写蛇形，如 AUTH_INVALID_CREDENTIALS
    message: "Human readable message",  // 可展示给用户的中文消息
    details?: Record<string, string[]>  // 字段级验证错误: { email: ["邮箱格式不正确"] }
  }
})
```

#### 5.1.2 HTTP状态码使用规范
```
200 OK          - 成功获取/更新资源
201 Created     - 成功创建资源
204 No Content  - 成功删除资源(无响应体)
400 Bad Request - 请求参数验证失败(Zod验证失败)
401 Unauthorized - 未登录或token过期/无效
403 Forbidden   - 无权限(非Admin访问Admin接口/非所有者操作他人资源)
404 Not Found   - 资源不存在
409 Conflict    - 资源冲突(邮箱已注册/文件已存在)
422 Unprocessable - 业务逻辑验证失败(配额超限/分享链接已过期)
429 Too Many Requests - 限流
500 Internal Server Error - 服务器内部错误(必须记录日志)
```

#### 5.1.3 错误码定义表
```typescript
// api/constants/error-codes.ts
export const ErrorCodes = {
  // Auth
  AUTH_INVALID_CREDENTIALS: { status: 401, message: '邮箱或密码错误' },
  AUTH_TOKEN_EXPIRED: { status: 401, message: '登录已过期，请重新登录' },
  AUTH_TOKEN_INVALID: { status: 401, message: '无效的认证令牌' },
  AUTH_2FA_REQUIRED: { status: 401, message: '需要两步验证' },
  AUTH_2FA_INVALID: { status: 401, message: '验证码错误' },
  AUTH_EMAIL_EXISTS: { status: 409, message: '该邮箱已注册' },
  AUTH_PASSWORD_TOO_WEAK: { status: 400, message: '密码强度不足，至少8位' },

  // Photos
  PHOTO_NOT_FOUND: { status: 404, message: '照片不存在' },
  PHOTO_NOT_OWNER: { status: 403, message: '无权操作此照片' },
  PHOTO_FILE_TOO_LARGE: { status: 422, message: '文件大小超过限制' },
  PHOTO_UNSUPPORTED_TYPE: { status: 422, message: '不支持的文件类型' },
  PHOTO_QUOTA_EXCEEDED: { status: 422, message: '存储空间不足' },
  PHOTO_ALREADY_EXISTS: { status: 409, message: '文件已存在' },
  PHOTO_PROCESSING: { status: 422, message: '照片正在处理中' },

  // Albums
  ALBUM_NOT_FOUND: { status: 404, message: '相册不存在' },
  ALBUM_NOT_OWNER: { status: 403, message: '无权操作此相册' },
  ALBUM_NAME_EXISTS: { status: 409, message: '相册名称已存在' },

  // Share
  SHARE_LINK_EXPIRED: { status: 410, message: '分享链接已过期' },
  SHARE_LINK_INVALID: { status: 404, message: '分享链接不存在' },
  SHARE_PASSWORD_REQUIRED: { status: 401, message: '需要密码访问' },
  SHARE_PASSWORD_WRONG: { status: 403, message: '密码错误' },
  SHARE_UPLOAD_DISABLED: { status: 403, message: '此分享链接不允许上传' },

  // Users
  USER_NOT_FOUND: { status: 404, message: '用户不存在' },
  USER_ALREADY_DISABLED: { status: 409, message: '用户已被禁用' },

  // Shared Library
  LIBRARY_NOT_FOUND: { status: 404, message: '共享图库不存在' },
  LIBRARY_NOT_OWNER: { status: 403, message: '仅创建者可执行此操作' },
  LIBRARY_ALREADY_MEMBER: { status: 409, message: '该用户已是成员' },

  // System
  SETUP_ALREADY_COMPLETED: { status: 403, message: '系统已完成初始配置' },
  ML_SERVICE_UNAVAILABLE: { status: 503, message: 'AI服务暂不可用，请稍后重试' },
  RATE_LIMIT_EXCEEDED: { status: 429, message: '请求过于频繁，请稍后重试' },
} as const;

// 使用方式:
// throw new AppError(ErrorCodes.PHOTO_NOT_FOUND)
// 或: res.status(ErrorCodes.PHOTO_NOT_FOUND.status).json({ error: ErrorCodes.PHOTO_NOT_FOUND })
```

#### 5.1.4 AppError类和ErrorHandler
```typescript
// api/middleware/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    public readonly message: string,
    public readonly details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
  }

  static fromErrorCode(errorCode: typeof ErrorCodes[keyof typeof ErrorCodes]): AppError {
    return new AppError(errorCode.code, errorCode.status, errorCode.message);
  }
}

// api/middleware/errorHandler.ts (在Express app中注册为最后一个中间件)
// export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
//   if (err instanceof AppError) {
//     return res.status(err.statusCode).json({
//       error: { code: err.code, message: err.message, details: err.details }
//     });
//   }
//   if (err instanceof ZodError) {
//     const details: Record<string, string[]> = {};
//     err.errors.forEach(e => {
//       const field = e.path.join('.');
//       (details[field] ??= []).push(e.message);
//     });
//     return res.status(400).json({
//       error: { code: 'VALIDATION_ERROR', message: '请求参数验证失败', details }
//     });
//   }
//   // 未知错误: 记录日志，返回通用500
//   logger.error('Unhandled error:', err);
//   return res.status(500).json({
//     error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' }
//   });
// }
```

### 5.2 前端组件开发指南

#### 5.2.1 页面组件结构规范
```typescript
// 每个页面组件必须遵循以下结构:
// src/pages/XxxPage.tsx

import { useEffect, useState } from 'react';
import { useXxxStore } from '@/stores/xxxStore';
import { api } from '@/services/api';
import type { Xxx } from '@/shared/types';

export default function XxxPage() {
  // 1. Store状态
  const { items, isLoading, fetchItems } = useXxxStore();

  // 2. 本地状态(仅页面级)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 3. 数据获取
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 4. 事件处理函数
  const handleDelete = async (id: string) => {
    if (!confirm('确认删除？')) return;
    try {
      await api.xxx.delete(id);
      await fetchItems();
    } catch (err) {
      // 5. 错误处理: 使用toast通知
      toast.error('删除失败');
    }
  };

  // 6. 渲染
  if (isLoading) return <LoadingSpinner />;
  if (items.length === 0) return <EmptyState message="暂无数据" action={...} />;

  return (
    <div className="page-container">
      {/* 页面内容 */}
    </div>
  );
}
```

#### 5.2.2 数据流规范
```
用户操作 → 调用API → 更新Store → 组件自动重渲染

具体流程:
1. 用户点击"收藏"按钮
2. 组件调用 api.photos.toggleFavorite(photoId)
3. API返回成功后，调用 photoStore.toggleFavorite(photoId) 更新本地状态
4. 组件自动重渲染，收藏图标变为已收藏状态

禁止:
- 直接修改store中的数据而不调用API
- API成功后不更新store，导致UI与服务器不一致
- 在组件内部维护与store重复的状态

SSE实时更新:
- notificationStore监听SSE事件
- 收到smart-album-classified事件 → 调用smartAlbumStore.refresh()
- 收到processing-complete事件 → 调用photoStore.refresh()
- 收到year-in-review-ready事件 → 显示通知
```

#### 5.2.3 通用组件清单
```typescript
// src/components/ui/ - 基础UI组件(所有页面复用)
// Button.tsx       - 按钮: variant(primary/secondary/danger/ghost), size(sm/md/lg), loading状态
// Input.tsx        - 输入框: label, error, icon, type(text/email/password/search)
// Modal.tsx        - 模态框: title, onClose, children, size(sm/md/lg/full)
// Toast.tsx        - 通知: type(success/error/warning/info), autoClose(3s)
// LoadingSpinner.tsx - 加载指示器: size(sm/md/lg)
// EmptyState.tsx   - 空状态: icon, message, action(按钮)
// ConfirmDialog.tsx - 确认对话框: title, message, onConfirm, variant(danger/normal)
// Pagination.tsx   - 分页: page, total, limit, onChange
// Avatar.tsx       - 头像: src, name, size(sm/md/lg)
// Badge.tsx        - 徽标: variant(primary/success/warning/error), count
// Dropdown.tsx     - 下拉菜单: trigger, items[], align(left/right)
// Tabs.tsx         - 标签页: items[{key, label}], activeKey, onChange
// Skeleton.tsx     - 骨架屏: variant(text/circle/rect), width, height

// src/components/photo/ - 照片相关组件
// PhotoGrid.tsx    - 照片网格: photos[], columns, onSelect, onScroll
// PhotoCard.tsx    - 照片卡片: photo, selected, onSelect, onClick
// PhotoViewer.tsx  - 照片查看器: photo, onClose, onPrev, onNext
// UploadDropzone.tsx - 拖拽上传: onFilesAdded, accept, maxSize
// Scrubber.tsx     - 时间线导航条: photos[], onJump, currentMonth

// src/components/layout/ - 布局组件
// AppLayout.tsx    - 主布局: sidebar + header + content
// Sidebar.tsx      - 侧边栏: navItems[], activeItem
// Header.tsx       - 顶部栏: search, user, notifications
```

### 5.3 数据库事务使用指南

#### 5.3.1 必须使用事务的操作
```typescript
// 以下操作必须使用数据库事务，确保数据一致性:

// 1. 用户注册 (插入用户 + 创建默认相册)
async function register(data: RegisterData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userRes = await client.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING *',
      [data.email, hash, data.name, 'user']
    );
    await client.query(
      'INSERT INTO albums (user_id, name) VALUES ($1, $2)',
      [userRes.rows[0].id, '收藏']
    );
    await client.query('COMMIT');
    return userRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 2. 照片删除 (移入回收站 + 更新相册计数 + 更新智能相册计数)
// 3. 相册删除 (删除相册 + 删除相册照片关联 + 更新照片计数)
// 4. 共享图库创建 (插入图库 + 插入创建者为owner成员)
// 5. 分享链接创建 (插入分享链接 + 插入分享照片关联)
// 6. 2FA启用 (验证密码 + 更新2FA字段)
// 7. 用户删除 (删除用户所有数据: 照片/相册/标签/人脸/分享等)
// 8. 智能相册分类 (删除旧分类 + 插入新分类 + 更新计数)
```

#### 5.3.2 事务封装工具
```typescript
// api/utils/transaction.ts
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 使用方式:
// const user = await withTransaction(async (client) => {
//   const userRes = await client.query('INSERT INTO users ...');
//   await client.query('INSERT INTO albums ...');
//   return userRes.rows[0];
// });
```

### 5.4 模块间集成契约

#### 5.4.1 Worker → ML Service 调用规范
```typescript
// api/utils/ml-client.ts
// 所有Worker调用ML服务必须通过此客户端，包含重试和熔断

import { callMLService } from '../config/circuit-breaker';

export const mlClient = {
  async ocr(imagePath: string, languages: string[] = ['chi_sim', 'eng']) {
    return callMLService<{ text: string; confidence: number }>(
      '/api/ml/ocr',
      { image_path: imagePath, languages }
    );
  },

  async ocrBatch(items: { imagePath: string; languages: string[] }[]) {
    return callMLService<{ results: { text: string; confidence: number }[] }>(
      '/api/ml/ocr/batch',
      { items }
    );
  },

  async clipEmbed(imagePath: string) {
    return callMLService<{ embedding: number[]; model: string }>(
      '/api/ml/clip/embed-image',
      { image_path: imagePath }
    );
  },

  async clipEmbedBatch(imagePaths: string[]) {
    return callMLService<{ embeddings: number[][]; model: string }>(
      '/api/ml/clip/embed-batch',
      { image_paths: imagePaths }
    );
  },

  async clipEmbedText(text: string) {
    return callMLService<{ embedding: number[]; model: string }>(
      '/api/ml/clip/embed-text',
      { text }
    );
  },

  async faceDetect(imagePath: string) {
    return callMLService<{ faces: FaceDetection[] }>(
      '/api/ml/face/detect',
      { image_path: imagePath }
    );
  },

  async faceDetectBatch(imagePaths: string[]) {
    return callMLService<{ results: { faces: FaceDetection[] }[] }>(
      '/api/ml/face/detect-batch',
      { image_paths: imagePaths }
    );
  },

  async faceCluster(embeddings: number[][], faceIds: string[]) {
    return callMLService<{ clusters: { label: number; indices: number[] }[] }>(
      '/api/ml/face/cluster',
      { embeddings, face_ids: faceIds }
    );
  },

  async health() {
    return callMLService<{ status: string; models: string[] }>('/health', {});
  },
};

// Worker中的使用示例 (clip.worker.ts):
// const result = await mlClient.clipEmbed(photo.filePath);
// await pool.query('UPDATE photos SET clip_embedding = $1::vector WHERE id = $2',
//   [JSON.stringify(result.embedding), photo.id]);
```

#### 5.4.2 前端 → API 调用规范
```typescript
// src/services/api.ts - API客户端基础封装
// 所有API调用必须通过此客户端，自动处理:
// 1. JWT token附加: Authorization: Bearer {token}
// 2. 401自动跳转登录页
// 3. 错误响应统一解析为AppError
// 4. 请求超时(30秒)
// 5. 请求取消(组件卸载时)

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(method: string, path: string, options?: {
    body?: unknown;
    params?: Record<string, string | number | undefined>;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  }): Promise<T> {
    const token = useAuthStore.getState().token;
    const url = new URL(`${this.baseUrl}${path}`);
    if (options?.params) {
      Object.entries(options.params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v));
      });
    }
    const res = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: options?.signal ?? AbortSignal.timeout(30000),
    });
    if (res.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    const data = await res.json();
    if (!res.ok) throw data.error; // 抛出 { code, message, details }
    return data;
  }

  get<T>(path: string, params?: Record<string, string | number | undefined>) {
    return this.request<T>('GET', path, { params });
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, { body });
  }
  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, { body });
  }
  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
  // 文件上传专用
  async upload<T>(path: string, formData: FormData, signal?: AbortSignal) {
    const token = useAuthStore.getState().token;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
      signal: signal ?? AbortSignal.timeout(300000), // 上传5分钟超时
    });
    if (res.status === 401) { useAuthStore.getState().logout(); throw new Error('Unauthorized'); }
    const data = await res.json();
    if (!res.ok) throw data.error;
    return data;
  }
}
```

#### 5.4.3 SSE事件契约
```typescript
// SSE事件类型定义 (前后端共享)
// api/config/sse.ts + src/shared/sse-events.ts

export interface SSEEventMap {
  'processing-complete': { message: string; photoId?: string };
  'smart-album-classified': { photoId: string; categories: string[] };
  'duplicate-scan-complete': { groupCount: number };
  'year-in-review-ready': { year: number };
  'shared-library-invite': { libraryId: string; libraryName: string };
  'shared-library-new-photos': { libraryId: string; count: number };
  'ml-service-down': { status: string };
  'ml-service-recovered': { status: string };
  'data-export-complete': { downloadUrl: string };
  'upload-progress': { photoId: string; status: string; progress: number };
}

// 前端监听:
// const eventSource = new EventSource('/api/events', { headers: { Authorization: `Bearer ${token}` } })
// 注意: EventSource不支持自定义header，需要通过query参数传递token
// 实际URL: /api/events?token={token}
// eventSource.addEventListener('smart-album-classified', (e) => {
//   const data = JSON.parse(e.data) as SSEEventMap['smart-album-classified'];
//   // 更新store
// });

// 后端发送:
// publishSSE(userId, 'smart-album-classified', { photoId, categories })
// 底层: redis.publish(`sse:${userId}`, JSON.stringify({ event: 'smart-album-classified', data: { photoId, categories } }))
```

**SSE完整实现代码:**

后端 - SSE端点 (api/routes/events.ts):
```typescript
import { Router, Request, Response } from 'express';
import { verify } from 'jsonwebtoken';
import { getRedisClient } from '../config/redis.js';

export const eventsRouter = Router();

const sseConnections = new Map<string, Response>();

eventsRouter.get('/', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }

  let payload: any;
  try { payload = verify(token, process.env.JWT_SECRET!); }
  catch { res.status(401).json({ error: 'Invalid token' }); return; }

  const userId = payload.userId;

  if (sseConnections.has(userId)) {
    const oldRes = sseConnections.get(userId)!;
    oldRes.end();
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`event: ping\ndata: {}\n\n`);

  sseConnections.set(userId, res);

  const heartbeat = setInterval(() => { res.write(`event: ping\ndata: {}\n\n`); }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseConnections.delete(userId);
  });
});

export function sendSSE(userId: string, event: string, data: unknown) {
  const res = sseConnections.get(userId);
  if (res && !res.writableEnded) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

const redis = getRedisClient();
redis.subscribe('sse:notify');
redis.on('message', (channel: string, message: string) => {
  if (channel === 'sse:notify') {
    const { userId, event, data } = JSON.parse(message);
    sendSSE(userId, event, data);
  }
});
```

后端 - Redis发布函数 (api/config/redis.ts补充):
```typescript
export async function publishSSE(userId: string, event: string, data: unknown) {
  const redis = getRedisClient();
  await redis.publish('sse:notify', JSON.stringify({ userId, event, data }));
}
```

Worker中调用:
```typescript
import { publishSSE } from '../config/redis.js';
await publishSSE(userId, 'processing-complete', { message: 'OCR完成', photoId });
```

前端 - SSE连接 (src/hooks/useSSE.ts):
```typescript
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useSSE() {
  const token = useAuthStore((s) => s.token);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token) return;
    const es = new EventSource(`/api/events?token=${token}`);
    esRef.current = es;

    es.addEventListener('processing-complete', (e) => {
      const data = JSON.parse(e.data);
      console.log('Processing complete:', data);
    });
    es.addEventListener('ping', () => {});

    es.onerror = () => {
      es.close();
      setTimeout(() => { if (token) esRef.current = new EventSource(`/api/events?token=${token}`); }, 3000);
    };

    return () => { es.close(); };
  }, [token]);
}
```

**Worker错误处理规范:**

所有Worker处理器必须遵循以下错误处理模式:
```typescript
import { Worker, Job } from 'bullmq';
import { publishSSE } from '../config/redis.js';
import { pool } from '../config/database.js';
import { getQueue } from './queue.js';

const thumbnailWorker = new Worker(
  'thumbnail-generation',
  async (job: Job<{ photoId: string; filePath: string }>) => {
    const { photoId, filePath } = job.data;

    try {
      await pool.query('UPDATE photos SET processing_status = $1 WHERE id = $2', ['thumbnailing', photoId]);

      // ... 实际处理逻辑 ...

      await pool.query('UPDATE photos SET processing_status = $1, thumbnail_path = $2 WHERE id = $3', ['metadata', thumbnailPath, photoId]);

      await getQueue('metadata-extraction').add('metadata', { photoId, filePath });
    } catch (error) {
      await pool.query('UPDATE photos SET processing_status = $1 WHERE id = $2', ['failed', photoId]);

      const photoResult = await pool.query('SELECT user_id FROM photos WHERE id = $1', [photoId]);
      if (photoResult.rows[0]) {
        await publishSSE(photoResult.rows[0].user_id, 'processing-complete', {
          message: `缩略图生成失败: ${error.message}`,
          photoId,
        });
      }

      throw error;
    }
  },
  { connection: redisConnection, concurrency: 4 }
);

export default thumbnailWorker;
```

**BullMQ重试策略 (在队列定义中配置):**
```typescript
// 所有队列的默认重试策略
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 }, // 5s, 25s, 125s
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

// 特殊队列的重试策略:
// ocr-processing: { attempts: 2, backoff: { type: 'fixed', delay: 30000 } }
//   (OCR失败通常不可恢复，减少重试)
// clip-embedding: { attempts: 3, backoff: { type: 'exponential', delay: 10000 } }
// face-detection: { attempts: 3, backoff: { type: 'exponential', delay: 10000 } }
// trash-cleanup: { attempts: 1 } (定时任务不需要重试，下次定时会重新执行)
```

### 5.5 开发验证检查清单

#### 5.5.1 每个API端点开发完成后必须验证
```
□ 正常请求返回正确状态码和数据格式
□ 缺少认证token返回401
□ 无权限返回403
□ 资源不存在返回404
□ 参数验证失败返回400 + details
□ 重复创建返回409
□ 分页参数正确(page从1开始, limit默认50)
□ 响应数据包含所有shared/types.ts中定义的字段
□ 数据库事务正确(COMMIT/ROLLBACK)
□ 活动日志已记录(如适用)
```

#### 5.5.2 每个前端页面开发完成后必须验证
```
□ 页面可正常加载，无控制台错误
□ 加载中显示LoadingSpinner
□ 空数据显示EmptyState
□ 错误状态显示错误提示(Toast)
□ 表单验证: 必填/格式/长度
□ 操作确认: 删除/危险操作需ConfirmDialog
□ 响应式: 桌面端/平板/手机布局正确
□ 键盘可访问: Tab导航/Enter确认/Esc关闭
□ 深色/浅色主题切换正常
```

#### 5.5.3 每个Worker开发完成后必须验证
```
□ 正常流程: 从队列取任务→处理→更新状态→通知
□ ML服务不可用: 任务标记failed，BullMQ自动重试
□ 数据库错误: 事务回滚，任务标记failed
□ 重复消费: 同一任务不会重复处理(幂等性)
□ 批处理: 多个任务批量处理提升效率
□ 优雅关闭: SIGTERM时当前任务完成后再退出
```

### 5.6 完整代码示例 (参考模板)

#### 5.6.1 后端路由完整示例: POST /api/auth/register
```typescript
// api/routes/auth.ts
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { registerSchema } from '../validation/schemas.js';
import { AppError, ErrorCodes } from '../middleware/errorHandler.js';

export const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new AppError(409, ErrorCodes.AUTH_EMAIL_EXISTS, 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const role = parseInt(userCount.rows[0].count) === 0 ? 'admin' : 'user';

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, storage_used, created_at',
      [email, passwordHash, name, role]
    );
    const user = result.rows[0];

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        storageUsed: user.storage_used,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});
```

#### 5.6.2 后端路由完整示例: GET /api/photos
```typescript
// api/routes/photos.ts
import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';
import { photoListQuerySchema } from '../validation/schemas.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError, ErrorCodes } from '../middleware/errorHandler.js';

export const photosRouter = Router();

photosRouter.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = photoListQuerySchema.parse(req.query);
    const userId = req.user!.userId;
    const { page, limit, isFavorite, isArchived, takenAfter, takenBefore, sort, order } = query;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['p.user_id = $1', 'p.deleted_at IS NULL'];
    const params: unknown[] = [userId];
    let paramIdx = 2;

    if (isFavorite !== undefined) {
      conditions.push(`p.is_favorite = $${paramIdx++}`);
      params.push(isFavorite);
    }
    if (isArchived !== undefined) {
      conditions.push(`p.is_archived = $${paramIdx++}`);
      params.push(isArchived);
    }
    if (takenAfter) {
      conditions.push(`p.taken_at >= $${paramIdx++}`);
      params.push(takenAfter);
    }
    if (takenBefore) {
      conditions.push(`p.taken_at <= $${paramIdx++}`);
      params.push(takenBefore);
    }

    const whereClause = conditions.join(' AND ');
    const SORT_COLUMNS: Record<string, string> = { takenAt: 'p.taken_at', createdAt: 'p.created_at', originalName: 'p.original_name', fileSize: 'p.file_size' };
    const SORT_DIRS: Record<string, string> = { asc: 'ASC', desc: 'DESC' };
    const orderBy = SORT_COLUMNS[sort] || 'p.taken_at';
    const orderDir = SORT_DIRS[order] || 'DESC';

    const countResult = await pool.query(`SELECT COUNT(*) FROM photos p WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.* FROM photos p WHERE ${whereClause} ORDER BY ${orderBy} ${orderDir} NULLS LAST LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    res.json({ photos: result.rows, total, page, limit });
  } catch (error) {
    next(error);
  }
});
```

#### 5.6.3 前端页面完整示例: LoginPage
```tsx
// src/pages/LoginPage.tsx
import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          AI Album
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <Link to="/forgot-password" className="hover:text-blue-600">Forgot password?</Link>
          <span className="mx-2">|</span>
          <Link to="/register" className="hover:text-blue-600">Create account</Link>
        </div>
      </div>
    </div>
  );
}
```

### 5.7 常见问题排查指南

#### 5.7.1 Docker容器启动失败
```
问题: postgres容器启动失败，日志显示 "Connection refused"
排查:
  1. docker compose logs postgres 查看PG日志
  2. 检查data目录权限: chmod 777 ./pgdata (开发环境)
  3. 检查端口冲突: lsof -i :5432 或 netstat -tlnp | grep 5432
  4. PG首次启动需要10-20秒初始化，检查healthcheck是否通过:
     docker compose exec pg pg_isready -U aialbum

问题: ml容器启动失败，模型下载超时
排查:
  1. 检查网络连接: curl -I https://huggingface.co
  2. 设置HF镜像: export HF_ENDPOINT=https://hf-mirror.com
  3. 预下载模型: python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('XLM-Roberta-Large-Vit-B-16Plus')"
  4. PaddleOCR模型: python -c "from paddleocr import PaddleOCR; PaddleOCR(lang='chi_sim')"
  5. 模型缓存目录: /root/.cache/huggingface 和 /root/.paddleocr

问题: Worker进程连接不上Redis
排查:
  1. 确认valkey容器运行: docker compose ps valkey
  2. 测试连接: docker compose exec server node -e "const r=require('redis');r.createClient({url:'redis://valkey:6379'}).connect().then(()=>console.log('OK'))"
  3. 检查REDIS_URL环境变量是否使用容器名(valkey)而非localhost
```

#### 5.7.2 数据库相关问题
```
问题: "extension vector does not exist"
排查:
  1. 进入PG容器: docker compose exec postgres psql -U aialbum -d aialbum
  2. 检查扩展: SELECT * FROM pg_available_extensions WHERE name = 'vector';
  3. 手动安装: CREATE EXTENSION IF NOT EXISTS vector;
  4. 如果扩展不存在，检查pgvector是否正确安装:
     docker compose exec postgres pg_config --pkglibdir
     应该能看到 vector.so

问题: "column clip_embedding does not exist"
排查:
  1. 检查迁移是否执行: SELECT * FROM migrations_tracking ORDER BY filename;
  2. 手动执行迁移: docker compose exec server npx node-pg-migrate up
  3. 检查表结构: \d photos

问题: vector类型查询报错 "operator does not exist"
排查:
  1. 确认pgvector扩展已安装且版本>=0.5.0
  2. 确认types.setTypeParser已注册(见2.2 Database Connection)
  3. 检查向量维度: SELECT array_length(clip_embedding, 1) FROM photos LIMIT 1;
     应该返回640(CLIP)或512(Face)
```

#### 5.7.3 ML服务相关问题
```
问题: ML服务OOM (Out of Memory)
排查:
  1. 检查容器内存限制: docker stats ai-album-ml
  2. ML服务至少需要4GB RAM (CLIP模型~2GB + PaddleOCR~1GB + InsightFace~0.5GB)
  3. docker-compose.yml中增加: deploy.resources.limits.memory: 8g
  4. 减小批处理大小: ML_BATCH_SIZE=8 (默认16)

问题: OCR识别结果为空
排查:
  1. 检查图片是否为视频文件(视频不执行OCR)
  2. 检查OCR语言配置: OCR_LANGUAGES=chi_sim+eng
  3. 测试ML服务: curl -X POST http://localhost:3001/api/ml/ocr -H "Content-Type: application/json" -d '{"image_path":"/uploads/test.jpg","languages":["chi_sim","eng"]}'
  4. 检查图片路径是否在容器内可访问

问题: 人脸检测不工作
排查:
  1. 检查InsightFace模型是否下载完成
  2. 确认图片file_type='image'(视频不执行人脸检测)
  3. 检查faces表是否有记录: SELECT COUNT(*) FROM faces;
  4. 小于50x50像素的人脸会被过滤
```

#### 5.7.4 前端相关问题
```
问题: SSE连接断开不重连
排查:
  1. 检查浏览器控制台EventSource错误
  2. 确认token有效: SSE URL需要 ?token=xxx 参数
  3. 检查Nginx代理配置: proxy_buffering off; proxy_read_timeout 86400s;
  4. 前端3秒自动重连逻辑是否实现

问题: 照片上传后不显示缩略图
排查:
  1. 检查Worker是否运行: docker compose logs server | grep thumbnail
  2. 检查THUMBNAIL_DIR路径是否正确且可写
  3. 检查sharp库是否正确安装(ARM平台需要额外配置)
  4. 检查照片processing_status: SELECT id, processing_status FROM photos ORDER BY created_at DESC LIMIT 5;

问题: BullMQ Worker不消费任务
排查:
  1. 检查Redis连接: docker compose exec server node -e "..."
  2. 检查队列状态: GET /api/admin/jobs (需Admin权限)
  3. 检查Worker日志: docker compose logs server | grep Worker
  4. 检查是否队列被暂停: PUT /api/admin/jobs/:name/resume
```

### 5.8 ARM平台适配说明 (Ubuntu 22.04 ARM)

> **完整Dockerfile定义见arch.md第6章"Docker部署架构"**，包含3阶段构建(frontend-builder → backend-builder → 生产镜像)、ML Dockerfile和Docker Compose完整配置。本节仅补充ARM平台特定适配说明。

#### 5.8.1 Docker基础镜像
```dockerfile
# Dockerfile中必须使用多架构镜像或ARM特定镜像:
# 后端API/Worker:
FROM --platform=linux/arm64 node:20-slim

# ML服务:
FROM --platform=linux/arm64 python:3.11-slim

# Nginx:
FROM --platform=linux/arm64 nginx:alpine

# PostgreSQL + pgvector:
# 使用官方ARM64镜像:
FROM --platform=linux/arm64 pgvector/pgvector:pg15
```

#### 5.8.2 sharp库ARM适配
```bash
# sharp在ARM上需要原生编译，确保Dockerfile中安装构建工具:
RUN apt-get update && apt-get install -y build-essential libvips-dev

# 或在package.json中指定ARM平台预编译版本:
# npm install --platform=linux/arm64 sharp

# 如果使用docker buildx构建:
# docker buildx build --platform linux/arm64 -t ai-album-server .
```

#### 5.8.3 PaddleOCR ARM性能
```
ARM平台注意事项:
  1. PaddleOCR在ARM上推理速度比x86慢2-3倍
  2. 建议ML_BATCH_SIZE=4 (ARM) vs 16 (x86)
  3. 建议Worker并发: ocr=1, clip=1, face=1 (ARM上不宜并发)
  4. 可选: 安装PaddlePaddle ARM优化版
     pip install paddlepaddle==3.0.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
  5. InsightFace在ARM上使用ONNX Runtime推理:
     pip install onnxruntime  # ARM自动使用CPU版
```

#### 5.8.4 Docker Compose ARM配置
```yaml
# docker-compose.yml中为ARM优化:
services:
  ml:
    environment:
      - ML_BATCH_SIZE=4
      - OCR_WORKERS=1
    deploy:
      resources:
        limits:
          memory: 8g
        reservations:
          memory: 4g

  server:
    environment:
      - THUMBNAIL_CONCURRENCY=2
      - METADATA_CONCURRENCY=1
      - OCR_CONCURRENCY=1
      - CLIP_CONCURRENCY=1
      - FACE_CONCURRENCY=1
```

## 6. Development Workflow

### 6.1 首次启动
```bash
# 1. 启动本地数据库
docker compose -f docker-compose.dev.yml up -d

# 2. 等待数据库就绪 (约5秒)

# 3. 运行数据库迁移
npm run migrate

# 4. 创建上传目录
mkdir -p uploads thumbnails

# 5. 启动开发服务器 (前端+后端)
npm run dev

# 6. (可选) 启动Worker
npm run dev:worker

# 7. (可选) 启动ML服务 (需要Python环境)
cd ml && pip install -r requirements.txt && python -m uvicorn main:app --port 3001
```

### 6.2 日常开发
```bash
npm run dev          # 启动前端(5173) + 后端(3000)
npm run dev:worker   # 启动后台Worker
npm run check        # TypeScript类型检查
```

### 6.3 构建生产版本
```bash
npm run build        # 构建前端到dist/client, 后端到dist/api
npm start            # 启动生产API服务器
npm run start:worker # 启动生产Worker
```

## 7. Database Migration Strategy

> **迁移工具**: node-pg-migrate (已在package.json中声明依赖)
> **配置文件**: db-config.js (项目根目录，见9.7节)
> **迁移目录**: migrations/ (项目根目录)
> **自动执行**: 容器启动时通过 entrypoint.sh 自动执行（使用 PG Advisory Lock 防止并发），详见 arch.md §7.3.1

### 7.1 迁移执行机制
```typescript
// api/index.ts 启动流程:
// 注意：数据库迁移已由容器 entrypoint.sh 处理（使用PG Advisory Lock防并发）
// 此处 bootstrap() 直接启动应用，无需执行迁移
//
// async function bootstrap() {
//   // 1. 初始化Valkey连接
//   // 2. 启动Express服务器
//   app.listen(PORT)
// }
//
// 迁移文件命名规则:
//   migrations/001_init.js          - 初始表结构
//   migrations/002_add_xxx.js       - 后续增量迁移
//
// node-pg-migrate迁移文件格式:
//   exports.up = (pgm) => { pgm.createTable(...) }
//   exports.down = (pgm) => { pgm.dropTable(...) }
```

### 7.2 初始迁移 (migrations/001_init.js)
内容即为arch.md中6.2节的DDL语句，使用node-pg-migrate API:
```javascript
// migrations/001_init.js
// exports.up = (pgm) => {
//   pgm.createExtension('vector')
//   pgm.createTable('users', { id: 'id', email: { type: 'varchar(255)', notNull: true, unique: true }, ... })
//   pgm.createTable('photos', { ... })
//   ... 所有CREATE TABLE语句
//   pgm.createIndex('photos', 'clip_embedding', { method: 'hnsw', opclass: 'vector_cosine_ops', name: 'idx_photos_clip_embedding' })
//   ... 所有CREATE INDEX语句
// }
// exports.down = (pgm) => {
//   pgm.dropTable('photos')
//   pgm.dropTable('users')
//   ... 所有DROP TABLE (逆序)
//   pgm.dropExtension('vector')
// }
```

## 8. Production Deployment Files

### 8.1 nginx.conf (简化参考 — 生产完整配置见8.4节)

> **重要**: 本节为简化参考配置。**生产部署必须使用8.4节的完整Nginx配置**，该配置包含server_tokens off、安全头(X-Frame-Options/X-Content-Type-Options/X-XSS-Protection/Referrer-Policy)、限流、proxy_intercept_errors on、上传端点方法限制等安全措施。

```nginx
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server_tokens off;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 200M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    server {
        listen 80;
        server_name _;

        add_header X-Frame-Options SAMEORIGIN always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy strict-origin-when-cross-origin always;

        location /api/server/ping {
            proxy_pass http://server:3000;
            access_log off;
        }

        location / {
            proxy_pass http://server:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            location /api/ {
                proxy_pass http://server:3000;
                proxy_read_timeout 120s;
                proxy_send_timeout 120s;
            }

            location /api/events {
                proxy_pass http://server:3000;
                proxy_http_version 1.1;
                proxy_set_header Connection '';
                proxy_buffering off;
                proxy_cache off;
                chunked_transfer_encoding off;
                proxy_read_timeout 86400s;
            }

            location /uploads/ {
                proxy_pass http://server:3000;
                expires 30d;
                add_header Cache-Control "public, immutable";
            }

            location /thumbnails/ {
                proxy_pass http://server:3000;
                expires 30d;
                add_header Cache-Control "public, immutable";
            }
        }

        # HTTPS配置 (取消注释并配置证书后启用)
        # server {
        #     listen 443 ssl http2;
        #     server_name _;
        #
        #     ssl_certificate /etc/nginx/ssl/fullchain.pem;
        #     ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        #     ssl_protocols TLSv1.2 TLSv1.3;
        #     ssl_ciphers HIGH:!aNULL:!MD5;
        #     ssl_prefer_server_ciphers on;
        #
        #     # 同HTTP的location配置
        #     location / { ... }
        # }
    }
}
```

### 8.2 index.html
```html
<!DOCTYPE html>
<html lang="zh-CN" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
    <meta name="theme-color" content="#101014" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="AI Album" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <link rel="manifest" href="/manifest.json" />
    <title>AI Album</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 8.2.1 manifest.json (PWA)
```json
{
  "name": "AI Album",
  "short_name": "AIAlbum",
  "description": "智能相册 - 隐私安全的AI照片管理",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#101014",
  "theme_color": "#101014",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "categories": ["photo", "utilities"]
}
```

### 8.2.2 Service Worker (public/sw.js)
```javascript
// 缓存策略:
// 1. 静态资源(JS/CSS/HTML): Cache First, 网络失败时使用缓存
// 2. API请求: Network First, 网络失败时使用缓存
// 3. 缩略图: Cache First, 缓存已浏览的缩略图
// 4. 原图: 不缓存(太大)

const CACHE_NAME = 'ai-album-v1';
const STATIC_CACHE = 'ai-album-static-v1';
const THUMBNAIL_CACHE = 'ai-album-thumbnails-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// install: 预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// activate: 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE && k !== THUMBNAIL_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// fetch: 路由策略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 缩略图: Cache First
  if (url.pathname.startsWith('/thumbnails/')) {
    event.respondWith(
      caches.open(THUMBNAIL_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // API: Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request)
      )
    );
    return;
  }

  // 静态资源: Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
```

### 8.2.3 Service Worker注册 (src/main.tsx)
```typescript
// 在React根组件渲染后注册Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
```

### 8.3 Geocode Implementation (简化方案)

反向地理编码使用**简化方案**，不依赖外部API或额外数据库：

```typescript
// api/workers/geocode.processor.ts
// 方案: 使用坐标四舍五入分组 + 缓存
//
// 1. 将坐标四舍五入到小数点后1位 (约11km精度)
// 2. 查询数据库是否已有该区域的 location_name
//   SELECT DISTINCT location_name FROM photos
//   WHERE ROUND(latitude::numeric, 1) = ROUND($1::numeric, 1)
//     AND ROUND(longitude::numeric, 1) = ROUND($2::numeric, 1)
//     AND location_name IS NOT NULL
//   LIMIT 1
// 3. 如果有缓存 -> 使用缓存名称
// 4. 如果没有 -> 调用免费Nominatim API (仅开发时)
//    或使用格式化坐标: "纬度:xx.x, 经度:xx.x"
//
// 生产环境推荐: 部署本地Nominatim Docker容器
// docker run -p 8080:8080 mediagis/nominatim:4.4
// 然后调用 http://nominatim:8080/reverse?lat=$1&lon=$2&format=json
```

### 8.4 ML Service Full Implementation (ml/main.py)

```
# ml/requirements.txt
fastapi==0.115.5
uvicorn[standard]==0.32.1
gunicorn==23.0.0
pydantic==2.10.3
paddleocr==3.3.1
paddlepaddle==3.0.0
sentence-transformers==3.3.1
insightface==0.7.3
onnxruntime==1.20.1
scikit-learn==1.5.2
numpy==1.26.4
opencv-python-headless==4.10.0.84
pillow==11.0.0
python-multipart==0.0.18
```

```python
# ml/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from routers import ocr, clip, face, pick_score

ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: 预加载模型
    from services.clip_service import ClipService
    from services.face_service import FaceService
    ml_models["clip"] = ClipService()
    ml_models["face"] = FaceService()
    yield
    ml_models.clear()

app = FastAPI(title="AI Album ML Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ocr.router, prefix="/api/ml/ocr", tags=["ocr"])
app.include_router(clip.router, prefix="/api/ml/clip", tags=["clip"])
app.include_router(face.router, prefix="/api/ml/face", tags=["face"])
app.include_router(pick_score.router, prefix="/api/ml", tags=["pick-score"])

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "models_loaded": list(ml_models.keys())
    }

@app.get("/health/detail")
async def health_detail():
    from services.clip_service import ClipService
    from services.face_service import FaceService
    clip_svc = ml_models.get("clip")
    face_svc = ml_models.get("face")
    return {
        "status": "initializing" if not ml_models.get("clip") or not ml_models.get("face") else "ok",
        "models": {
            "ocr": {"loaded": True, "model_name": "PaddleOCR 3.3.1"},
            "clip": {
                "loaded": clip_svc is not None and clip_svc._model is not None,
                "model_name": "XLM-Roberta-Large-Vit-B-16Plus",
                "download_progress": 100 if clip_svc and clip_svc._model else 0
            },
            "face": {
                "loaded": face_svc is not None and face_svc._app is not None,
                "model_name": "buffalo_l",
                "download_progress": 100 if face_svc and face_svc._app else 0
            }
        },
        "version": "0.1.0"
    }
```

```python
# ml/routers/ocr.py
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.ocr_service import OcrService

router = APIRouter()
ocr_service = OcrService()

class OcrRequest(BaseModel):
    image_path: str
    languages: list[str] = ["chi_sim", "eng"]

class OcrBlock(BaseModel):
    text: str
    bbox: list[int]
    confidence: float

class OcrResponse(BaseModel):
    text: str
    confidence: float
    blocks: list[OcrBlock]

@router.post("", response_model=OcrResponse)
async def recognize_text(req: OcrRequest):
    if not os.path.exists(req.image_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return ocr_service.recognize(req.image_path, req.languages)
```

```python
# ml/routers/clip.py
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.clip_service import ClipService

router = APIRouter()

class EmbedImageRequest(BaseModel):
    image_path: str

class EmbedTextRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: list[float]
    model: str

@router.post("/embed-image", response_model=EmbedResponse)
async def embed_image(req: EmbedImageRequest):
    if not os.path.exists(req.image_path):
        raise HTTPException(status_code=404, detail="Image not found")
    from main import ml_models
    service = ml_models["clip"]
    embedding = service.embed_image(req.image_path)
    return EmbedResponse(embedding=embedding.tolist(), model=service.model_name)

@router.post("/embed-text", response_model=EmbedResponse)
async def embed_text(req: EmbedTextRequest):
    from main import ml_models
    service = ml_models["clip"]
    embedding = service.embed_text(req.text)
    return EmbedResponse(embedding=embedding.tolist(), model=service.model_name)
```

```python
# ml/routers/face.py
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.face_service import FaceService

router = APIRouter()

class FaceDetectRequest(BaseModel):
    image_path: str

class FaceInfo(BaseModel):
    bbox: dict
    embedding: list[float]
    confidence: float

class FaceDetectResponse(BaseModel):
    faces: list[FaceInfo]

class FaceClusterRequest(BaseModel):
    face_ids: list[str]
    embeddings: list[list[float]]

class ClusterInfo(BaseModel):
    person_id: str
    face_ids: list[str]

class FaceClusterResponse(BaseModel):
    clusters: list[ClusterInfo]

@router.post("/detect", response_model=FaceDetectResponse)
async def detect_faces(req: FaceDetectRequest):
    if not os.path.exists(req.image_path):
        raise HTTPException(status_code=404, detail="Image not found")
    from main import ml_models
    service = ml_models["face"]
    faces = service.detect(req.image_path)
    return FaceDetectResponse(faces=faces)

@router.post("/cluster", response_model=FaceClusterResponse)
async def cluster_faces(req: FaceClusterRequest):
    # 聚类在数据库层面完成 (使用pgvector)
    # 此端点仅返回建议的聚类结果
    from main import ml_models
    service = ml_models["face"]
    clusters = service.cluster(req.face_ids, req.embeddings)
    return FaceClusterResponse(clusters=clusters)
```

```python
# ml/routers/pick_score.py
import os
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class PickScoreRequest(BaseModel):
    photo_id: str
    thumbnail_path: str

class PickScoreResponse(BaseModel):
    pick_score: float
    clarity: float
    composition: float
    expression: float

@router.post("/pick-score", response_model=PickScoreResponse)
async def compute_pick_score(req: PickScoreRequest):
    import cv2
    if not os.path.exists(req.thumbnail_path):
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    img = cv2.imread(req.thumbnail_path)
    if img is None:
        raise HTTPException(status_code=400, detail="Failed to read image")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape[:2]

    # Clarity score (Laplacian variance)
    clarity_val = cv2.Laplacian(gray, cv2.CV_64F).var()
    clarity_score = min(clarity_val / 500.0, 1.0)

    # Composition score (Rule of thirds via Canny edges)
    edges = cv2.Canny(gray, 50, 150)
    third_x, third_y = w // 3, h // 3
    total_edges = np.sum(edges) + 1
    third_line_weight = (
        np.sum(edges[:, max(0, third_x - 5):third_x + 5]) +
        np.sum(edges[max(0, third_y - 5):third_y + 5, :])
    ) / total_edges
    composition_score = min(third_line_weight * 10.0, 1.0)

    # Expression score (face count based)
    try:
        from main import ml_models
        face_service = ml_models.get("face")
        if face_service:
            faces = face_service.detect(req.thumbnail_path)
            face_count = len(faces) if faces else 0
            expression_score = min(face_count * 0.3, 1.0) if face_count > 0 else 0.5
        else:
            expression_score = 0.5
    except Exception:
        expression_score = 0.5

    pick_score = clarity_score * 0.4 + composition_score * 0.3 + expression_score * 0.3
    return PickScoreResponse(
        pick_score=round(pick_score, 4),
        clarity=round(clarity_score, 4),
        composition=round(composition_score, 4),
        expression=round(expression_score, 4)
    )
```

```python
# ml/services/ocr_service.py
from paddleocr import PaddleOCR

class OcrService:
    def __init__(self):
        self._ocr_cache = {}

    def _get_ocr(self, languages: list[str]):
        lang_key = "+".join(sorted(languages))
        if lang_key not in self._ocr_cache:
            lang_map = {
                "chi_sim": "ch",
                "eng": "en",
                "jpn": "japan",
                "chi_tra": "chinese_cht",
            }
            primary_lang = lang_map.get(languages[0], "ch")
            self._ocr_cache[lang_key] = PaddleOCR(use_angle_cls=True, lang=primary_lang)
        return self._ocr_cache[lang_key]

    def recognize(self, image_path: str, languages: list[str]):
        ocr = self._get_ocr(languages)
        result = ocr.ocr(image_path, cls=True)
        text_parts = []
        blocks = []
        if not result or not result[0]:
            return {"text": "", "confidence": 0, "blocks": []}
        for line in result[0]:
            bbox_flat = [int(coord) for point in line[0] for coord in point]
            text = line[1][0]
            confidence = float(line[1][1])
            text_parts.append(text)
            blocks.append({
                "text": text,
                "bbox": bbox_flat,
                "confidence": confidence
            })
        full_text = " ".join(text_parts)
        avg_confidence = sum(b["confidence"] for b in blocks) / len(blocks) if blocks else 0
        return {
            "text": full_text,
            "confidence": avg_confidence,
            "blocks": blocks
        }
```

```python
# ml/services/clip_service.py
import os
from sentence_transformers import SentenceTransformer

class ClipService:
    def __init__(self, model_name: str = "XLM-Roberta-Large-Vit-B-16Plus"):
        self.model_name = model_name
        self._model = None

    @property
    def model(self):
        if self._model is None:
            cache_dir = os.environ.get("MODEL_CACHE_DIR", "/cache")
            self._model = SentenceTransformer(
                f"M-CLIP/{self.model_name}",
                cache_folder=cache_dir
            )
        return self._model

    def embed_image(self, image_path: str) -> list:
        from PIL import Image
        image = Image.open(image_path).convert("RGB")
        embedding = self.model.encode(image, normalize_embeddings=True)
        return embedding.tolist()

    def embed_text(self, text: str) -> list:
        embedding = self.model.encode(text, normalize_embeddings=True)
        return embedding.tolist()
```

```python
# ml/services/face_service.py
import os
import numpy as np
import cv2
import insightface
from insightface.app import FaceApp

class FaceService:
    def __init__(self, model_name: str = "buffalo_l"):
        self.model_name = model_name
        self._app = None

    @property
    def app(self):
        if self._app is None:
            self._app = FaceApp(name=self.model_name,
                                root=os.environ.get("MODEL_CACHE_DIR", "/cache"))
        return self._app

    def detect(self, image_path: str) -> list[dict]:
        img = cv2.imread(image_path)
        if img is None:
            return []
        faces = self.app.get(img)
        results = []
        for face in faces:
            bbox = face.bbox.astype(int)
            results.append({
                "bbox": {"x1": int(bbox[0]), "y1": int(bbox[1]),
                         "x2": int(bbox[2]), "y2": int(bbox[3])},
                "embedding": face.embedding.tolist(),
                "confidence": float(face.det_score)
            })
        return results

    def cluster(self, face_ids: list[str], embeddings: list[list[float]], threshold: float = 0.4) -> list[dict]:
        if not embeddings:
            return []
        from sklearn.cluster import DBSCAN
        X = np.array(embeddings)
        clustering = DBSCAN(eps=threshold, min_samples=2, metric='cosine').fit(X)
        clusters = {}
        for idx, label in enumerate(clustering.labels_):
            if label == -1:
                continue
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(face_ids[idx])
        return [
            {"person_id": f"auto-{label}", "face_ids": ids}
            for label, ids in clusters.items()
        ]
```

### 8.5 Flutter Mobile App Specification

#### 8.5.1 pubspec.yaml
```yaml
name: ai_album
description: AI Album - Smart Photo Management
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  # State Management
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5
  # Network
  dio: ^5.4.0
  # Navigation
  go_router: ^13.2.0
  # Local Storage
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  isar: ^3.1.0+1
  isar_flutter_libs: ^3.1.0+1
  # Image
  cached_network_image: ^3.3.1
  photo_manager: ^3.5.0
  # Background
  workmanager: ^0.5.2
  flutter_local_notifications: ^17.2.0
  # UI
  flutter_map: ^6.1.0
  latlong2: ^0.9.1
  photo_view: ^0.15.0
  shimmer: ^3.0.0
  # Utils
  path_provider: ^2.1.2
  permission_handler: ^11.3.0
  connectivity_plus: ^5.0.2
  package_info_plus: ^5.0.1
  url_launcher: ^6.2.4
  share_plus: ^7.2.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1
  build_runner: ^2.4.8
  isar_generator: ^3.1.0+1
  riverpod_generator: ^2.3.11
```

#### 8.5.2 Project Structure
```
mobile/lib/
├── main.dart
├── app.dart                    # MaterialApp + GoRouter
├── config/
│   ├── api_config.dart         # API base URL配置
│   └── theme_config.dart       # 亮色/暗色主题
├── models/
│   ├── user.dart
│   ├── photo.dart
│   ├── album.dart
│   ├── person.dart
│   └── backup_state.dart
├── providers/
│   ├── auth_provider.dart      # 认证状态 (Riverpod)
│   ├── photo_provider.dart     # 照片列表+分页
│   ├── backup_provider.dart    # 备份状态+进度
│   ├── album_provider.dart     # 相册数据
│   └── settings_provider.dart  # 设置+只读模式
├── services/
│   ├── api_service.dart        # Dio HTTP客户端
│   ├── backup_service.dart     # 前台/后台备份逻辑
│   ├── album_sync_service.dart # 相册同步
│   ├── cache_service.dart      # 离线缓存
│   ├── local_storage_service.dart  # Hive键值存储
│   └── photo_manager_service.dart  # 设备相册访问
├── pages/
│   ├── login_page.dart
│   ├── onboarding_page.dart
│   ├── home_page.dart          # 时间线+搜索+回忆
│   ├── explore_page.dart       # 人物/地点/标签
│   ├── photo_detail_page.dart
│   ├── search_page.dart
│   ├── map_page.dart
│   ├── backup_page.dart        # 备份管理
│   ├── albums_page.dart
│   ├── album_detail_page.dart
│   ├── sharing_page.dart
│   ├── favorites_page.dart
│   ├── archive_page.dart
│   ├── trash_page.dart
│   ├── settings_page.dart
│   └── free_up_space_page.dart
├── widgets/
│   ├── photo_grid.dart         # 照片网格组件
│   ├── photo_tile.dart         # 单个照片瓦片(含同步指示器)
│   ├── timeline_header.dart    # 日期分组头
│   ├── backup_progress_bar.dart
│   ├── person_card.dart
│   ├── map_marker.dart
│   └── empty_state.dart
└── utils/
    ├── date_formatter.dart
    ├── file_utils.dart
    └── constants.dart
```

#### 8.5.3 API Service (services/api_service.dart)
```dart
// class ApiService {
//   static final ApiService _instance = ApiService._internal();
//   factory ApiService() => _instance;
//   ApiService._internal();
//
//   late final Dio _dio;
//   String? _token;
//
//   void configure(String baseUrl, {String? token}) {
//     _dio = Dio(BaseOptions(
//       baseUrl: baseUrl,
//       connectTimeout: Duration(seconds: 30),
//       receiveTimeout: Duration(seconds: 60),
//       sendTimeout: Duration(seconds: 300), // 上传需要较长超时
//     ));
//     if (token != null) setToken(token);
//     _dio.interceptors.add(LogInterceptor(requestBody: false));
//   }
//
//   void setToken(String token) {
//     _token = token;
//     _dio.options.headers['Authorization'] = 'Bearer $token';
//   }
//
//   // Auth
//   Future<Map<String, dynamic>> login(String email, String password) =>
//     _dio.post('/api/auth/login', data: {'email': email, 'password': password});
//   Future<Map<String, dynamic>> register(String email, String password, String name) =>
//     _dio.post('/api/auth/register', data: {'email': email, 'password': password, 'name': name});
//
//   // Photos
//   Future<Map<String, dynamic>> getPhotos({int page = 1, int limit = 50}) =>
//     _dio.get('/api/photos', queryParameters: {'page': page, 'limit': limit});
//   Future<Map<String, dynamic>> getPhoto(String id) =>
//     _dio.get('/api/photos/$id');
//   Future<Map<String, dynamic>> getExistingHashes(List<String> hashes) =>
//     _dio.get('/api/photos/existing', queryParameters: {'hashes': hashes.join(',')});
//   Future<Map<String, dynamic>> mobileUpload(File file, {
//   String? deviceAssetId, String? deviceId, String? fileCreatedAt, String? livePhotoVideoId
//   }) =>
//     _dio.post('/api/photos/mobile-upload', data: FormData.fromMap({
//       'file': await MultipartFile.fromFile(file.path),
//       if (deviceAssetId != null) 'deviceAssetId': deviceAssetId,
//       if (deviceId != null) 'deviceId': deviceId,
//       if (fileCreatedAt != null) 'fileCreatedAt': fileCreatedAt,
//       if (livePhotoVideoId != null) 'livePhotoVideoId': livePhotoVideoId,
//     }));
//   Future<void> deletePhoto(String id) => _dio.delete('/api/photos/$id');
//   Future<void> favoritePhoto(String id, bool favorite) =>
//     _dio.put('/api/photos/$id', data: {'isFavorite': favorite});
//   Future<Map<String, dynamic>> searchPhotos(String query, {String mode = 'smart', int page = 1}) =>
//     _dio.get('/api/search', queryParameters: {'q': query, 'mode': mode, 'page': page});
//   Future<List<String>> getDeviceAlbums() =>
//     _dio.get('/api/photos/device-albums');
//   Future<Map<String, dynamic>> getMemories() => _dio.get('/api/photos/memories');
//
//   // Albums, Persons, etc. - 类似模式
// }
```

#### 8.5.4 Backup Service (services/backup_service.dart)
```dart
// class BackupService {
//   final ApiService _api;
//   final PhotoManagerService _photoManager;
//   final BackupProvider _backupProvider;
//
//   // 前台备份
//   Future<void> foregroundBackup() async {
//     1. 检查网络连接 (connectivity_plus)
//     2. 检查WiFi设置 (如果用户要求仅WiFi备份)
//     3. 获取选中备份相册列表 (从Hive读取)
//     4. 获取设备相册中的所有资产 (photo_manager)
//     5. 过滤: 仅保留选中相册的资产
//     6. 计算每个文件的SHA-256 hash
//     7. 批量检查已存在: _api.getExistingHashes(hashes)
//     8. 过滤掉已存在的文件
//     9. 逐个上传: _api.mobileUpload(file, deviceAssetId, deviceId, ...)
//     10. 更新进度: _backupProvider.updateProgress(current, total)
//     11. 上传完成后更新本地记录 (Hive: 已上传的assetId列表)
//   }
//
//   // 后台备份 (WorkManager)
//   static void registerBackgroundTask() {
//     Workmanager().initialize(callbackDispatcher, isInDebugMode: false);
//     Workmanager().registerPeriodicTask(
//       'backup-task',
//       'background-backup',
//       frequency: Duration(minutes: 15),
//       constraints: Constraints(
//         networkType: NetworkType.unmetered,  // 仅WiFi
//         requiresBatteryNotLow: true,
//       ),
//       existingWorkPolicy: ExistingWorkPolicy.keep,
//     );
//   }
//
//   // iOS后台备份 (BGTaskScheduler)
//   static void registerIOSBackgroundTask() {
//     // 在AppDelegate.swift中注册BGAppRefreshTask
//     // 最低刷新间隔由iOS系统决定(通常15分钟+)
//   }
// }
//
// // WorkManager回调
// void callbackDispatcher() {
//   Workmanager().executeTask((task, inputData) async {
//     final backupService = BackupService();
//     await backupService.foregroundBackup();
//     return true;
//   });
// }
```

#### 8.5.5 Key Pages

#### LoginPage
```dart
// 布局:
//   居中Card, 宽度max 400px
//   Logo + "AI Album" 标题
//   服务器URL输入框 (默认https://, 可切换http)
//   邮箱输入框
//   密码输入框 (可切换显示)
//   "登录"按钮 (加载时显示Spinner)
//   "忘记密码?"链接
//   "注册新账户"链接
//
// 逻辑:
//   1. 输入服务器URL → 点击"连接" → GET /api/server/ping验证服务器可达
//   2. 输入邮箱密码 → POST /api/auth/login
//   3. 成功: 保存token到Hive, 设置ApiService.token, 导航到HomePage
//   4. 失败: 显示错误提示(SnackBar)
//   5. HTTPS证书验证: 允许自签名证书(显示警告, 用户确认后接受)
```

#### HomePage (时间线)
```dart
// 布局:
//   AppBar: Logo + 搜索图标 + 备份状态图标(云图标)
//   回忆卡片: 水平滚动 "1年前的今天" (如果有)
//   照片网格: SliverGrid, 3列(手机)/4列(平板)
//   日期分组头: "2024年1月15日 周一"
//   浮动按钮: 上传按钮
//   底部导航: 首页/探索/相册/地图/设置
//
// 逻辑:
//   1. 进入页面: GET /api/photos?page=1&limit=50
//   2. 按taken_at分组显示日期头
//   3. 滚动到底部: 自动加载下一页 (page++)
//   4. 点击照片: 导航到PhotoDetailPage
//   5. 长按照片: 进入多选模式
//   6. 下拉刷新: 重新加载page=1
//   7. 搜索图标: 导航到SearchPage
//   8. 云图标: 导航到BackupPage
//   9. 存储指示器: 已同步照片显示小云图标
```

#### BackupPage
```dart
// 布局:
//   AppBar: "备份管理" + 后台备份开关
//   备份状态卡片:
//     - 已上传/总数
//     - 进度条 (仅备份中显示)
//     - 当前上传文件名
//   备份相册选择:
//     - 设备相册列表 (photo_manager获取)
//     - 每个相册: 名称 + 照片数量 + 开关
//     - 仅WiFi备份开关
//   释放空间按钮: 导航到FreeUpSpacePage
//
// 逻辑:
//   1. 进入页面: 获取设备相册列表 (photo_manager)
//   2. 计算每个相册的待上传数量
//   3. 切换相册开关: 保存到Hive
//   4. 开启前台备份: 调用BackupService.foregroundBackup()
//   5. 后台备份开关: 注册/取消WorkManager任务
//   6. 进度更新: BackupProvider监听
```

#### FreeUpSpacePage
```dart
// 布局:
//   步骤1 - 配置:
//     截止日期选择器 (DatePicker)
//     保留收藏照片开关
//     保留相册多选 (WhatsApp等)
//     保留类型: 全部照片/全部视频/不保留
//   步骤2 - 预览:
//     "将删除X张照片, 释放Y GB"
//     照片网格预览 (可滚动)
//   步骤3 - 确认:
//     "确认释放空间"按钮 (红色)
//     二次确认对话框
//
// 逻辑:
//   1. 扫描已备份照片: 查询Hive中已上传的assetId列表
//   2. 应用过滤规则: 截止日期/保留收藏/保留相册/保留类型
//   3. 生成待删除列表
//   4. 确认后: 批量删除 (Android: 2000/批, iOS: 10000/批)
//   5. 删除到系统回收站 (photo_manager.delete)
```

#### PhotoDetailPage
```dart
// 布局:
//   全屏照片 (PhotoView可缩放)
//   顶部: 返回按钮 + 日期 + 更多菜单
//   底部工具栏: 收藏/分享/下载/删除
//   LivePhoto: 长按播放动态效果
//   上滑: EXIF信息面板
//
// 逻辑:
//   1. 加载照片: GET /api/photos/:id
//   2. 缩放: PhotoView组件
//   3. 左右滑动: 切换上/下一张 (使用photo列表中的index)
//   4. 收藏: PUT /api/photos/:id {isFavorite: !current}
//   5. 下载: 保存到设备相册
//   6. 删除: 确认对话框 → DELETE /api/photos/:id
//   7. LivePhoto: 检查livePhotoVideoId, 长按播放视频
//   8. EXIF面板: 显示拍摄参数/GPS/OCR文本
```

#### 8.5.6 AndroidManifest.xml 关键配置
```xml
<!-- 权限 -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="29" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Application -->
<application
    android:usesCleartextTraffic="true">  <!-- 允许HTTP连接(局域网部署) -->
    <service
        android:name="be.tramckrijte.workmanager.WorkmanagerService"
        android:permission="android.permission.BIND_JOB_SERVICE"
        android:exported="true" />
</application>
```

#### 8.5.7 iOS Info.plist 关键配置
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>AI Album需要访问您的相册以备份照片</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>AI Album需要保存照片到您的相册</string>
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
    <string>com.aialbum.background-backup</string>
</array>
<key>UIBackgroundModes</key>
<array>
    <string>fetch</string>
    <string>processing</string>
</array>
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>  <!-- 允许HTTP连接(局域网部署) -->
</dict>
```

## 9. Critical Implementation Rules

### 9.1 代码规范
- 所有TypeScript文件使用ESM (import/export)
- 不使用any类型，所有变量必须有明确类型
- 函数参数和返回值必须有类型注解
- 错误处理必须使用try/catch，不能忽略错误
- 异步操作必须使用async/await，不使用.then链
- 文件命名: 组件PascalCase, 工具函数camelCase, 页面PascalCase+Page后缀

### 9.2 安全规范
- 密码使用bcryptjs哈希 (salt rounds: 12)
- JWT签名: 必须指定`{ algorithms: ['HS256'] }`防止算法混淆攻击
- JWT Payload包含jti(session ID), 每次请求验证session存在性
- API Key: SHA256哈希存储, 过期检查(expires_at), 权限限制(keyPermissions), 无admin权限
- 文件上传: path.basename防止路径遍历, 文件名过滤特殊字符, MIME类型白名单, magic number验证
- SQL查询使用参数化 ($1, $2)，绝不拼接SQL; ORDER BY使用白名单映射表
- 分享链接token使用crypto.randomBytes生成, 密码使用bcrypt哈希存储
- API密钥存储hash，不存原文
- 密码重置token一次性使用(used_at标记), 1小时过期, 用户枚举防护
- OAuth state参数CSRF保护(Redis存储, 10分钟过期, 一次性使用)
- 错误响应: 生产环境不暴露堆栈/SQL/文件路径, 数据库错误统一返回500
- CORS: 生产环境严格限制origin为FRONTEND_URL域名列表, 不使用'*'
- 日志: 不记录密码/JWT token/API Key/重置token
- setup路由: 首次安装后自动禁用
- Docker容器: security_opt: no-new-privileges:true, Server/ML以appuser非root运行
- Valkey: 密码认证(--requirepass)
- Nginx: server_tokens off, 安全头(X-Frame-Options/X-Content-Type-Options/X-XSS-Protection/Referrer-Policy)

### 9.3 部署脚本规格

#### scripts/install.sh (一键安装)
```bash
#!/bin/bash
set -euo pipefail

# AI Album 一键安装脚本 (Ubuntu 22.04 ARM64/x86_64)
# 参考: immich install.sh
# 用法: curl -fsSL https://raw.githubusercontent.com/<repo>/main/install.sh | bash
# 或:   wget -qO- https://raw.githubusercontent.com/<repo>/main/install.sh | bash

INSTALL_DIR="/opt/ai-album"
REPO_BASE="https://github.com/<org>/ai-album"
BRANCH="main"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 1. 检测操作系统和架构
detect_os() {
  if [[ ! -f /etc/os-release ]]; then
    error "Unsupported OS. This script supports Ubuntu 22.04+."
  fi
  source /etc/os-release
  if [[ "$ID" != "ubuntu" ]] || [[ "$(echo $VERSION_ID | cut -d. -f1)" -lt 22 ]]; then
    warn "This script is optimized for Ubuntu 22.04+. Current: $PRETTY_NAME"
  fi
  ARCH=$(uname -m)
  if [[ "$ARCH" != "aarch64" ]] && [[ "$ARCH" != "x86_64" ]]; then
    error "Unsupported architecture: $ARCH. Only aarch64(ARM64) and x86_64 are supported."
  fi
  info "Detected: $PRETTY_NAME ($ARCH)"

  # 检查最低系统要求
  TOTAL_MEM=$(grep MemTotal /proc/meminfo | awk '{print int($2/1024)}')
  if [[ $TOTAL_MEM -lt 3500 ]]; then
    error "Insufficient memory: ${TOTAL_MEM}MB. Minimum 4GB RAM required."
  fi
  if [[ $TOTAL_MEM -lt 7000 ]]; then
    warn "Memory: ${TOTAL_MEM}MB. Recommended 8GB+ for optimal ML performance."
    warn "On 4GB devices, ensure at least 2GB swap is configured."
  fi
}

# 2. 检测和安装Docker
ensure_docker() {
  if command -v docker &>/dev/null && docker info &>/dev/null; then
    info "Docker is already installed: $(docker --version)"
  else
    info "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
    info "Docker installed: $(docker --version)"
  fi

  if docker compose version &>/dev/null; then
    DOCKER_BIN="docker compose"
  elif command -v docker-compose &>/dev/null; then
    DOCKER_BIN="docker-compose"
  else
    error "Cannot find docker compose or docker-compose."
  fi
  info "Using: $DOCKER_BIN"
}

# 3. 创建安装目录
create_install_dir() {
  if [[ -d "$INSTALL_DIR" ]]; then
    warn "Directory $INSTALL_DIR already exists."
    read -p "Continue with existing directory? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit 1; fi
  else
    info "Creating install directory: $INSTALL_DIR"
    mkdir -p "$INSTALL_DIR"
  fi
  cd "$INSTALL_DIR"
}

# 4. 下载配置文件
download_configs() {
  info "Downloading docker-compose.yml..."
  curl -L "$REPO_BASE/releases/latest/download/docker-compose.yml" -o docker-compose.yml 2>/dev/null \
    || curl -L "$REPO_BASE/raw/$BRANCH/docker/docker-compose.yml" -o docker-compose.yml

  info "Downloading .env template..."
  curl -L "$REPO_BASE/releases/latest/download/example.env" -o .env 2>/dev/null \
    || curl -L "$REPO_BASE/raw/$BRANCH/docker/example.env" -o .env
}

# 5. 生成随机密码并配置.env
configure_env() {
  info "Generating secure credentials..."
  JWT_SECRET=$(openssl rand -hex 32)
  DB_PASSWORD=$(openssl rand -hex 16)
  VALKEY_PASSWORD=$(openssl rand -hex 16)

  UPLOAD_LOCATION="$INSTALL_DIR/data/uploads"
  THUMBNAIL_LOCATION="$INSTALL_DIR/data/thumbnails"
  DB_DATA_LOCATION="$INSTALL_DIR/data/postgres"

  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|" .env
  sed -i "s|^VALKEY_PASSWORD=.*|VALKEY_PASSWORD=$VALKEY_PASSWORD|" .env
  sed -i "s|^UPLOAD_LOCATION=.*|UPLOAD_LOCATION=$UPLOAD_LOCATION|" .env
  sed -i "s|^THUMBNAIL_LOCATION=.*|THUMBNAIL_LOCATION=$THUMBNAIL_LOCATION|" .env
  sed -i "s|^DB_DATA_LOCATION=.*|DB_DATA_LOCATION=$DB_DATA_LOCATION|" .env

  info "Environment configured."
}

# 6. 创建必要目录
create_data_dirs() {
  info "Creating data directories..."
  mkdir -p "$UPLOAD_LOCATION" "$THUMBNAIL_LOCATION" "$DB_DATA_LOCATION"
  mkdir -p "$INSTALL_DIR/data/backups" "$INSTALL_DIR/data/logs"
  mkdir -p "$INSTALL_DIR/data/ssl"
}

# 7. 拉取镜像并启动
start_services() {
  info "Pulling Docker images (this may take a few minutes)..."
  $DOCKER_BIN pull

  info "Starting AI Album services..."
  $DOCKER_BIN up -d

  info "Waiting for services to be ready..."
  local max_wait=120
  local waited=0
  while [[ $waited -lt $max_wait ]]; do
    if curl -fsS -m 2 http://localhost:80/api/server/ping 2>/dev/null | grep -q 'pong'; then
      info "Services are ready!"
      return 0
    fi
    sleep 3
    waited=$((waited + 3))
    echo -n "."
  done
  echo
  warn "Services may still be starting. Check status: cd $INSTALL_DIR && $DOCKER_BIN ps"
}

# 8. 配置防火墙
configure_firewall() {
  if command -v ufw &>/dev/null; then
    info "Configuring UFW firewall..."
    ufw allow 80/tcp 2>/dev/null
    ufw allow 443/tcp 2>/dev/null
  fi
}

# 9. 显示安装结果
show_result() {
  IP_ADDRESS=$(hostname -I | awk '{print $1}')
  echo ""
  echo "========================================================"
  echo -e "${GREEN}  AI Album has been successfully installed!${NC}"
  echo "========================================================"
  echo ""
  echo "  Web UI:      http://$IP_ADDRESS"
  echo "  Mobile API:  http://$IP_ADDRESS/api"
  echo "  Data:        $INSTALL_DIR/data"
  echo "  Config:      $INSTALL_DIR/.env"
  echo ""
  echo "  Next steps:"
  echo "    1. Open the URL above in your browser"
  echo "    2. Complete the setup wizard to create admin account"
  echo ""
  echo "  Useful commands:"
  echo "    cd $INSTALL_DIR"
  echo "    $DOCKER_BIN ps          # Check service status"
  echo "    $DOCKER_BIN logs -f     # View logs"
  echo "    ./scripts/backup.sh     # Backup data"
  echo "    ./scripts/upgrade.sh    # Upgrade to new version"
  echo "========================================================"
}

# MAIN
main() {
  echo "AI Album Installer"
  echo "=================="
  detect_os
  ensure_docker
  create_install_dir
  download_configs
  configure_env
  create_data_dirs
  start_services
  configure_firewall
  show_result
}

main
```

#### scripts/upgrade.sh (升级脚本)
```bash
#!/bin/bash
set -euo pipefail

# AI Album 升级脚本
# 参考: immich 升级流程 (docker-compose pull && docker-compose up -d)
# 用法: ./upgrade.sh [version]

INSTALL_DIR="/opt/ai-album"
cd "$INSTALL_DIR"

DOCKER_BIN="docker compose"
if ! $DOCKER_BIN version &>/dev/null; then
  DOCKER_BIN="docker-compose"
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 1. 检查当前版本
CURRENT_VERSION=$(cat .version 2>/dev/null || echo "unknown")
info "Current version: $CURRENT_VERSION"

# 2. 执行备份
info "Creating backup before upgrade..."
./scripts/backup.sh

# 3. 拉取新镜像
TARGET_VERSION="${1:-latest}"
info "Pulling new images (target: $TARGET_VERSION)..."
if [[ "$TARGET_VERSION" == "latest" ]]; then
  $DOCKER_BIN pull
else
  sed -i "s|^AI_ALBUM_VERSION=.*|AI_ALBUM_VERSION=$TARGET_VERSION|" .env
  $DOCKER_BIN pull
fi

# 4. 停止服务
info "Stopping services..."
$DOCKER_BIN down

# 5. 启动服务 (entrypoint.sh通过PG Advisory Lock自动执行迁移)
info "Starting services (database migrations run automatically)..."
$DOCKER_BIN up -d

# 6. 等待服务就绪
info "Waiting for services to be ready..."
max_wait=180
waited=0
while [[ $waited -lt $max_wait ]]; do
  if curl -fsS -m 2 http://localhost:80/api/server/ping 2>/dev/null | grep -q 'pong'; then
    NEW_VERSION=$(cat .version 2>/dev/null || echo "unknown")
    info "Upgrade complete: $CURRENT_VERSION -> $NEW_VERSION"
    exit 0
  fi
  sleep 3
  waited=$((waited + 3))
  echo -n "."
done
echo
warn "Services may still be starting. Check: $DOCKER_BIN ps"

# 7. 如果升级失败提示恢复
echo ""
echo "If something went wrong, restore from backup:"
echo "  ./scripts/restore.sh /opt/ai-album/data/backups/<latest_backup>.tar.gz"
```

#### scripts/backup.sh (备份脚本)
```bash
#!/bin/bash
set -euo pipefail

# AI Album 备份脚本
# 参考: immich pg_dumpall 备份方式
# 用法: ./backup.sh
# 定时: crontab -e → 0 3 * * * /opt/ai-album/scripts/backup.sh

INSTALL_DIR="/opt/ai-album"
BACKUP_DIR="$INSTALL_DIR/data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

DOCKER_BIN="docker compose"
if ! $DOCKER_BIN version &>/dev/null; then
  DOCKER_BIN="docker-compose"
fi

mkdir -p "$BACKUP_PATH"

# 1. 备份数据库
echo "Backing up PostgreSQL database..."
$DOCKER_BIN -f "$INSTALL_DIR/docker-compose.yml" exec -T postgres \
  pg_dump -U aialbum aialbum > "$BACKUP_PATH/database.sql"

# 2. 备份配置文件
cp "$INSTALL_DIR/.env" "$BACKUP_PATH/.env"
cp "$INSTALL_DIR/docker-compose.yml" "$BACKUP_PATH/docker-compose.yml"

# 3. 备份Redis数据
VALKEY_PASSWORD=$(grep '^VALKEY_PASSWORD=' "$INSTALL_DIR/.env" | cut -d= -f2)
$DOCKER_BIN -f "$INSTALL_DIR/docker-compose.yml" exec -T valkey \
  valkey-cli -a "$VALKEY_PASSWORD" BGSAVE 2>/dev/null
sleep 2
docker cp ai-album-valkey:/data/dump.rdb \
  "$BACKUP_PATH/valkey-dump.rdb" 2>/dev/null || true

# 4. 压缩备份
echo "Compressing backup..."
tar czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "$TIMESTAMP"

# 5. 显示结果
SIZE=$(du -sh "$BACKUP_PATH.tar.gz" | cut -f1)
rm -rf "$BACKUP_PATH"

# 6. 清理7天前的备份
echo "Cleaning old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_PATH.tar.gz ($SIZE)"
echo ""
echo "Note: Upload files are NOT included in this backup."
echo "To backup uploads, use: rsync -av $INSTALL_DIR/data/uploads/ /your/backup/location/"
```

#### scripts/restore.sh (恢复脚本)
```bash
#!/bin/bash
set -euo pipefail

# AI Album 恢复脚本
# 参考: immich 数据库恢复流程
# 用法: ./restore.sh <backup_file.tar.gz>

INSTALL_DIR="/opt/ai-album"
BACKUP_FILE="${1:?Usage: restore.sh <backup_file.tar.gz>}"

DOCKER_BIN="docker compose"
if ! $DOCKER_BIN version &>/dev/null; then
  DOCKER_BIN="docker-compose"
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will replace all current data!"
read -p "Are you sure? Type 'RESTORE' to confirm: " confirm
if [[ "$confirm" != "RESTORE" ]]; then
  echo "Aborted."
  exit 0
fi

# 1. 停止服务
echo "Stopping services..."
$DOCKER_BIN -f "$INSTALL_DIR/docker-compose.yml" down

# 2. 解压备份
RESTORE_DIR=$(mktemp -d)
tar xzf "$BACKUP_FILE" -C "$RESTORE_DIR"
BACKUP_SUBDIR=$(ls "$RESTORE_DIR")

# 3. 恢复配置文件
cp "$RESTORE_DIR/$BACKUP_SUBDIR/.env" "$INSTALL_DIR/.env"
cp "$RESTORE_DIR/$BACKUP_SUBDIR/docker-compose.yml" "$INSTALL_DIR/docker-compose.yml"

# 4. 启动数据库
echo "Starting PostgreSQL..."
$DOCKER_BIN -f "$INSTALL_DIR/docker-compose.yml" up -d postgres valkey
sleep 10

# 5. 恢复数据库
echo "Restoring database..."
$DOCKER_BIN -f "$INSTALL_DIR/docker-compose.yml" exec -T postgres \
  psql -U aialbum -d postgres -c "DROP DATABASE IF EXISTS aialbum;"
$DOCKER_BIN -f "$INSTALL_DIR/docker-compose.yml" exec -T postgres \
  psql -U aialbum -d postgres -c "CREATE DATABASE aialbum;"
cat "$RESTORE_DIR/$BACKUP_SUBDIR/database.sql" | \
  $DOCKER_BIN -f "$INSTALL_DIR/docker-compose.yml" exec -T postgres \
  psql -U aialbum aialbum

# 6. 恢复Redis数据
if [[ -f "$RESTORE_DIR/$BACKUP_SUBDIR/valkey-dump.rdb" ]]; then
  docker cp "$RESTORE_DIR/$BACKUP_SUBDIR/valkey-dump.rdb" ai-album-valkey:/data/dump.rdb
fi

# 7. 启动所有服务
echo "Starting all services..."
$DOCKER_BIN -f "$INSTALL_DIR/docker-compose.yml" up -d

# 8. 清理
rm -rf "$RESTORE_DIR"
echo "Restore completed. Check service status: $DOCKER_BIN ps"
```

#### scripts/uninstall.sh (卸载脚本)
```bash
#!/bin/bash
set -euo pipefail

# AI Album 卸载脚本
# 用法: ./uninstall.sh

INSTALL_DIR="/opt/ai-album"

echo "========================================================"
echo "  AI Album Uninstaller"
echo "========================================================"
echo ""
echo "WARNING: This will remove AI Album from your system."
echo ""
read -p 'Type "UNINSTALL" to confirm: ' confirm
if [[ "$confirm" != "UNINSTALL" ]]; then
  echo "Aborted."
  exit 0
fi

# 1. 询问是否保留数据
read -p "Keep uploaded files and database? [Y/n] " -n 1 -r
echo
KEEP_DATA=$REPLY
if [[ ! $KEEP_DATA =~ ^[Nn]$ ]]; then
  KEEP_DATA="y"
fi

# 2. 停止服务
echo "Stopping services..."
cd "$INSTALL_DIR"
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true

# 3. 删除Docker资源
echo "Removing Docker containers and images..."
docker compose down --rmi all --volumes 2>/dev/null || true

if [[ "$KEEP_DATA" == "n" ]]; then
  echo "Removing all data including uploads and database..."
  rm -rf "$INSTALL_DIR"
  echo "AI Album has been completely removed."
else
  echo "Keeping data in: $INSTALL_DIR/data/"
  # 仅删除容器/镜像/配置, 保留data目录
  rm -f "$INSTALL_DIR/docker-compose.yml"
  rm -f "$INSTALL_DIR/.env"
  echo "AI Album containers and images removed."
  echo "Data preserved in: $INSTALL_DIR/data/"
  echo "To reinstall: curl -fsSL <url>/install.sh | bash"
fi

# 4. 可选卸载Docker
read -p "Also uninstall Docker? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  echo "Docker has been uninstalled."
fi
```

#### docker/nginx.conf (完整Nginx配置)
```nginx
# AI Album Nginx Configuration
# 参考: immich 外部反向代理配置
# 部署方式: 作为Docker容器内的Nginx, 终止SSL并反向代理到server服务
# 注意: 首次安装无SSL证书时, 使用HTTP模式; 运行install.sh --ssl后自动切换HTTPS

worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server_tokens off;

    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    # 隐藏上游错误细节
    proxy_intercept_errors on;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml
        application/rss+xml
        image/svg+xml;

    # 上传大小限制 (与MAX_FILE_SIZE环境变量一致)
    client_max_body_size 200M;
    client_body_buffer_size 128k;

    # 超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 300s;

    # 限流
    limit_req_zone $binary_remote_addr zone=global:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=10r/m;

    # 上游服务定义
    upstream api_server {
        server ai-album-server:3000;
    }

    # 健康检查端点 - 在所有server块之前定义,确保始终可用
    # Docker健康检查使用: curl -f http://localhost/api/server/ping

    # HTTP服务器 (默认模式, 支持HTTP和HTTPS自动切换)
    server {
        listen 80;
        server_name _;

        # 安全头 (HTTP和HTTPS模式均生效)
        add_header X-Frame-Options SAMEORIGIN always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy strict-origin-when-cross-origin always;

        # 如果SSL证书存在, 重定向到HTTPS
        # 由install.sh --ssl自动配置: 将此server块替换为return 301
        # if ($scheme = http) { return 301 https://$host$request_uri; }

        # 健康检查 (无需限流, 无需认证)
        location /api/server/ping {
            proxy_pass http://api_server;
            access_log off;
        }

        # API端点
        location /api/ {
            limit_req zone=global burst=20 nodelay;

            proxy_pass http://api_server;
            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # 认证接口额外限流
            location /api/auth/login {
                limit_req zone=auth burst=3 nodelay;
                proxy_pass http://api_server;
                proxy_set_header Host $http_host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }

            location /api/auth/register {
                limit_req zone=auth burst=3 nodelay;
                proxy_pass http://api_server;
                proxy_set_header Host $http_host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }

            # 上传接口额外限流
            location /api/photos/upload {
                limit_req zone=upload burst=5 nodelay;
                client_max_body_size 200M;

                # 恶意上传防护: 仅允许合法多媒体文件
                if ($request_method != POST) { return 405; }

                proxy_pass http://api_server;
                proxy_set_header Host $http_host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }

            # 移动端上传 (匹配 /api/photos/mobile-upload 和 /api/photos/mobile-upload-batch)
            location /api/photos/mobile-upload {
                limit_req zone=upload burst=5 nodelay;
                client_max_body_size 200M;

                if ($request_method != POST) { return 405; }

                proxy_pass http://api_server;
                proxy_set_header Host $http_host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }
        }

        # SSE端点 (需要长连接)
        location /api/events {
            proxy_pass http://api_server;
            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_http_version 1.1;
            proxy_set_header Connection '';
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 86400s;
        }

        # 前端静态资源
        location / {
            proxy_pass http://api_server;
            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # 前端资源缓存
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
                proxy_pass http://api_server;
                proxy_set_header Host $http_host;
                expires 30d;
                add_header Cache-Control "public, immutable";
            }
        }

        # 缩略图缓存
        location /thumbnails/ {
            proxy_pass http://api_server;
            expires 365d;
            add_header Cache-Control "public, immutable";
        }
    }

    # HTTPS服务器 (由install.sh --ssl自动启用此配置块)
    # 启用方式: 将以下内容取消注释, 并在HTTP server块中添加重定向
    # server {
    #     listen 443 ssl http2;
    #     server_name _;
    #
    #     ssl_certificate /etc/nginx/ssl/cert.pem;
    #     ssl_certificate_key /etc/nginx/ssl/key.pem;
    #     ssl_protocols TLSv1.2 TLSv1.3;
    #     ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    #     ssl_prefer_server_ciphers off;
    #     ssl_session_cache shared:SSL:10m;
    #     ssl_session_timeout 1d;
    #     ssl_session_tickets off;
    #
    #     # 安全头
    #     add_header X-Frame-Options SAMEORIGIN always;
    #     add_header X-Content-Type-Options nosniff always;
    #     add_header X-XSS-Protection "1; mode=block" always;
    #     add_header Referrer-Policy strict-origin-when-cross-origin always;
    #     add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws: wss: https:; media-src 'self' blob:; frame-src 'none'" always;
    #     add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    #
    #     # ... (所有location块与HTTP server相同, 复制即可)
    # }
}
```

**SSL证书配置方案:**

| 方案 | 命令 | 适用场景 |
|------|------|----------|
| Let's Encrypt | `./scripts/install.sh --ssl --domain album.example.com --email admin@example.com` | 公网域名 |
| 自签名证书 | `./scripts/install.sh --ssl --self-signed` | 内网/测试 |
| 自有证书 | 将cert.pem和key.pem放入`./ssl/`目录 | 企业证书 |

**Let's Encrypt自动续期:** 安装脚本会在crontab中添加 `0 3 * * 0 /opt/ai-album/scripts/renew-cert.sh >> /var/log/ai-album/cert-renew.log 2>&1`

#### docker/example.env (环境变量模板)
```bash
# ============================================================
# AI Album 环境变量配置
# 参考: immich example.env
# ============================================================

# --- 必须修改 ---
# 上传文件存储路径
UPLOAD_LOCATION=/opt/ai-album/data/uploads
# 缩略图存储路径
THUMBNAIL_LOCATION=/opt/ai-album/data/thumbnails
# 数据库存储路径
DB_DATA_LOCATION=/opt/ai-album/data/postgres

# JWT签名密钥 (务必修改! 使用: openssl rand -hex 32)
JWT_SECRET=change-me-to-a-random-string

# 数据库密码 (务必修改! 使用: openssl rand -hex 16)
DB_PASSWORD=change-me-to-a-random-password

# Valkey密码 (务必修改! 使用: openssl rand -hex 16)
VALKEY_PASSWORD=change-me-to-a-random-password

# --- 可选配置 ---
# AI Album版本 (默认latest, 可指定如v1.0.0)
AI_ALBUM_VERSION=latest

# 数据库连接URL (自动构建, 一般无需修改)
DATABASE_URL=postgresql://aialbum:${DB_PASSWORD}@${DB_HOST:-postgres}:${DB_PORT:-5432}/${DB_DATABASE_NAME:-aialbum}

# Redis连接URL (自动构建, 包含密码认证)
REDIS_URL=redis://:${VALKEY_PASSWORD}@${REDIS_HOST:-valkey}:${REDIS_PORT:-6379}

# ML服务URL (一般无需修改)
ML_SERVICE_URL=http://${ML_HOST:-ml}:${ML_PORT:-3001}

# 前端URL (CORS配置, 修改为实际访问地址)
FRONTEND_URL=http://localhost

# 数据库连接池
DB_POOL_MAX=15

# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=aialbum
DB_DATABASE_NAME=aialbum

# Redis配置
REDIS_HOST=valkey
REDIS_PORT=6379

# ML服务配置
ML_HOST=ml
ML_PORT=3001

# 服务器配置
PORT=3000
NODE_ENV=production

# 上传限制
MAX_FILE_SIZE=209715200  # 200MB in bytes

# OCR语言 (逗号分隔)
OCR_LANGUAGES=ch,en,ja

# CLIP模型
CLIP_MODEL=XLM-Roberta-Large-Vit-B-16Plus

# 人脸检测模型
FACE_MODEL=buffalo_l

# SMTP邮件配置 (可选, 用于密码重置)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=noreply@example.com

# OAuth配置 (可选)
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=

# Stripe支付配置 (Phase 5商业化, 可选)
# STRIPE_SECRET_KEY=sk_test_xxx
# STRIPE_PUBLISHABLE_KEY=pk_test_xxx
# STRIPE_WEBHOOK_SECRET=whsec_xxx

# 多租户配置 (Phase 5商业化, 可选)
# DEFAULT_DOMAIN=album.example.com
# ENABLE_MULTI_TENANT=false

# 管理员邮箱 (可选, 首个注册用户自动成为Admin)
# ADMIN_EMAIL=admin@example.com

# 时区
TZ=Asia/Shanghai
```

### 9.4 性能规范
- 照片列表必须分页 (默认50条)
- 缩略图使用sharp压缩 (800px, quality 80)
- 前端使用虚拟滚动 (@tanstack/react-virtual)
- 静态资源设置30天缓存
- 启用gzip压缩
- BullMQ Worker并发限制: thumbnail=4, metadata=2, ocr=1, clip=1, face=1

### 9.5 日志规范

**后端日志 (使用pino):**
```typescript
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// 日志级别使用规范:
// logger.fatal(): 系统不可用 (数据库连接失败、ML服务完全不可用)
// logger.error(): 请求处理失败 (API返回5xx, Worker处理失败)
// logger.warn():  可恢复的异常 (限流触发、重试中、熔断器打开)
// logger.info():  关键业务事件 (用户注册、照片上传、处理完成、分享创建)
// logger.debug(): 调试信息 (SQL查询、Redis操作、请求参数)

// 结构化日志格式:
logger.info({ userId, photoId, action: 'photo.upload' }, 'Photo uploaded');
logger.error({ err, photoId, worker: 'thumbnail' }, 'Thumbnail generation failed');

// 敏感信息脱敏规则(必须遵守):
// 1. 绝不记录: 密码(明文/哈希)、JWT token、API Key(明文/哈希)、重置token
// 2. 绝不记录: 请求体中的password/newPassword字段
// 3. 邮箱地址可记录(用于审计), 但OAuth access_token不可记录
// 4. 文件路径仅记录相对路径, 不记录服务器绝对路径
// 5. 数据库错误记录err.message, 不记录包含SQL语句的err.detail
// 6. 使用redact工具函数: const redactEmail = (email) => email.replace(/(.{2}).*(@.*)/, '$1***$2')
```

**ML服务日志 (使用Python logging):**
```python
import logging
logger = logging.getLogger('ai-album-ml')
# 格式: %(asctime)s [%(levelname)s] %(name)s: %(message)s
# 关键事件: 模型加载完成、推理请求、推理耗时、错误
```

**前端日志:**
- 生产环境: 仅console.error和console.warn
- 开发环境: console.debug可用
- 关键错误上报: 使用window.onerror和unhandledrejection捕获

**日志输出目标:**
- 开发环境: 控制台(stdout)
- 生产环境: 容器stdout (由Docker日志驱动收集)
- 可选: 配置LOG_FILE=/var/log/ai-album/app.jsonl写入文件

### 9.6 测试策略

**后端测试 (使用vitest):**
```typescript
// api/__tests__/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

describe('Auth API', () => {
  it('POST /api/auth/register - should register new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Test1234', name: 'Test' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });
});
```

**测试分类:**
- 单元测试: 工具函数、验证Schema、Repository方法
- 集成测试: API端点(使用supertest + 测试数据库)
- E2E测试: 关键用户流程(注册→上传→浏览→搜索→删除)

**测试数据库:**
- 使用docker-compose.test.yml启动独立的测试PG和Redis
- 每个测试套件前执行迁移，测试后清理
- CI中自动运行: `docker compose -f docker-compose.test.yml up -d && npm test`

**前端测试 (使用vitest + @testing-library/react):**
- 组件测试: 渲染、交互、状态变化
- Store测试: action调用、状态更新
- API客户端测试: mock fetch响应

**ML服务测试 (使用pytest):**
- 模型加载测试: 确认模型可正常加载和推理
- API端点测试: 使用httpx.AsyncClient测试FastAPI端点
- 批处理测试: 验证batch API的输入输出格式

**测试覆盖率要求:**
- 后端核心模块(Auth, Photos, Search): ≥80%
- Worker处理器: ≥70%
- 前端页面: ≥60%
- ML服务: ≥50%

### 9.7 CI/CD流水线

**GitHub Actions (.github/workflows/ci.yml):**
```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg15
        env: { POSTGRES_USER: test, POSTGRES_PASSWORD: test, POSTGRES_DB: aialbum_test }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd web && npm ci
      - run: cd web && npm run typecheck
      - run: cd web && npm run lint
      - run: cd web && npm run build
      - run: cd web && npm test

  ml:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: cd ml && pip install -r requirements.txt
      - run: cd ml && python -m pytest tests/ -v

  docker-build:
    runs-on: ubuntu-latest
    needs: [backend, frontend, ml]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/setup-qemu-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - run: |
          docker buildx build --platform linux/arm64,linux/amd64 \
            -t ghcr.io/${{ github.repository }}:latest \
            -t ghcr.io/${{ github.repository }}:${{ github.sha }} \
            --push .
```

**package.json中需添加的脚本:**
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint 'api/**/*.ts' 'src/**/*.ts' 'src/**/*.tsx'",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "migrate": "node-pg-migrate up",
    "migrate:create": "node-pg-migrate create"
  }
}
```

**db-config.js (node-pg-migrate配置, 项目根目录):**
```javascript
// node-pg-migrate运行时自动加载此文件
// 必须使用CommonJS格式(node-pg-migrate要求)
module.exports = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};
```

### 9.8 开发顺序 (严格按此顺序实现)

**Phase 1 MVP - 按以下顺序逐步实现，每步完成后验证:**

1. 项目初始化 (npm init vite, 安装依赖)
2. 配置文件 (tsconfig, vite.config, tailwind, postcss, .env)
3. Docker Compose开发环境
4. 数据库迁移脚本 + shared/types.ts
5. Express基础框架 (index.ts, middleware, errorHandler, rateLimit)
6. Auth API (注册/登录/JWT + sessions会话管理)
7. 密码重置 API (forgot-password/reset-password + email service)
8. 前端: 登录/注册页 + 忘记密码页 + 重置密码页 + authStore + API客户端
9. Photo上传API + 文件存储 + 存储配额检查
10. Thumbnail Worker (sharp + ffmpeg for video)
11. Metadata Worker (exifr)
12. 前端: 首页照片时间线 + photoStore + 排序 + 批量操作
13. 前端: 照片详情页 (图片+视频播放)
14. 前端: 上传页
15. 前端: 收藏/归档/回收站功能
16. 基础文本搜索API + 前端搜索页
17. 一键安装脚本 (install.sh)
18. 健康检查端点 (/api/server/ping)
19. **Phase 1 验证: 注册→上传→浏览→搜索→详情→下载→删除→恢复 完整流程 + install.sh部署验证**

**Phase 2 AI功能 + 移动端:**

20. ML Service基础框架 (FastAPI + health)
21. OCR Service + Worker
22. CLIP Service + Worker
23. Face Service + Worker
24. 智能搜索API (OCR/语义/混合)
25. 前端: 搜索页多模式切换
26. 前端: 照片详情OCR文本
27. 前端: 探索页-人物浏览
28. Geocode Worker + 地图页
29. 回忆功能
30. 移动端上传API (mobile-upload + existing检查)
31. LivePhoto API (pair + video)
32. Flutter移动端: 项目初始化 + 登录 + 时间线浏览
33. Flutter移动端: 前台自动备份 + 选择性相册
34. Flutter移动端: 后台自动备份 (WorkManager/BGTask)
35. **Phase 2 验证: AI搜索完整流程 + 移动端自动备份验证**

**Phase 3 社交与管理:**

36. 相册CRUD API + 前端
37. 共享相册 + 公开分享
38. 标签系统
39. 伙伴共享
40. Admin: 用户管理 + 任务队列
41. AI处理进度追踪
42. 外部库API + Library Scan Worker
43. 照片堆叠自动检测 (连拍/RAW+JPEG)
44. 照片编辑 (sharp裁剪/旋转/滤镜 + photo_versions)
45. 批量下载 (archiver ZIP)
46. 幻灯片播放
47. Flutter移动端: 释放空间 + 相册同步
48. Flutter移动端: 离线浏览 + 只读模式
49. Prometheus Metrics端点 (/api/metrics)
50. **Phase 3 验证: 社交功能完整流程 + 移动端高级功能验证**

**Phase 4 部署与高级功能:**

51. 生产Dockerfile + Dockerfile.ml
52. docker-compose.yml (生产)
53. nginx.conf
54. deploy.sh (Ubuntu 22.04 ARM)
55. 升级脚本 (upgrade.sh)
56. 备份脚本 (backup.sh) + 恢复脚本 (restore.sh)
57. 卸载脚本 (uninstall.sh)
58. 数据导入 (Google Photos Takeout + immich导出)
59. XMP Sidecar支持
60. OAuth登录 (GitHub/Google)
61. API密钥管理
62. PWA (manifest.json + sw.js)
63. Grafana仪表盘JSON
64. **最终验证: 在Ubuntu 22.04 ARM上完整部署 + 移动端APP测试**

**Phase 5 商业化功能 (可选):**

65. 会话管理 (sessions表DDL + sessions API + SessionManagementPage)
66. 通知系统 (notifications表DDL + notification_settings表DDL + notifications API + NotificationPage + SSE推送)
67. 相册活动/评论 (activities表DDL + activities API + 相册详情页评论区)
68. 系统配置管理 (system_config表DDL + config API + Admin配置页)
69. 服务器信息 (server-info API + /api/server/ping健康检查 + 版本检查)
70. 订阅与计费 (subscription_plans/subscriptions/invoices表DDL + Stripe集成 + planLimits中间件 + PricingPage + SubscriptionPage)
71. 多租户 (tenants表DDL + tenantIsolation中间件 + AdminTenantsPage)
72. 白标/品牌 (tenant_branding表DDL + branding API + AdminBrandingPage + 前端品牌动态加载)
73. 邀请奖励 (invitations/invitation_uses表DDL + invitations API)
74. 反馈收集 (feedback表DDL + feedback API + FeedbackWidget + AdminFeedbackPage)
75. **Phase 5 验证: 订阅流程完整测试 + 多租户隔离验证 + 品牌定制预览**
```

**照片上传→AI处理完整链路 (核心数据流):**
```
用户上传照片
    │
    ▼
POST /api/photos/upload (multer接收)
    │
    ├─ 计算SHA-256 → 检查重复(file_hash) → 重复则跳过返回已有照片
    │
    ├─ 不重复: 移动文件到 {UPLOAD_DIR}/{userId}/{yyyy-MM}/{uuid}.{ext}
    │
    ├─ INSERT INTO photos (processing_status='pending')
    │
    └─ 添加 BullMQ Job: thumbnail-generation { photoId, filePath }
         │
         ▼
    [thumbnail-generation Worker]
    ├─ image: sharp(filePath).resize(800).webp() → {THUMBNAIL_DIR}/.../{uuid}.webp
    ├─ video: ffmpeg -i filePath -vframes 1 -f image2pipe → sharp().resize(800).webp()
    ├─ UPDATE photos SET thumbnail_path, processing_status='metadata'
    └─ 添加 BullMQ Job: metadata-extraction { photoId, filePath }
         │
         ▼
    [metadata-extraction Worker]
    ├─ image: exifr.parse(filePath) → width, height, takenAt, latitude, longitude, camera, lens
    ├─ video: ffprobe(filePath) → width, height, duration, codec
    ├─ UPDATE photos SET width, height, taken_at, latitude, longitude, duration, processing_status='ocr'
    ├─ 添加 BullMQ Job: geocoding { photoId } (如果有GPS坐标)
    └─ 添加 BullMQ Job: ocr-processing { photoId, filePath } (仅image)
         │
         ▼
    [geocoding Worker] (并行)
    ├─ 查询本地GeoJSON数据库: 反向地理编码(lat,lng) → locationName
    └─ UPDATE photos SET location_name, processing_status保持不变
         │
    [ocr-processing Worker] (并行)
    ├─ 调用ML Service: POST /api/ml/ocr { image_path, languages }
    ├─ UPDATE photos SET ocr_text, processing_status='clip'
    └─ 添加 BullMQ Job: clip-embedding { photoId, filePath } (仅image)
         │
         ▼
    [clip-embedding Worker]
    ├─ 调用ML Service: POST /api/ml/clip/embed-image { image_path }
    ├─ UPDATE photos SET clip_embedding=vector(640), processing_status='face'
    ├─ 添加 BullMQ Job: face-detection { photoId, filePath } (仅image)
    └─ 添加 BullMQ Job: smart-album-classify { photoId } (分类)
         │
         ▼
    [face-detection Worker]
    ├─ 调用ML Service: POST /api/ml/face/detect { image_path }
    ├─ INSERT INTO faces (person_id=null, photo_id, x1, y1, x2, y2, embedding)
    ├─ 如果检测到人脸: 添加 BullMQ Job: face-cluster { faceIds[] }
    └─ UPDATE photos SET processing_status='completed'
         │
         ▼
    [face-cluster Worker] (异步)
    ├─ 调用ML Service: POST /api/ml/face/cluster { face_ids }
    ├─ 更新 faces.person_id (按聚类结果)
    └─ INSERT/UPDATE persons (name=null, face_count)
         │
    [smart-album-classify Worker] (异步)
    ├─ 获取照片CLIP向量
    ├─ 与所有智能相册center_vector计算余弦相似度
    ├─ 相似度 > 阈值: INSERT INTO smart_album_photos
    └─ 更新 smart_albums.photo_count
         │
         ▼
    全部完成 → publishSSE(userId, 'processing-complete', { photoId })
```

**每步开发的依赖关系和交付物:**

| 步骤 | 依赖 | 交付物 | 验证方式 |
|------|------|--------|---------|
| 1.项目初始化 | 无 | package.json, node_modules | npm run dev不报错 |
| 2.配置文件 | 1 | tsconfig, vite.config, tailwind, .env | tsc --noEmit通过 |
| 3.Docker开发环境 | 2 | docker-compose.dev.yml | docker compose up -d成功, PG可连接 |
| 4.数据库迁移+类型 | 3 | migrations/001_init.sql, shared/types.ts | 迁移执行成功, 表已创建 |
| 5.Express基础框架 | 4 | api/index.ts, middleware/, errorHandler | curl /api/server/ping返回pong |
| 6.Auth API | 5 | api/routes/auth.ts | 注册/登录/JWT验证通过 |
| 7.密码重置 | 6 | forgot-password, email service | 发送邮件成功 |
| 8.前端登录注册 | 6 | LoginPage, RegisterPage, authStore | 登录→跳转首页 |
| 9.Photo上传API | 5,6 | api/routes/photos.ts (upload) | curl上传文件成功 |
| 10.Thumbnail Worker | 9 | thumbnail.worker.ts | 上传后缩略图生成 |
| 11.Metadata Worker | 10 | metadata.worker.ts | EXIF数据写入DB |
| 12.前端首页时间线 | 8,10 | HomePage, photoStore | 照片网格展示 |
| 13.照片详情页 | 12 | PhotoDetailPage | 点击照片→详情 |
| 14.上传页 | 9,12 | UploadPage | 拖拽上传→看到照片 |
| 15.收藏/归档/回收站 | 12 | FavoritesPage, ArchivePage, TrashPage | 操作正确 |
| 16.文本搜索 | 5 | search API + SearchPage | 搜索返回结果 |
| 17.安装脚本 | 3 | install.sh | 一键安装成功 |
| 18.健康检查 | 5 | /api/server/ping | 返回pong |
| 19.Phase1验证 | 1-18 | 完整MVP | 注册→上传→浏览→搜索→删除 |
| 20.ML Service | 3 | ml/main.py (FastAPI) | curl /api/ml/health返回200 |
| 21.OCR | 20 | ocr.worker.ts | 上传后OCR文本写入 |
| 22.CLIP | 20 | clip.worker.ts | 上传后向量写入 |
| 23.Face | 20 | face.worker.ts | 上传后人脸写入 |
| 24.智能搜索 | 21,22 | search API多模式 | 语义搜索返回结果 |
| 25-35.Phase2 | 依赖前序步骤 | AI+移动端 | AI搜索+移动端备份 |

---

## 10. Mobile App Build & Distribution

### 10.1 Flutter项目配置 (mobile/)

#### 项目初始化
```bash
flutter create --org com.aialbum --project-name ai_album_mobile mobile/
cd mobile/
flutter pub add riverpod flutter_riverpod dio hive isar hive_flutter isar_flutter_libs
flutter pub add workmanager flutter_local_notifications path_provider image_picker
flutter pub add permission_handler package_info_plus device_info_plus
flutter pub add cached_network_image photo_manager video_player
flutter pub add flutter_map latlong2 geolocator
flutter pub add flutter_secure_storage flutter_inappwebview
```

#### 10.1.1 Android构建配置 (mobile/android/key.properties)
```properties
# key.properties (通过环境变量注入，不提交到仓库)
storeFile=../keystore/release.keystore
storePassword=${ANDROID_KEYSTORE_PASSWORD}
keyAlias=upload
keyPassword=${ANDROID_KEY_PASSWORD}
```

```gradle
// mobile/android/app/build.gradle 关键配置
android {
  compileSdkVersion 34
  defaultConfig {
    minSdkVersion 24
    targetSdkVersion 34
    versionCode 1
    versionName "1.0.0"
  }
  signingConfigs {
    release {
      storeFile file(System.getenv('ANDROID_KEYSTORE_FILE') ?: '../keystore/release.keystore')
      storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
      keyAlias 'upload'
      keyPassword System.getenv('ANDROID_KEY_PASSWORD')
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
  }
}
```

#### 10.1.2 iOS构建配置
```bash
# 1. 创建证书
#    Apple Developer → Certificates → iOS Distribution
#    Apple Developer → Identifiers → App ID (com.aialbum.mobile)
#    Apple Developer → Profiles → App Store Distribution
#
# 2. Xcode项目配置
#    mobile/ios/Runner.xcodeproj → Signing & Capabilities
#    Team: 选择Apple Developer Team
#    Bundle Identifier: com.aialbum.mobile

# 3. CI/CD构建命令
flutter build ios --release --no-codesign              # 本地测试
flutter build ios --release --export-method app-store   # App Store提交
flutter build ipa --export-method app-store             # 生成IPA
```

#### 10.1.3 Flutter构建命令汇总

| 命令 | 用途 | 输出 |
|------|------|------|
| `flutter build apk --release` | Android APK | build/app/outputs/apk/release/app-release.apk |
| `flutter build appbundle --release` | Android AAB(Play Store) | build/app/outputs/bundle/release/app-release.aab |
| `flutter build ios --release` | iOS本地测试 | build/ios/iphoneos/Runner.app |
| `flutter build ipa` | iOS发布到App Store | build/ios/ipa/*.ipa |
| `flutter build web --release` | Web PWA | build/web/ |

#### 10.1.4 版本号管理

```yaml
# mobile/pubspec.yaml
version: 1.0.0+1  # {major}.{minor}.{patch}+{buildNumber}
```

```bash
# CI/CD脚本中自动递增
# 从git tag获取版本号: git describe --tags --abbrev=0
# buildNumber从CI环境变量获取: CI_PIPELINE_ID
```

#### 10.1.5 应用商店发布清单

| 步骤 | 平台 | 说明 |
|------|------|------|
| 1.创建开发者账号 | Google Play / Apple | 注册并支付年费 |
| 2.应用信息 | 两者 | 应用名称/描述/类别/关键词 |
| 3.图标 | 两者 | 1024x1024 PNG (通过flutter_launcher_icons生成) |
| 4.截图 | 两者 | 不同设备尺寸的应用截图(4-8张) |
| 5.隐私政策URL | 两者 | https://yourdomain.com/privacy |
| 6.内容分级 | Google Play | 填写内容分级问卷 |
| 7.定价 | 两者 | 免费应用 |
| 8.上传构建 | 两者 | Google Play Console / App Store Connect |
| 9.审核 | 两者 | Google数小时 / Apple 1-2天 |

### 10.2 图片优化与响应式交付

> 相册应用的核心是图片展示，优化策略直接影响用户体验和带宽成本。

#### 10.2.1 缩略图多尺寸策略

| 尺寸 | 命名 | 用途 | 宽度 | 质量 |
|------|------|------|------|------|
| Thumb-S | `{hash}_thumb_s.webp` | 网格列表缩略图 | 300px | 75% |
| Thumb-M | `{hash}_thumb_m.webp` | 照片详情预览 | 800px | 80% |
| Thumb-L | `{hash}_thumb_l.webp` | 全屏查看 | 1920px | 85% |
| Blurhash | `blurhash` 字段 | 加载占位符 | - | Blurhash字符串(20-30字符) |

```typescript
// Thumbnail Worker 生成多尺寸缩略图:
// sharp(inputPath)
//   .resize(300).webp({ quality: 75 }).toFile(`${hash}_thumb_s.webp`)
//   .resize(800).webp({ quality: 80 }).toFile(`${hash}_thumb_m.webp`)
//   .resize(1920).webp({ quality: 85 }).toFile(`${hash}_thumb_l.webp`)
//
// 同时生成Blurhash:
// import { encode } from 'blurhash';
// const blurhash = encode(pixels, width, height, 4, 4);
// UPDATE photos SET blurhash = $1 WHERE id = $2
```

#### 10.2.2 前端响应式图片

```tsx
// PhotoCard.tsx - 响应式图片加载
function PhotoCard({ photo }: { photo: Photo }) {
  const isMobile = useMedia('(max-width: 768px)');
  const thumbSize = isMobile ? 'thumb_s' : 'thumb_m';
  
  return (
    <div className="photo-card">
      {/* Blurhash占位符 */}
      {photo.blurhash && !loaded && (
        <BlurhashCanvas hash={photo.blurhash} width={300} height={200} />
      )}
      {/* 渐进式加载: 先Thumb-S再Thumb-M */}
      <img
        src={`/thumbnails/${photo.id}_${thumbSize}.webp`}
        srcSet={`
          /thumbnails/${photo.id}_thumb_s.webp 300w,
          /thumbnails/${photo.id}_thumb_m.webp 800w,
          /thumbnails/${photo.id}_thumb_l.webp 1920w
        `}
        sizes="(max-width: 640px) 300px, (max-width: 1024px) 800px, 1920px"
        loading="lazy"
        decoding="async"
        alt={photo.originalName}
        className="photo-thumb"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
```

#### 10.2.3 视频缩略图

```typescript
// Video thumbnail: ffmpeg -i input.mp4 -ss 00:00:01 -vframes 1 -vf scale=300:-1 thumb.jpg
// sharp(thumbPath)
//   .resize(300).webp({ quality: 75 }).toFile(`${hash}_thumb_s.webp`)
```

### 10.3 ARIA无障碍访问规范

> 商业化产品必须满足WCAG 2.1 AA级标准。

```tsx
// 3.2.1 全局ARIA规范

// 1. Skip Link (页面顶部，移到主要内容): 
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white">
  {t('a11y.skipToContent')}
</a>

// 2. 所有交互元素必须有可聚焦性和键盘操作支持:
//    <button> 默认支持Enter和Space
//    <a href> 默认支持Enter
//    自定义交互元素: role="button" + tabIndex={0} + onKeyDown处理Enter/Space

// 3. 图片必须有alt文本:
<img alt={photo.originalName || t('photos.untitledPhoto')} ... />
// 纯装饰图片: alt="" 或 role="presentation"

// 4. 表单可访问性:
<label htmlFor="email">{t('auth.email')}</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-describedby="email-error"
  aria-invalid={!!emailError}
  autoComplete="email"
/>
{emailError && <span id="email-error" role="alert" className="text-red-500">{emailError}</span>}

// 5. 模态框聚焦陷阱:
function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();           // 焦点进入模态框
      document.body.style.overflow = 'hidden'; // 禁止背景滚动
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      {/* 焦点循环: Tab聚焦最后一个元素时跳回第一个 */}
      {children}
    </div>
  );
}

// 6. 通知/Toast的ARIA:
<div role="status" aria-live="polite" className="toast">
  {message}
</div>
// 重要告警: aria-live="assertive"

// 7. 搜索框ARIA:
<input
  type="search"
  role="searchbox"
  aria-label={t('search.placeholder')}
  aria-autocomplete="list"
  aria-controls="search-suggestions"
/>

// 8. 加载状态ARIA:
<div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={t('common.loading')}>
  <div className="progress-bar" style={{ width: `${progress}%` }} />
</div>

// 9. 颜色对比度 (Tailwind默认):
// WCAG AA要求: 正文4.5:1, 大文本3:1
// text-gray-900 on white = 16.7:1 ✓
// text-gray-500 on white = 3.7:1 ✗ → 使用text-gray-600 (5.7:1)
// 错误红色: text-red-600 替代 text-red-500

// 10. 焦点样式:
// 不要移除outline: outline-none → 改为 ring-2 ring-blue-500
// 所有交互元素必须有可见焦点指示器
```

**翻译键补充 (zh.json a11y分组):**
```json
{
  "a11y": {
    "skipToContent": "跳转到主要内容",
    "untitledPhoto": "未命名照片",
    "photoThumbnail": "{{name}}的缩略图",
    "closeModal": "关闭对话框",
    "previousPhoto": "上一张照片",
    "nextPhoto": "下一张照片",
    "menu": "菜单",
    "userMenu": "用户菜单",
    "notificationBadge": "{{count}}条新通知",
    "sortBy": "排序方式",
    "viewAs": "显示方式",
    "gridView": "网格视图",
    "listView": "列表视图"
  }
}
```

### 10.4 SEO与营销页面

#### 10.4.1 营销首页HTML模板 (public/index.html)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- Primary Meta -->
  <title>AI Album — 你的智能相册</title>
  <meta name="title" content="AI Album — AI驱动的智能相册管理平台" />
  <meta name="description" content="AI Album 是一个AI驱动的智能相册，支持手机自动备份、AI人脸识别、OCR文字搜索、语义检索，数据完全存储在你的服务器上，隐私安全有保障。" />
  <meta name="keywords" content="AI相册,智能相册,照片备份,人脸识别,OCR,语义搜索,自托管相册,照片管理,隐私相册" />
  <meta name="author" content="AI Album" />
  <meta name="robots" content="index, follow" />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ai-album.com/" />
  <meta property="og:title" content="AI Album — 你的智能相册" />
  <meta property="og:description" content="AI驱动的智能相册，数据私有，安全可控。" />
  <meta property="og:image" content="https://ai-album.com/og-image.png" />
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="https://ai-album.com/" />
  <meta property="twitter:title" content="AI Album — 你的智能相册" />
  <meta property="twitter:description" content="AI驱动的智能相册，数据私有，安全可控。" />
  <meta property="twitter:image" content="https://ai-album.com/og-image.png" />
  
  <!-- PWA -->
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#2563eb" />
  
  <!-- Structured Data (JSON-LD) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI Album",
    "applicationCategory": "PhotographyApplication",
    "operatingSystem": "Web, Android, iOS",
    "description": "AI驱动的智能相册管理平台",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "CNY"
    }
  }
  </script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

#### 10.4.2 Sitemap和robots.txt (public/)

```txt
# public/robots.txt
User-agent: *
Allow: /
Sitemap: https://ai-album.com/sitemap.xml
Disallow: /api/
Disallow: /admin/
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- public/sitemap.xml -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ai-album.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ai-album.com/welcome</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://ai-album.com/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://ai-album.com/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
```

### 10.5 Docker Compose 开发环境 (docker-compose.dev.yml)

```yaml
# docker-compose.dev.yml — 本地开发使用
# 启动: docker compose -f docker-compose.dev.yml up -d
version: '3.9'

services:
  postgres-dev:
    image: pgvector/pgvector:pg15
    container_name: ai-album-dev-postgres
    environment:
      POSTGRES_USER: aialbum
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: aialbum
    ports:
      - "5432:5432"
    volumes:
      - pgdata-dev:/var/lib/postgresql/data
    
  valkey-dev:
    image: valkey/valkey:9
    container_name: ai-album-dev-valkey
    ports:
      - "6379:6379"
    command: valkey-server --save "" --appendonly no

volumes:
  pgdata-dev:
```