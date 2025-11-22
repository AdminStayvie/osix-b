import dotenv from 'dotenv';

dotenv.config();

const requiredVars = ['JWT_SECRET'];
const missing = requiredVars.filter(name => !process.env[name]);
if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

const rawPublicUrl = process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:4000';
export const BACKEND_PUBLIC_URL = rawPublicUrl.replace(/\/$/, '');
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? 'uploads';
export const UPLOAD_MAX_SIZE_BYTES = Number(process.env.UPLOAD_MAX_SIZE_BYTES) || 20 * 1024 * 1024;

export const DATABASE_URL =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.PG_URL ??
  'postgres://postgres:D3FBk8JW4IXiENqDV7MiVg03Nl4mor6pQF3f3Dz1n5UsjsSi2c7OUnyFeO8GD0KK@148.230.97.197:5433/postgres';

const sslMode = (process.env.PGSSLMODE ?? '').toLowerCase();
export const POSTGRES_SSL =
  process.env.PG_SSL === 'true' ||
  sslMode === 'require' ||
  DATABASE_URL.includes('sslmode=require');

export const DEFAULT_OUTLET_SLUG = process.env.DEFAULT_OUTLET_SLUG ?? 'bhaskara-osix';
export const DEFAULT_COMPANY_NAME = process.env.COMPANY_NAME ?? 'Stayvie Co-Living';
export const JWT_SECRET = process.env.JWT_SECRET!;
