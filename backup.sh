#!/bin/bash
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/aialbum_backup_${TIMESTAMP}"

mkdir -p "${BACKUP_DIR}"

echo "Starting AI Album backup..."

echo "[1/3] Backing up PostgreSQL..."
docker exec ai-album-postgres pg_dump -U aialbum aialbum > "${BACKUP_FILE}.sql"

echo "[2/3] Backing up uploads..."
tar -czf "${BACKUP_FILE}_uploads.tar.gz" -C ./uploads .

echo "[3/3] Compressing backup..."
tar -czf "${BACKUP_FILE}.tar.gz" "${BACKUP_FILE}.sql" "${BACKUP_FILE}_uploads.tar.gz"

rm "${BACKUP_FILE}.sql" "${BACKUP_FILE}_uploads.tar.gz"

echo "Backup completed: ${BACKUP_FILE}.tar.gz"
echo "Backup size: $(du -h ${BACKUP_FILE}.tar.gz | cut -f1)"
