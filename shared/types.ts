export interface User {
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
  createdAt: string;
  updatedAt: string;
}

export interface PhotoListItem {
  id: string;
  originalName: string;
  thumbnailPath: string | null;
  mimeType: string;
  fileType: 'image' | 'video';
  width: number | null;
  height: number | null;
  takenAt: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  processingStatus: string;
}

export interface PhotoDetail extends Photo {
  tags: Tag[];
  people: Person[];
  albums: AlbumSummary[];
  exif: ExifData | null;
}

export interface ExifData {
  make: string | null;
  model: string | null;
  lensModel: string | null;
  focalLength: number | null;
  fNumber: number | null;
  exposureTime: string | null;
  iso: number | null;
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
}

export interface Face {
  id: string;
  personId: string | null;
  photoId: string;
  boundingBox: { x1: number; y1: number; x2: number; y2: number };
  embedding: number[];
}

export interface Album {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverPath: string | null;
  photoCount: number;
  startDate: string | null;
  endDate: string | null;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumSummary {
  id: string;
  name: string;
  coverPath: string | null;
  photoCount: number;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  photoCount: number;
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

export interface SearchResult {
  photo: PhotoListItem;
  score: number;
  matchType: 'text' | 'ocr' | 'semantic' | 'face' | 'hybrid';
  highlights: { field: string; snippet: string }[];
}

export interface ProcessingStatus {
  photoId: string;
  stage: 'pending' | 'thumbnailing' | 'metadata' | 'ocr' | 'clip' | 'face' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: unknown;
}

export interface Session {
  id: string;
  userId: string;
  deviceInfo: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'system' | 'share' | 'processing' | 'subscription' | 'security';
  title: string;
  message: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
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

export interface Stack {
  id: string;
  userId: string;
  primaryPhotoId: string;
  photoIds: string[];
  createdAt: string;
}

export interface ExternalLibrary {
  id: string;
  userId: string;
  name: string;
  importPath: string;
  exclusionPatterns: string[];
  isWatched: boolean;
  lastScannedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface DuplicateGroup {
  id: string;
  photos: PhotoListItem[];
  similarity: number;
  type: 'exact' | 'similar';
  recommendedKeepId: string;
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

export interface DataExportJob {
  id: string;
  userId: string;
  include: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl: string | null;
  createdAt: string;
}

export interface Stats {
  totalPhotos: number;
  totalVideos: number;
  monthlyNew: number;
  storageUsed: number;
  processingQueue: number;
  ocrCompleted: number;
  clipCompleted: number;
  faceCompleted: number;
}

export interface JobQueue {
  name: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  isPaused: boolean;
}
