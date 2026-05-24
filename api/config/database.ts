import pg, { types, Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

types.setTypeParser(11449 as any, (val: string) => JSON.parse(val));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX) || 15,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  maxUses: 7500,
  allowExitOnIdle: false,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

export { pool };

export async function queryWithRetry(text: string, params: unknown[], maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await pool.query(text, params);
    } catch (err: any) {
      if (err.code === 'ECONNRESET' || err.code === '57P03' || err.code === '08006') {
        if (i === maxRetries - 1) throw err;
        await new Promise(r => setTimeout(r, 200 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function checkDBHealth(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1');
    return result.rowCount === 1;
  } catch {
    return false;
  }
}
