import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS vector`);

  pgm.sql(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      avatar_path VARCHAR(500),
      storage_quota BIGINT,
      storage_used BIGINT NOT NULL DEFAULT 0,
      locale VARCHAR(5) NOT NULL DEFAULT 'zh',
      otp_secret VARCHAR(100),
      otp_enabled BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_users_email ON users(email);
  `);

  pgm.sql(`
    CREATE TABLE sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_info VARCHAR(500),
      last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX idx_sessions_user_expires ON sessions(user_id, expires_at);
  `);

  pgm.sql(`
    CREATE TABLE password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_prt_user_expires ON password_reset_tokens(user_id, expires_at);
  `);

  pgm.sql(`
    CREATE TABLE libraries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      import_path VARCHAR(500) NOT NULL,
      exclusion_patterns JSONB DEFAULT '[]',
      is_watched BOOLEAN NOT NULL DEFAULT true,
      last_scanned_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_libraries_user_id ON libraries(user_id);
  `);

  pgm.sql(`
    CREATE TABLE photos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(500) NOT NULL,
      file_path VARCHAR(1000) NOT NULL,
      thumbnail_path VARCHAR(1000),
      mime_type VARCHAR(100) NOT NULL,
      file_type VARCHAR(10) NOT NULL,
      file_size BIGINT NOT NULL,
      width INTEGER,
      height INTEGER,
      duration INTEGER,
      taken_at TIMESTAMPTZ,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      location_name VARCHAR(255),
      ocr_text TEXT,
      clip_embedding vector(768),
      is_favorite BOOLEAN NOT NULL DEFAULT false,
      is_archived BOOLEAN NOT NULL DEFAULT false,
      processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
      file_hash VARCHAR(64),
      deleted_at TIMESTAMPTZ,
      library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
      live_photo_video_id UUID REFERENCES photos(id) ON DELETE SET NULL,
      device_asset_id VARCHAR(255),
      device_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_photos_user_id ON photos(user_id);
    CREATE INDEX idx_photos_user_deleted ON photos(user_id, deleted_at);
    CREATE INDEX idx_photos_user_favorite ON photos(user_id, is_favorite);
    CREATE INDEX idx_photos_user_archived ON photos(user_id, is_archived);
    CREATE INDEX idx_photos_user_hash ON photos(user_id, file_hash);
    CREATE INDEX idx_photos_user_taken ON photos(user_id, taken_at);
    CREATE INDEX idx_photos_user_status ON photos(user_id, processing_status);
    CREATE INDEX idx_photos_clip_embedding ON photos USING hnsw (clip_embedding vector_cosine_ops);
  `);

  pgm.sql(`
    CREATE TABLE photo_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      file_path VARCHAR(1000) NOT NULL,
      operation VARCHAR(50) NOT NULL,
      params JSONB,
      version_number INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_photo_versions_photo_id ON photo_versions(photo_id);
  `);

  pgm.sql(`
    CREATE TABLE persons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100),
      feature_face_path VARCHAR(1000),
      face_count INTEGER NOT NULL DEFAULT 0,
      is_hidden BOOLEAN NOT NULL DEFAULT false,
      birth_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_persons_user_id ON persons(user_id);
  `);

  pgm.sql(`
    CREATE TABLE faces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
      photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      bounding_box JSONB NOT NULL,
      embedding vector(512),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_faces_photo_id ON faces(photo_id);
    CREATE INDEX idx_faces_person_id ON faces(person_id);
    CREATE INDEX idx_faces_embedding ON faces USING hnsw (embedding vector_cosine_ops);
  `);

  pgm.sql(`
    CREATE TABLE albums (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      cover_path VARCHAR(1000),
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_albums_user_id ON albums(user_id);
  `);

  pgm.sql(`
    CREATE TABLE photo_albums (
      photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT pk_photo_albums PRIMARY KEY (photo_id, album_id)
    );
  `);

  pgm.sql(`
    CREATE TABLE album_users (
      album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL DEFAULT 'viewer',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT pk_album_users PRIMARY KEY (album_id, user_id)
    );
  `);

  pgm.sql(`
    CREATE TABLE tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX idx_tags_user_name ON tags(user_id, name);
  `);

  pgm.sql(`
    CREATE TABLE photo_tags (
      photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      CONSTRAINT pk_photo_tags PRIMARY KEY (photo_id, tag_id)
    );
  `);

  pgm.sql(`
    CREATE TABLE share_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
      photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(64) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      expires_at TIMESTAMPTZ,
      allow_download BOOLEAN NOT NULL DEFAULT true,
      allow_upload BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_share_links_token ON share_links(token);
    CREATE INDEX idx_share_links_user_id ON share_links(user_id);
  `);

  pgm.sql(`
    CREATE TABLE partner_sharing (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      in_timeline BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX idx_partner_sharing ON partner_sharing(shared_by_user_id, shared_with_user_id);
  `);

  pgm.sql(`
    CREATE TABLE stacks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      primary_photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_stacks_user_id ON stacks(user_id);
  `);

  pgm.sql(`
    CREATE TABLE stack_photos (
      stack_id UUID NOT NULL REFERENCES stacks(id) ON DELETE CASCADE,
      photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      CONSTRAINT pk_stack_photos PRIMARY KEY (stack_id, photo_id)
    );
  `);

  pgm.sql(`
    CREATE TABLE api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      key_hash VARCHAR(255) NOT NULL,
      key_prefix VARCHAR(10) NOT NULL,
      permissions JSONB DEFAULT '[]',
      expires_at TIMESTAMPTZ,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
    CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
  `);

  pgm.sql(`
    CREATE TABLE search_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      query VARCHAR(500) NOT NULL,
      search_mode VARCHAR(20) NOT NULL,
      result_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_search_history_user_id ON search_history(user_id);
  `);

  pgm.sql(`
    CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
  `);

  pgm.sql(`
    CREATE TABLE activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(50) NOT NULL,
      resource VARCHAR(50) NOT NULL,
      resource_id UUID,
      details JSONB,
      ip_address VARCHAR(45),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
    CREATE INDEX idx_activity_logs_resource ON activity_logs(resource, action);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  const tables = [
    'activity_logs', 'notifications', 'search_history', 'api_keys',
    'stack_photos', 'stacks', 'partner_sharing', 'share_links',
    'photo_tags', 'tags', 'album_users', 'photo_albums', 'albums',
    'faces', 'persons', 'photo_versions', 'photos', 'libraries',
    'password_reset_tokens', 'sessions', 'users',
  ];
  for (const table of tables) {
    pgm.sql(`DROP TABLE IF EXISTS ${table}`);
  }
}
