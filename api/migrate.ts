import migrate from 'node-pg-migrate';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  await migrate({
    databaseUrl: process.env.DATABASE_URL!,
    migrationsTable: 'pgmigrations',
    dir: path.join(__dirname, 'migrations'),
    direction: 'up',
    verbose: true,
  });
  console.log('Migration completed');
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
