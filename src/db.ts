import { Pool, PoolClient, type QueryResultRow, types } from 'pg';
import { DATABASE_URL, POSTGRES_SSL } from './config';

types.setTypeParser(types.builtins.INT8, (value: string) => parseInt(value, 10));
types.setTypeParser(types.builtins.FLOAT8, (value: string) => parseFloat(value));
types.setTypeParser(types.builtins.NUMERIC, (value: string) => parseFloat(value));

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: POSTGRES_SSL ? { rejectUnauthorized: false } : undefined,
});

let connected = false;

export async function connectDatabase(): Promise<void> {
  if (connected) return;
  await pool.query('SELECT 1');
  await migrate();
  connected = true;
  console.log('✅ Connected to PostgreSQL');
}

export async function migrate(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS outlets (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      company_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS floors (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
      level INTEGER NOT NULL,
      name TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      view_box TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT floors_unique_level UNIQUE(outlet_id, level)
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
      floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
      room_code TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      width REAL NOT NULL,
      height REAL NOT NULL,
      status TEXT NOT NULL,
      tenant_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT rooms_unique_code_per_outlet UNIQUE(outlet_id, room_code),
      CONSTRAINT rooms_unique_code_per_floor UNIQUE(floor_id, room_code),
      CONSTRAINT room_status_valid CHECK (status IN ('Booked', 'Sementara'))
    );

    CREATE INDEX IF NOT EXISTS idx_floors_outlet_level ON floors (outlet_id, level);
    CREATE INDEX IF NOT EXISTS idx_rooms_outlet_code ON rooms (outlet_id, room_code);
    CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms (floor_id);
  `);
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
