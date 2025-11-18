import fs from 'fs/promises';
import path from 'path';
import { UPLOADS_DIR } from './config';

export const uploadsPath = path.resolve(__dirname, '../', UPLOADS_DIR);

export async function ensureUploadsDirectory(): Promise<void> {
  await fs.mkdir(uploadsPath, { recursive: true });
}
