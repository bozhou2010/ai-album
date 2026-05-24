#!/bin/sh
set -e

echo "Running database migrations..."
node -e "
const { migrate } = require('node-pg-migrate');
const path = require('path');
migrate({
  databaseUrl: process.env.DATABASE_URL,
  migrationsDir: path.join(__dirname, 'api/migrations'),
  direction: 'up',
  verbose: true,
}).then(() => {
  console.log('Migration completed');
}).catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
"

echo "Starting PM2..."
exec pm2-runtime start ecosystem.config.cjs
