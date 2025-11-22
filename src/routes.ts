import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { BACKEND_PUBLIC_URL, DEFAULT_COMPANY_NAME, DEFAULT_OUTLET_SLUG, JWT_SECRET, UPLOAD_MAX_SIZE_BYTES } from './config';
import { Floor, Outlet, Room, RoomStatus, type User } from './types';
import { uploadsPath } from './uploads';
import { query } from './db';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsPath),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase() || '.png';
    const outletSegment = req.params.outletSlug ? `outlet-${req.params.outletSlug}` : 'outlet';
    const levelSegment = req.params.level ? `floor-${req.params.level}` : 'floor';
    cb(null, `${outletSegment}-${levelSegment}-${Date.now()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: UPLOAD_MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File harus berupa gambar.'));
    }
    cb(null, true);
  },
});

type OutletRow = { id: number; slug: string; name: string; company_name: string };
type FloorRow = {
  id: number;
  outlet_id: number;
  level: number;
  name: string;
  image_url: string | null;
  view_box: string;
};
type RoomRow = {
  id: number;
  outlet_id: number;
  floor_id: number;
  room_code: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: RoomStatus;
  tenant_name: string | null;
};
type UserRow = { id: number; email: string; full_name: string; password_hash: string; role: 'admin' | 'editor' };

type AuthenticatedRequest = Request & { user?: User };

const outletNotFound = (slug: string) => ({ message: `Outlet ${slug} tidak ditemukan.` });
const floorNotFound = (level: number, outletSlug: string) => ({
  message: `Floor ${level} untuk outlet ${outletSlug} tidak ditemukan.`,
});

const isRoomStatus = (value: unknown): value is RoomStatus =>
  typeof value === 'string' && Object.values(RoomStatus).includes(value as RoomStatus);

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  }
  return undefined;
};

const sanitizeRoomPayload = (payload: Partial<Room>) => {
  const updates: Partial<Room> = {};

  if (typeof payload.id === 'string' && payload.id.trim()) {
    updates.id = payload.id.trim();
  }
  const x = toNumber(payload.x);
  const y = toNumber(payload.y);
  const width = toNumber(payload.width);
  const height = toNumber(payload.height);
  if (x !== undefined) updates.x = x;
  if (y !== undefined) updates.y = y;
  if (width !== undefined) updates.width = width;
  if (height !== undefined) updates.height = height;

  if (payload.tenantName !== undefined && typeof payload.tenantName === 'string') {
    updates.tenantName = payload.tenantName.trim();
  }
  if (payload.status && isRoomStatus(payload.status)) updates.status = payload.status;

  return updates;
};

async function deleteLocalImage(imageUrl?: string | null) {
  if (!imageUrl) return;
  const uploadsPrefix = `${BACKEND_PUBLIC_URL}/uploads/`;
  if (!imageUrl.startsWith(uploadsPrefix)) {
    return;
  }

  const filename = imageUrl.replace(uploadsPrefix, '');
  const fullPath = path.join(uploadsPath, filename);
  await fs.unlink(fullPath).catch(() => {});
}

function mapOutlet(row: OutletRow): Outlet {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    companyName: row.company_name,
  };
}

function mapRoom(row: RoomRow): Room {
  return {
    id: row.room_code,
    outletId: row.outlet_id,
    floorId: row.floor_id,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    status: row.status,
    tenantName: row.tenant_name ?? undefined,
  };
}

function mapFloor(row: FloorRow, outletSlug: string, rooms: Room[] = []): Floor {
  return {
    id: row.id,
    outletId: row.outlet_id,
    outletSlug,
    level: row.level,
    name: row.name,
    imageUrl: row.image_url ?? '',
    viewBox: row.view_box,
    rooms,
  };
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
  };
}

async function fetchOutlet(slug: string): Promise<OutletRow | null> {
  const outlet = await query<OutletRow>('SELECT id, slug, name, company_name FROM outlets WHERE slug = $1', [
    slug,
  ]);
  return outlet[0] ?? null;
}

async function fetchUserByEmail(email: string): Promise<UserRow | null> {
  const users = await query<UserRow>(
    'SELECT id, email, full_name, password_hash, role FROM users WHERE email = $1',
    [email]
  );
  return users[0] ?? null;
}

async function fetchUserById(id: number): Promise<UserRow | null> {
  const users = await query<UserRow>(
    'SELECT id, email, full_name, password_hash, role FROM users WHERE id = $1',
    [id]
  );
  return users[0] ?? null;
}

const createToken = (user: UserRow) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ message: 'Login diperlukan untuk mengakses resource ini.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: number };
    const userId = typeof payload.sub === 'number' ? payload.sub : Number(payload.sub);
    if (!userId) {
      return res.status(401).json({ message: 'Token tidak valid.' });
    }

    const user = await fetchUserById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Sesi tidak ditemukan. Silakan login ulang.' });
    }

    req.user = mapUser(user);
    next();
  } catch (error) {
    console.error('Token verification failed', error);
    return res.status(401).json({ message: 'Token tidak valid atau kedaluwarsa.' });
  }
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Hanya admin yang dapat melakukan aksi ini.' });
  }
  next();
};

async function fetchFloorsWithRooms(outlet: OutletRow): Promise<Floor[]> {
  const floorRows = await query<FloorRow>(
    'SELECT id, outlet_id, level, name, image_url, view_box FROM floors WHERE outlet_id = $1 ORDER BY level',
    [outlet.id]
  );

  if (!floorRows.length) {
    return [];
  }

  const floorIds = floorRows.map(f => f.id);
  const roomRows = await query<RoomRow>(
    'SELECT id, outlet_id, floor_id, room_code, x, y, width, height, status, tenant_name FROM rooms WHERE floor_id = ANY($1::int[]) ORDER BY room_code',
    [floorIds]
  );

  const roomsByFloor = new Map<number, Room[]>();
  for (const room of roomRows) {
    const mapped = mapRoom(room);
    const list = roomsByFloor.get(room.floor_id) ?? [];
    list.push(mapped);
    roomsByFloor.set(room.floor_id, list);
  }

  return floorRows.map(floor => mapFloor(floor, outlet.slug, roomsByFloor.get(floor.id) ?? []));
}

async function fetchFloorWithRooms(outlet: OutletRow, level: number): Promise<Floor | null> {
  const floorRows = await query<FloorRow>(
    'SELECT id, outlet_id, level, name, image_url, view_box FROM floors WHERE outlet_id = $1 AND level = $2',
    [outlet.id, level]
  );
  const floorRow = floorRows[0];
  if (!floorRow) return null;

  const roomRows = await query<RoomRow>(
    'SELECT id, outlet_id, floor_id, room_code, x, y, width, height, status, tenant_name FROM rooms WHERE floor_id = $1 ORDER BY room_code',
    [floorRow.id]
  );
  const rooms = roomRows.map(mapRoom);
  return mapFloor(floorRow, outlet.slug, rooms);
}

const loginHandler = async (req: Request, res: Response) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi.' });
  }

  const user = await fetchUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: 'Email atau password salah.' });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: 'Email atau password salah.' });
  }

  const token = createToken(user);
  res.json({ token, user: mapUser(user) });
};

const meHandler = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Tidak ada sesi aktif.' });
  }
  res.json({ user: req.user });
};

const listUsersHandler = async (_req: AuthenticatedRequest, res: Response) => {
  const users = await query<UserRow>('SELECT id, email, full_name, role FROM users ORDER BY created_at DESC');
  res.json(users.map(mapUser));
};

const createUserHandler = async (req: AuthenticatedRequest, res: Response) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const role = req.body.role === 'admin' ? 'admin' : 'editor';

  if (!email || !fullName || password.length < 6) {
    return res
      .status(400)
      .json({ message: 'Nama, email, dan password (min 6 karakter) wajib diisi.' });
  }

  const existing = await fetchUserByEmail(email);
  if (existing) {
    return res.status(409).json({ message: 'Email sudah terdaftar.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await query<UserRow>(
    `INSERT INTO users (email, full_name, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, password_hash, role`,
    [email, fullName, passwordHash, role]
  );

  res.status(201).json(mapUser(created[0]));
};

const deleteUserHandler = async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'ID user tidak valid.' });
  }

  if (req.user?.id === id) {
    return res.status(400).json({ message: 'Tidak bisa menghapus akun yang sedang login.' });
  }

  const deleted = await query<UserRow>(
    'DELETE FROM users WHERE id = $1 RETURNING id, email, full_name, role',
    [id]
  );

  if (!deleted[0]) {
    return res.status(404).json({ message: 'User tidak ditemukan.' });
  }

  res.json({ user: mapUser(deleted[0]) });
};

const listOutletsHandler = async (_req: Request, res: Response) => {
  const outlets = await query<OutletRow>('SELECT id, slug, name, company_name FROM outlets ORDER BY name ASC');
  res.json(outlets.map(mapOutlet));
};

const createOutletHandler = async (req: Request, res: Response) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const companyName = typeof req.body.companyName === 'string' ? req.body.companyName.trim() : '';
  const customSlug = typeof req.body.slug === 'string' ? req.body.slug.trim() : '';

  if (!name) {
    return res.status(400).json({ message: 'Nama outlet wajib diisi.' });
  }

  const slug = slugify(customSlug || name) || DEFAULT_OUTLET_SLUG;
  const existing = await fetchOutlet(slug);
  if (existing) {
    return res.status(409).json({ message: `Outlet ${slug} sudah ada.` });
  }

  const created = await query<OutletRow>(
    'INSERT INTO outlets (slug, name, company_name) VALUES ($1, $2, $3) RETURNING id, slug, name, company_name',
    [slug, name, companyName || DEFAULT_COMPANY_NAME]
  );

  res.status(201).json(mapOutlet(created[0]));
};

const updateOutletHandler = async (req: Request, res: Response) => {
  const outletSlug = req.params.outletSlug ?? DEFAULT_OUTLET_SLUG;
  const outlet = await fetchOutlet(outletSlug);
  if (!outlet) {
    return res.status(404).json(outletNotFound(outletSlug));
  }

  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const companyName = typeof req.body.companyName === 'string' ? req.body.companyName.trim() : '';

  if (!name && !companyName) {
    return res.status(400).json({ message: 'Tidak ada field yang bisa diupdate.' });
  }

  const updated = await query<OutletRow>(
    `UPDATE outlets
     SET name = COALESCE(NULLIF($2, ''), name),
         company_name = COALESCE(NULLIF($3, ''), company_name),
         updated_at = NOW()
     WHERE slug = $1
     RETURNING id, slug, name, company_name`,
    [outlet.slug, name, companyName]
  );

  res.json(mapOutlet(updated[0]));
};

const deleteOutletHandler = async (req: Request, res: Response) => {
  const outletSlug = req.params.outletSlug ?? DEFAULT_OUTLET_SLUG;
  const outlet = await fetchOutlet(outletSlug);
  if (!outlet) {
    return res.status(404).json(outletNotFound(outletSlug));
  }

  const floors = await query<FloorRow>(
    'SELECT id, outlet_id, level, name, image_url, view_box FROM floors WHERE outlet_id = $1',
    [outlet.id]
  );

  await query('DELETE FROM outlets WHERE id = $1', [outlet.id]);
  await Promise.all(floors.map(floor => deleteLocalImage(floor.image_url)));

  res.json({ message: `Outlet ${outlet.name} dihapus.`, slug: outlet.slug });
};

const listFloorsHandler = async (req: Request, res: Response) => {
  const outletSlug = req.params.outletSlug ?? DEFAULT_OUTLET_SLUG;
  const outlet = await fetchOutlet(outletSlug);
  if (!outlet) {
    return res.status(404).json(outletNotFound(outletSlug));
  }

  const floors = await fetchFloorsWithRooms(outlet);
  res.json(floors);
};

const getFloorHandler = async (req: Request, res: Response) => {
  const outletSlug = req.params.outletSlug ?? DEFAULT_OUTLET_SLUG;
  const outlet = await fetchOutlet(outletSlug);
  if (!outlet) {
    return res.status(404).json(outletNotFound(outletSlug));
  }

  const level = Number(req.params.level);
  if (Number.isNaN(level)) {
    return res.status(400).json({ message: 'Level tidak valid.' });
  }

  const floor = await fetchFloorWithRooms(outlet, level);
  if (!floor) {
    return res.status(404).json(floorNotFound(level, outletSlug));
  }

  res.json(floor);
};

const createFloorHandler = async (req: Request, res: Response) => {
  const outletSlug = req.params.outletSlug ?? DEFAULT_OUTLET_SLUG;
  const outlet = await fetchOutlet(outletSlug);
  if (!outlet) {
    if (req.file) await fs.unlink(path.join(uploadsPath, req.file.filename)).catch(() => {});
    return res.status(404).json(outletNotFound(outletSlug));
  }

  const level = Number(req.body.level);
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const viewBox = typeof req.body.viewBox === 'string' ? req.body.viewBox.trim() : '';

  if (!name || !viewBox || Number.isNaN(level)) {
    if (req.file) {
      await fs.unlink(path.join(uploadsPath, req.file.filename)).catch(() => {});
    }
    return res.status(400).json({ message: 'Field level, name, dan viewBox wajib diisi.' });
  }

  const existing = await query<FloorRow>('SELECT id FROM floors WHERE outlet_id = $1 AND level = $2', [
    outlet.id,
    level,
  ]);
  if (existing[0]) {
    if (req.file) {
      await fs.unlink(path.join(uploadsPath, req.file.filename)).catch(() => {});
    }
    return res.status(409).json({ message: `Floor ${level} sudah ada untuk outlet ${outlet.slug}.` });
  }

  const imageUrl = req.file
    ? `${BACKEND_PUBLIC_URL}/uploads/${req.file.filename}`
    : typeof req.body.imageUrl === 'string'
      ? req.body.imageUrl
      : '';

  const created = await query<FloorRow>(
    `INSERT INTO floors (outlet_id, level, name, image_url, view_box)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, outlet_id, level, name, image_url, view_box`,
    [outlet.id, level, name, imageUrl, viewBox]
  );

  res.status(201).json(mapFloor(created[0], outlet.slug, []));
};

const updateFloorHandler = async (req: Request, res: Response) => {
  const outletSlug = req.params.outletSlug ?? DEFAULT_OUTLET_SLUG;
  const outlet = await fetchOutlet(outletSlug);
  if (!outlet) {
    return res.status(404).json(outletNotFound(outletSlug));
  }

  const level = Number(req.params.level);
  if (Number.isNaN(level)) {
    return res.status(400).json({ message: 'Level tidak valid.' });
  }

  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const viewBox = typeof req.body.viewBox === 'string' ? req.body.viewBox.trim() : '';

  if (!name && !viewBox) {
    return res.status(400).json({ message: 'Tidak ada field yang bisa diupdate.' });
  }

  const updated = await query<FloorRow>(
    `UPDATE floors
     SET name = COALESCE(NULLIF($3, ''), name),
         view_box = COALESCE(NULLIF($4, ''), view_box),
         updated_at = NOW()
     WHERE outlet_id = $1 AND level = $2
     RETURNING id, outlet_id, level, name, image_url, view_box`,
    [outlet.id, level, name, viewBox]
  );

  if (!updated[0]) {
    return res.status(404).json(floorNotFound(level, outletSlug));
  }

  const rooms = await query<RoomRow>(
    'SELECT id, outlet_id, floor_id, room_code, x, y, width, height, status, tenant_name FROM rooms WHERE floor_id = $1 ORDER BY room_code',
    [updated[0].id]
  );
  res.json(mapFloor(updated[0], outlet.slug, rooms.map(mapRoom)));
};

const deleteFloorHandler = async (req: Request, res: Response) => {
  const outletSlug = req.params.outletSlug ?? DEFAULT_OUTLET_SLUG;
  const outlet = await fetchOutlet(outletSlug);
  if (!outlet) {
    return res.status(404).json(outletNotFound(outletSlug));
  }

  const level = Number(req.params.level);
  if (Number.isNaN(level)) {
    return res.status(400).json({ message: 'Level tidak valid.' });
  }

  const deleted = await query<FloorRow>(
    'DELETE FROM floors WHERE outlet_id = $1 AND level = $2 RETURNING id, outlet_id, level, name, image_url, view_box',
    [outlet.id, level]
  );

  if (!deleted[0]) {
    return res.status(404).json(floorNotFound(level, outletSlug));
  }

  await deleteLocalImage(deleted[0].image_url);
  res.json({ message: `Floor ${level} dihapus.`, level });
};

const updateFloorImageHandler = async (req: Request, res: Response) => {
  const outletSlug = req.params.outletSlug ?? DEFAULT_OUTLET_SLUG;
  const outlet = await fetchOutlet(outletSlug);
  if (!outlet) {
    if (req.file) await fs.unlink(path.join(uploadsPath, req.file.filename)).catch(() => {});
    return res.status(404).json(outletNotFound(outletSlug));
  }

  const level = Number(req.params.level);
  if (!req.file) {
    return res.status(400).json({ message: 'File gambar tidak ditemukan pada field `image`.' });
  }
  if (Number.isNaN(level)) {
    await fs.unlink(path.join(uploadsPath, req.file.filename)).catch(() => {});
    return res.status(400).json({ message: 'Level tidak valid.' });
  }

  const floorRows = await query<FloorRow>(
    'SELECT id, outlet_id, level, name, image_url, view_box FROM floors WHERE outlet_id = $1 AND level = $2',
    [outlet.id, level]
  );
  const floor = floorRows[0];
  if (!floor) {
    await fs.unlink(path.join(uploadsPath, req.file.filename)).catch(() => {});
    return res.status(404).json(floorNotFound(level, outletSlug));
  }

  const previousImageUrl = floor.image_url;
  const imageUrl = `${BACKEND_PUBLIC_URL}/uploads/${req.file.filename}`;
  await query('UPDATE floors SET image_url = $1, updated_at = NOW() WHERE id = $2', [imageUrl, floor.id]);
  await deleteLocalImage(previousImageUrl);

  res.json({ imageUrl });
};

const createRoomHandler = async (req: Request, res: Response) => {
  const outletSlug = req.params.outletSlug ?? DEFAULT_OUTLET_SLUG;
  const outlet = await fetchOutlet(outletSlug);
  if (!outlet) {
    return res.status(404).json(outletNotFound(outletSlug));
  }

  const level = Number(req.params.level ?? req.body.level);
  const { id, status, tenantName } = req.body;
  const x = toNumber(req.body.x);
  const y = toNumber(req.body.y);
  const width = toNumber(req.body.width);
  const height = toNumber(req.body.height);
  const trimmedId = typeof id === 'string' ? id.trim() : '';

  if (!trimmedId || x === undefined || y === undefined || width === undefined || height === undefined || !isRoomStatus(status)) {
    return res.status(400).json({ message: 'Salah satu field room tidak valid.' });
  }

  const floorRows = await query<FloorRow>(
    'SELECT id FROM floors WHERE outlet_id = $1 AND level = $2',
    [outlet.id, level]
  );
  const floor = floorRows[0];
  if (!floor) {
    return res.status(404).json(floorNotFound(level, outletSlug));
  }

  const duplicate = await query<{ id: number }>(
    'SELECT id FROM rooms WHERE outlet_id = $1 AND room_code = $2',
    [outlet.id, trimmedId]
  );
  if (duplicate[0]) {
    return res.status(409).json({ message: `Room ${trimmedId} sudah ada di outlet ${outlet.slug}.` });
  }

  const created = await query<RoomRow>(
    `INSERT INTO rooms (outlet_id, floor_id, room_code, x, y, width, height, status, tenant_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, outlet_id, floor_id, room_code, x, y, width, height, status, tenant_name`,
    [outlet.id, floor.id, trimmedId, x, y, width, height, status, tenantName ?? null]
  );

  res.status(201).json(mapRoom(created[0]));
};

const updateRoomHandler = async (req: Request, res: Response) => {
  const outletSlug = req.params.outletSlug ?? DEFAULT_OUTLET_SLUG;
  const outlet = await fetchOutlet(outletSlug);
  if (!outlet) {
    return res.status(404).json(outletNotFound(outletSlug));
  }

  const { id } = req.params;
  const updates = sanitizeRoomPayload(req.body as Partial<Room>);

  if (!Object.keys(updates).length) {
    return res.status(400).json({ message: 'Tidak ada field yang bisa diupdate.' });
  }

  const existingRows = await query<RoomRow>(
    'SELECT id, outlet_id, floor_id, room_code, x, y, width, height, status, tenant_name FROM rooms WHERE outlet_id = $1 AND room_code = $2',
    [outlet.id, id]
  );
  const existing = existingRows[0];
  if (!existing) {
    return res.status(404).json({ message: `Room ${id} tidak ditemukan.` });
  }

  if (updates.id && updates.id !== id) {
    const duplicate = await query<{ id: number }>(
      'SELECT id FROM rooms WHERE outlet_id = $1 AND room_code = $2',
      [outlet.id, updates.id]
    );
    if (duplicate[0]) {
      return res.status(409).json({ message: `Room ${updates.id} sudah digunakan di outlet ${outlet.slug}.` });
    }
  }

  const fields: string[] = [];
  const params: unknown[] = [outlet.id, id];
  let index = params.length + 1;

  if (updates.id) {
    fields.push(`room_code = $${index++}`);
    params.push(updates.id);
  }
  if (updates.x !== undefined) {
    fields.push(`x = $${index++}`);
    params.push(updates.x);
  }
  if (updates.y !== undefined) {
    fields.push(`y = $${index++}`);
    params.push(updates.y);
  }
  if (updates.width !== undefined) {
    fields.push(`width = $${index++}`);
    params.push(updates.width);
  }
  if (updates.height !== undefined) {
    fields.push(`height = $${index++}`);
    params.push(updates.height);
  }
  if (updates.status) {
    fields.push(`status = $${index++}`);
    params.push(updates.status);
  }
  if (updates.tenantName !== undefined) {
    fields.push(`tenant_name = $${index++}`);
    params.push(updates.tenantName ?? null);
  }

  fields.push(`updated_at = NOW()`);

  const updated = await query<RoomRow>(
    `UPDATE rooms
     SET ${fields.join(', ')}
     WHERE outlet_id = $1 AND room_code = $2
     RETURNING id, outlet_id, floor_id, room_code, x, y, width, height, status, tenant_name`,
    params
  );

  if (!updated[0]) {
    return res.status(404).json({ message: `Room ${id} tidak ditemukan.` });
  }

  res.json(mapRoom(updated[0]));
};

const bulkRoomStatusHandler = async (req: Request, res: Response) => {
  const outletSlug = req.params.outletSlug ?? DEFAULT_OUTLET_SLUG;
  const outlet = await fetchOutlet(outletSlug);
  if (!outlet) {
    return res.status(404).json(outletNotFound(outletSlug));
  }

  const { ids, status } = req.body;

  if (!Array.isArray(ids) || !ids.length || !isRoomStatus(status)) {
    return res.status(400).json({ message: 'Payload bulk status tidak valid.' });
  }

  const updated = await query<RoomRow>(
    `UPDATE rooms
     SET status = $3,
         updated_at = NOW()
     WHERE outlet_id = $1 AND room_code = ANY($2)
     RETURNING id, outlet_id, floor_id, room_code, x, y, width, height, status, tenant_name`,
    [outlet.id, ids, status]
  );

  if (!updated.length) {
    return res.status(404).json({ message: 'Tidak ditemukan room untuk diupdate.' });
  }

  res.json({ updated: updated.map(mapRoom) });
};

const deleteRoomHandler = async (req: Request, res: Response) => {
  const outletSlug = req.params.outletSlug ?? DEFAULT_OUTLET_SLUG;
  const outlet = await fetchOutlet(outletSlug);
  if (!outlet) {
    return res.status(404).json(outletNotFound(outletSlug));
  }

  const { id } = req.params;
  const deleted = await query<RoomRow>(
    `DELETE FROM rooms
     WHERE outlet_id = $1 AND room_code = $2
     RETURNING id, outlet_id, floor_id, room_code, x, y, width, height, status, tenant_name`,
    [outlet.id, id]
  );

  if (!deleted[0]) {
    return res.status(404).json({ message: `Room ${id} tidak ditemukan.` });
  }

  res.json(mapRoom(deleted[0]));
};

router.post('/auth/login', loginHandler);

// Public read-only endpoints
router.get('/outlets', listOutletsHandler);
router.get('/outlets/:outletSlug/floors', listFloorsHandler);
router.get('/floors', listFloorsHandler);
router.get('/outlets/:outletSlug/floors/:level', getFloorHandler);
router.get('/floors/:level', getFloorHandler);

// Protected endpoints
router.use(requireAuth);

router.get('/auth/me', meHandler);

router.get('/users', requireAdmin, listUsersHandler);
router.post('/users', requireAdmin, createUserHandler);
router.delete('/users/:id', requireAdmin, deleteUserHandler);

router.post('/outlets', requireAdmin, createOutletHandler);
router.put('/outlets/:outletSlug', updateOutletHandler);
router.delete('/outlets/:outletSlug', requireAdmin, deleteOutletHandler);

router.post('/outlets/:outletSlug/floors', upload.single('image'), createFloorHandler);
router.put('/outlets/:outletSlug/floors/:level', updateFloorHandler);
router.put('/floors/:level', updateFloorHandler);
router.delete('/outlets/:outletSlug/floors/:level', deleteFloorHandler);
router.delete('/floors/:level', deleteFloorHandler);
router.post('/outlets/:outletSlug/floors/:level/image', upload.single('image'), updateFloorImageHandler);
router.post('/floors/:level/image', upload.single('image'), updateFloorImageHandler);

router.post('/outlets/:outletSlug/floors/:level/rooms', createRoomHandler);
router.post('/floors/:level/rooms', createRoomHandler);
router.put('/outlets/:outletSlug/rooms/:id', updateRoomHandler);
router.put('/rooms/:id', updateRoomHandler);
router.patch('/outlets/:outletSlug/rooms/bulk-status', bulkRoomStatusHandler);
router.patch('/rooms/bulk-status', bulkRoomStatusHandler);
router.delete('/outlets/:outletSlug/rooms/:id', deleteRoomHandler);
router.delete('/rooms/:id', deleteRoomHandler);

export default router;
