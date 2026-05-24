
# AI相册APP 技术架构文档

## 1. Architecture Design

参考immich的架构设计，采用客户端-服务器模式，将AI处理和ML推理分离为独立服务。

```mermaid
graph TB
    subgraph "Clients"
        WebApp[Web App<br/>React 18 + TypeScript]
        MobileApp[Mobile App<br/>Flutter Dart]
        CLI[CLI Tool<br/>Node.js]
    end

    subgraph "Server - API"
        API[Express API Server<br/>REST Endpoints]
        Auth[JWT + OAuth Auth]
    end

    subgraph "Server - Microservices"
        ThumbWorker[Thumbnail Worker]
        MetadataWorker[Metadata Worker]
        GeocodeWorker[Geocode Worker]
    end

    subgraph "ML Service - Python"
        FastAPI[FastAPI Server]
        OCRModel[OCR Engine<br/>PaddleOCR]
        CLIPModel[CLIP Model<br/>ONNX Runtime]
        FaceModel[Face Detection<br/>InsightFace / SCRFD]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL 15<br/>+ pgvector)]
        Redis[(Valkey/Redis 7<br/>BullMQ Queue)]
        FS[Local File Storage<br/>uploads/]
    end

    WebApp --> API
    MobileApp --> API
    CLI --> API
    API --> Auth
    API --> PG
    API --> FS
    API --> Redis
    Redis --> ThumbWorker
    Redis --> MetadataWorker
    Redis --> GeocodeWorker
    ThumbWorker --> FS
    MetadataWorker --> FastAPI
    GeocodeWorker --> PG
    FastAPI --> OCRModel
    FastAPI --> CLIPModel
    FastAPI --> FaceModel
    ThumbWorker --> PG
    MetadataWorker --> PG
```

## 2. Technology Description

参考immich的架构，将服务拆分为API服务器、微服务Worker和ML服务三个独立容器。

| 层级 | 技术 | 说明 |
|------|------|------|
| **Frontend** | React@18 + TypeScript + tailwindcss@3 + vite + react-router-dom@6 + zustand | Web前端 |
| **API Server** | Express@4 + TypeScript (ESM) | REST API，处理业务逻辑 |
| **Microservices** | Express@4 + TypeScript (同代码库，不同入口) | 后台任务Worker |
| **ML Service** | Python 3.11 + FastAPI + ONNX Runtime | AI推理服务，独立容器 |
| **Database** | PostgreSQL 15 + pgvector | 数据持久化 + 向量搜索 |
| **Queue** | Valkey 9 (Redis兼容) + BullMQ | 任务队列管理 |
| **File Storage** | 本地文件系统 | 原始文件 + 缩略图 |
| **Image Processing** | sharp | 缩略图生成、格式转换 |
| **OCR** | PaddleOCR (Python, ONNX) | 中英文OCR识别 |
| **CLIP** | XLM-Roberta-Large-Vit-B-16Plus (多语言CLIP, ONNX Runtime) | 图像语义嵌入 |
| **Face Detection** | InsightFace SCRFD (ONNX Runtime) | 人脸检测与嵌入 |
| **Map** | Leaflet + OpenStreetMap | 地图展示 |
| **Geocoding** | GeoNames离线数据库 | 反向地理编码 |
| **Email** | Nodemailer + SMTP | 密码重置邮件发送 |

### 2.1 与immich架构对比

| 方面 | immich | AI Album | 说明 |
|------|--------|----------|------|
| Web框架 | SvelteKit | React 18 + Vite | 保持React生态 |
| Server框架 | NestJS | Express 4 | 轻量级，易于上手 |
| ML服务 | Python + FastAPI | Python + FastAPI | 相同方案 |
| 搜索引擎 | Typesense | pgvector | 减少组件依赖，pgvector已满足需求 |
| 数据库 | PostgreSQL + TypeORM | PostgreSQL + pg | 相同数据库 |
| 队列 | Redis + BullMQ | Valkey + BullMQ | Valkey是Redis的开源替代 |
| 移动端 | Flutter | Flutter (Dart) | 相同方案，Phase 2实现 |
| 认证方式 | Cookie + API Key + Bearer | Bearer Token + API Key | 我们简化了认证方式 |

### 2.2 移动端架构

```
┌─────────────────────────────────────────────┐
│              Flutter Mobile App              │
├─────────────────────────────────────────────┤
│  UI Layer (Pages/Widgets)                    │
│  ├── LoginPage / OnboardingPage              │
│  ├── HomePage (时间线+搜索+回忆)              │
│  ├── ExplorePage (人物/地点/标签)             │
│  ├── PhotoDetailPage (大图+EXIF+人脸)        │
│  ├── MapPage (地图浏览)                       │
│  ├── SearchPage (智能搜索)                    │
│  ├── BackupPage (备份管理+进度)               │
│  └── SettingsPage (设置+只读模式)             │
├─────────────────────────────────────────────┤
│  State Management (Riverpod)                 │
│  ├── AuthProvider (认证状态)                  │
│  ├── PhotoProvider (照片数据)                 │
│  ├── BackupProvider (备份状态+进度)           │
│  ├── AlbumProvider (相册数据)                 │
│  └── SettingsProvider (设置+只读模式)         │
├─────────────────────────────────────────────┤
│  Service Layer                               │
│  ├── ApiService (Dio HTTP客户端)             │
│  ├── BackupService (前台/后台备份)            │
│  ├── AlbumSyncService (相册同步)              │
│  ├── CacheService (离线缓存管理)             │
│  └── LocalStorageService (Hive/Isar)         │
├─────────────────────────────────────────────┤
│  Platform Layer                              │
│  ├── PhotoManager (设备相册访问)              │
│  ├── BackgroundWorker (WorkManager/BGTask)   │
│  ├── FileManager (本地文件操作)               │
│  └── NotificationManager (推送通知)           │
└─────────────────────────────────────────────┘
         │
         ▼
   REST API (Bearer Token)
```

**移动端关键技术决策：**
- **Flutter**: 跨平台(Android+iOS)一套代码，参考immich移动端
- **Riverpod**: 类型安全的状态管理，编译时检查
- **Dio**: 拦截器模式，自动添加Bearer Token和错误处理
- **WorkManager/BGTaskScheduler**: 平台原生后台任务调度
- **Hive**: 轻量级键值存储(设置/认证信息)
- **Isar**: 高性能本地数据库(照片索引/离线数据)
- **cached_network_image**: 缩略图缓存和离线浏览

## 3. Route Definitions
| Route | Purpose |
|-------|---------|
| /login | 登录页面 |
| /register | 注册页面 |
| /forgot-password | 忘记密码页面 |
| /reset-password | 重置密码页面 |
| /onboarding | 新用户引导页(3步引导) |
| / | 首页 - 照片时间线 + 搜索 + 回忆 |
| /explore | 探索页 - 人物/地点/标签 |
| /album | 相册页 - 个人/共享/文件夹 |
| /album/:id | 相册详情页 |
| /map | 地图页 |
| /photo/:id | 照片详情页 |
| /upload | 上传页面 |
| /search | 搜索页面 |
| /favorites | 收藏页 |
| /archive | 归档页 |
| /sharing | 分享管理页 |
| /trash | 回收站页 |
| /admin | 管理页（仅Admin） |
| /settings | 设置页面 |
| /share/:token | 公开分享访问页（无需登录） |
| /smart-albums | 智能相册页 - AI自动分类浏览 |
| /smart-albums/:id | 智能相册详情页 |
| /year-in-review | 年度回顾页 |
| /year-in-review/:year | 指定年份回顾页 |
| /duplicates | 重复检测管理页 |
| /shared-libraries | 共享图库页 |
| /activity-logs | 活动日志页 |
| /setup | 首次启动配置向导(仅未配置时显示) |

## 4. API Definitions

### 4.1 Types

注意：以下接口定义是API完整响应模型（包含关联数据），shared/types.ts是前后端共享的基础数据模型（不含关联数组，关联数据通过单独API获取）。

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  avatarPath: string | null;
  storageQuota: number | null;
  storageUsed: number;
  locale: 'zh' | 'en';
  otpSecret: string | null;
  otpEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Photo {
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
  takenAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  ocrText: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  processingStatus: 'pending' | 'thumbnailing' | 'metadata' | 'ocr' | 'clip' | 'face' | 'completed' | 'failed';
  fileHash: string | null;
  deletedAt: Date | null;
  libraryId: string | null;
  livePhotoVideoId: string | null;
  deviceAssetId: string | null;
  deviceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// PhotoDetail - 详情接口(包含关联数据), 仅在 GET /api/photos/:id 时返回
interface PhotoDetail extends Photo {
  tags: Tag[];
  people: Person[];
  albums: AlbumSummary[];
  exif: ExifData | null;
}

// PhotoListItem - 列表接口(轻量), 在 GET /api/photos 列表查询时返回
interface PhotoListItem {
  id: string;
  originalName: string;
  thumbnailPath: string | null;
  mimeType: string;
  fileType: 'image' | 'video';
  width: number | null;
  height: number | null;
  takenAt: Date | null;
  isFavorite: boolean;
  isArchived: boolean;
  processingStatus: string;
}

interface Person {
  id: string;
  userId: string;
  name: string | null;
  featureFacePath: string | null;
  faceCount: number;
  isHidden: boolean;
  birthDate: Date | null;
  createdAt: Date;
}

interface Face {
  id: string;
  personId: string | null;
  photoId: string;
  boundingBox: { x1: number; y1: number; x2: number; y2: number };
  embedding: number[];
}

interface Album {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverPath: string | null;
  photoCount: number;
  startDate: Date | null;
  endDate: Date | null;
  isShared: boolean;
  sharedWith: SharedUser[];
  createdAt: Date;
  updatedAt: Date;
}

interface Tag {
  id: string;
  userId: string;
  name: string;
  photoCount: number;
  createdAt: Date;
}

interface ShareLink {
  id: string;
  albumId: string | null;
  photoId: string | null;
  token: string;
  expiresAt: Date | null;
  allowDownload: boolean;
  allowUpload: boolean;
  hasPassword: boolean;
  createdAt: Date;
}

interface PartnerSharing {
  id: string;
  sharedByUserId: string;
  sharedWithUserId: string;
  inTimeline: boolean;
  createdAt: Date;
}

interface SearchResult {
  photo: Photo;
  score: number;
  matchType: 'text' | 'ocr' | 'semantic' | 'face' | 'hybrid';
  highlights: { field: string; snippet: string }[];
}

interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  searchMode: 'smart' | 'text' | 'ocr' | 'semantic' | 'face' | 'hybrid';
  resultCount: number;
  createdAt: Date;
}

interface ProcessingStatus {
  photoId: string;
  stage: 'pending' | 'thumbnailing' | 'metadata' | 'ocr' | 'clip' | 'face' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

interface JobQueue {
  name: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  isPaused: boolean;
}

interface Stats {
  totalPhotos: number;
  totalVideos: number;
  monthlyNew: number;
  storageUsed: number;
  processingQueue: number;
  ocrCompleted: number;
  clipCompleted: number;
  faceCompleted: number;
}

interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsedAt: Date | null;
  createdAt: Date;
}

