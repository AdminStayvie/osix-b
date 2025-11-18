import express from 'express';
import cors from 'cors';
import floorsRouter from './routes';
import { connectDatabase } from './db';
import { ensureSeeded } from './seed';
import { JWT_SECRET } from './config';
import { ensureUploadsDirectory, uploadsPath } from './uploads';

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsPath));

app.get('/', async (_req, res) => {
  res.json({
    message: 'StayVie room management backend is running.',
    zone: 'Osix',
    jwtConfigured: Boolean(JWT_SECRET),
  });
});

app.use('/api', floorsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error in backend', err);
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ message: 'Internal server error.' });
});

async function start() {
  await connectDatabase();
  await ensureUploadsDirectory();
  await ensureSeeded();

  app.listen(port, () => {
    console.log(`Backend started on port ${port}`);
  });
}

start().catch(error => {
  console.error('Failed to start backend', error);
  process.exit(1);
});
