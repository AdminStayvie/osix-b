import dotenv from 'dotenv';

dotenv.config();

const requiredVars = ['MONGO_URI', 'DB_NAME', 'JWT_SECRET'];
const missing = requiredVars.filter(name => !process.env[name]);
if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

const rawPublicUrl = process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:4000';
export const BACKEND_PUBLIC_URL = rawPublicUrl.replace(/\/$/, '');
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? 'uploads';
export const UPLOAD_MAX_SIZE_BYTES = Number(process.env.UPLOAD_MAX_SIZE_BYTES) || 20 * 1024 * 1024;

export const MONGO_URI = process.env.MONGO_URI!;
export const DB_NAME = process.env.DB_NAME!;
export const JWT_SECRET = process.env.JWT_SECRET!;