interface ExternalLibrary {
  id: string;
  userId: string;
  name: string;
  importPath: string;
  exclusionPatterns: string[];
  isWatched: boolean;
  lastScannedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Stack {
  id: string;
  userId: string;
  primaryPhotoId: string;
  photoIds: string[];
  createdAt: Date;
}

interface SmartAlbum {
  id: string;
  userId: string;
  name: string;
  categoryKey: string;
  centerVector: number[];
  threshold: number;
  photoCount: number;
  coverPath: string | null;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SharedLibrary {
  id: string;
  name: string;
  createdById: string;
  members: SharedLibraryMember[];
  rules: SharedLibraryRule[];
  photoCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SharedLibraryMember {
  id: string;
  libraryId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: Date;
}

interface SharedLibraryRule {
  type: 'person' | 'date_range' | 'location' | 'all';
  value: string;
}

interface DuplicateGroup {
  id: string;
  photos: Photo[];
  similarity: number;
  type: 'exact' | 'similar';
  recommendedKeepId: string;
}

interface YearInReview {
  id: string;
  userId: string;
  year: number;
  topPhotos: Photo[];
  topPersons: { person: Person; count: number }[];
  travelFootprint: { locationName: string; count: number; month: number }[];
  monthlyPicks: { month: number; photo: Photo }[];
  stats: { totalPhotos: number; totalVideos: number; storageUsed: number; topCamera: string; topLens: string };
  shareCardGenerated: boolean;
  createdAt: Date;
}

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

interface DataExportJob {
  id: string;
  userId: string;
  include: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl: string | null;
  createdAt: Date;
}
```

### 4.2 API Versioning Strategy

#### 4.2.1 版本化方案

采用 **URL Path版本化** (`/api/v1/...`)，原因：
- 对AI开发者最直观，URL即可识别版本
- 客户端实现简单，无需解析Header
- immich、Google Photos API等均采用此方案

```
当前版本: /api/v1/auth/register
未来版本: /api/v2/auth/register
```

#### 4.2.2 版本路由架构

```typescript
// api/index.ts
import v1Router from './routes/v1/index';

const app = express();
app.use('/api/v1', v1Router);

// 健康检查和Metrics不版本化(始终最新)
app.get('/api/server/ping', (_req, res) => res.send('pong'));
app.get('/api/metrics', metricsHandler);

// 版本发现端点
app.get('/api/versions', (_req, res) => {
  res.json({
    current: 'v1',
    supported: ['v1'],
    deprecated: [],
  });
});
```

```typescript
// api/routes/v1/index.ts
import { Router } from 'express';
import authRoutes from './auth';
import photoRoutes from './photos';

const router = Router();
router.use('/auth', authRoutes);
router.use('/photos', photoRoutes);
router.use('/search', searchRoutes);
router.use('/persons', personRoutes);
router.use('/tags', tagRoutes);
router.use('/albums', albumRoutes);
router.use('/share', shareRoutes);
router.use('/admin', adminRoutes);
router.use('/settings', settingsRoutes);
router.use('/events', eventsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/sessions', sessionRoutes);
router.use('/libraries', libraryRoutes);
router.use('/jobs', jobRoutes);
router.use('/server', serverRoutes);
export default router;
```

#### 4.2.3 版本迁移策略

| 场景 | 策略 | 时间线 |
|------|------|--------|
| 新增字段(非破坏性) | 在当前版本直接添加，旧客户端忽略新字段 | 即时 |
| 新增API端点 | 在当前版本直接添加 | 即时 |
| 重命名字段(破坏性) | 创建新版本路由，旧版本标记deprecated | 旧版本保留6个月 |
| 删除API端点 | 创建新版本不含该端点，旧版本标记deprecated | 旧版本保留6个月 |
| 修改响应结构 | 创建新版本 | 旧版本保留6个月 |

**Deprecated响应Header:**
```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 01 Jan 2027 00:00:00 GMT
Link: </api/v2/auth/register>; rel="successor-version"
```

#### 4.2.4 向后兼容规则

1. **新增字段**: 始终向后兼容，旧客户端忽略未知字段
2. **枚举扩展**: 新增枚举值向后兼容，客户端使用switch-default处理
3. **分页参数**: 统一使用 `?page=1&limit=20`，不随意更改参数名
4. **错误响应格式**: 统一 `{ error: { code: string, message: string, details?: unknown } }`，不随版本变化
5. **ID格式**: 始终使用UUID，不随版本变化

#### 4.2.5 当前阶段说明

> MVP阶段所有API使用 `/api/v1/` 前缀。本文档中其他章节的API路径简写为 `/api/...`，
> 实际实现时均需加上 `/v1` 前缀。例如 `POST /api/auth/register` 实际为 `POST /api/v1/auth/register`。

### 4.3 API Endpoints

#### Auth APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| POST | /api/auth/register | `{ email, password, name }` | `{ user, token }` | 用户注册 |
| POST | /api/auth/login | `{ email, password }` | `{ user, token }` | 用户登录 |
| GET | /api/auth/me | - | `{ user }` | 获取当前用户 |
| POST | /api/auth/change-password | `{ oldPassword, newPassword }` | `{ success }` | 修改密码 |
| POST | /api/auth/forgot-password | `{ email }` | `{ message }` | 请求密码重置 |
| POST | /api/auth/reset-password | `{ token, newPassword }` | `{ success }` | 重置密码 |
| POST | /api/auth/logout-all | - | `{ success }` | 退出所有设备(删除所有sessions) |
| GET | /api/auth/sessions | - | `{ sessions: Session[] }` | 查看当前活跃会话列表 |
| DELETE | /api/auth/sessions/:id | - | `{ success }` | 撤销指定会话(单设备登出) |
| GET | /api/auth/oauth/github | - | 302重定向到GitHub | GitHub OAuth授权(Phase 4) |
| GET | /api/auth/oauth/github/callback | `?code=xxx&state=xxx` | 302重定向到前端 | GitHub OAuth回调 |
| GET | /api/auth/oauth/google | - | 302重定向到Google | Google OAuth授权(Phase 4) |
| GET | /api/auth/oauth/google/callback | `?code=xxx&state=xxx` | 302重定向到前端 | Google OAuth回调 |

#### Photo APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/photos | `?page=1&limit=50&isFavorite&isArchived&takenAfter&takenBefore&sort=takenAt&order=desc` | `{ photos: PhotoListItem[], total, page, limit }` | 照片列表(轻量查询) |
| GET | /api/photos/:id | - | `{ photo: PhotoDetail }` | 照片详情(含tags/people/albums/exif) |
| POST | /api/photos/upload | `multipart/form-data` | `{ photos[] }` | 批量上传 |
| DELETE | /api/photos/:id | - | `{ success }` | 删除照片(移入回收站) |
| DELETE | /api/photos/:id/permanent | - | `{ success }` | 永久删除照片 |
| POST | /api/photos/:id/restore | - | `{ photo }` | 从回收站恢复 |
| PUT | /api/photos/:id/favorite | `{ isFavorite }` | `{ photo }` | 收藏/取消 |
| PUT | /api/photos/:id/archive | `{ isArchived }` | `{ photo }` | 归档/取消 |
| GET | /api/photos/:id/status | - | `ProcessingStatus` | 处理状态 |
| POST | /api/photos/:id/reprocess | `{ stages }` | `{ job }` | 重新处理 |
| GET | /api/photos/:id/download | - | `Binary` | 下载照片 |
| POST | /api/photos/batch | `{ photoIds[], action: 'favorite'|'archive'|'delete'|'add-to-album', albumId? }` | `{ success, count }` | 批量操作 |
| POST | /api/photos/batch-download | `{ photoIds[], size: 'original'|'thumbnail' }` | `Binary (ZIP)` | 批量下载ZIP |
| PUT | /api/photos/:id/edit | `{ operation, params }` | `{ photo }` | 照片编辑(裁剪/旋转/滤镜) |
| POST | /api/photos/:id/edit/undo | - | `{ photo }` | 撤销编辑(恢复上一版本) |

#### Photo Grouping APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/photos/grouped/date | `?year&month` | `{ groups[] }` | 按日期分组 |
| GET | /api/photos/favorites | `?page&limit` | `{ photos, total }` | 收藏列表 |
| GET | /api/photos/archived | `?page&limit` | `{ photos, total }` | 归档列表 |
| GET | /api/photos/trash | `?page&limit` | `{ photos, total }` | 回收站列表 |
| DELETE | /api/photos/trash/empty | - | `{ success, count }` | 清空回收站 |
| GET | /api/photos/memories | - | `{ memories[] }` | 回忆（X年前） |

#### Person APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/persons | `?page&limit` | `{ persons, total }` | 人物列表 |
| GET | /api/persons/:id | - | `{ person }` | 人物详情 |
| GET | /api/persons/:id/photos | `?page&limit` | `{ photos, total }` | 人物照片 |
| PUT | /api/persons/:id | `{ name, isHidden, birthDate }` | `{ person }` | 更新人物 |
| POST | /api/persons/merge | `{ sourceIds[], targetId }` | `{ person }` | 合并人物 |
| PUT | /api/persons/:id/feature-face | `{ faceId }` | `{ person }` | 设置特征照 |

#### Album APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/albums | `?shared` | `{ albums[] }` | 相册列表 |
| POST | /api/albums | `{ name, description }` | `{ album }` | 创建相册 |
| GET | /api/albums/:id | - | `{ album }` | 相册详情 |
| PUT | /api/albums/:id | `{ name, description, coverId }` | `{ album }` | 更新相册 |
| DELETE | /api/albums/:id | - | `{ success }` | 删除相册 |
| PUT | /api/albums/:id/photos | `{ photoIds[] }` | `{ album }` | 添加照片到相册 |
| DELETE | /api/albums/:id/photos | `{ photoIds[] }` | `{ album }` | 从相册移除照片 |
| PUT | /api/albums/:id/users | `{ userIds[] }` | `{ album }` | 添加协作者 |

#### Tag APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/tags | - | `{ tags[] }` | 标签列表 |
| POST | /api/tags | `{ name }` | `{ tag }` | 创建标签 |
| PUT | /api/photos/:id/tags | `{ tagIds[] }` | `{ photo }` | 给照片添加标签 |
| GET | /api/tags/:id/photos | `?page&limit` | `{ photos, total }` | 标签下的照片 |

#### Search APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/search | `?q&mode&limit&isFavorite&isArchived&takenAfter&takenBefore&personId&tagId` | `{ results, total, appliedMode }` | 智能搜索(mode默认smart) |
| GET | /api/search/suggest | `?q` | `{ suggestions[] }` | 搜索建议 |
| GET | /api/search/history | `?limit` | `{ history[] }` | 搜索历史 |
| DELETE | /api/search/history/:id | - | `{ success }` | 删除历史 |

#### Share APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| POST | /api/share-links | `{ albumId?, photoId?, expiresAt?, allowDownload?, allowUpload?, password? }` | `{ link }` | 创建分享 |
| GET | /api/share-links | - | `{ links[] }` | 我的分享列表 |
| DELETE | /api/share-links/:id | - | `{ success }` | 删除分享 |
| GET | /api/share/:token | `?password?` | `{ photos/album }` | 访问分享 |
| POST | /api/share/:token/upload | `multipart/form-data` | `{ photo }` | 分享链接上传(需allowUpload) |

#### Partner APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| POST | /api/partners | `{ partnerId }` | `{ partner }` | 添加伙伴 |
| GET | /api/partners | - | `{ partners[] }` | 伙伴列表 |
| DELETE | /api/partners/:id | - | `{ success }` | 移除伙伴 |
| PUT | /api/partners/:id | `{ inTimeline }` | `{ partner }` | 更新伙伴设置 |

#### Stack APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/stacks | `?page&limit` | `{ stacks[] }` | 堆叠列表 |
| GET | /api/stacks/:id | - | `{ stack }` | 堆叠详情 |
| DELETE | /api/stacks/:id | - | `{ success }` | 取消堆叠 |
| PUT | /api/stacks/:id/primary | `{ photoId }` | `{ stack }` | 设置主照片 |

#### Admin APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/admin/users | - | `{ users[] }` | 用户列表 |
| POST | /api/admin/users | `{ email, password, name, role }` | `{ user }` | 创建用户 |
| PUT | /api/admin/users/:id | `{ role, storageQuota }` | `{ user }` | 更新用户 |
| DELETE | /api/admin/users/:id | - | `{ success }` | 删除用户 |
| GET | /api/admin/jobs | - | `{ queues: JobQueue[] }` | 任务队列状态 |
| PUT | /api/admin/jobs/:name/pause | - | `{ success }` | 暂停队列 |
| PUT | /api/admin/jobs/:name/resume | - | `{ success }` | 恢复队列 |
| POST | /api/admin/jobs/:name/retry-failed | - | `{ success }` | 重试失败任务 |
| GET | /api/admin/config | - | `{ config }` | 系统配置 |
| PUT | /api/admin/config | `{ config }` | `{ config }` | 更新配置 |

#### External Library APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/libraries | - | `{ libraries[] }` | 外部库列表 |
| POST | /api/libraries | `{ name, importPath, exclusionPatterns }` | `{ library }` | 创建外部库 |
| PUT | /api/libraries/:id | `{ name, importPath, exclusionPatterns }` | `{ library }` | 更新外部库 |
| DELETE | /api/libraries/:id | - | `{ success }` | 删除外部库 |
| POST | /api/libraries/:id/scan | - | `{ job }` | 触发扫描 |

#### Data Import APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| POST | /api/import/upload | `multipart/form-data (ZIP)` | `{ jobId }` | 上传Takeout/immich ZIP |
| GET | /api/import/:jobId/status | - | `{ status, progress }` | 导入进度 |
| POST | /api/import/directory | `{ path, recursive }` | `{ job }` | 从目录导入照片 |

#### Stats & Settings APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/stats | - | `Stats` | 统计概览 |
| GET | /api/settings | - | `{ settings }` | 用户设置 |
| PUT | /api/settings | `{ settings }` | `{ settings }` | 更新设置 |
| DELETE | /api/settings/account | `{ password }` | `{ success }` | 删除账户及所有数据 |
| GET | /api/server/ping | - | `pong` | 健康检查 |
| POST | /api/api-keys | `{ name, permissions }` | `{ apiKey }` | 创建API密钥 |
| GET | /api/api-keys | - | `{ keys[] }` | API密钥列表 |
| DELETE | /api/api-keys/:id | - | `{ success }` | 删除API密钥 |

#### Real-time Events API (SSE)
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/events | - | `text/event-stream` | SSE实时事件推送(需认证) |

**SSE事件类型:**
```
event: processing-progress
data: { "photoId": "xxx", "stage": "ocr", "progress": 0.5 }

event: processing-complete
data: { "photoId": "xxx", "stage": "completed" }

event: processing-failed
data: { "photoId": "xxx", "stage": "clip", "error": "Model load failed" }
```

**SSE连接规范:**
- 需Bearer Token认证(通过URL参数`?token=xxx`或Header)
- 心跳: 每30秒发送`event: ping`
- 断线重连: 前端3秒自动重连，使用`Last-Event-ID`恢复
- 单用户最多1个SSE连接(新连接自动关闭旧连接)

**SSE跨进程通信方案:**
- Workers运行在server容器(PM2管理的worker进程)，SSE连接在server容器(api进程)
- 使用Redis Pub/Sub桥接(跨进程通信):
  - Workers完成/失败时: redis.publish('sse:notify', JSON.stringify({ userId, event, data }))
  - API Server启动时: redis.subscribe('sse:notify'), 收到消息后调用sendSSE()
  - 实现位置:
    - api/config/redis.ts: 导出publishSSE(userId, event, data)函数
    - api/index.ts: 启动时订阅sse:notify频道，调用sendSSE
    - Workers: 完成时调用publishSSE()而非直接调用sendSSE()

#### Mobile Backup APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| POST | /api/photos/mobile-upload | `multipart/form-data` | `{ photo }` | 移动端上传(含设备信息) |
| GET | /api/photos/existing | `?hashes=sha256_1,sha256_2` | `{ existing: string[] }` | 批量检查已存在照片(移动端去重) |
| GET | /api/photos/device-albums | - | `{ albums[] }` | 获取服务端相册列表(用于Album Sync) |
| POST | /api/photos/mobile-upload-batch | `multipart/form-data (多文件)` | `{ photos[], skippedDuplicates[] }` | 移动端批量上传 |

**移动端上传请求额外字段:**
- `deviceAssetId`: 设备端唯一ID (用于关联LivePhoto配对)
- `deviceId`: 设备标识
- `fileCreatedAt`: 设备端文件创建时间
- `livePhotoVideoId`: 关联的视频ID (LivePhoto配对)

#### LivePhoto APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/photos/:id/video | - | `video/mp4` | 获取LivePhoto的视频部分 |
| POST | /api/photos/live-photo-pair | `{ photoId, videoId }` | `{ photo }` | 配对LivePhoto的图片和视频 |

#### Monitoring APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/metrics | - | `text/plain` | Prometheus格式指标(需Admin) |
| GET | /api/server/info | - | `{ status, services, mlModels, storage }` | 详细健康状态(需Admin) |

#### Smart Album APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/smart-albums | - | `{ albums[] }` | 智能相册列表 |
| GET | /api/smart-albums/:id | - | `{ album }` | 智能相册详情 |
| GET | /api/smart-albums/:id/photos | `?page&limit` | `{ photos, total }` | 智能相册照片 |
| POST | /api/smart-albums/custom | `{ name, samplePhotoIds[] }` | `{ album }` | 创建自定义智能相册(提供样本照片) |
| PUT | /api/smart-albums/:id/recalculate | - | `{ album }` | 重新计算分类 |
| PUT | /api/smart-albums/:id/threshold | `{ threshold }` | `{ album }` | 调整分类阈值 |
| POST | /api/smart-albums/classify | `{ photoId }` | `{ classifications[] }` | 手动触发照片分类 |

#### Year in Review APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/year-in-review | - | `{ reviews[] }` | 年度回顾列表 |
| GET | /api/year-in-review/:year | - | `YearInReview` | 指定年份回顾详情 |
| POST | /api/year-in-review/:year/generate | - | `{ review }` | 手动生成年度回顾 |
| POST | /api/year-in-review/:year/share-card | `{ template }` | `{ imageUrl }` | 生成分享卡片 |
| PUT | /api/year-in-review/:year/exclusions | `{ personIds[], dateRanges[] }` | `{ review }` | 设置排除项 |

#### Duplicate Detection APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/duplicates | `?type=exact|similar&page&limit` | `{ groups: DuplicateGroup[], total }` | 重复照片分组列表 |
| POST | /api/duplicates/scan | - | `{ jobId }` | 触发重复检测扫描 |
| GET | /api/duplicates/scan/status | - | `{ status, progress }` | 扫描进度 |
| POST | /api/duplicates/resolve | `{ groupId, keepId, action: 'delete_others' }` | `{ success }` | 解决重复(保留指定照片) |
| POST | /api/duplicates/resolve-batch | `{ resolutions[] }` | `{ success, count }` | 批量解决重复 |

#### Shared Library APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/shared-libraries | - | `{ libraries[] }` | 共享图库列表 |
| POST | /api/shared-libraries | `{ name }` | `{ library }` | 创建共享图库 |
| GET | /api/shared-libraries/:id | - | `{ library }` | 共享图库详情 |
| PUT | /api/shared-libraries/:id | `{ name }` | `{ library }` | 更新共享图库 |
| DELETE | /api/shared-libraries/:id | - | `{ success }` | 删除共享图库 |
| POST | /api/shared-libraries/:id/members | `{ userId }` | `{ member }` | 邀请成员 |
| DELETE | /api/shared-libraries/:id/members/:userId | - | `{ success }` | 移除成员 |
| PUT | /api/shared-libraries/:id/rules | `{ rules[] }` | `{ library }` | 更新共享规则 |
| GET | /api/shared-libraries/:id/photos | `?page&limit` | `{ photos, total }` | 共享图库照片 |
| POST | /api/shared-libraries/:id/sync | - | `{ job }` | 触发规则同步 |

#### Activity Log APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/activity-logs | `?userId&action&resource&startDate&endDate&page&limit` | `{ logs[], total }` | 活动日志列表 |
| GET | /api/activity-logs/me | `?action&startDate&endDate&page&limit` | `{ logs[], total }` | 我的操作日志 |

#### 2FA APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| POST | /api/auth/2fa/enable | - | `{ secret, qrCodeUrl, recoveryCodes[] }` | 启用2FA(返回TOTP密钥和恢复码) |
| POST | /api/auth/2fa/verify | `{ code }` | `{ success }` | 验证2FA码(启用时验证) |
| POST | /api/auth/2fa/disable | `{ password }` | `{ success }` | 禁用2FA(需密码确认) |
| POST | /api/auth/login/2fa | `{ email, password, code }` | `{ user, token }` | 2FA登录验证 |

#### Data Export APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| POST | /api/data-export | `{ include: ['photos','albums','tags','persons'] }` | `{ jobId }` | 请求导出个人数据 |
| GET | /api/data-export/status | - | `{ status, progress, downloadUrl? }` | 导出进度 |
| GET | /api/data-export/download | - | `Binary (ZIP)` | 下载导出文件 |

#### Setup Wizard APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/setup/status | - | `{ isSetup }` | 检查是否已完成初始配置 |
| POST | /api/setup/admin | `{ email, password, name }` | `{ user, token }` | 创建管理员(仅未配置时) |
| PUT | /api/setup/storage | `{ uploadLocation, thumbnailLocation }` | `{ success }` | 配置存储路径 |
| PUT | /api/setup/smtp | `{ host, port, user, pass, from }` | `{ success }` | 配置SMTP(可选) |
| GET | /api/setup/ml-status | - | `{ models: { ocr, clip, face }, progress }` | ML模型下载状态 |

#### Version Check APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/admin/version | - | `{ current, latest, changelog, updateAvailable }` | 检查版本更新(需Admin) |

#### P2 Feature APIs (Phase 4实现)

##### Pick Score APIs (精选照片)
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/photos/picks | `?limit=20&albumId&personId` | `{ photos[] }` | 获取精选照片列表 |
| POST | /api/photos/:id/pick-score | - | `{ pickScore, details }` | 手动触发精选评分 |
| POST | /api/photos/batch-pick-score | `{ albumId?, force? }` | `{ queued }` | 批量精选评分 |

**精选评分算法:**
- 清晰度评分: 使用Laplacian方差(cv2.Laplacian(gray, cv2.CV_64F).var(), 归一化到0-1)
- 构图评分: 使用三分法规则(Canny边缘检测+三分线区域权重)
- 表情评分: 基于人脸数量和表情关键点(无人脸时=0.5)
- 综合评分: `pickScore = clarity * 0.4 + composition * 0.3 + expression * 0.3`
- 存储位置: photos表 `pick_score FLOAT` 字段(0-1)
- 触发时机: 用户手动触发或批量评分

##### XMP Sidecar APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| POST | /api/photos/:id/xmp | - | `{ updated: { rating, description, tags, gps } }` | 解析并导入XMP元数据 |
| POST | /api/photos/batch-xmp-import | - | `{ queued }` | 批量XMP导入 |

**XMP解析实现:**
- 使用fast-xml-parser解析XMP文件
- 支持的字段: `dc:subject`(标签), `xmp:Rating`(评分1-5), `dc:description`(描述), `exif:GPSLatitude/Longitude`(GPS), `xmp:CreateDate`(拍摄时间), `tiff:Orientation`(方向)
- XMP文件查找规则: 与图片同目录，`{uuid}.xmp` 或 `{original_name}.xmp`
- 触发时机: 用户手动触发或批量导入
- 解析结果: 标签→自动创建tag并关联, 评分→存入photos表`rating INT`, 描述→存入photos表`description TEXT`

##### immich Migration APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/migration/immich/status | - | `{ status, progress, totalPhotos, migratedPhotos, errors }` | 迁移进度 |
| POST | /api/migration/immich/start | `{ pgHost, pgPort, pgDatabase, pgUser, pgPassword, uploadPath, mode }` | `{ migrationId }` | 启动immich迁移(需Admin) |
| GET | /api/migration/immich/preview | `{ pgHost, pgPort, pgDatabase, pgUser, pgPassword }` | `{ photoCount, videoCount, albumCount, personCount, userCount, estimatedSize }` | 预览迁移数据量 |

**immich迁移实现:**
- 迁移脚本: `scripts/migrate-from-immich.ts`
- 数据源: 直接读取immich的PostgreSQL数据库
- 迁移映射:
  - immich.users → ai_album.users (email, password_hash需重新hash, name←firstName+lastName)
  - immich.assets → ai_album.photos (deviceAssetId←deviceAssetId, filePath需路径转换)
  - immich.albums → ai_album.albums + photo_albums
  - immich.person → ai_album.persons (name←name, faceImagePath需转换)
  - immich.face → ai_album.faces (embedding需检查维度是否匹配)
- 路径转换: immich的upload路径→AI Album的`{UPLOAD_DIR}/{userId}/{yyyy-MM}/`格式
- 文件处理: 不复制文件，使用符号链接或直接引用原路径(配置UPLOAD_DIR指向immich上传目录)
- 迁移后验证: 对比源和目标的记录数

#### Session APIs (参考immich Sessions)
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/sessions | - | `{ sessions[] }` | 列出当前用户所有会话 |
| DELETE | /api/sessions/:id | - | `{ success }` | 撤销指定会话 |
| DELETE | /api/sessions | - | `{ deletedCount }` | 撤销所有其他会话 |

#### Notification APIs
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/notifications | `?page&limit&unreadOnly&type` | `{ items, total }` | 通知列表 |
| PUT | /api/notifications/read | `{ ids[] }` | `{ updatedCount }` | 标记已读 |
| PUT | /api/notifications/read-all | - | `{ updatedCount }` | 全部标记已读 |
| GET | /api/notifications/unread-count | - | `{ count }` | 未读数量 |
| GET | /api/notifications/settings | - | `{ settings }` | 通知设置 |
| PUT | /api/notifications/settings | `{ enableEmail, enableInApp, types }` | `{ settings }` | 更新通知设置 |

#### Activity APIs (参考immich Activities)
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/activities | `?albumId&assetId&type&page&limit` | `{ activities[] }` | 相册活动列表 |
| POST | /api/activities | `{ albumId, assetId?, type, comment? }` | `{ activity }` | 创建评论/点赞 |
| DELETE | /api/activities/:id | - | 204 | 删除活动 |
| GET | /api/activities/statistics | `?albumId&assetId` | `{ comments, likes }` | 活动统计 |

#### System Config APIs (参考immich System Config)
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/admin/config | - | `{ configs[] }` | 获取所有配置(Admin) |
| GET | /api/admin/config/:key | - | `{ key, value }` | 获取单个配置(Admin) |
| PUT | /api/admin/config | `{ configs: [{key, value}] }` | `{ updatedCount }` | 批量更新配置(Admin) |
| GET | /api/admin/config/defaults | - | `{ defaults }` | 获取默认配置(Admin) |

#### Server Info APIs (参考immich Server Info)
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/server/ping | - | `{ res: "pong" }` | 健康检查(无需认证) |
| GET | /api/server/info | - | `{ version, database, redis, mlService, storage, usage }` | 服务器信息 |
| GET | /api/server/stats | - | `{ photos, videos, users, albums, storageUsed, dbSize }` | 统计数据(Admin) |
| GET | /api/server/version | - | `{ version, latestVersion, updateAvailable }` | 版本信息 |
| POST | /api/server/version/check | - | `{ current, latest, updateAvailable }` | 检查新版本(Admin) |

#### Subscription APIs (Phase 5)
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/subscriptions/plans | - | `{ plans[] }` | 订阅计划列表(公开) |
| POST | /api/subscriptions/checkout | `{ planId, successUrl, cancelUrl }` | `{ checkoutUrl }` | 创建Stripe Checkout |
| POST | /api/subscriptions/webhook | Stripe Event | `{ received }` | Stripe Webhook(无需认证) |
| GET | /api/subscriptions/current | - | `{ subscription, plan, limits }` | 当前订阅状态 |
| POST | /api/subscriptions/cancel | `{ reason? }` | `{ cancelAtPeriodEnd, currentPeriodEnd }` | 取消订阅 |
| POST | /api/subscriptions/portal | - | `{ portalUrl }` | Stripe客户门户 |
| GET | /api/subscriptions/invoices | - | `{ invoices[] }` | 发票列表 |

#### Tenant APIs (Phase 5)
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| POST | /api/admin/tenants | `{ name, domain?, planId?, settings? }` | `{ tenant }` | 创建租户(Admin) |
| GET | /api/admin/tenants | - | `{ tenants[] }` | 租户列表(Admin) |
| PUT | /api/admin/tenants/:id | `{ name?, domain?, planId?, settings? }` | `{ tenant }` | 更新租户(Admin) |
| GET | /api/admin/tenants/:id/resources | `?period` | `{ usage }` | 租户资源使用(Admin) |
| DELETE | /api/admin/tenants/:id | - | `{ success }` | 删除租户(Admin) |
| POST | /api/admin/tenants/:id/export | - | `{ exportId, status }` | 导出租户数据(Admin) |

#### Branding APIs (Phase 5)
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | /api/branding | - | `{ branding }` | 品牌配置(公开) |
| PUT | /api/admin/branding | `{ primaryColor?, appName?, ... }` | `{ branding }` | 更新品牌(Admin) |
| POST | /api/admin/branding/logo | `multipart/form-data` | `{ logoUrl, faviconUrl }` | 上传Logo(Admin) |
| POST | /api/admin/branding/login-background | `multipart/form-data` | `{ loginBackgroundUrl }` | 上传登录背景(Admin) |

#### Invitation APIs (Phase 5)
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| POST | /api/invitations | `{ maxUses, rewardStorageBytes, expiresAt? }` | `{ code, inviteUrl }` | 创建邀请 |
| GET | /api/invitations | - | `{ invitations[] }` | 我的邀请列表 |
| POST | /api/invitations/:code/redeem | - | `{ rewardStorageBytes }` | 兑换邀请码 |

#### Feedback APIs (Phase 5)
| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| POST | /api/feedback | `{ category, title, description, screenshotUrl?, userEmail? }` | `{ id, message }` | 提交反馈(可选认证) |
| GET | /api/admin/feedback | - | `{ feedback[] }` | 反馈列表(Admin) |
| PUT | /api/admin/feedback/:id/status | `{ status }` | `{ success }` | 更新反馈状态(Admin) |

参考immich的六边形架构，将技术实现与核心业务逻辑分离。

```mermaid
graph LR
    subgraph "API Layer"
        Router[Express Router]
        Middleware[Auth + Error + Upload + RateLimit]
    end

    subgraph "Domain Layer"
        AuthService[Auth Service]
        PhotoService[Photo Service]
        SearchService[Search Service]
        PersonService[Person Service]
        AlbumService[Album Service]
        ShareService[Share Service]
        PartnerService[Partner Service]
        AdminService[Admin Service]
    end

    subgraph "Infrastructure Layer"
        PhotoRepo[Photo Repository]
        UserRepo[User Repository]
        PersonRepo[Person Repository]
        AlbumRepo[Album Repository]
        SearchRepo[Search Repository]
        FileStorage[File Storage]
        QueueService[Queue Service]
        MLClient[ML Service Client]
    end

    Router --> Middleware
    Middleware --> AuthService
    Middleware --> PhotoService
    Middleware --> SearchService
    Middleware --> PersonService
    Middleware --> AlbumService
    Middleware --> ShareService
    Middleware --> PartnerService
    Middleware --> AdminService

    AuthService --> UserRepo
    PhotoService --> PhotoRepo
    PhotoService --> FileStorage
    PhotoService --> QueueService
    SearchService --> SearchRepo
    PersonService --> PersonRepo
    AlbumService --> AlbumRepo
    ShareService --> PhotoRepo
    PartnerService --> UserRepo
    AdminService --> QueueService

    QueueService --> BullMQ[BullMQ]
    QueueService --> ThumbWorker[Thumbnail Worker]
    QueueService --> MetadataWorker[Metadata Worker]
    QueueService --> GeocodeWorker[Geocode Worker]
    MetadataWorker --> MLClient
    MLClient --> MLService[ML Service]

    UserRepo --> DB[(PostgreSQL)]
    PhotoRepo --> DB
    PersonRepo --> DB
    AlbumRepo --> DB
    SearchRepo --> DB
```

## 6. Data Model

### 6.1 Data Model Definition
```mermaid
erDiagram
    USER ||--o{ PHOTO : owns
    USER ||--o{ ALBUM : creates
    USER ||--o{ TAG : creates
    USER ||--o{ SEARCH_HISTORY : has
    USER ||--o{ API_KEY : has
    USER ||--o{ PARTNER_SHARING : shares
    USER ||--o{ EXTERNAL_LIBRARY : manages
    EXTERNAL_LIBRARY ||--o{ PHOTO : imports
    USER ||--o{ STACK : owns
    USER ||--o{ SMART_ALBUM : creates
    USER ||--o{ SHARED_LIBRARY : creates
    USER ||--o{ ACTIVITY_LOG : generates
    USER ||--o{ YEAR_IN_REVIEW : has
    STACK ||--o{ PHOTO_STACK : contains
    PHOTO ||--o{ PHOTO_STACK : in
    PHOTO ||--o{ PHOTO_VERSION : versions
    PHOTO ||--o{ FACE : contains
    PHOTO ||--o{ PHOTO_TAG : tagged
    PHOTO ||--o{ PHOTO_ALBUM : in
    PHOTO ||--o{ SHARE_LINK : shared
    PERSON ||--o{ FACE : has
    ALBUM ||--o{ PHOTO_ALBUM : contains
    TAG ||--o{ PHOTO_TAG : applied

    SMART_ALBUM ||--o{ SMART_ALBUM_PHOTO : contains
    PHOTO ||--o{ SMART_ALBUM_PHOTO : classified_in
    SHARED_LIBRARY ||--o{ SHARED_LIBRARY_MEMBER : has_members
    SHARED_LIBRARY ||--o{ SHARED_LIBRARY_RULE : has_rules
    SHARED_LIBRARY ||--o{ SHARED_LIBRARY_PHOTO : contains_photos
    PHOTO ||--o{ SHARED_LIBRARY_PHOTO : shared_in

    USER {
        string id PK
        string email UK
        string password_hash
        string name
        string avatar_path
        string role
        bigint storage_quota
        bigint storage_used
        string oauth_provider
        string oauth_id
        datetime created_at
        datetime updated_at
    }

    PHOTO {
        string id PK
        string user_id FK
        string filename
        string original_name
        string file_path
        string thumbnail_path
        string mime_type
        bigint file_size
        int width
        int height
        datetime taken_at
        float latitude
        float longitude
        string location_name
        text ocr_text
        vector clip_embedding_640
        string processing_status
        string file_hash
        boolean is_favorite
        boolean is_archived
        datetime deleted_at
        string library_id FK
        string live_photo_video_id FK
        string device_asset_id
        string device_id
        datetime created_at
        datetime updated_at
    }

    PERSON {
        string id PK
        string user_id FK
        string name
        string feature_face_path
        int face_count
        boolean is_hidden
        date birth_date
        datetime created_at
        datetime updated_at
    }

    FACE {
        string id PK
        string person_id FK
        string photo_id FK
        float x1
        float y1
        float x2
        float y2
        vector embedding_512
        datetime created_at
    }

    ALBUM {
        string id PK
        string user_id FK
        string name
        text description
        string cover_path
        boolean is_shared
        datetime start_date
        datetime end_date
        datetime created_at
        datetime updated_at
    }

    TAG {
        string id PK
        string user_id FK
        string name
        datetime created_at
    }

    PHOTO_TAG {
        string photo_id FK
        string tag_id FK
        datetime created_at
    }

    PHOTO_ALBUM {
        string photo_id FK
        string album_id FK
        datetime created_at
    }

    SHARE_LINK {
        string id PK
        string album_id FK
        string photo_id FK
        string token UK
        datetime expires_at
        boolean allow_download
        boolean allow_upload
        string password_hash
        datetime created_at
    }

    PARTNER_SHARING {
        string id PK
        string shared_by_user_id FK
        string shared_with_user_id FK
        boolean in_timeline
        datetime created_at
    }

    SEARCH_HISTORY {
        string id PK
        string user_id FK
        text query
        string search_mode
        int result_count
        datetime created_at
    }

    API_KEY {
        string id PK
        string user_id FK
        string name
        string key_hash
        string[] permissions
        datetime last_used_at
        datetime created_at
    }

    EXTERNAL_LIBRARY {
        string id PK
        string user_id FK
        string name
        string import_path
        string[] exclusion_patterns
        boolean is_watched
        datetime last_scanned_at
        datetime created_at
        datetime updated_at
    }

    STACK {
        string id PK
        string user_id FK
        string primary_photo_id FK
        datetime created_at
    }

    PHOTO_STACK {
        string photo_id FK
        string stack_id FK
        datetime created_at
    }

    PHOTO_VERSION {
        string id PK
        string photo_id FK
        string file_path
        string operation
        text params
        int version_number
        datetime created_at
    }

    SMART_ALBUM {
        string id PK
        string user_id FK
        string name
        string category_key
        vector center_vector_640
        float threshold
        int photo_count
        boolean is_custom
        datetime created_at
        datetime updated_at
    }

    SMART_ALBUM_PHOTO {
        string photo_id FK
        string smart_album_id FK
        float similarity
        datetime created_at
    }

    SHARED_LIBRARY {
        string id PK
        string name
        string created_by FK
        datetime created_at
        datetime updated_at
    }

    SHARED_LIBRARY_MEMBER {
        string id PK
        string library_id FK
        string user_id FK
        string role
        datetime joined_at
    }

    SHARED_LIBRARY_RULE {
        string id PK
        string library_id FK
        string rule_type
        text rule_value
        datetime created_at
    }

    SHARED_LIBRARY_PHOTO {
        string id PK
        string library_id FK
        string photo_id FK
        string added_by FK
        string matched_rule_id FK
        datetime created_at
    }

    YEAR_IN_REVIEW {
        string id PK
        string user_id FK
        int year
        text[] top_photo_ids
        jsonb top_person_data
        jsonb travel_footprint
        text[] monthly_pick_ids
        jsonb stats
        jsonb exclusions
        boolean share_card_generated
        datetime created_at
    }

    ACTIVITY_LOG {
        string id PK
        string user_id FK
        string action
        string resource
        string resource_id
        jsonb details
        string ip_address
        datetime created_at
    }
```

### 6.2 Data Definition Language
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    avatar_path VARCHAR(500),
    role VARCHAR(20) DEFAULT 'user',
    storage_quota BIGINT DEFAULT 10737418240,
    storage_used BIGINT DEFAULT 0,
    locale VARCHAR(5) DEFAULT 'zh',
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_recovery_codes TEXT[],
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE photos (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(10) DEFAULT 'image',
    file_size BIGINT NOT NULL,
    width INT,
    height INT,
    duration INT,
    taken_at TIMESTAMP WITH TIME ZONE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_name VARCHAR(255),
    ocr_text TEXT,
    clip_embedding vector(640),
    processing_status VARCHAR(20) DEFAULT 'pending',
    file_hash VARCHAR(64),
    is_favorite BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    library_id VARCHAR(36),
    live_photo_video_id VARCHAR(36),
    device_asset_id VARCHAR(255),
    device_id VARCHAR(255),
    pick_score FLOAT DEFAULT NULL,
    rating INT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (library_id) REFERENCES external_libraries(id) ON DELETE SET NULL,
    FOREIGN KEY (live_photo_video_id) REFERENCES photos(id) ON DELETE SET NULL
);

CREATE TABLE persons (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100),
    feature_face_path VARCHAR(500),
    face_count INT DEFAULT 0,
    is_hidden BOOLEAN DEFAULT FALSE,
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE faces (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    person_id VARCHAR(36),
    photo_id VARCHAR(36) NOT NULL,
    x1 DOUBLE PRECISION NOT NULL,
    y1 DOUBLE PRECISION NOT NULL,
    x2 DOUBLE PRECISION NOT NULL,
    y2 DOUBLE PRECISION NOT NULL,
    embedding vector(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL,
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

CREATE TABLE albums (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_path VARCHAR(500),
    is_shared BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE photo_tags (
    photo_id VARCHAR(36) NOT NULL,
    tag_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (photo_id, tag_id),
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE photo_albums (
    photo_id VARCHAR(36) NOT NULL,
    album_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (photo_id, album_id),
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

CREATE TABLE share_links (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    album_id VARCHAR(36),
    photo_id VARCHAR(36),
    token VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    allow_download BOOLEAN DEFAULT TRUE,
    allow_upload BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

CREATE TABLE partner_sharing (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shared_by_user_id VARCHAR(36) NOT NULL,
    shared_with_user_id VARCHAR(36) NOT NULL,
    in_timeline BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shared_by_user_id, shared_with_user_id),
    FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE search_history (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    query TEXT NOT NULL,
    search_mode VARCHAR(20) NOT NULL,
    result_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE api_keys (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_taken_at ON photos(taken_at DESC NULLS LAST);
CREATE INDEX idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX idx_photos_processing_status ON photos(processing_status);
CREATE INDEX idx_photos_file_hash ON photos(file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX idx_photos_location ON photos(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_photos_is_favorite ON photos(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_photos_is_archived ON photos(user_id, is_archived) WHERE is_archived = FALSE;
CREATE INDEX idx_photos_deleted_at ON photos(user_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_photos_file_type ON photos(user_id, file_type);
CREATE INDEX idx_photos_ocr_text ON photos USING gin(to_tsvector('simple', coalesce(ocr_text, '')));
CREATE INDEX idx_photos_clip_embedding ON photos USING hnsw (clip_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64) WHERE clip_embedding IS NOT NULL;

CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

CREATE INDEX idx_faces_photo_id ON faces(photo_id);
CREATE INDEX idx_faces_person_id ON faces(person_id) WHERE person_id IS NOT NULL;
CREATE INDEX idx_faces_embedding ON faces USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64) WHERE embedding IS NOT NULL;

CREATE INDEX idx_persons_user_id ON persons(user_id) WHERE is_hidden = FALSE;

CREATE INDEX idx_albums_user_id ON albums(user_id);
CREATE INDEX idx_share_links_token ON share_links(token);
CREATE INDEX idx_search_history_user_created ON search_history(user_id, created_at DESC);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

CREATE TABLE external_libraries (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    import_path VARCHAR(500) NOT NULL,
    exclusion_patterns TEXT[] DEFAULT '{}',
    is_watched BOOLEAN DEFAULT TRUE,
    last_scanned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE stacks (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    primary_photo_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (primary_photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

CREATE TABLE photo_stacks (
    photo_id VARCHAR(36) NOT NULL,
    stack_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (photo_id, stack_id),
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY (stack_id) REFERENCES stacks(id) ON DELETE CASCADE
);

CREATE INDEX idx_external_libraries_user_id ON external_libraries(user_id);
CREATE INDEX idx_stacks_user_id ON stacks(user_id);
CREATE INDEX idx_photo_stacks_stack_id ON photo_stacks(stack_id);

CREATE INDEX idx_smart_albums_user_id ON smart_albums(user_id);
CREATE INDEX idx_smart_album_photos_smart_album_id ON smart_album_photos(smart_album_id);
CREATE INDEX idx_smart_albums_center_vector ON smart_albums USING hnsw (center_vector vector_cosine_ops) WITH (m = 16, ef_construction = 64) WHERE center_vector IS NOT NULL;

CREATE INDEX idx_shared_libraries_created_by ON shared_libraries(created_by);
CREATE INDEX idx_shared_library_members_user_id ON shared_library_members(user_id);
CREATE INDEX idx_shared_library_members_library_id ON shared_library_members(library_id);
CREATE INDEX idx_shared_library_rules_library_id ON shared_library_rules(library_id);
CREATE INDEX idx_shared_library_photos_library_id ON shared_library_photos(library_id);
CREATE INDEX idx_shared_library_photos_photo_id ON shared_library_photos(photo_id);

CREATE INDEX idx_year_in_reviews_user_year ON year_in_reviews(user_id, year);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_resource ON activity_logs(action, resource);

CREATE TABLE photo_versions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    photo_id VARCHAR(36) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    params TEXT,
    version_number INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

CREATE TABLE smart_albums (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    category_key VARCHAR(50) NOT NULL,
    center_vector vector(640),
    threshold DOUBLE PRECISION DEFAULT 0.3,
    photo_count INT DEFAULT 0,
    cover_path VARCHAR(500),
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE smart_album_photos (
    photo_id VARCHAR(36) NOT NULL,
    smart_album_id VARCHAR(36) NOT NULL,
    similarity DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (photo_id, smart_album_id),
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY (smart_album_id) REFERENCES smart_albums(id) ON DELETE CASCADE
);

CREATE TABLE shared_libraries (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE shared_library_members (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    library_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(library_id, user_id),
    FOREIGN KEY (library_id) REFERENCES shared_libraries(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE shared_library_rules (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    library_id VARCHAR(36) NOT NULL,
    rule_type VARCHAR(20) NOT NULL,
    rule_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (library_id) REFERENCES shared_libraries(id) ON DELETE CASCADE
);

CREATE TABLE shared_library_photos (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    library_id VARCHAR(36) NOT NULL,
    photo_id VARCHAR(36) NOT NULL,
    added_by VARCHAR(36) NOT NULL,
    matched_rule_id VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(library_id, photo_id),
    FOREIGN KEY (library_id) REFERENCES shared_libraries(id) ON DELETE CASCADE,
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_rule_id) REFERENCES shared_library_rules(id) ON DELETE SET NULL
);

CREATE TABLE year_in_reviews (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    year INT NOT NULL,
    top_photo_ids TEXT[],
    top_person_data JSONB,
    travel_footprint JSONB,
    monthly_pick_ids TEXT[],
    stats JSONB,
    exclusions JSONB DEFAULT '{}',
    share_card_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, year),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE activity_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id VARCHAR(36),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO system_config (key, value) VALUES ('setup_completed', 'false');
INSERT INTO system_config (key, value) VALUES ('version', '"0.1.0"');

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);
```

## 7. Docker Deployment Architecture (Ubuntu 22.04 ARM)

### 7.1 Docker Compose 服务组成

**默认部署(5容器，推荐):** server容器内置PM2管理API+Worker双进程，适合1000用户以下场景。
**高流量扩展(7容器):** 设置SERVICE_ROLE=api和SERVICE_ROLE=worker可分离部署。

```mermaid
graph TB
    subgraph "Docker Compose"
        App[ai-album-server<br/>API Server + BullMQ Workers<br/>PM2双进程管理<br/>Port 3000]
        ML[ai-album-ml<br/>Python FastAPI<br/>ML Inference<br/>Port 3001]
        PG[PostgreSQL 15<br/>+ pgvector<br/>Port 5432]
        VK[Valkey 9<br/>BullMQ + 缓存<br/>Port 6379]
        Nginx[Nginx<br/>Port 80/443]
    end

    Nginx --> App

**Nginx SSL配置说明:**
- 默认监听80端口(HTTP)，可配置443端口(HTTPS)
- SSL证书挂载目录: ./ssl/
- 启用HTTPS时，在nginx.conf中添加server块监听443，配置ssl_certificate和ssl_certificate_key
- HTTP自动跳转HTTPS: return 301 https://$host$request_uri
    App --> PG
    App --> Redis
    Worker --> Redis
    Worker --> PG
    Worker --> ML
    ML --> ModelCache[(model-cache/)]
    App --> Volume[(uploads/)]
    PG --> PGData[(pgdata/)]
```

### 7.2 环境配置 (.env)
```env
NODE_ENV=production
PORT=3000
ML_SERVICE_URL=http://ml:3001

DB_PASSWORD=change-me-to-a-strong-password
DATABASE_URL=postgresql://aialbum:${DB_PASSWORD}@postgres:5432/aialbum
REDIS_URL=redis://:${VALKEY_PASSWORD}@valkey:6379

VALKEY_PASSWORD=change-me-to-a-random-password

JWT_SECRET=change-me-to-a-random-64-char-string
JWT_EXPIRES_IN=7d

UPLOAD_LOCATION=/app/uploads
THUMBNAIL_LOCATION=/app/thumbnails
MAX_FILE_SIZE=200mb

OCR_LANGUAGES=chi_sim+eng+jpn
CLIP_MODEL=XLM-Roberta-Large-Vit-B-16Plus
FACE_MODEL=buffalo_l

ADMIN_EMAIL=admin@example.com

OAUTH_GITHUB_CLIENT_ID=
OAUTH_GITHUB_CLIENT_SECRET=
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
```

**注意**: DB_PASSWORD和JWT_SECRET必须在部署前修改为强密码。安装脚本(install.sh)会自动生成随机密码。

### 7.3 Docker Compose 配置
```yaml
name: ai-album

services:
  postgres:
    image: pgvector/pgvector:pg15
    container_name: ai-album-postgres
    security_opt:
      - no-new-privileges:true
    environment:
      POSTGRES_DB: aialbum
      POSTGRES_USER: aialbum
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: '--data-checksums'
    volumes:
      - pgdata:/var/lib/postgresql/data
    expose:
      - "5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aialbum -d aialbum"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    command: >
      postgres
      -c shared_buffers=128MB
      -c effective_cache_size=384MB
      -c work_mem=8MB
      -c maintenance_work_mem=64MB
      -c max_connections=80
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c wal_level=replica
      -c max_wal_size=1GB
    stop_grace_period: 60s

  valkey:
    image: valkey/valkey:9-alpine
    container_name: ai-album-valkey
    security_opt:
      - no-new-privileges:true
    volumes:
      - valkeydata:/data
    expose:
      - "6379"
    command: valkey-server --maxmemory 256mb --maxmemory-policy allkeys-lru --appendonly yes --appendfsync everysec --requirepass ${VALKEY_PASSWORD:-}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "valkey-cli", "-a", "${VALKEY_PASSWORD:-}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  server:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ai-album-server
    security_opt:
      - no-new-privileges:true
    # SERVICE_ROLE: api(仅API) | worker(仅Worker) | all(API+Worker, 默认)
    # all模式使用PM2管理双进程，适合大多数自托管场景(节省~100MB RAM vs 双容器)
    # 高流量部署可设置独立容器的api/worker角色扩展
    # entrypoint.sh使用PG Advisory Lock确保多实例启动时只有一个执行迁移
    entrypoint: ["/app/scripts/entrypoint.sh"]
    command: ["npx", "pm2-runtime", "start", "ecosystem.config.cjs"]
    environment:
      NODE_ENV: production
      SERVICE_ROLE: ${SERVICE_ROLE:-all}
      PORT: 3000
      DATABASE_URL: postgresql://aialbum:${DB_PASSWORD}@postgres:5432/aialbum
      REDIS_URL: redis://:${VALKEY_PASSWORD:-}@valkey:6379
      ML_SERVICE_URL: http://ml:3001
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost}
      UPLOAD_LOCATION: /app/uploads
      THUMBNAIL_LOCATION: /app/thumbnails
      MAX_FILE_SIZE: 200mb
    volumes:
      - uploads:/app/uploads
      - thumbnails:/app/thumbnails
    expose:
      - "3000"
    depends_on:
      postgres:
        condition: service_healthy
      valkey:
        condition: service_healthy
    restart: unless-stopped
    stop_grace_period: 90s
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/server/ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  ml:
    build:
      context: ./ml
      dockerfile: Dockerfile
    container_name: ai-album-ml
    security_opt:
      - no-new-privileges:true
    environment:
      NODE_ENV: production
      PORT: 3001
      OCR_LANGUAGES: ${OCR_LANGUAGES:-chi_sim+eng+jpn}
      CLIP_MODEL: ${CLIP_MODEL:-XLM-Roberta-Large-Vit-B-16Plus}
      FACE_MODEL: ${FACE_MODEL:-buffalo_l}
      MODEL_CACHE_DIR: /cache
    volumes:
      - model-cache:/cache
    expose:
      - "3001"
    restart: unless-stopped
    mem_limit: 4g
    mem_reservation: 2g
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/ping"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s

  nginx:
    image: nginx:alpine
    container_name: ai-album-nginx
    security_opt:
      - no-new-privileges:true
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      server:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/api/server/ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  pgdata:
  valkeydata:
  uploads:
  thumbnails:
  model-cache:

networks:
  default:
    name: ai-album-network
```

### 7.2.1 Nginx配置 (nginx.conf)

```nginx
# nginx.conf — AI Album反向代理配置
# 放置位置: 项目根目录/nginx.conf
# Docker Compose挂载: ./nginx.conf:/etc/nginx/nginx.conf:ro

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

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time';

    access_log /var/log/nginx/access.log main;

    # 性能优化
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 200m;

    # 安全Header
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    server_tokens off;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 4;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml;

    # 上游服务
    upstream api_server {
        server ai-album-server:3000;
        keepalive 32;
    }

    upstream ml_service {
        server ai-album-ml:3001;
    }

    # HTTP服务器(默认)
    server {
        listen 80;
        server_name _;

        # HTTP自动跳转HTTPS(启用SSL时取消注释)
        # return 301 https://$host$request_uri;

        # 健康检查(不代理到后端)
        location /api/server/ping {
            proxy_pass http://api_server;
            proxy_set_header Host $host;
            access_log off;
        }

        # API请求代理
        location /api/ {
            proxy_pass http://api_server;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Connection "";

            # SSE支持
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # 超时配置
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 300s;

            # 缓冲关闭(SSE需要)
            proxy_buffering off;
        }

        # 缩略图直接由Nginx服务(性能优化)
        location /thumbnails/ {
            proxy_pass http://api_server;
            proxy_set_header Host $host;

            # 缩略图缓存1年(内容不变)
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header X-Content-Type-Options "nosniff" always;
        }

        # 上传文件代理(大文件超时)
        location /api/photos/upload {
            proxy_pass http://api_server;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

            client_max_body_size 200m;
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }

        # 前端静态资源
        location / {
            proxy_pass http://api_server;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

            # SPA路由: 所有非文件请求回退到index.html
            # (由Express服务端处理, Nginx仅代理)
        }

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://api_server;
            expires 30d;
            add_header Cache-Control "public, no-transform";
        }
    }

    # HTTPS服务器(启用SSL时取消注释)
    # server {
    #     listen 443 ssl http2;
    #     server_name your-domain.com;
    #
    #     ssl_certificate /etc/nginx/ssl/fullchain.pem;
    #     ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    #     ssl_protocols TLSv1.2 TLSv1.3;
    #     ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    #     ssl_prefer_server_ciphers off;
    #     ssl_session_cache shared:SSL:10m;
    #     ssl_session_timeout 1d;
    #     ssl_session_tickets off;
    #
    #     # HSTS(生产环境启用)
    #     add_header Strict-Transport-Security "max-age=63072000" always;
    #
    #     # 其余location配置同HTTP server块
    #     # ...
    # }
}
```

### 7.3 SERVICE_ROLE 扩展机制

> 默认5容器部署，生产环境可根据流量选择扩展模式。

| 模式 | SERVICE_ROLE | 容器数 | 适用场景 | 内存估算 |
|------|-------------|--------|---------|---------|
| 默认(推荐) | all | 5 | 1-1000用户自托管 | ~3.5GB含ML |
| API扩容 | api | 5+N | 1000+活跃用户 | ~3.5GB+N×200MB |
| Worker扩容 | worker | 5+N | 大量AI处理任务 | ~3.5GB+N×200MB |

```yaml
# 扩展示例: docker-compose.scale.yml (叠加使用)
# docker compose -f docker-compose.yml -f docker-compose.scale.yml up -d
services:
  api-2:
    build: .
    container_name: ai-album-api-2
    command: ["node", "dist/api/index.js"]
    environment:
      SERVICE_ROLE: api
      PORT: 3000
      DATABASE_URL: postgresql://aialbum:${DB_PASSWORD}@postgres:5432/aialbum
      REDIS_URL: redis://:${VALKEY_PASSWORD:-}@valkey:6379
      ML_SERVICE_URL: http://ml:3001
      JWT_SECRET: ${JWT_SECRET}
    expose: ["3000"]
    restart: unless-stopped
```

### 7.3 PM2进程管理配置 (ecosystem.config.cjs)

```javascript
// ecosystem.config.cjs — PM2进程管理，在SERVICE_ROLE=all模式下运行API+Worker

module.exports = {
  apps: [
    {
      name: 'api-server',
      script: 'dist/api/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '500M',
      kill_timeout: 10000,
      listen_timeout: 5000,
      shutdown_with_message: true,
    },
    {
      name: 'worker',
      script: 'dist/api/workers/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '800M',
      kill_timeout: 30000,  // Worker需要时间完成当前任务
      shutdown_with_message: true,
    },
  ],
};
```

### 7.3.1 容器入口脚本 (scripts/entrypoint.sh)

```bash
#!/bin/sh
# scripts/entrypoint.sh — 容器入口脚本
# 职责：
#   1. 等待 PostgreSQL 就绪
#   2. 通过 PG Advisory Lock 确保多实例并发启动时只有一个执行数据库迁移
#   3. 执行迁移后释放锁，其他实例跳过迁移直接启动应用
#
# Docker Compose 使用方式:
#   entrypoint: ["/app/scripts/entrypoint.sh"]
#   command: ["npx", "pm2-runtime", "start", "ecosystem.config.cjs"]
#
# 多实例场景:
#   docker compose up --scale server=3
#   实例A: 获取Advisory Lock → 执行迁移 → 释放锁 → 启动应用
#   实例B: 等待锁 → 检查迁移已执行 → 跳过 → 启动应用
#   实例C: 等待锁 → 检查迁移已执行 → 跳过 → 启动应用
#
# 超时配置: 最多等待PostgreSQL就绪60秒，迁移执行无硬性超时（由node-pg-migrate自身控制）

set -e

MAX_RETRIES=30
RETRY_INTERVAL=2
ADVISORY_LOCK_KEY=123456

# 1. 等待 PostgreSQL 就绪
echo "[entrypoint] Waiting for PostgreSQL..."
for i in $(seq 1 $MAX_RETRIES); do
  if pg_isready -h postgres -p 5432 -U aialbum -d aialbum -q 2>/dev/null; then
    echo "[entrypoint] PostgreSQL is ready"
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "[entrypoint] ERROR: PostgreSQL not ready after ${MAX_RETRIES} attempts" >&2
    exit 1
  fi
  sleep "$RETRY_INTERVAL"
done

# 2. 尝试获取 Advisory Lock 并执行迁移
#    使用 psql 尝试获取锁，如果失败（已被其他实例持有），等待后重试
echo "[entrypoint] Acquiring migration lock..."
LOCK_ACQUIRED=false
for i in $(seq 1 10); do
  # pg_try_advisory_lock 非阻塞尝试获取锁，成功返回t，失败返回f
  if psql "$DATABASE_URL" -t -c "SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY})" | grep -q 't'; then
    LOCK_ACQUIRED=true
    echo "[entrypoint] Migration lock acquired"
    break
  fi
  echo "[entrypoint] Lock held by another instance, waiting... (attempt $i/10)"
  sleep 3
done

if [ "$LOCK_ACQUIRED" = true ]; then
  # 3. 执行数据库迁移
  echo "[entrypoint] Running database migrations..."
  if npx node-pg-migrate up; then
    echo "[entrypoint] Migrations completed successfully"
  else
    echo "[entrypoint] ERROR: Migration failed" >&2
    # 即使迁移失败也要释放锁，避免死锁
    psql "$DATABASE_URL" -c "SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})" >/dev/null 2>&1
    exit 1
  fi

  # 4. 释放锁
  psql "$DATABASE_URL" -c "SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})" >/dev/null 2>&1
  echo "[entrypoint] Migration lock released"
else
  # 无法获取锁（可能所有实例都卡住了），但迁移可能已经完成
  # node-pg-migrate 的幂等性保证重复执行安全，此处直接继续
  echo "[entrypoint] WARNING: Could not acquire migration lock after 10 attempts, proceeding..."

  # 最后尝试执行迁移（node-pg-migrate 自带幂等保护）
  # 如果迁移已执行，node-pg-migrate 会跳过所有已执行的迁移文件
  echo "[entrypoint] Attempting migrations (may already be applied)..."
  npx node-pg-migrate up || echo "[entrypoint] Migration attempt finished (may have been applied by another instance)"
fi

# 5. 启动应用（exec 替换当前进程，传递 CMD 参数）
echo "[entrypoint] Starting application: $@"
exec "$@"
```

### 7.4 Dockerfile (Server, ARM64)
```dockerfile
# Stage 1: 构建前端
FROM --platform=linux/arm64 node:20-slim AS frontend-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ ./src/
COPY index.html vite.config.ts tailwind.config.js postcss.config.js tsconfig.json ./
RUN npm run build:client
# 前端构建输出到 dist/client/ (vite.config.ts中outDir配置)

# Stage 2: 构建后端 + 最终镜像
FROM --platform=linux/arm64 node:20-slim AS backend-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY api/ ./api/
COPY shared/ ./shared/
COPY tsconfig.server.json ./
RUN npm run build:server

# Stage 3: 生产镜像
FROM --platform=linux/arm64 node:20-slim
RUN apt-get update && apt-get install -y ffmpeg curl postgresql-client && rm -rf /var/lib/apt/lists/*
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm install -g pm2

COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/dist/client ./public
COPY migrations ./migrations
COPY scripts/ ./scripts/
COPY db-config.js ./

RUN mkdir -p /app/uploads /app/thumbnails /app/logs /app/backups \
    && chown -R appuser:appuser /app \
    && chmod +x /app/scripts/entrypoint.sh

USER appuser

EXPOSE 3000

CMD ["node", "dist/api/index.js"]
```

**构建流程:**
1. Stage 1 (frontend-builder): 安装全部依赖 → 编译前端 → 输出到/app/dist (Vite默认输出)
2. Stage 2 (backend-builder): 安装全部依赖 → 编译后端TypeScript → 输出到/app/dist/api/
3. Stage 3 (production): 仅安装production依赖 → 从Stage 1复制前端dist → 从Stage 2复制后端dist → 复制迁移文件+入口脚本
4. 最终镜像只包含: node_modules(production) + dist/(后端) + public/(前端) + migrations/ + scripts/entrypoint.sh
5. 多阶段构建确保构建工具和devDependencies不进入生产镜像

### 7.5 Dockerfile.ml (ML Service, ARM64)
```dockerfile
FROM --platform=linux/arm64 python:3.11-slim

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV MODEL_CACHE_DIR=/cache
RUN mkdir -p /cache && chown -R appuser:appuser /app /cache

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
    CMD curl -f http://localhost:3001/ping || exit 1

# 生产模式使用gunicorn管理多worker进程，避免单进程瓶颈
# 4GB设备: WORKERS=1 (避免OOM) | 8GB+设备: WORKERS=2 (推荐)
# PaddleOCR+CLIP+InsightFace同时加载约需3-4GB → 每个worker需独立加载模型
CMD ["sh", "-c", "gunicorn main:app -k uvicorn.workers.UvicornWorker -w ${WORKERS:-1} --max-requests 100 --timeout 300 --graceful-timeout 30 -b 0.0.0.0:3001"]
```

**ML服务并发策略:**

| 设备内存 | workers | 并发能力 | 内存占用 | 适用场景 |
|---------|---------|---------|---------|---------|
| 4GB | 1 | 1请求/次 | ~3.5GB | 个人/家庭(1-5用户) |
| 8GB | 2 | 2请求/次 | ~6.5GB | 20+用户 |
| 16GB | 4 | 4请求/次 | ~12GB | 100+用户(需独立GPU/服务器) |

**请求队列策略:**
```python
# 当所有worker繁忙时，BullMQ负责排队 (Node.js端)
# Workers调用ML时使用BullMQ Job，天然排队
# ML Service本身不维护队列 — 这是正确的分层设计
# 前端不需要等待ML结果，所以ML处理的延迟对用户透明
```

**ML Service graceful shutdown:**
```python
# gunicorn.conf.py
import signal, sys, time

def worker_int(worker):
    """接收SIGTERM时优雅关闭"""
    worker.log.info("Worker received SIGTERM, waiting for current task to finish...")
    worker.tmp.finish_request = True
    time.sleep(20)  # 最多等待20秒完成当前推理
    sys.exit(0)

### 7.6 ML Service requirements.txt
```
fastapi==0.115.0
uvicorn==0.32.0
onnxruntime==1.20.0
pillow==11.0.0
numpy==2.1.0
pgvector==0.3.6
psycopg2-binary==2.9.10
paddleocr==3.3.1
paddlepaddle==3.2.1
insightface==0.7.3
sentence-transformers==3.3.1
scikit-learn==1.5.2
```

### 7.7 部署脚本 (Ubuntu 22.04 ARM)
```bash
#!/bin/bash
set -e

echo "=== AI Album 部署脚本 (Ubuntu 22.04 ARM64) ==="
echo "参考 immich 的 Docker Compose 部署方式"

if ! command -v docker &> /dev/null; then
    echo "安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker 安装完成，请重新登录以使组权限生效"
    exit 0
fi

if ! docker compose version &> /dev/null; then
    echo "安装 Docker Compose Plugin..."
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

echo "检查 .env 文件..."
if [ ! -f .env ]; then
    echo "创建默认 .env 文件..."
    cat > .env << 'EOF'
DB_PASSWORD=aialbum_password
VALKEY_PASSWORD=valkey_password
JWT_SECRET=change-me-in-production-$(openssl rand -hex 32)
UPLOAD_LOCATION=/app/uploads
THUMBNAIL_LOCATION=/app/thumbnails
EOF
fi

echo "构建应用镜像..."
docker compose build

echo "启动服务..."
docker compose up -d

echo "等待数据库就绪..."
sleep 15

echo "运行数据库迁移..."
docker compose exec server node dist/api/migrate.js

echo ""
echo "=== 部署完成 ==="
echo "访问地址: http://$(hostname -I | awk '{print $1}')"
echo "默认管理员: 查看 .env 中的 ADMIN_EMAIL"
echo ""
echo "常用命令:"
echo "  查看日志: docker compose logs -f"
echo "  停止服务: docker compose down"
echo "  重启服务: docker compose restart"
echo "  查看状态: docker compose ps"
```

## 8. Implementation Guide

### 8.1 Project File Structure
```
ai-album/
├── src/                          # Frontend (React)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx       # 左侧导航栏
│   │   │   ├── Header.tsx        # 顶部搜索栏
│   │   │   └── MobileNav.tsx     # 移动端底部导航
│   │   ├── photo/
│   │   │   ├── PhotoGrid.tsx     # 照片网格/瀑布流
│   │   │   ├── PhotoCard.tsx     # 单张照片卡片
│   │   │   ├── PhotoDetail.tsx   # 照片详情面板
│   │   │   └── PhotoUpload.tsx   # 上传组件
│   │   ├── search/
│   │   │   ├── SearchBar.tsx     # 搜索栏
│   │   │   └── SearchResults.tsx # 搜索结果
│   │   ├── person/
│   │   │   ├── PersonGrid.tsx    # 人物网格
│   │   │   └── PersonDetail.tsx  # 人物详情
│   │   ├── album/
│   │   │   ├── AlbumList.tsx     # 相册列表
│   │   │   └── AlbumDetail.tsx   # 相册详情
│   │   ├── map/
│   │   │   └── MapView.tsx       # 地图组件
│   │   └── ui/                   # 通用UI组件
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   ├── OnboardingPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── ExplorePage.tsx
│   │   ├── AlbumPage.tsx
│   │   ├── MapPage.tsx
│   │   ├── PhotoDetailPage.tsx
│   │   ├── UploadPage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── FavoritesPage.tsx
│   │   ├── ArchivePage.tsx
│   │   ├── TrashPage.tsx
│   │   ├── SharingPage.tsx
│   │   ├── SharedPage.tsx
│   │   ├── PersonDetailPage.tsx
│   │   ├── AlbumDetailPage.tsx
│   │   ├── SmartAlbumPage.tsx
│   │   ├── SmartAlbumDetailPage.tsx
│   │   ├── YearInReviewPage.tsx
│   │   ├── DuplicatePage.tsx
│   │   ├── SharedLibraryPage.tsx
│   │   ├── ActivityLogPage.tsx
│   │   ├── SetupWizardPage.tsx
│   │   ├── AdminPage.tsx
│   │   └── SettingsPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePhotos.ts
│   │   ├── useSearch.ts
│   │   ├── useUpload.ts
│   │   └── useInfiniteScroll.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── photoStore.ts
│   │   ├── searchStore.ts
│   │   ├── notificationStore.ts
│   │   └── uiStore.ts
│   ├── utils/
│   │   ├── api.ts               # API客户端
│   │   ├── format.ts            # 格式化工具
│   │   └── constants.ts         # 常量定义
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── api/                          # Backend (Express)
│   ├── index.ts                  # API Server入口
│   ├── workers/
│   │   └── index.ts              # Microservices Worker入口
│   ├── migrate.ts                # 数据库迁移脚本
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── photos.ts
│   │   ├── persons.ts
│   │   ├── albums.ts
│   │   ├── tags.ts
│   │   ├── search.ts
│   │   ├── share.ts
│   │   ├── partners.ts
│   │   ├── libraries.ts
│   │   ├── stacks.ts
│   │   ├── import.ts
│   │   ├── events.ts
│   │   ├── admin.ts
│   │   ├── settings.ts
│   │   ├── api-keys.ts
│   │   ├── smart-albums.ts
│   │   ├── year-in-review.ts
│   │   ├── duplicates.ts
│   │   ├── shared-libraries.ts
│   │   ├── activity-logs.ts
│   │   ├── data-export.ts
│   │   ├── setup.ts
│   │   ├── sessions.ts            # Phase 4.5: 会话管理
│   │   ├── notifications.ts       # Phase 4.5: 通知系统
│   │   ├── activities.ts          # Phase 4.5: 相册活动/评论
│   │   ├── system-config.ts       # Phase 4.5: 系统配置
│   │   ├── server-info.ts         # Phase 4.5: 服务器信息
│   │   ├── subscriptions.ts       # Phase 5: 订阅管理
│   │   ├── tenants.ts             # Phase 5: 多租户
│   │   ├── branding.ts            # Phase 5: 品牌定制
│   │   ├── invitations.ts         # Phase 5: 邀请奖励
│   │   └── feedback.ts            # Phase 5: 反馈
│   ├── middleware/
│   │   ├── auth.ts               # JWT认证中间件
│   │   ├── upload.ts             # 文件上传中间件
│   │   ├── errorHandler.ts       # 错误处理中间件
│   │   ├── rateLimit.ts          # 限流中间件
│   │   ├── planLimits.ts         # Phase 5: 计划限制中间件
│   │   └── tenantIsolation.ts    # Phase 5: 租户隔离中间件
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── photo.service.ts
│   │   ├── person.service.ts
│   │   ├── album.service.ts
│   │   ├── search.service.ts
│   │   ├── share.service.ts
│   │   ├── partner.service.ts
│   │   ├── library.service.ts
│   │   ├── stack.service.ts
│   │   ├── admin.service.ts
│   │   ├── import.service.ts
│   │   ├── email.service.ts
│   │   ├── smart-album.service.ts
│   │   ├── year-in-review.service.ts
│   │   ├── duplicate.service.ts
│   │   ├── shared-library.service.ts
│   │   ├── activity-log.service.ts
│   │   ├── data-export.service.ts
│   │   ├── setup.service.ts
│   │   ├── session.service.ts       # Phase 4.5: 会话管理
│   │   ├── notification.service.ts   # Phase 4.5: 通知系统
│   │   ├── activity.service.ts       # Phase 4.5: 相册活动
│   │   ├── system-config.service.ts  # Phase 4.5: 系统配置
│   │   ├── server-info.service.ts    # Phase 4.5: 服务器信息
│   │   ├── subscription.service.ts   # Phase 5: 订阅管理
│   │   ├── tenant.service.ts         # Phase 5: 多租户
│   │   ├── branding.service.ts       # Phase 5: 品牌定制
│   │   ├── invitation.service.ts     # Phase 5: 邀请奖励
│   │   └── feedback.service.ts       # Phase 5: 反馈
│   ├── repositories/
│   │   ├── base.repository.ts    # 基础CRUD Repository
│   │   ├── user.repository.ts
│   │   ├── photo.repository.ts
│   │   ├── person.repository.ts
│   │   ├── album.repository.ts
│   │   ├── library.repository.ts
│   │   ├── search.repository.ts
│   │   ├── share.repository.ts
│   │   ├── tag.repository.ts
│   │   ├── stack.repository.ts
│   │   ├── api-key.repository.ts
│   │   ├── smart-album.repository.ts
│   │   ├── shared-library.repository.ts
│   │   └── activity-log.repository.ts
│   ├── workers/
│   │   ├── thumbnail.worker.ts
│   │   ├── metadata.worker.ts
│   │   ├── ocr.worker.ts
│   │   ├── clip.worker.ts
│   │   ├── face.worker.ts
│   │   ├── geocode.worker.ts
│   │   ├── trash-cleanup.worker.ts
│   │   ├── library-scan.worker.ts
│   │   ├── stack-detect.worker.ts
│   │   ├── import.worker.ts
│   │   ├── smart-album-classify.worker.ts
│   │   ├── duplicate-detect.worker.ts
│   │   ├── shared-library-sync.worker.ts
│   │   ├── year-in-review.worker.ts
│   │   ├── data-export.worker.ts
│   │   └── queue.ts              # BullMQ队列定义
│   ├── ml/
│   │   └── client.ts             # ML Service HTTP客户端
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── env.ts
│   │   └── sse.ts               # SSE连接管理+Redis Pub/Sub
│   └── utils/
│       ├── hash.ts
│       └── storage.ts
├── shared/                       # 前后端共享类型
│   └── types.ts
├── ml/                           # ML Service (Python)
│   ├── main.py                   # FastAPI入口
│   ├── routers/
│   │   ├── ocr.py
│   │   ├── clip.py
│   │   └── face.py
│   ├── services/
│   │   ├── ocr_service.py
│   │   ├── clip_service.py
│   │   └── face_service.py
│   ├── models/                   # 模型缓存目录
│   ├── requirements.txt
│   └── Dockerfile
├── migrations/                   # SQL迁移文件
│   └── 001_init.sql
├── mobile/                       # Flutter移动端
│   ├── lib/
│   │   ├── main.dart             # Flutter入口
│   │   ├── pages/
│   │   │   ├── login_page.dart
│   │   │   ├── home_page.dart
│   │   │   ├── photo_detail_page.dart
│   │   │   ├── explore_page.dart
│   │   │   ├── search_page.dart
│   │   │   ├── map_page.dart
│   │   │   ├── backup_page.dart
│   │   │   ├── smart_album_page.dart
│   │   │   ├── year_in_review_page.dart
│   │   │   ├── duplicate_page.dart
│   │   │   ├── shared_library_page.dart
│   │   │   └── settings_page.dart
│   │   ├── providers/            # Riverpod状态管理
│   │   │   ├── auth_provider.dart
│   │   │   ├── photo_provider.dart
│   │   │   ├── backup_provider.dart
│   │   │   ├── album_provider.dart
│   │   │   └── settings_provider.dart
│   │   ├── services/
│   │   │   ├── api_service.dart  # Dio HTTP客户端
│   │   │   ├── backup_service.dart
│   │   │   ├── album_sync_service.dart
│   │   │   ├── cache_service.dart
│   │   │   └── local_storage_service.dart
│   │   └── models/               # 数据模型
│   ├── pubspec.yaml
│   ├── android/
│   ├── ios/
│   └── test/
├── scripts/                      # 部署脚本
│   ├── install.sh                # 一键安装脚本
│   ├── upgrade.sh                # 升级脚本
│   ├── backup.sh                 # 备份脚本
│   ├── restore.sh                # 恢复脚本
│   └── uninstall.sh              # 卸载脚本
├── monitoring/                   # 监控配置
│   └── grafana/
│       └── dashboard.json        # 预配置Grafana仪表盘
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── deploy.sh
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

### 8.2 ML Service API Definitions

ML Service是独立的Python FastAPI服务，Microservices Worker通过HTTP调用。

#### OCR Endpoint
```
POST /api/ml/ocr
Request:
{
  "image_path": "/app/uploads/abc123.jpg",
  "languages": ["chi_sim", "eng"]
}
Response:
{
  "text": "识别出的文字内容",
  "confidence": 0.95,
  "blocks": [
    { "text": "第一段", "bbox": [x1, y1, x2, y2], "confidence": 0.98 }
  ]
}
```

#### CLIP Embedding Endpoint
```
POST /api/ml/clip/embed-image
Request:
{
  "image_path": "/app/uploads/abc123.jpg"
}
Response:
{
  "embedding": [0.123, -0.456, ...],  // 640维向量
  "model": "XLM-Roberta-Large-Vit-B-16Plus"
}

POST /api/ml/clip/embed-text
Request:
{
  "text": "海边的日落"
}
Response:
{
  "embedding": [0.789, 0.012, ...],  // 640维向量
  "model": "XLM-Roberta-Large-Vit-B-16Plus"
}
```

#### Face Detection Endpoint
```
POST /api/ml/face/detect
Request:
{
  "image_path": "/app/uploads/abc123.jpg"
}
Response:
{
  "faces": [
    {
      "bbox": { "x1": 100, "y1": 150, "x2": 200, "y2": 280 },
      "embedding": [0.321, -0.654, ...],  // 512维向量
      "confidence": 0.99
    }
  ]
}

POST /api/ml/face/cluster
Request:
{
  "face_ids": ["face-uuid-1", "face-uuid-2", ...],
  "embeddings": [[0.321, -0.654, ...], [0.789, 0.012, ...], ...]  // 512维向量数组
}
Response:
{
  "clusters": [
    { "person_id": "auto-gen-id", "face_ids": ["face-uuid-1", "face-uuid-3"] },
    { "person_id": "auto-gen-id-2", "face_ids": ["face-uuid-2", "face-uuid-4"] }
  ]
}
```

#### Pick Score (P2 Feature)
```
POST /api/ml/pick-score
Request:
{
  "photo_id": "uuid",
  "thumbnail_path": "/thumbnails/uuid.jpg"
}
Response:
{
  "pick_score": 0.82,
  "clarity": 0.9,
  "composition": 0.75,
  "expression": 0.8
}

处理逻辑:
1. 读取缩略图: cv2.imread(thumbnail_path)
2. 灰度化: gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
3. 清晰度: clarity = min(cv2.Laplacian(gray, cv2.CV_64F).var() / 500.0, 1.0)
4. 构图: Canny边缘检测 + 三分线区域权重 → composition_score
5. 表情: 检测人脸数量 → expression_score (无人脸=0.5)
6. pick_score = clarity * 0.4 + composition * 0.3 + expression * 0.3
```

#### CLIP Text Embedding (用于智能相册center_vector初始化)
```
POST /api/ml/clip/embed-text
Request:
{
  "text": "photos of cats dogs and pets"
}
Response:
{
  "embedding": [0.321, -0.654, ...]  // 640维向量
}
```

#### Health Check
```
GET /health
Response: { "status": "ok", "models_loaded": ["ocr", "clip", "face"] }

GET /health/detail
Response: {
  "status": "ok" | "initializing" | "degraded",
  "models": {
    "ocr": { "loaded": true, "model_name": "PaddleOCR 3.3.1" },
    "clip": { "loaded": true, "model_name": "XLM-Roberta-Large-Vit-B-16Plus", "download_progress": 100 },
    "face": { "loaded": false, "model_name": "buffalo_l", "download_progress": 65, "status": "downloading" }
  },
  "version": "0.1.0"
}
```

### 8.3 BullMQ Queue Definitions

```typescript
const QUEUES = {
  THUMBNAIL_GENERATION: {
    name: 'thumbnail-generation',
    concurrency: 4,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
  METADATA_EXTRACTION: {
    name: 'metadata-extraction',
    concurrency: 2,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
  OCR_PROCESSING: {
    name: 'ocr-processing',
    concurrency: 1,
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
  },
  CLIP_EMBEDDING: {
    name: 'clip-embedding',
    concurrency: 1,
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
  },
  FACE_DETECTION: {
    name: 'face-detection',
    concurrency: 1,
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
  },
  GEOCODING: {
    name: 'geocoding',
    concurrency: 2,
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
  },
  LIBRARY_SCAN: {
    name: 'library-scan',
    concurrency: 1,
    attempts: 1,
    backoff: { type: 'exponential', delay: 30000 },
  },
  STACK_DETECT: {
    name: 'stack-detect',
    concurrency: 2,
    attempts: 1,
    backoff: { type: 'exponential', delay: 5000 },
  },
  TRASH_CLEANUP: {
    name: 'trash-cleanup',
    concurrency: 1,
    attempts: 1,
    backoff: { type: 'exponential', delay: 86400000 },
  },
  SMART_ALBUM_CLASSIFY: {
    name: 'smart-album-classify',
    concurrency: 2,
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
  },
  DUPLICATE_DETECT: {
    name: 'duplicate-detect',
    concurrency: 1,
    attempts: 1,
    backoff: { type: 'exponential', delay: 30000 },
  },
  SHARED_LIBRARY_SYNC: {
    name: 'shared-library-sync',
    concurrency: 2,
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
  },
  YEAR_IN_REVIEW: {
    name: 'year-in-review',
    concurrency: 1,
    attempts: 1,
    backoff: { type: 'exponential', delay: 60000 },
  },
  DATA_EXPORT: {
    name: 'data-export',
    concurrency: 1,
    attempts: 1,
    backoff: { type: 'exponential', delay: 30000 },
  },
  FACE_CLUSTER: {
    name: 'face-cluster',
    concurrency: 1,
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
  },
  IMPORT_UPLOAD: {
    name: 'import-upload',
    concurrency: 1,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
  STORAGE_QUOTA_CHECK: {
    name: 'storage-quota-check',
    concurrency: 1,
    attempts: 1,
    backoff: { type: 'fixed', delay: 60000 },
  },
} as const;

// Job Data Structure
interface ThumbnailJob {
  photoId: string;
  filePath: string;
  mimeType: string;
}

interface MetadataJob {
  photoId: string;
  filePath: string;
}

interface OcrJob {
  photoId: string;
  filePath: string;
  languages: string[];
}

interface ClipJob {
  photoId: string;
  filePath: string;
}

interface FaceJob {
  photoId: string;
  filePath: string;
}

interface GeocodeJob {
  photoId: string;
  latitude: number;
  longitude: number;
}

interface StackDetectJob {
  userId: string;
  photoId: string;
}

interface SmartAlbumClassifyJob {
  photoId: string;
  userId: string;
}

interface DuplicateDetectJob {
  userId: string;
  type: 'exact' | 'similar' | 'all';
}

interface SharedLibrarySyncJob {
  libraryId: string;
  ruleId?: string;
}

interface YearInReviewJob {
  userId: string;
  year: number;
}

interface DataExportJob {
  userId: string;
  include: string[];
}

interface FaceClusterJob {
  faceIds: string[];
  userId: string;
}

interface ImportUploadJob {
  photoId: string;
  filePath: string;
  userId: string;
  source: 'mobile' | 'web' | 'import';
}

interface StorageQuotaCheckJob {
  userId: string;
}
```

### 8.4 JWT Authentication

```typescript
// JWT Payload
interface JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

// Token Structure
// Authorization: Bearer <token>
// JWT Payload: { sub: userId, email, role, jti: sessionId, iat, exp }
// Token过期: 7天
// 刷新机制: 前端在401时跳转登录页

// 会话管理 (sessions表替代tokenVersion):
//   登录: 创建新session → 生成JWT(含jti=session.id) → 返回
//   修改密码: 可选"仅本设备登录"(新JWT绑定新session)或"退出所有设备"(清空所有sessions)
//   退出登录: 删除当前session → JWT失效
//   退出所有设备: DELETE FROM sessions WHERE user_id = X
//   验证: 除JWT签名和过期外，额外检查 jti 在 sessions 表中是否存在且未过期

// Auth Middleware
// 1. 从Authorization header提取token
// 2. 验证jwt签名和过期时间
// 3. 检查sessions表中jti是否存在且未过期 → 如果不存在返回401
// 4. 将userId附加到req.user
// 5. 公开路由: POST /api/auth/*, GET /api/share/*
// 6. Admin路由: 额外检查role === 'admin'
```

**认证场景处理矩阵:**

| 场景 | 处理方式 | HTTP状态码 | 前端行为 |
|------|---------|-----------|---------|
| 无token | 返回401 | 401 | 跳转登录页 |
| token过期 | jwt.verify抛出TokenExpiredError | 401 | 跳转登录页 |
| token签名无效 | jwt.verify抛出JsonWebTokenError | 401 | 跳转登录页 |
| 会话已撤销 | jti不在sessions表中(用户退出/管理员踢出) | 401 + ErrorCodes.AUTH_SESSION_REVOKED | 跳转登录页(提示:"此会话已被撤销") |
| 2FA未验证 | 用户two_factor_enabled但请求无2FA | 403 + ErrorCodes.AUTH_2FA_REQUIRED | 弹出2FA验证弹窗 |

**sessions表DDL:**
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_info VARCHAR(255),       -- 设备信息 'Chrome/Windows', 'Safari/iOS'
  ip_address VARCHAR(45),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

**JWT payload变更对比:**

| 字段 | 旧(tokenVersion) | 新(sessions) | 说明 |
|------|-----------------|-------------|------|
| sub | userId | userId | 不变 |
| email | ✓ | ✓ | 不变 |
| role | ✓ | ✓ | 不变 |
| tokenVersion | tokenVersion(即时) | **移除** | 改为sessions表管理 |
| jti | - | **新增: session.id** | 关联sessions表 |
| exp | 7天 | 7天 | 不变 |
| 2FA验证码错误 | code校验失败 | 401 + ErrorCodes.AUTH_2FA_INVALID | 提示重新输入 |
| API Key认证 | Authorization: Bearer ak_xxx | 同JWT，但跳过session检查(API Key无session) | - |
| 资源不属于当前用户 | 查询结果userId !== req.user.userId | 404(不暴露资源存在) | 显示"未找到" |

**snake_case → camelCase 映射规则:**

| 数据库字段 (snake_case) | TypeScript属性 (camelCase) | 说明 |
|------------------------|---------------------------|------|
| user_id | userId | 外键字段 |
| file_path | filePath | 普通字段 |
| is_favorite | isFavorite | 布尔字段 |
| created_at | createdAt | 时间字段 |
| updated_at | updatedAt | 时间字段 |
| deleted_at | deletedAt | 时间字段 |
| processing_status | processingStatus | 枚举字段 |
| file_hash | fileHash | 普通字段 |
| thumbnail_path | thumbnailPath | 普通字段 |
| original_name | originalName | 普通字段 |
| file_type | fileType | 枚举字段 |
| file_size | fileSize | 数值字段 |
| taken_at | takenAt | 时间字段 |
| location_name | locationName | 普通字段 |
| ocr_text | ocrText | 文本字段 |
| storage_used | storageUsed | 数值字段 |
| storage_quota | storageQuota | 数值字段 |
| two_factor_enabled | twoFactorEnabled | 布尔字段 |
| two_factor_secret | twoFactorSecret | 文本字段 |
| two_factor_recovery_codes | twoFactorRecoveryCodes | 数组字段 |
| feature_face_path | featureFacePath | 普通字段 |
| face_count | faceCount | 数值字段 |
| is_hidden | isHidden | 布尔字段 |
| birth_date | birthDate | 日期字段 |
| is_shared | isShared | 布尔字段 |
| cover_path | coverPath | 普通字段 |
| photo_count | photoCount | 数值字段 |
| start_date | startDate | 时间字段 |
| end_date | endDate | 时间字段 |
| is_archived | isArchived | 布尔字段 |
| allow_download | allowDownload | 布尔字段 |
| allow_upload | allowUpload | 布尔字段 |
| password_hash | passwordHash | 内部字段(不返回前端) |
| expires_at | expiresAt | 时间字段 |
| shared_by_user_id | sharedByUserId | 外键字段 |
| shared_with_user_id | sharedWithUserId | 外键字段 |
| in_timeline | inTimeline | 布尔字段 |
| key_hash | keyHash | 内部字段(不返回前端) |
| last_used_at | lastUsedAt | 时间字段 |
| import_path | importPath | 普通字段 |
| exclusion_patterns | exclusionPatterns | 数组字段 |
| is_watched | isWatched | 布尔字段 |
| last_scanned_at | lastScannedAt | 时间字段 |
| primary_photo_id | primaryPhotoId | 外键字段 |
| photo_ids | photoIds | 数组字段 |
| version_number | versionNumber | 数值字段 |
| category_key | categoryKey | 普通字段 |
| center_vector | centerVector | 内部字段(不返回前端) |
| is_custom | isCustom | 布尔字段 |
| ip_address | ipAddress | 普通字段 |
| share_card_generated | shareCardGenerated | 布尔字段 |

**映射实现**: 在Repository层统一转换，使用工具函数:
```typescript
function toCamelCase(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}
```

### 8.5 Error Response Format

```typescript
interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: Record<string, string[]>;
}

// 错误码:
// 400 - 请求参数错误
// 401 - 未认证
// 403 - 无权限
// 404 - 资源不存在
// 409 - 冲突（如重复上传）
// 413 - 文件过大
// 422 - 数据验证失败
// 500 - 服务器内部错误
```

### 8.6 Search Implementation Details

```sql
-- 文本搜索: PostgreSQL ILIKE + tsvector
SELECT * FROM photos
WHERE user_id = $1
  AND (
    original_name ILIKE '%' || $2 || '%'
    OR location_name ILIKE '%' || $2 || '%'
    OR to_tsvector('simple', coalesce(ocr_text, '')) @@ plainto_tsquery('simple', $2)
  )
ORDER BY created_at DESC;

-- OCR搜索: GIN索引全文搜索
SELECT * FROM photos
WHERE user_id = $1
  AND to_tsvector('simple', coalesce(ocr_text, '')) @@ plainto_tsquery('simple', $2)
ORDER BY ts_rank(to_tsvector('simple', coalesce(ocr_text, '')), plainto_tsquery('simple', $2)) DESC;

-- 语义搜索: pgvector余弦相似度
SET LOCAL hnsw.ef_search = 100;
SELECT *, 1 - (clip_embedding <=> $2::vector) AS score
FROM photos
WHERE user_id = $1
  AND clip_embedding IS NOT NULL
ORDER BY clip_embedding <=> $2::vector
LIMIT 20;

-- 人脸搜索: 按人物ID
SELECT p.* FROM photos p
JOIN faces f ON f.photo_id = p.id
JOIN persons pr ON f.person_id = pr.id
WHERE pr.user_id = $1 AND pr.name ILIKE '%' || $2 || '%'
ORDER BY p.taken_at DESC;

-- 混合搜索: 合并以上结果，按加权分数排序
// 权重: text=0.2, ocr=0.3, semantic=0.4, face=0.1
// 归一化各搜索分数到0-1，加权求和，降序排列
```

**混合搜索完整SQL实现:**
```sql
-- 混合搜索: 使用CTE合并各搜索结果，归一化分数后加权排序
WITH text_results AS (
  SELECT p.id,
    CASE
      WHEN p.original_name ILIKE '%' || $2 || '%' THEN 1.0
      WHEN p.location_name ILIKE '%' || $2 || '%' THEN 0.8
      ELSE 0.0
    END AS raw_score
  FROM photos p
  WHERE p.user_id = $1 AND p.deleted_at IS NULL
    AND (p.original_name ILIKE '%' || $2 || '%' OR p.location_name ILIKE '%' || $2 || '%')
),
ocr_results AS (
  SELECT p.id,
    ts_rank(to_tsvector('simple', coalesce(p.ocr_text, '')), plainto_tsquery('simple', $2)) AS raw_score
  FROM photos p
  WHERE p.user_id = $1 AND p.deleted_at IS NULL
    AND to_tsvector('simple', coalesce(p.ocr_text, '')) @@ plainto_tsquery('simple', $2)
),
semantic_results AS (
  SELECT p.id,
    1 - (p.clip_embedding <=> $3::vector) AS raw_score
  FROM photos p
  WHERE p.user_id = $1 AND p.deleted_at IS NULL AND p.clip_embedding IS NOT NULL
  ORDER BY p.clip_embedding <=> $3::vector
  LIMIT 50
),
face_results AS (
  SELECT p.id, 1.0 AS raw_score
  FROM photos p
  JOIN faces f ON f.photo_id = p.id
  JOIN persons pr ON f.person_id = pr.id
  WHERE pr.user_id = $1 AND pr.name ILIKE '%' || $2 || '%'
    AND p.deleted_at IS NULL
),
combined AS (
  SELECT id,
    COALESCE((SELECT raw_score FROM text_results WHERE id = t.id), 0) * 0.2 +
    COALESCE((SELECT raw_score FROM ocr_results WHERE id = t.id), 0) * 0.3 +
    COALESCE((SELECT raw_score FROM semantic_results WHERE id = t.id), 0) * 0.4 +
    COALESCE((SELECT raw_score FROM face_results WHERE id = t.id), 0) * 0.1
    AS final_score
  FROM (
    SELECT id FROM text_results
    UNION SELECT id FROM ocr_results
    UNION SELECT id FROM semantic_results
    UNION SELECT id FROM face_results
  ) t
)
SELECT p.*, c.final_score
FROM combined c
JOIN photos p ON p.id = c.id
ORDER BY c.final_score DESC
LIMIT $4 OFFSET $5;
```

**注意**: $3为查询文本的CLIP嵌入向量，由ML Service的`/api/ml/clip/embed-text`端点生成

**智能搜索策略（默认模式）:**
```
// 自动判断查询意图，选择最优搜索策略
// 规则:
// 1. 查询长度 ≤ 3字符: 优先文本+OCR搜索（短词通常是精确匹配）
// 2. 查询包含已知人物名: 优先人脸搜索
// 3. 查询包含自然语言描述(含形容词/动词): 优先语义搜索
// 4. 其他情况: 执行混合搜索
//
// 实现:
//   a. 先查询用户的人物名列表，检查是否匹配
//   b. 短查询(≤3字): text + ocr (跳过语义，节省CLIP推理时间)
//   c. 长查询(>3字): hybrid (全部模式)
//   d. 匹配到人物名: hybrid + 额外face权重
//
// 搜索建议:
//   输入时从以下来源自动补全:
//   - 用户的人物名 (persons表)
//   - 地点名称 (photos表DISTINCT location_name)
//   - 标签名 (tags表)
//   - 搜索历史
```

### 8.7.1 Partner Timeline Query

```sql
-- 伙伴共享照片出现在时间线
-- 当用户请求照片列表时，除了自己的照片外，还包含伙伴共享的照片
-- GET /api/photos 需要修改查询:
SELECT p.* FROM photos p
WHERE (
  (p.user_id = $1 AND p.deleted_at IS NULL AND p.is_archived = FALSE)
  OR (
    p.user_id IN (
      SELECT ps.shared_by_user_id FROM partner_sharing ps
      WHERE ps.shared_with_user_id = $1 AND ps.in_timeline = TRUE
    )
    AND p.deleted_at IS NULL AND p.is_archived = FALSE
  )
)
ORDER BY p.taken_at DESC NULLS LAST
LIMIT $2 OFFSET $3;
```

### 8.7.2 External Library File Serving

```typescript
// 外部库文件通过Express提供访问
// 方案: 在Express中注册外部库路径的静态文件路由
//
// api/index.ts 中添加:
//   app.use('/external-lib', (req, res, next) => {
//     // 从数据库查询所有外部库路径
//     // 检查请求路径是否匹配某个外部库的importPath
//     // 如果匹配，使用express.static提供文件
//   })
//
// 更简单的方案: 使用符号链接
//   当外部库被添加时，在 uploads/external/{libraryId}/ 创建指向importPath的符号链接
//   Express通过 /uploads/external/{libraryId}/ 提供文件
//
// 照片记录中:
//   外部库照片的file_path存储原始路径 (如 /mnt/nas/photos/xxx.jpg)
//   thumbnail_path存储在THUMBNAIL_DIR中 (如 /app/thumbnails/xxx.jpg)
//   前端请求缩略图: /thumbnails/xxx.jpg (正常)
//   前端请求原图: /api/photos/:id/download (通过API下载，API读取原始路径)
//
// 实现方式:
//   1. 照片上传API: 文件保存到UPLOAD_DIR
//   2. 外部库照片: file_path指向外部路径，通过 /api/photos/:id/download 提供访问
//   3. download端点: res.sendFile(photo.file_path) 直接发送文件
//   4. 缩略图: 始终存储在THUMBNAIL_DIR，通过 /thumbnails/ 静态路由提供
```

### 8.7 Frontend Zustand Store Structure

## 9. Performance Architecture

### 9.1 Database Connection Pool
```typescript
// config/database.ts
// 使用pg Pool连接池，避免每次请求创建新连接
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '15', 10),
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  maxUses: 7500,
  allowExitOnIdle: false,
});

// 连接池监控
pool.on('connect', () => { /* prom-client: pool_size gauge */ });
pool.on('remove', () => { /* prom-client: pool_size gauge */ });
pool.on('error', (err) => { logger.error('PG pool error:', err); });

// 健康检查
export async function checkDBHealth(): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
}
```

### 9.2 Redis Connection with Reconnect
```typescript
// config/redis.ts
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,    // 单请求最大重试次数
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000); // 重试延迟: 200ms, 400ms, ... 最大5秒
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) return true;
    return false;
  },
  enableReadyCheck: true,
  lazyConnect: true,          // 延迟连接，首次命令时才连接
});

redis.on('error', (err) => logger.error('Redis error:', err));
redis.on('connect', () => logger.info('Redis connected'));
redis.on('reconnecting', () => logger.warn('Redis reconnecting...'));
```

### 9.3 ML Service Batch Processing
```typescript
// ML Service 批处理API设计
// 问题: 10k照片逐张调用ML = 10k次HTTP请求，网络开销巨大
// 方案: 新增批处理端点，单次请求处理多张照片

// 新增ML批处理API:
// POST /api/ml/ocr/batch
// Request: { "items": [{ "image_path": "...", "languages": ["chi_sim"] }, ...] }
// Response: { "results": [{ "text": "...", "confidence": 0.95 }, ...] }

// POST /api/ml/clip/embed-batch
// Request: { "image_paths": ["/app/uploads/a.jpg", "/app/uploads/b.jpg"] }
// Response: { "embeddings": [[0.1, ...], [0.2, ...]], "model": "..." }

// POST /api/ml/face/detect-batch
// Request: { "image_paths": ["/app/uploads/a.jpg", "/app/uploads/b.jpg"] }
// Response: { "results": [{ "faces": [...] }, { "faces": [...] }] }

// Worker中使用批处理:
// clip.worker.ts 改进:
//   1. 从队列取最多BATCH_SIZE(16)个ClipJob
//   2. 调用 POST /api/ml/clip/embed-batch { image_paths: [...] }
//   3. 批量更新数据库: UPDATE photos SET clip_embedding = ... WHERE id = ANY(...)
//   4. 批量触发后续任务(smart-album-classify等)
// 批处理大小配置:
const ML_BATCH_SIZE = parseInt(process.env.ML_BATCH_SIZE || '16', 10);
```

### 9.4 Multi-Level Cache Strategy
```
┌──────────────────────────────────────────────────────┐
│                   Cache Architecture                  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  L1: Browser Cache (HTTP Cache Headers)               │
│  ├── 缩略图: Cache-Control: public, max-age=31536000  │
│  │            ETag: fileHash                          │
│  ├── 原图下载: Cache-Control: private, max-age=3600   │
│  ├── API响应: Cache-Control: private, max-age=0       │
│  │              ETag: dataHash                        │
│  └── 静态资源(JS/CSS): Cache-Control: public,         │
│                         max-age=31536000, immutable    │
│                                                       │
│  L2: Redis Application Cache                          │
│  ├── 用户会话: user:session:{userId} TTL=7d            │
│  ├── 搜索结果: search:{userId}:{hash} TTL=5min         │
│  ├── 智能相册列表: smart-albums:{userId} TTL=10min      │
│  ├── 统计数据: stats:{userId} TTL=1min                 │
│  ├── 重复检测结果: duplicates:{userId} TTL=1h           │
│  ├── 照片详情: photo:{id} TTL=10min                    │
│  └── 缓存失效: 写操作时主动删除相关缓存key              │
│                                                       │
│  L3: PostgreSQL Materialized Views (可选)              │
│  ├── 相册照片计数: 刷新频率1min                         │
│  └── 年度统计: 刷新频率1h                               │
│                                                       │
│  缓存一致性策略:                                       │
│  ├── Write-Through: 写操作时同步更新缓存                │
│  ├── Cache-Aside: 读操作时先查缓存，miss时查DB并回填    │
│  └── 主动失效: 数据变更时删除相关缓存key                │
└──────────────────────────────────────────────────────┘
```

### 9.5 Query Optimization
```sql
-- 照片时间线查询优化 (最频繁的查询)
-- 问题: partner_sharing子查询每次执行
-- 优化: 使用CTE缓存伙伴ID
WITH partner_ids AS (
  SELECT shared_by_user_id FROM partner_sharing
  WHERE shared_with_user_id = $1 AND in_timeline = TRUE
)
SELECT p.* FROM photos p
WHERE (
  (p.user_id = $1 AND p.deleted_at IS NULL AND p.is_archived = FALSE)
  OR (p.user_id IN (SELECT shared_by_user_id FROM partner_ids)
      AND p.deleted_at IS NULL AND p.is_archived = FALSE)
)
ORDER BY p.taken_at DESC NULLS LAST
LIMIT $2 OFFSET $3;

-- 使用covering index减少回表
CREATE INDEX idx_photos_timeline_covering ON photos(user_id, deleted_at, is_archived, taken_at DESC NULLS LAST)
  WHERE deleted_at IS NULL AND is_archived = FALSE;

-- 智能相册分类查询优化
-- 问题: 逐张照片与所有分类中心计算相似度
-- 优化: 使用pgvector批量计算
SELECT sa.id, sa.name, sa.category_key, 1 - (sa.center_vector <=> $1::vector) AS similarity
FROM smart_albums sa
WHERE sa.user_id = $2 AND sa.center_vector IS NOT NULL
  AND 1 - (sa.center_vector <=> $1::vector) > sa.threshold
ORDER BY similarity DESC;

-- 重复检测优化 (避免O(n²))
-- 精确重复: 直接按file_hash分组，O(n)
SELECT file_hash, array_agg(id) as photo_ids, COUNT(*) as cnt
FROM photos WHERE user_id = $1 AND deleted_at IS NULL AND file_hash IS NOT NULL
GROUP BY file_hash HAVING COUNT(*) > 1;

-- 相似重复: 使用pgvector近似搜索，O(n*log(n))
-- 对每张照片，只搜索最相似的Top K张
SELECT p1.id as source_id, p2.id as match_id,
       1 - (p1.clip_embedding <=> p2.clip_embedding) AS similarity
FROM photos p1
CROSS JOIN LATERAL (
  SELECT id, clip_embedding FROM photos
  WHERE user_id = $1 AND deleted_at IS NULL
    AND clip_embedding IS NOT NULL
    AND id != p1.id
  ORDER BY clip_embedding <=> p1.clip_embedding
  LIMIT 5
) p2
WHERE p1.user_id = $1 AND p1.deleted_at IS NULL AND p1.clip_embedding IS NOT NULL
  AND 1 - (p1.clip_embedding <=> p2.clip_embedding) > 0.9;

-- 搜索结果缓存key生成
-- key = search:{userId}:md5(query+mode+filters)
-- TTL = 5分钟，相同查询5分钟内直接返回缓存结果
```

### 9.6 Thumbnail Serving Optimization
```nginx
# nginx.conf 缩略图缓存优化
location /thumbnails/ {
    alias /app/thumbnails/;
    expires 1y;                           # 浏览器缓存1年
    add_header Cache-Control "public, immutable";
    add_header ETag "";                   # 基于文件修改时间自动生成ETag
    gzip on;
    gzip_types image/jpeg image/png image/webp;
    try_files $uri =404;
}

# 原图通过API下载，短期缓存
location /api/photos/ {
    proxy_pass http://ai-album-server:3000;
    proxy_cache_valid 200 1h;             # Nginx层缓存1小时
}
```

### 9.7 Activity Log Partitioning and Archival
```sql
-- activity_logs按月分区，避免单表过大
-- 使用PostgreSQL原生分区表
CREATE TABLE activity_logs (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id VARCHAR(36),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- 按月创建分区(自动化脚本)
CREATE TABLE activity_logs_2025_01 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE activity_logs_2025_02 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... 后续分区由定时任务自动创建

-- 数据归档策略
-- 1. 保留最近6个月的分区数据
-- 2. 超过6个月的分区导出为JSON归档文件
-- 3. 归档后DETACH分区: ALTER TABLE activity_logs DETACH PARTITION activity_logs_2024_01
-- 4. 归档文件存储到 /app/backups/activity-logs/
-- 5. 定时任务: 每月1日执行归档和分区创建
```

### 9.8 Smart Album Classification Optimization
```typescript
// 智能相册分类优化: 批量处理 + 增量更新
// 问题: 每张新照片单独触发分类，频繁DB查询
// 优化: 
//   1. 新照片先标记为待分类，累积到一定数量后批量处理
//   2. 使用pgvector批量计算，一次SQL完成所有分类

// smart-album-classify.worker.ts 改进:
//   1. 从队列取最多BATCH_SIZE(50)个SmartAlbumClassifyJob
//   2. 获取所有待分类照片的CLIP向量:
//      SELECT id, clip_embedding FROM photos
//      WHERE id = ANY($1) AND clip_embedding IS NOT NULL
//   3. 获取用户所有智能相册中心向量:
//      SELECT id, name, category_key, center_vector, threshold
//      FROM smart_albums WHERE user_id = $1
//   4. 批量计算: 对每张照片，与所有分类中心计算相似度
//      使用矩阵运算(numpy)而非逐个计算
//   5. 批量插入分类结果:
//      INSERT INTO smart_album_photos (photo_id, smart_album_id, similarity)
//      VALUES ... ON CONFLICT DO NOTHING
//   6. 批量更新计数:
//      UPDATE smart_albums SET photo_count = (SELECT COUNT(*) FROM smart_album_photos WHERE smart_album_id = smart_albums.id)
```

## 10. Scalability Architecture

### 10.1 Storage Abstraction Layer
```typescript
// 存储抽象层: 支持本地文件系统和S3兼容对象存储
// 问题: 当前硬编码本地文件系统，无法扩展到云存储
// 方案: 定义IStorageProvider接口，通过配置切换实现

interface IStorageProvider {
  save(key: string, data: Buffer, contentType: string): Promise<string>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  getPath(key: string): string;
}

// 本地文件系统实现
class LocalStorageProvider implements IStorageProvider {
  constructor(private basePath: string) {}
  async save(key: string, data: Buffer): Promise<string> {
    const fullPath = path.join(this.basePath, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
    return fullPath;
  }
  async read(key: string): Promise<Buffer> {
    return fs.readFile(path.join(this.basePath, key));
  }
  getPath(key: string): string {
    return path.join(this.basePath, key);
  }
  // ... 其他方法
}

// S3兼容对象存储实现 (Phase 4, 可选)
class S3StorageProvider implements IStorageProvider {
  constructor(private s3Client: S3Client, private bucket: string) {}
  async save(key: string, data: Buffer, contentType: string): Promise<string> {
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: data, ContentType: contentType
    }));
    return key;
  }
  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    return getSignedUrl(this.s3Client, new GetObjectCommand({
      Bucket: this.bucket, Key: key
    }), { expiresIn });
  }
  // ... 其他方法
}

// 工厂函数
function createStorageProvider(): IStorageProvider {
  if (process.env.STORAGE_TYPE === 's3') {
    return new S3StorageProvider(/* ... */);
  }
  return new LocalStorageProvider(process.env.UPLOAD_LOCATION!);
}

// 使用:
// const uploadStorage = createStorageProvider();
// const thumbnailStorage = new LocalStorageProvider(process.env.THUMBNAIL_LOCATION!);
// 缩略图始终使用本地存储(高频访问，延迟敏感)
// 原始文件可使用S3(低频访问，节省本地存储)
```

### 10.2 Horizontal Scaling Strategy
```
┌──────────────────────────────────────────────────────────────────┐
│                    Horizontal Scaling Architecture                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────┐                                                     │
│  │  Nginx   │ ← 负载均衡 + SSL终止 + 静态资源                    │
│  └────┬─────┘                                                     │
│       │                                                           │
│  ┌────▼──────────────────────────┐                                │
│  │     API Server (可水平扩展)     │                                │
│  │  ┌──────┐  ┌──────┐  ┌──────┐ │                                │
│  │  │ S1   │  │ S2   │  │ S3   │ │ ← 无状态, 可多实例部署         │
│  │  └──┬───┘  └──┬───┘  └──┬───┘ │                                │
│  └─────┼─────────┼─────────┼─────┘                                │
│        │         │         │                                      │
│  ┌─────▼─────────▼─────────▼─────┐                                │
│  │     Shared State Layer         │                                │
│  │  ┌──────────┐  ┌───────────┐  │                                │
│  │  │PostgreSQL│  │  Valkey   │  │ ← 有状态, 共享存储             │
│  │  │(Primary) │  │ (Standalone│  │                                │
│  │  │          │  │  or Cluster│  │                                │
│  │  └──────────┘  └───────────┘  │                                │
│  └───────────────────────────────┘                                │
│                                                                   │
│  ┌───────────────────────────────┐                                │
│  │  Microservices Worker         │                                │
│  │  ┌──────┐  ┌──────┐          │ ← BullMQ保证单次消费           │
│  │  │ W1   │  │ W2   │          │    可多实例但同队列不重复消费   │
│  │  └──────┘  └──────┘          │                                │
│  └───────────────────────────────┘                                │
│                                                                   │
│  ┌───────────────────────────────┐                                │
│  │  ML Service (单实例, GPU绑定)  │ ← GPU资源限制，通常单实例      │
│  │  如需扩展: 多ML实例+负载均衡   │    可通过Nginx upstream扩展   │
│  └───────────────────────────────┘                                │
│                                                                   │
│  扩展规则:                                                        │
│  1. API Server: CPU密集 → 按CPU使用率扩展 (target: 70%)          │
│  2. Worker: 队列积压 → 按队列长度扩展 (target: <100)             │
│  3. ML Service: GPU密集 → 按GPU使用率扩展 (target: 90%)          │
│  4. PostgreSQL: IO密集 → 垂直扩展 + 只读副本(Phase 4)            │
│  5. Valkey: 内存密集 → 垂直扩展 + Cluster模式(Phase 4)           │
│                                                                   │
│  Docker Compose水平扩展:                                          │
│  docker compose up -d --scale server=3                             │
│  (需配置Nginx upstream为server容器组)                              │
└──────────────────────────────────────────────────────────────────┘
```

### 10.3 Database Scaling Strategy
```sql
-- Phase 1-3: 单PG实例 + pgvector
-- Phase 4: 读写分离 + 分区

-- photos表分区策略 (10万+照片时启用)
-- 按user_id哈希分区，确保同一用户的照片在同一分区
-- 注意: pgvector HNSW索引不支持分区表，分区后需在每个分区单独建索引
-- 替代方案: 按时间范围分区(按年)，查询时利用时间条件裁剪分区

-- 方案A: 按年分区(推荐，与时间线查询匹配)
CREATE TABLE photos (
    -- 同原DDL字段
) PARTITION BY RANGE (created_at);

CREATE TABLE photos_2024 PARTITION OF photos
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE photos_2025 PARTITION OF photos
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE photos_default PARTITION OF photos DEFAULT;

-- 每个分区独立创建索引(包括HNSW向量索引)
CREATE INDEX idx_photos_2024_clip ON photos_2024 USING hnsw (clip_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- 方案B: 读写分离(Phase 4)
-- 主库: 写入 + 实时查询
-- 从库: 只读查询(搜索/浏览/统计)
-- 配置: docker-compose新增postgres-replica容器
-- 应用层: 读操作使用REPLICA_DB_URL，写操作使用DATABASE_URL

-- PG连接配置优化
-- 当前配置适用于4GB ARM设备:
--   shared_buffers=128MB, effective_cache_size=384MB, work_mem=8MB, max_connections=80
-- 8GB+设备推荐配置:
--   shared_buffers=256MB, effective_cache_size=768MB, work_mem=16MB, max_connections=100
--   maintenance_work_mem=128MB
```

### 10.4 ML Service Scaling
```yaml
# ML服务扩展方案
# 单实例配置(默认):
#   - 1个ML容器处理所有OCR/CLIP/Face请求
#   - 适合: 个人/家庭用户(<10k照片)

# 多实例配置(可选):
#   - 通过Nginx负载均衡多个ML实例
#   - 每个实例绑定不同GPU
#   - docker-compose.ml-scale.yml:

# ml-1:
#   build: ./ml
#   environment:
#     PORT: 3001
#     CUDA_VISIBLE_DEVICES: "0"
#   deploy:
#     resources:
#       reservations:
#         devices:
#           - capabilities: [gpu]

# ml-2:
#   build: ./ml
#   environment:
#     PORT: 3002
#     CUDA_VISIBLE_DEVICES: "1"

# nginx upstream配置:
# upstream ml_backend {
#   least_conn;
#   server ml-1:3001;
#   server ml-2:3002;
# }

# CPU模式(ARM64默认):
#   - 使用ONNX Runtime CPU推理
#   - 并发: OCR=1, CLIP=1, Face=1 (避免CPU争抢)
#   - 批处理: 启用batch API提升吞吐
#   - 内存需求: ≥4GB (模型加载)
```

### 10.4.1 ML扩展功能 (P2, Phase 4)

```yaml
# 物体识别/Visual Look Up (P2):
#   - 模型: YOLOv8-nano (轻量级目标检测, ~6MB)
#   - 检测类别: 80类COCO数据集(人/车/动物/家具/食物等)
#   - API: POST /api/ml/object-detect { image_base64 } → { objects: [{label, confidence, bbox}] }
#   - 存储: 新增photo_objects表 (photo_id, label, confidence, bbox)
#   - 触发: CLIP嵌入完成后可选触发(需Admin在system_config启用)
#   - 用途: 照片详情页显示识别的物体标签, 探索页按物体类别浏览

# 照片增强/AI去模糊 (P2):
#   - 模型: Real-ESRGAN (超分辨率+去模糊, ~17MB)
#   - API: POST /api/ml/enhance { image_base64, scale: 2|4 } → { enhanced_image_base64 }
#   - 限制: 仅对≤2MP图片增强, 大图自动降采样后增强
#   - 存储: 增强版本保存到photo_versions表(type='enhanced')
#   - 触发: 用户手动触发(照片详情页"AI增强"按钮), 不自动执行
#   - 资源: 单次增强约需5-10秒(CPU), 建议GPU加速
```

### 10.5 Valkey/Redis Scaling
```yaml
# 单实例(默认): 适合<50用户
# valkey:
#   command: valkey-server --maxmemory 256mb --maxmemory-policy allkeys-lru

# Cluster模式(Phase 4): 适合50+用户
# 使用Valkey Cluster分片队列数据
# BullMQ支持Redis Cluster模式
# 配置:
#   valkey-cluster:
#     image: valkey/valkey:9-alpine
#     command: valkey-server --cluster-enabled yes --cluster-config-file nodes.conf

# 内存策略:
#   - maxmemory: 物理内存的50%
#   - maxmemory-policy: allkeys-lru (LRU淘汰不常用key)
#   - 队列数据不设TTL(由BullMQ管理)
#   - 缓存数据设TTL(5min-1h)
#   - SSE Pub/Sub数据不持久化(临时消息)
```

## 11. Reliability Architecture

### 11.1 Database Migration Framework
```typescript
// 使用node-pg-migrate作为数据库迁移框架
// 替代单一001_init.sql文件，支持版本化迁移和回滚

// 安装: npm install node-pg-migrate
// 配置: package.json scripts:
//   "migrate": "node-pg-migrate up"
//   "migrate:down": "node-pg-migrate down"
//   "migrate:create": "node-pg-migrate create"

// db-config.js (node-pg-migrate配置):
// module.exports = {
//   connectionString: process.env.DATABASE_URL,
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
// };
// 注意: node-pg-migrate自动读取DATABASE_URL环境变量

// 迁移文件命名: {timestamp}_{description}.js
// migrations/
//   20250101000000_init-schema.js      // 初始化所有表
//   20250102000000_add-2fa-fields.js   // 添加2FA字段
//   20250103000000_add-smart-albums.js // 添加智能相册表
//   20250104000000_add-shared-libraries.js
//   20250105000000_add-system-config.js
//   20250106000000_add-activity-logs-partition.js

// 迁移文件示例:
// exports.up = (pgm) => {
//   pgm.createTable('smart_albums', { ... });
//   pgm.addIndex('smart_albums', ['user_id']);
// };
// exports.down = (pgm) => {
//   pgm.dropTable('smart_albums');
// };

// Docker启动时自动执行迁移:
// 通过 entrypoint.sh 脚本在应用启动前执行迁移
// entrypoint.sh 使用 PostgreSQL Advisory Lock (pg_advisory_lock) 确保
// 即使 docker compose up --scale server=N 多实例并发启动，也只有一个实例执行迁移
// 其他实例等待锁释放后跳过迁移（迁移已执行），直接启动应用
//
// entrypoint.sh 核心逻辑（见 scripts/entrypoint.sh）:
//   1. 等待 PostgreSQL 就绪（pg_isready 轮询，最多30次×2秒）
//   2. 尝试获取 Advisory Lock (key=123456)
//   3. 获取锁成功后执行 npx node-pg-migrate up
//   4. 释放锁
//   5. 无论是否执行迁移，最终 exec "$@" 启动应用
//
// 竞赛安全性:
//   - PG Advisory Lock 是原子操作，确保只有一个连接获取到锁
//   - 获取失败的实例跳过迁移（已被其他实例执行），直接 exec 启动
//   - node-pg-migrate 自身也维护 pgmigrations 表去重（幂等操作）
```

### 11.2 ML Service Circuit Breaker
```typescript
// ML服务熔断器: 防止ML服务宕机时整个处理链路阻塞
// 使用cockatiel库实现熔断器模式

import { CircuitBreaker, Policy } from 'cockatiel';

const mlCircuitBreaker = new CircuitBreaker({
  halfOpenAfter: 30 * 1000,     // 30秒后尝试半开
  breaker: new CircuitBreaker.Breaker(5, 60000), // 60秒内5次失败则熔断
});

const mlRetry = Policy.handleAll()
  .retry()
  .attempts(2)
  .exponential({ maxDelay: 10000 });

// 包装ML调用
export async function callMLService<T>(
  endpoint: string,
  data: unknown
): Promise<T> {
  return mlRetry.execute(() =>
    mlCircuitBreaker.execute(async () => {
      const response = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(60000), // 60秒超时
      });
      if (!response.ok) {
        throw new Error(`ML Service error: ${response.status}`);
      }
      return response.json();
    })
  );
}

// 熔断状态监控
mlCircuitBreaker.onBreak(() => {
  logger.error('ML Service circuit breaker OPEN - service unavailable');
  publishSSE('admin', 'ml-service-down', { status: 'circuit-open' });
});
mlCircuitBreaker.onReset(() => {
  logger.info('ML Service circuit breaker CLOSED - service recovered');
  publishSSE('admin', 'ml-service-recovered', { status: 'circuit-closed' });
});

// Worker中使用:
// 当ML服务熔断时，Worker将任务标记为failed，等待ML恢复后重试
// BullMQ的attempts和backoff配置确保自动重试
```

### 11.3 Graceful Shutdown
```typescript
// 优雅关闭: 确保SIGTERM时进行中的任务完成后再退出

// API Server优雅关闭
function setupGracefulShutdown(server: Server) {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // 1. 停止接受新连接
    server.close(() => logger.info('HTTP server closed'));

    // 2. 等待进行中的请求完成(最多30秒)
    await new Promise(resolve => setTimeout(resolve, 30000));

    // 3. 关闭数据库连接池
    await pool.end();

    // 4. 关闭Redis连接
    redis.disconnect();

    // 5. 退出进程
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Worker优雅关闭
async function setupWorkerShutdown(workers: Record<string, Worker>) {
  const shutdown = async (signal: string) => {
    logger.info(`Worker received ${signal}, graceful shutdown...`);

    // 1. 关闭所有Worker(停止消费新任务)
    for (const [name, worker] of Object.entries(workers)) {
      await worker.close(false); // false = 不强制，等待当前任务完成
    }

    // 2. 等待当前任务完成(最多60秒)
    await new Promise(resolve => setTimeout(resolve, 60000));

    // 3. 关闭连接
    await pool.end();
    redis.disconnect();

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Docker配置配合:
// docker-compose.yml:
//   stop_grace_period: 60s  # 给容器60秒时间优雅关闭
//   healthcheck:
//     test: ["CMD", "curl", "-f", "http://localhost:3000/api/server/ping"]
```

### 11.4 Database Connection Resilience
```typescript
// 数据库连接重试和恢复策略
// 问题: PG/Redis断连后无自动恢复，服务永久不可用
// 方案: 连接池自动重连 + 应用层重试

// PG连接池自动恢复:
// pg Pool内置重连机制:
// - 连接断开时自动从池中移除
// - 新请求自动创建新连接
// - 配置connectionTimeoutMillis避免无限等待

// 应用层重试(关键操作):
import { Policy } from 'cockatiel';

const dbRetry = Policy.handleAll()
  .retry()
  .attempts(3)
  .exponential({ maxDelay: 5000 });

// 使用示例:
export async function queryWithRetry(text: string, params: any[]) {
  return dbRetry.execute(() => pool.query(text, params));
}

// Redis连接恢复:
// ioredis内置重连机制(retryStrategy配置)
// 额外: BullMQ队列自动重连
// BullMQ Worker在Redis断连时:
//   - 暂停消费新任务
//   - 当前任务标记为stalled
//   - Redis恢复后自动恢复消费
//   - stalled任务自动重新分配

// 健康检查端点增强:
// GET /api/server/ping 返回:
// {
//   status: "ok" | "degraded" | "unhealthy",
//   services: {
//     database: { status: "ok", latency: 2 },
//     redis: { status: "ok", latency: 1 },
//     ml: { status: "ok", models: ["ocr","clip","face"] },
//     storage: { status: "ok", freeSpace: "50GB" }
//   }
// }
// degraded: 非核心服务(Redis/ML)不可用，核心功能仍可用
// unhealthy: 核心服务(Database)不可用
```

### 11.5 Data Backup and Recovery
```bash
#!/bin/bash
# 备份脚本: scripts/backup.sh
# 策略: 全量备份(数据库+配置) + 增量备份(上传文件)

set -e

BACKUP_DIR=/app/backups
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="ai-album-backup-${DATE}.tar.gz"

# 1. 数据库备份(pg_dump)
docker compose exec -T postgres pg_dump -U aialbum -Fc aialbum > "${BACKUP_DIR}/db-${DATE}.dump"

# 2. 系统配置备份
docker compose exec -T postgres pg_dump -U aialbum -t system_config -t users --data-only aialbum > "${BACKUP_DIR}/config-${DATE}.sql"

# 3. Valkey持久化(触发BGSAVE)
docker compose exec valkey valkey-cli BGSAVE
docker cp ai-album-valkey:/data/dump.rdb "${BACKUP_DIR}/valkey-${DATE}.rdb"

# 4. 打包备份文件
tar czf "${BACKUP_DIR}/${BACKUP_FILE}" \
  "${BACKUP_DIR}/db-${DATE}.dump" \
  "${BACKUP_DIR}/config-${DATE}.sql" \
  "${BACKUP_DIR}/valkey-${DATE}.rdb" \
  .env \
  docker-compose.yml

# 5. 清理临时文件
rm "${BACKUP_DIR}/db-${DATE}.dump" "${BACKUP_DIR}/config-${DATE}.sql" "${BACKUP_DIR}/valkey-${DATE}.rdb"

# 6. 保留最近7天备份
find ${BACKUP_DIR} -name "ai-album-backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_DIR}/${BACKUP_FILE}"

# 恢复脚本: scripts/restore.sh
# 1. 停止服务: docker compose down
# 2. 解压备份: tar xzf backup-file.tar.gz
# 3. 恢复数据库: pg_restore -U aialbum -d aialbum db.dump
# 4. 恢复Valkey: docker cp dump.rdb ai-album-valkey:/data/dump.rdb
# 5. 启动服务: docker compose up -d
# 6. 验证: curl http://localhost/api/server/ping
```

### 11.5.1 一键安装脚本 (scripts/install.sh)

```bash
#!/bin/bash
# scripts/install.sh — AI Album一键安装脚本
# 适用系统: Ubuntu 22.04 LTS (ARM64/x86_64)
# 前置条件: 无(脚本自动安装Docker)
# 使用方式: curl -fsSL https://raw.githubusercontent.com/user/aialbum/main/scripts/install.sh | bash
# 或: wget -qO- https://raw.githubusercontent.com/user/aialbum/main/scripts/install.sh | bash

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 1. 系统检查
info "Checking system requirements..."
[ "$(id -u)" -eq 0 ] || error "Please run as root (sudo)"
[ -f /etc/os-release ] || error "Unsupported OS"
source /etc/os-release
[[ "$ID" == "ubuntu" && "$VERSION_ID" == "22.04" ]] || warn "This script is designed for Ubuntu 22.04, your system: $ID $VERSION_ID"

# 检查架构
ARCH=$(dpkg --print-architecture)
info "System architecture: $ARCH"

# 2. 安装Docker
if ! command -v docker &> /dev/null; then
    info "Installing Docker..."
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$ARCH signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl start docker
    systemctl enable docker
    info "Docker installed successfully"
else
    info "Docker already installed: $(docker --version)"
fi

# 3. 安装postgresql-client(用于备份和健康检查)
if ! command -v pg_isready &> /dev/null; then
    info "Installing postgresql-client..."
    apt-get install -y postgresql-client
fi

# 4. 创建安装目录
INSTALL_DIR="/opt/ai-album"
info "Creating installation directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 5. 生成随机密码
generate_password() {
    openssl rand -base64 32 | tr -d '/+=' | head -c 32
}

DB_PASSWORD=$(generate_password)
VALKEY_PASSWORD=$(generate_password)
JWT_SECRET=$(generate_password)

info "Generated secure passwords"

# 6. 创建.env文件
cat > .env << EOF
NODE_ENV=production
PORT=3000
ML_SERVICE_URL=http://ml:3001

DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://aialbum:${DB_PASSWORD}@postgres:5432/aialbum
REDIS_URL=redis://:${VALKEY_PASSWORD}@valkey:6379

VALKEY_PASSWORD=${VALKEY_PASSWORD}

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

UPLOAD_LOCATION=/app/uploads
THUMBNAIL_LOCATION=/app/thumbnails
MAX_FILE_SIZE=200mb

OCR_LANGUAGES=chi_sim+eng+jpn
CLIP_MODEL=XLM-Roberta-Large-Vit-B-16Plus
FACE_MODEL=buffalo_l

ADMIN_EMAIL=admin@example.com

OAUTH_GITHUB_CLIENT_ID=
OAUTH_GITHUB_CLIENT_SECRET=
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
EOF

chmod 600 .env
info "Created .env with secure passwords"

# 7. 下载docker-compose.yml和nginx.conf
# 注意: 实际部署时这些文件应从GitHub Release下载
# 此处假设已从源码构建Docker镜像并推送到Registry
# 如果从源码构建，需要先git clone并docker compose build

GITHUB_REPO="${GITHUB_REPO:-ai-album/ai-album}"
RELEASE_VERSION="${RELEASE_VERSION:-latest}"

info "Downloading configuration files..."
curl -fsSL "https://raw.githubusercontent.com/${GITHUB_REPO}/main/docker-compose.yml" -o docker-compose.yml || error "Failed to download docker-compose.yml"
curl -fsSL "https://raw.githubusercontent.com/${GITHUB_REPO}/main/nginx.conf" -o nginx.conf || error "Failed to download nginx.conf"
curl -fsSL "https://raw.githubusercontent.com/${GITHUB_REPO}/main/scripts/entrypoint.sh" -o scripts/entrypoint.sh || true
mkdir -p ssl backups scripts

# 8. 拉取Docker镜像
info "Pulling Docker images (this may take a while)..."
docker compose pull || error "Failed to pull Docker images"

# 9. 启动服务
info "Starting AI Album services..."
docker compose up -d

# 10. 等待服务就绪
info "Waiting for services to be ready..."
MAX_WAIT=180
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -sf http://localhost/api/server/ping > /dev/null 2>&1; then
        echo ""
        info "AI Album is ready!"
        break
    fi
    sleep 5
    WAITED=$((WAITED + 5))
    echo -n "."
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo ""
    warn "Services are still starting. Check status: docker compose ps"
fi

# 11. 输出安装信息
echo ""
echo "=========================================="
echo -e "${GREEN}  AI Album installed successfully!${NC}"
echo "=========================================="
echo ""
echo "  URL:         http://$(hostname -I | awk '{print $1}')"
echo "  Admin Email: admin@example.com"
echo "  Config:      ${INSTALL_DIR}/.env"
echo "  Data:        Docker volumes (pgdata, uploads, thumbnails)"
echo "  Backups:     ${INSTALL_DIR}/backups/"
echo ""
echo "  Next steps:"
echo "  1. Open the URL in your browser"
echo "  2. Complete the setup wizard"
echo "  3. Change the admin password"
echo "  4. (Optional) Configure SSL: edit nginx.conf and place certs in ssl/"
echo ""
echo "  Useful commands:"
echo "  docker compose logs -f        # View logs"
echo "  docker compose ps             # Check status"
echo "  docker compose down           # Stop services"
echo "  docker compose up -d          # Start services"
echo "  bash scripts/backup.sh        # Create backup"
echo ""
echo -e "${YELLOW}  IMPORTANT: Save the passwords in ${INSTALL_DIR}/.env securely!${NC}"
echo "=========================================="
```

### 11.6 Rate Limiting and Security
```typescript
// 限流策略增强
// 问题: 当前限流配置不够细化
// 方案: 分级限流 + IP黑名单 + 请求大小限制

// 限流配置:
const rateLimits = {
  // 全局限流: 每IP每分钟100请求
  global: {
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  },
  // 认证接口: 每IP每分钟5次(防暴力破解)
  auth: {
    windowMs: 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true, // 成功请求不计入(避免正常用户被限)
  },
  // 上传接口: 每用户每分钟10次
  upload: {
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => req.user?.userId || req.ip,
  },
  // 搜索接口: 每用户每分钟30次(语义搜索消耗ML资源)
  search: {
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: (req) => req.user?.userId || req.ip,
  },
  // ML相关操作: 每用户每小时5次(重复检测/年度回顾等重操作)
  heavyOperation: {
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.user?.userId,
  },
};

// 文件上传安全:
// - 文件大小限制: MAX_FILE_SIZE (默认200MB)
// - MIME类型白名单: image/jpeg, image/png, image/webp, image/heic, image/avif,
//                    video/mp4, video/quicktime, video/webm
// - 文件扩展名验证
// - 文件内容验证(magic number检查, 不信任Content-Type)
// - 文件名消毒(移除路径遍历字符)
// - 病毒扫描(可选, 调用ClamAV)

// IP白名单 (P2 Feature, Phase 4):
// Admin可在系统配置中设置允许访问的IP范围
// 配置存储: system_config表 key='ip_whitelist', value={ enabled: boolean, allowedRanges: string[] }
// 示例: { enabled: true, allowedRanges: ['192.168.1.0/24', '10.0.0.0/8', '203.0.113.50'] }
// 中间件实现: ipWhitelistMiddleware (在authMiddleware之前执行)
//   1. 读取system_config中ip_whitelist配置
//   2. 如果enabled=false: 跳过检查, next()
//   3. 获取客户端IP: req.ip或X-Forwarded-For(需trust proxy)
//   4. 检查IP是否在allowedRanges内(使用ip-range-check库, 支持CIDR)
//   5. 不在白名单: 403 { message: 'Access denied' }
//   6. 在白名单: next()
// 注意: /api/server/ping端点不受IP白名单限制(健康检查需要)
// 注意: Admin可配置白名单时需确保自身IP在范围内, 否则锁定
```

```typescript
// authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
}

// photoStore.ts
interface PhotoState {
  photos: Photo[];
  total: number;
  currentPage: number;
  isLoading: boolean;
  selectedPhoto: Photo | null;
  fetchPhotos: (page: number) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
}

// searchStore.ts
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

// uiStore.ts
interface UIState {
  sidebarOpen: boolean;
  theme: 'dark' | 'light' | 'system';
  effectiveTheme: 'dark' | 'light';
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
}

// notificationStore.ts (新增)
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
```

### 8.8 Phased Implementation Plan

#### Phase 1 - MVP (核心功能)
**目标**: 基本的照片上传、浏览、搜索能力

| 步骤 | 内容 | 依赖 |
|------|------|------|
| 1.1 | 项目初始化 (vite react-express-ts) | 无 |
| 1.2 | 数据库迁移脚本 + 共享类型定义 | 1.1 |
| 1.3 | 认证: 注册/登录/JWT中间件 | 1.2 |
| 1.4 | 照片上传API + 文件存储 | 1.3 |
| 1.5 | 缩略图生成Worker (sharp) | 1.4 |
| 1.6 | EXIF元数据提取Worker | 1.5 |
| 1.7 | 前端: 登录/注册页 | 1.3 |
| 1.8 | 前端: 首页时间线 (照片网格) | 1.6 |
| 1.9 | 前端: 照片详情页 (EXIF+下载) | 1.8 |
| 1.10 | 前端: 上传页 (拖拽+进度) | 1.4 |
| 1.11 | Docker Compose本地开发环境 | 1.2 |

**交付物**: 可上传照片、浏览时间线、查看详情

#### Phase 2 - AI功能
**目标**: OCR + CLIP语义搜索 + 人脸识别

| 步骤 | 内容 | 依赖 |
|------|------|------|
| 2.1 | ML Service搭建 (FastAPI + 基础框架) | Phase 1 |
| 2.2 | OCR端点 (PaddleOCR) + OCR Worker | 2.1 |
| 2.3 | CLIP端点 (ONNX Runtime) + CLIP Worker | 2.1 |
| 2.4 | 人脸检测端点 (InsightFace) + Face Worker | 2.1 |
| 2.5 | 搜索API: 文本+OCR+语义+混合 | 2.2, 2.3 |
| 2.6 | 前端: 搜索页 (多模式切换) | 2.5 |
| 2.7 | 前端: 照片详情页增加OCR文本 | 2.2 |
| 2.8 | 前端: 探索页-人物浏览 | 2.4 |
| 2.9 | 反向地理编码Worker | Phase 1 |
| 2.10 | 前端: 地图页 (Leaflet) | 2.9 |

**交付物**: AI搜索、OCR文本、人脸识别、地图浏览

#### Phase 3 - 社交与管理
**目标**: 相册、分享、管理功能

| 步骤 | 内容 | 依赖 |
|------|------|------|
| 3.1 | 相册CRUD API | Phase 1 |
| 3.2 | 共享相册 + 协作者 | 3.1 |
| 3.3 | 公开分享链接 | 3.1 |
| 3.4 | 伙伴共享 | Phase 1 |
| 3.5 | 标签系统 | Phase 1 |
| 3.6 | 收藏/归档功能 | Phase 1 |
| 3.7 | 回忆功能 (X年前的今天) | Phase 1 |
| 3.8 | Admin: 用户管理 + 任务队列 | Phase 1 |
| 3.9 | 外部库管理 + 扫描Worker | Phase 1 |
| 3.10 | 照片堆叠 (Stack) | Phase 1 |
| 3.11 | 前端: 相册页/分享页/管理页 | 3.1-3.10 |

**交付物**: 完整社交功能和管理后台

#### Phase 4 - 高级功能
**目标**: OAuth、API密钥、存储模板等

| 步骤 | 内容 | 依赖 |
|------|------|------|
| 4.1 | OAuth登录 (GitHub/Google) | Phase 1 |
| 4.2 | API密钥 | Phase 1 |
| 4.3 | 自定义存储模板 | Phase 1 |
| 4.4 | 重复检测 (感知哈希) | Phase 1 |
| 4.5 | 文件夹视图 | Phase 1 |
| 4.6 | Ubuntu ARM部署脚本 + 生产Docker | 全部 |

**交付物**: 生产级部署和高级功能

#### Phase 5 - 商业化功能 (可选)
**目标**: SaaS化运营、订阅计费、白标定制

| 步骤 | 内容 | 依赖 |
|------|------|------|
| 5.1 | 订阅计划DDL + 订阅管理API | Phase 1 |
| 5.2 | Stripe Checkout集成 + Webhook | 5.1 |
| 5.3 | AI功能配额中间件 (planLimits) | 5.1 |
| 5.4 | 多租户DDL (tenants表) + 租户隔离中间件 | Phase 1 |
| 5.5 | 白标配置API (Logo/颜色/登录页) | Phase 1 |
| 5.6 | 品牌定制前端 (CSS变量动态加载) | 5.5 |
| 5.7 | 运营统计API (DAU/MRR/留存) | 5.1 |
| 5.8 | 营销页面 (Next.js或静态站) | 无 |
| 5.9 | 会话管理 (sessions表 + 会话撤销) | Phase 1 |
| 5.10 | 通知系统 (notifications表 + SSE推送 + 邮件通知) | Phase 1 |
| 5.11 | 相册活动/评论 (activities表 + 评论/点赞) | Phase 3 |
| 5.12 | 系统配置管理 (system_config表 + 动态配置) | Phase 1 |
| 5.13 | 服务器信息 + 版本检查 | Phase 1 |
| 5.14 | 邀请奖励 (invitations表 + 双方奖励) | 5.1 |
| 5.15 | 反馈收集 (feedback表 + 反馈组件) | Phase 1 |

**交付物**: 可商业运营的SaaS平台

### 12. Commercial Architecture (Phase 5)

#### 12.1 Subscription & Billing

**DDL - 新增表:**
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  price_monthly INTEGER NOT NULL,
  storage_bytes BIGINT NOT NULL,
  ai_features JSONB NOT NULL DEFAULT '{}',
  max_users INTEGER NOT NULL DEFAULT 1,
  api_calls_monthly INTEGER NOT NULL,
  stripe_price_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  stripe_subscription_id VARCHAR(100),
  stripe_customer_id VARCHAR(100),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'cny',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  stripe_invoice_id VARCHAR(100),
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  owner_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}',
  storage_quota BIGINT,
  storage_used BIGINT NOT NULL DEFAULT 0,
  user_count INTEGER NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_owner ON tenants(owner_id);
CREATE INDEX idx_tenants_domain ON tenants(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_tenants_status ON tenants(status);

CREATE TABLE tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user ON tenant_members(user_id);

-- users表添加tenant_id列(Phase 5迁移)
-- ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
-- CREATE INDEX idx_users_tenant ON users(tenant_id);
-- 所有查询添加WHERE tenant_id = $1实现行级隔离

CREATE TABLE usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  counter_type VARCHAR(50) NOT NULL,
  counter_value INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  UNIQUE(tenant_id, user_id, counter_type, period_start)
);

CREATE INDEX idx_usage_counters_lookup ON usage_counters(tenant_id, user_id, counter_type, period_start);
```

#### 12.2 Plan Limits Middleware (planLimits.ts)

```typescript
// src/api/middleware/planLimits.ts
// 用途: 在API端点执行前检查用户订阅计划的功能限制
// Phase 5启用，Phase 1-4所有限制设为无限(不阻断)
//
// 检查流程:
//   1. 从req.user获取userId
//   2. 查询subscriptions表获取当前plan_id
//   3. 查询subscription_plans表获取ai_features和storage_bytes
//   4. 查询usage_counters表获取当月用量
//   5. 判断是否超限
//
// 限制项与API端点映射:

// | 限制项 | 检查端点 | 免费计划 | 基础计划 | 专业计划 | 企业计划 |
// |--------|----------|----------|----------|----------|----------|
// | 存储空间 | POST /api/photos/upload | 5GB | 50GB | 500GB | 无限 |
// | OCR语言 | POST /api/ml/ocr | 仅eng | chi_sim+eng+jpn | 全语言 | 全语言 |
// | CLIP处理张数 | (内部Worker检查) | 1000张/月 | 无限 | 无限 | 无限 |
// | 人脸聚类人数 | GET /api/persons | 0人(禁用) | 5人 | 无限 | 无限 |
// | API调用次数 | 全局 | 1000/月 | 10000/月 | 50000/月 | 无限 |
// | 用户数 | POST /api/admin/users | 1 | 1 | 5 | 无限 |
// | 分享链接数 | POST /api/share | 5/月 | 50/月 | 无限 | 无限 |
// | 批量下载数 | POST /api/photos/download | 3/月 | 10/月 | 无限 | 无限 |

// 实现模式: Express中间件工厂函数
//
// function requirePlanLimit(limitType: string) {
//   return async (req: Request, res: Response, next: NextFunction) => {
//     if (process.env.ENABLE_BILLING !== 'true') return next(); // Phase 1-4跳过
//
//     const plan = await getActivePlan(req.user.userId);
//     const usage = await getMonthlyUsage(req.user.userId, limitType);
//     const limit = plan.limits[limitType];
//
//     if (limit === -1) return next(); // -1 = 无限
//     if (usage >= limit) {
//       return res.status(402).json({
//         error: {
//           code: 'PLAN_LIMIT_EXCEEDED',
//           message: `${limitType}配额已用尽`,
//           limit,
//           usage,
//           upgradeUrl: '/settings/subscription'
//         }
//       });
//     }
//
//     // 用量+1(异步，不阻断请求)
//     incrementUsage(req.user.userId, limitType).catch(() => {});
//     next();
//   };
// }
//
// 使用方式:
// router.post('/photos/upload', auth, requirePlanLimit('storage'), uploadHandler);
// router.post('/share', auth, requirePlanLimit('share_links'), shareHandler);
```

#### 12.3 Stripe Webhook处理

```typescript
// src/api/routes/subscriptions.ts — Stripe Webhook处理逻辑
//
// Webhook端点: POST /api/subscriptions/webhook
// 安全: 必须验证Stripe签名(stripe.webhooks.constructEvent)
// Stripe签名密钥: STRIPE_WEBHOOK_SECRET 环境变量
//
// 处理的Webhook事件:
//
// | 事件 | 处理逻辑 |
// |------|----------|
// | checkout.session.completed | 1. 从session.metadata获取userId和planId |
// |                            | 2. 创建subscriptions记录(status=active) |
// |                            | 3. 更新users.storage_quota为plan对应值 |
// |                            | 4. 发送欢迎邮件(welcome-premium模板) |
// |                            | 5. 创建通知"订阅成功" |
// | customer.subscription.updated | 1. 从subscription对象获取plan变更 |
// |                               | 2. 更新subscriptions记录 |
// |                               | 3. 如果升级: 更新storage_quota, 发送升级通知 |
// |                               | 4. 如果降级: 标记cancel_at_period_end, 不立即降级 |
// | customer.subscription.deleted | 1. 更新subscriptions.status=cancelled |
// |                               | 2. 降级到免费计划(见12.4降级策略) |
// |                               | 3. 更新storage_quota为5GB |
// |                               | 4. 发送取消确认邮件 |
// | invoice.payment_succeeded | 1. 创建invoices记录(status=paid) |
// |                           | 2. 重置月度usage_counters |
// |                           | 3. 发送收据邮件(subscription-receipt模板) |
// | invoice.payment_failed | 1. 更新subscriptions.status=past_due |
// |                        | 2. 发送支付失败邮件(含重试链接) |
// |                        | 3. 7天后仍失败→自动降级到免费计划 |
// | customer.subscription.trial_will_end | 1. 发送试用到期提醒邮件(到期前3天) |
// |                                      | 2. 创建通知"试用即将到期" |
//
// Webhook签名验证:
// const sig = req.headers['stripe-signature'];
// const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
// 如果验证失败返回400(防止伪造Webhook攻击)
//
// 幂等性保证:
// 每个Webhook事件通过event.id去重
// 处理前检查: SELECT 1 FROM processed_events WHERE event_id = $1
// 处理后记录: INSERT INTO processed_events (event_id, event_type, processed_at)
```

#### 12.4 订阅降级策略

```
当用户取消订阅或支付失败导致降级时，超出免费配额的数据处理策略:

**原则: 永不删除用户数据，仅限制访问**

| 场景 | 处理策略 | 用户体验 |
|------|----------|----------|
| 存储超限(>5GB) | 超出部分照片标记为"archived_by_plan" | 时间线隐藏，详情页显示"升级计划查看"横幅 |
| CLIP处理超限 | 超出部分不执行CLIP推理 | 语义搜索不包含这些照片，其他搜索正常 |
| 人脸聚类超限 | 保留已有聚类结果，不新增 | 新上传照片不执行人脸检测 |
| 分享链接超限 | 已有链接保持有效，不可创建新链接 | 分享按钮显示"升级计划" |
| 批量下载超限 | 禁止批量下载 | 单张仍可下载 |

**降级执行流程:**
1. Stripe Webhook: customer.subscription.deleted
2. 更新 subscriptions.status = 'cancelled'
3. 更新 users.storage_quota = 5GB (免费计划)
4. 不修改任何照片数据(不删除、不隐藏)
5. 超出5GB的照片: 添加标记 archived_by_plan=true (新列，Phase 5迁移)
6. 前端: archived_by_plan=true的照片在时间线灰色显示，点击提示"升级计划查看"
7. 用户仍可搜索和查看这些照片(只读)，但不能上传新照片
8. 重新订阅后: 移除archived_by_plan标记，恢复正常

**支付失败宽限期:**
- 第1次失败: 发送提醒邮件，服务不受影响
- 第2次失败(3天后): 发送警告邮件，服务不受影响
- 第3次失败(7天后): 自动降级到免费计划
- 期间用户可手动更新支付方式(Stripe客户门户)
```

#### 12.5 计费周期与用量重置

```typescript
// 用量计数和重置机制
//
// 1. 用量计数表: usage_counters (见12.1 DDL)
//    - 每次API调用时 INCREMENT counter_value
//    - 按 (tenant_id, user_id, counter_type, period_start) 唯一
//
// 2. 计费周期对齐:
//    - Stripe订阅的current_period_start/end决定计费周期
//    - usage_counters的period_start/end与Stripe周期对齐
//    - 首次创建订阅时初始化计数器
//
// 3. 用量重置(每月):
//    方式A: Stripe Webhook invoice.payment_succeeded 触发重置
//    方式B: BullMQ定时任务每月1日00:00(UTC)检查并重置
//    推荐: 双重保障(A为主，B为兜底)
//
//    重置逻辑:
//    async function resetMonthlyUsage() {
//      // 查找所有period_end < NOW()的活跃计数器
//      const expired = await db.query(
//        `SELECT DISTINCT tenant_id, user_id, counter_type
//         FROM usage_counters
//         WHERE period_end < NOW()`
//      );
//      // 为每个用户创建新的计数器周期
//      for (const row of expired) {
//        const periodStart = startOfMonth(new Date());
//        const periodEnd = endOfMonth(new Date());
//        await db.query(
//          `INSERT INTO usage_counters (tenant_id, user_id, counter_type, period_start, period_end, counter_value)
//           VALUES ($1, $2, $3, $4, $5, 0)
//           ON CONFLICT DO NOTHING`
//        );
//      }
//    }
//
// 4. 用量查询API:
//    GET /api/subscriptions/usage → { storage: {used, limit}, apiCalls: {used, limit}, ... }
//    前端在设置页和首页统计区显示用量进度条
//
// 5. 用量预警:
//    - 80%用量: 黄色Toast提醒
//    - 95%用量: 红色Toast + 邮件通知
//    - 100%用量: 402响应 + 升级弹窗
```

#### 12.6 免费试用期

```typescript
// 免费试用实现规格
//
// 1. 注册时自动创建试用:
//    - 注册成功后创建subscriptions记录
//    - status = 'trialing'
//    - plan_id = 专业计划ID
//    - trial_ends_at = NOW() + 14天
//    - stripe_customer_id = null (试用期间不创建Stripe客户)
//
// 2. 试用期间:
//    - 享受专业计划全部功能
//    - 设置页显示"试用剩余X天"+ "立即订阅"按钮
//    - 到期前3天发送提醒邮件
//    - 到期前1天发送最后提醒邮件
//
// 3. 试用到期处理:
//    - BullMQ定时任务每小时检查trial_ends_at < NOW()的订阅
//    - 更新status = 'expired'
//    - 降级到免费计划(见12.4降级策略)
//    - 发送"试用已到期"邮件(含订阅链接)
//    - 数据保留，不删除
//
// 4. 试用期间订阅:
//    - 用户点击"立即订阅"→创建Stripe Checkout Session
//    - Checkout成功→更新subscription.status = 'active'
//    - 设置stripe_customer_id和stripe_subscription_id
//    - 试用剩余天数折算不计费
//
// 5. 防滥用:
//    - 同一邮箱仅可试用一次(检查users表email)
//    - 同一设备仅可试用一次(检查sessions表device_info指纹)
//    - Admin可手动延长试用(更新trial_ends_at)
```

#### 12.7 支付安全策略

```
1. Stripe密钥管理:
   - STRIPE_SECRET_KEY: 仅服务端使用，不暴露到前端
   - STRIPE_PUBLISHABLE_KEY: 前端Checkout使用，可公开
   - STRIPE_WEBHOOK_SECRET: Webhook签名验证，仅服务端
   - 所有密钥通过环境变量注入，不硬编码
   - 生产环境密钥与测试环境密钥分离

2. Webhook签名验证:
   - 每个Webhook请求必须验证stripe-signature Header
   - 使用stripe.webhooks.constructEvent(rawBody, sig, secret)
   - 验证失败返回400，记录安全日志
   - 原始请求体(rawBody)必须保留，不可使用JSON解析后的数据

3. 防重复支付:
   - Stripe Checkout Session自带幂等性(idempotency_key)
   - 服务端创建Session前检查是否已有活跃订阅
   - Webhook处理使用event.id去重(processed_events表)

4. 金额验证:
   - Webhook中的金额必须与数据库中plan.price_monthly一致
   - 不一致时记录告警，不执行升级操作

5. 敏感数据:
   - 不存储完整信用卡号(Stripe处理，我们只存stripe_customer_id)
   - invoices表不存储卡号，仅存储stripe_invoice_id引用
   - PDF发票由Stripe生成，我们仅存储URL

6. 退款处理:
   - Admin可在Stripe Dashboard手动退款
   - 退款Webhook(charge.refunded)更新invoices.status = 'refunded'
   - 退款后不自动降级(由Admin决定)

7. 合规:
   - 中国用户: Stripe不支持CNY直接支付，需使用Stripe全球支付(支持支付宝/微信)
   - 或: 集成国内支付网关(如LemonSqueezy/Paddle)作为备选
   - 发票: 中国用户需提供增值税发票(手动开具或对接税务API)
```

**运营统计API (Phase 5, P3):**
```typescript
// GET /api/admin/analytics/overview (Admin)
// 返回: { dau, mau, newUsers, retentionRate, mrr, arr, arpu, churnRate }
// 数据来源: 从users/sessions/subscriptions表聚合计算
// 缓存: Redis缓存1小时, 避免频繁聚合查询

// GET /api/admin/analytics/usage (Admin)
// 返回: { featureUsage: { upload: N, search: N, ocr: N, clip: N, face: N }, storageByUser: [...] }
// 用途: Admin管理页收入仪表盘和用户行为统计图表
```

**营销页面 (Phase 5, P3):**
```yaml
# 独立静态站点(不集成到主应用), 使用Vite + React构建
# 部署: 可选Nginx独立serve或集成到主应用/public/landing/
# 页面:
#   / - 产品介绍(功能亮点/截图/视频)
#   /pricing - 定价页面(计划对比表+Stripe Checkout链接)
#   /download - 下载页面(Web/Mobile/CLI)
#   /docs - API文档(可选, 使用Swagger UI)
# SEO: 预渲染(SSG) + meta tags + structured data
```

### 19. Security Architecture Summary

**认证与授权安全:**
- JWT签名: HS256算法, 必须指定`{ algorithms: ['HS256'] }`防止算法混淆攻击
- JWT Payload: 包含jti(session ID)用于会话撤销, 批量失效通过DELETE sessions实现
- Session验证: 每次请求验证session存在性(SELECT 1 FROM sessions WHERE id = jti)
- 密码存储: bcryptjs, salt rounds=12
- API Key: SHA256哈希存储, 过期检查(expires_at), 权限限制(keyPermissions), 无admin权限
- 2FA: TOTP(HOTP RFC 4226), 恢复码crypto.randomBytes生成
- OAuth: state参数CSRF保护(Redis存储, 10分钟过期, 一次性使用)

**输入验证与注入防护:**
- SQL: 所有查询使用参数化($1, $2), ORDER BY使用白名单映射表(SORT_COLUMNS/SORT_DIRS)
- 文件上传: path.basename防止路径遍历, 文件名过滤特殊字符, MIME类型白名单, magic number验证
- 请求验证: Zod schema验证所有API输入
- 密码重置: token一次性使用(used_at标记), 1小时过期, 用户枚举防护(统一返回信息)

**Docker容器安全:**
- 所有容器: `security_opt: no-new-privileges:true`
- Server/ML容器: 以appuser非root用户运行
- 端口暴露: 仅Nginx暴露80/443到宿主机, 其余服务使用expose仅内部可达
- Valkey: 密码认证(`--requirepass`), AOF持久化
- PostgreSQL: 非默认用户(aialbum), 密码认证, 数据校验(--data-checksums)

**Nginx安全:**
- `server_tokens off`: 隐藏Nginx版本
- `proxy_intercept_errors on`: 隐藏上游错误细节
- 安全头: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy(HTTP和HTTPS均生效)
- HTTPS模式: HSTS, CSP, TLS 1.2+仅
- 限流: global(100r/m), auth(5r/m), upload(10r/m)
- 上传防护: 仅允许POST方法到上传端点

**信息泄露防护:**
- 错误响应: 生产环境不暴露堆栈/SQL/文件路径, 数据库错误统一返回500
- /api/server/info: 不暴露nodeVersion/database.version/size/redis.usedMemory
- /api/server/version: 普通用户仅返回updateAvailable布尔值, 不暴露latestVersion
- 日志: 不记录密码/JWT token/API Key/重置token, morgan不记录请求体
- CORS: 生产环境严格限制origin为FRONTEND_URL域名列表, 不使用'*'

**后门防护:**
- setup路由: 首次安装后自动禁用(SELECT setup_completed FROM system_config)
- 无硬编码密码: 所有密码通过环境变量传入, install.sh自动生成随机密码
- 无调试端口: 生产环境不暴露任何调试/管理端口
- 无默认admin账户: 首个注册用户自动成为Admin, 无预设账户

**Subscription APIs:**
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/subscriptions/plans | 列出所有订阅计划 |
| POST | /api/subscriptions/checkout | 创建Stripe Checkout Session |
| POST | /api/subscriptions/webhook | Stripe Webhook处理 |
| GET | /api/subscriptions/current | 获取当前用户订阅状态 |
| POST | /api/subscriptions/cancel | 取消订阅(期末降级) |
| POST | /api/subscriptions/portal | Stripe Customer Portal |

**AI功能配额中间件:**
```typescript
// middleware/planLimits.ts
const PLAN_LIMITS = {
  free:    { ocrLangs: ['en'], clipMax: 1000, faceCluster: false, apiCalls: 1000 },
  basic:   { ocrLangs: ['ch','en','ja'], clipMax: -1, faceCluster: true, faceMax: 5, apiCalls: 10000 },
  pro:     { ocrLangs: '*', clipMax: -1, faceCluster: true, faceMax: -1, apiCalls: 50000 },
  enterprise: { ocrLangs: '*', clipMax: -1, faceCluster: true, faceMax: -1, apiCalls: -1 },
};

async function planLimits(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  const subscription = await getActiveSubscription(user.id);
  const plan = subscription?.plan_name || 'free';
  const limits = PLAN_LIMITS[plan];
  // 检查AI功能配额...
}
```

#### 12.2 Multi-Tenancy

**DDL - 新增表:**
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  plan_id UUID REFERENCES subscription_plans(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE photos ADD COLUMN tenant_id UUID REFERENCES tenants(id);
-- 所有业务表添加tenant_id字段
```

**租户隔离中间件:**
```typescript
// middleware/tenantIsolation.ts
async function tenantIsolation(req: Request, res: Response, next: NextFunction) {
  const domain = req.hostname;
  const tenant = await getTenantByDomain(domain);
  if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
  req.tenantId = tenant.id;
  // 所有后续查询自动添加 WHERE tenant_id = $1
  next();
}
```

#### 12.3 White-Label / Branding

**DDL - 新增表:**
```sql
CREATE TABLE tenant_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id),
  logo_url TEXT,
  favicon_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#6366f1',
  login_background_url TEXT,
  login_title VARCHAR(100),
  login_description TEXT,
  email_header_logo_url TEXT,
  email_footer_text TEXT,
  hide_version_info BOOLEAN DEFAULT FALSE,
  app_name VARCHAR(50) DEFAULT 'AI Album',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.5 产品分析埋点架构 (Product Analytics)

> 商业化产品需要通过数据分析驱动产品迭代和运营决策。

#### 6.5.1 数据采集策略

```
采集原则:
  1. 仅匿名化采集（基于session ID，不关联到特定用户的照片内容）
  2. 不采集任何照片内容或元数据
  3. 自托管模式下用户可选择完全关闭
  4. 数据仅存储在本地PostgreSQL，不发送到任何第三方服务
```

#### 6.5.2 事件表 (analytics_events DDL)

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL,  -- 'page_view', 'feature_usage', 'performance', 'error'
  session_id VARCHAR(64),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_category ON analytics_events(event_category);
```

#### 6.5.3 埋点事件定义

```typescript
// shared/types/analytics.ts

export type EventCategory = 'page_view' | 'feature_usage' | 'performance' | 'error';

export interface AnalyticsEvent {
  eventName: string;
  eventCategory: EventCategory;
  sessionId: string;
  userId?: string;
  tenantId?: string;
  properties?: Record<string, any>;
}

// 核心事件清单 (通过POST /api/analytics/events 上报):

// === page_view ===
// - page_view.home              { referrer, loadTimeMs }
// - page_view.photo_detail      { photoId }
// - page_view.album_detail      { albumId }
// - page_view.person_detail     { personId }
// - page_view.search            { query, mode, resultCount }
// - page_view.settings          { section }

// === feature_usage ===
// - photos.upload               { count, totalSizeBytes, source: 'web'|'mobile' }
// - photos.download             { count, format: 'original'|'zip' }
// - photos.delete               { count, type: 'soft'|'permanent' }
// - photos.favorite             { action: 'add'|'remove' }
// - photos.edit                 { operations: ['crop'|'rotate'|'filter'] }
// - search.execute              { query, mode: 'text'|'ocr'|'semantic'|'hybrid', resultCount, durationMs }
// - album.create                { photoCount }
// - person.name                 { personId }
// - person.merge                { count }
// - share.create_link           { expiryHours, passwordProtected }
// - share.view                   { shareId, referrer }
// - mobile.backup_start         { photoCount }
// - mobile.backup_complete      { photoCount, durationMs }

// === performance ===
// - perf.api_response           { endpoint, method, statusCode, durationMs }
// - perf.image_load             { size: 'thumb_s'|'thumb_m'|'thumb_l', durationMs }
// - perf.page_load              { route, durationMs, firstContentfulPaintMs }

// === error ===
// - error.api                   { endpoint, method, statusCode, errorCode }
// - error.upload                { fileName, errorMessage, fileSize }
// - error.auth                  { type: 'login'|'register'|'reset', errorCode }
```

#### 6.5.4 前端埋点实现

```typescript
// src/hooks/useAnalytics.ts
import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

const SESSION_ID_KEY = 'analytics_session_id';

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

let eventBuffer: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushEvents() {
  if (eventBuffer.length === 0) return;
  const events = [...eventBuffer];
  eventBuffer = [];
  fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
    keepalive: true,
  }).catch(() => {}); // 静默失败，不影响用户体验
}

// 页面卸载时清空缓冲
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushEvents);
}

export function useAnalytics() {
  const track = useCallback((eventName: string, category: EventCategory, properties?: Record<string, any>) => {
    // 检查用户是否关闭了分析
    const analyticsEnabled = localStorage.getItem('analytics_enabled') !== 'false';
    if (!analyticsEnabled) return;

    eventBuffer.push({
      eventName,
      eventCategory: category,
      sessionId: getSessionId(),
      properties,
    });

    // 每10个事件或每5秒上报一次
    if (eventBuffer.length >= 10) {
      flushEvents();
    } else if (!flushTimer) {
      flushTimer = setTimeout(() => { flushTimer = null; flushEvents(); }, 5000);
    }
  }, []);

  return { track };
}
```

#### 6.5.5 后端接收API

```typescript
// POST /api/analytics/events
// Body: { events: AnalyticsEvent[] }
// 1. 验证 events 数组 (最多100个)
// 2. 对每个事件，如果已登录: 附加 userId
// 3. 批量 INSERT INTO analytics_events
// 4. 返回 { accepted: events.length }
//
// GET /api/admin/analytics/overview (管理员)
// 返回:
//   dailyActiveUsers: 近30天每日活跃用户数
//   monthlyActiveUsers: 近12月每月活跃用户数
//   topFeatures: 最常使用的功能 (TOP 10)
//   averageSessionDuration: 平均会话时长
//   totalPhotoCount: 总照片数趋势
//   uploadVolume: 上传量趋势 (TB/月)
//
// GET /api/admin/analytics/revenue (管理员)
// 返回: MRR/ARR/ARPU/流失率
```

#### 6.5.6 隐私开关

```typescript
// 系统配置: analytics_enabled (默认: true)
// 用户设置: PUT /api/settings { analytics_enabled: false }
// 自托管部署可通过环境变量: ANALYTICS_ENABLED=false 全局关闭
```

```

### 6.6 数据库连接池配置 (完整参数)

**Branding APIs:**
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/branding | 获取当前租户品牌配置(公开) |
| PUT | /api/admin/branding | 更新品牌配置(Admin) |
| POST | /api/admin/branding/logo | 上传Logo(Admin) |

**前端品牌动态加载:**
```typescript
// 前端在App.tsx中加载品牌配置
useEffect(() => {
  api.get('/api/branding').then(branding => {
    document.documentElement.style.setProperty('--color-primary', branding.primaryColor);
    document.title = branding.appName;
    // 更新Favicon等
  });
}, []);
```

### 13. Session Management Architecture (参考immich Sessions)

**DDL:**
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  device_info VARCHAR(500),
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
```

**会话管理流程:**
- 登录成功: INSERT INTO sessions + JWT包含jti claim(=session.id)
- 每次请求: 更新last_active_at (节流: 每5分钟更新一次)
- 登出: DELETE FROM sessions WHERE id = currentJti
- 登出所有: DELETE FROM sessions WHERE user_id = $1 AND id != currentJti
- JWT验证: 解码jti -> 查询sessions表 -> 不存在则拒绝(已撤销)

### 14. Notification Architecture (参考immich Notifications)

**DDL:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('system', 'share', 'processing', 'subscription', 'security')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

CREATE TABLE notification_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enable_email BOOLEAN DEFAULT TRUE,
  enable_in_app BOOLEAN DEFAULT TRUE,
  types JSONB DEFAULT '{"system":true,"share":true,"processing":true,"subscription":true,"security":true}'
);
```

**通知触发源:**
| 触发事件 | 通知类型 | 推送方式 |
|----------|----------|----------|
| 照片处理完成 | processing | SSE + 可选邮件 |
| 相册被分享 | share | SSE + 邮件 |
| 订阅变更 | subscription | SSE + 邮件 |
| 新设备登录 | security | SSE + 邮件 |
| 系统维护通知 | system | SSE + 邮件 |
| 存储空间告警 | system | SSE + 邮件 |

**SSE实时推送:** publishSSE(userId, 'notification', notification)
**邮件推送:** 使用email.service.ts发送HTML模板邮件

### 15. Activity Architecture (参考immich Activities)

**DDL:**
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('comment', 'like')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_album ON activities(album_id, created_at);
CREATE UNIQUE INDEX idx_activities_like_unique ON activities(album_id, user_id, asset_id) WHERE type = 'like';
```

**权限规则:**
- 评论/点赞: 相册成员(album_users)或相册owner
- 删除: 活动创建者 或 相册owner 或 Admin
- 点赞去重: 同一用户对同一照片/相册只能点赞一次(UNIQUE索引)

### 16. System Config Architecture (参考immich System Config)

**DDL:**
```sql
CREATE TABLE system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);
```

**配置加载策略:**
1. 启动时: SELECT * FROM system_config -> 缓存到内存Map
2. 读取: 优先内存缓存 -> 缺失则查DB -> 缺失则用硬编码默认值
3. 更新: UPDATE DB + 更新内存缓存 + 发布Redis Pub/Sub通知其他实例
4. 环境变量覆盖: 部分配置可通过环境变量覆盖(优先级: env > DB > default)

**配置分类:**
| 分类 | 配置项数 | 环境变量可覆盖 |
|------|----------|----------------|
| 认证 | 3 | 是 |
| 存储 | 2 | 是 |
| 回收站 | 2 | 否 |
| AI/ML | 6 | 是 |
| 通知 | 2 | 是 |
| 地图 | 3 | 是 |
| 注册 | 1 | 是 |

### 17. Server Info & Version Check Architecture (参考immich Server Info)

**API端点:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/server/ping | 无 | 健康检查 {"res":"pong"} |
| GET | /api/server/info | 用户 | 服务器状态信息 |
| GET | /api/server/stats | Admin | 详细统计数据 |
| GET | /api/server/version | 用户 | 版本信息 |
| POST | /api/server/version/check | Admin | 检查新版本 |

**版本检查机制:**
- 定时任务: 每天检查一次(Cron: 0 9 * * *)
- 检查方式: GET https://api.github.com/repos/{owner}/{repo}/releases/latest
- 结果存储: system_config key='version_check'
- Admin通知: 有新版本时发送SSE通知

### 18. Invitation & Feedback Architecture (Phase 5)

**DDL:**
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(16) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  reward_storage_bytes BIGINT NOT NULL DEFAULT 1073741824,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invitation_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invitation_id, user_id)
);

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('bug', 'feature', 'improvement', 'other')),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  user_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
