import mongoose from 'mongoose';
import { MONGO_URI, DB_NAME } from './config';

mongoose.set('strictQuery', true);

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  await mongoose.connect(MONGO_URI, {
    dbName: DB_NAME,
    autoIndex: false,
  });

  console.log('✅ Connected to MongoDB', DB_NAME);
}
