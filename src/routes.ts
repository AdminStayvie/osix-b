import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { FloorModel } from './models/floor';
import { Room, RoomStatus } from './types';
import { BACKEND_PUBLIC_URL, UPLOAD_MAX_SIZE_BYTES } from './config';
import { uploadsPath } from './uploads';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsPath),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase() || '.png';
    const levelSegment = req.params.level ? `floor-${req.params.level}` : 'floor';
    cb(null, `${levelSegment}-${Date.now()}${extension}`);
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

const floorNotFound = (level: number) => ({ message: `Floor ${level} tidak ditemukan.` });

const isRoomStatus = (value: unknown): value is RoomStatus =>
  typeof value === 'string' && Object.values(RoomStatus).includes(value as RoomStatus);

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

router.get('/floors', async (_req, res) => {
  const floors = await FloorModel.find().sort({ level: 1 }).lean();
  res.json(floors);
});

router.get('/floors/:level', async (req, res) => {
  const level = Number(req.params.level);
  const floor = await FloorModel.findOne({ level }).lean();
  if (!floor) {
    return res.status(404).json(floorNotFound(level));
  }
  res.json(floor);
});

router.post('/floors', upload.single('image'), async (req, res) => {
  const level = Number(req.body.level);
  const { name, viewBox } = req.body;

  if (!name || !viewBox || Number.isNaN(level)) {
    if (req.file) {
      await fs.unlink(path.join(uploadsPath, req.file.filename)).catch(() => {});
    }
    return res.status(400).json({ message: 'Field level, name, dan viewBox wajib diisi.' });
  }

  const existing = await FloorModel.findOne({ level });
  if (existing) {
    if (req.file) {
      await fs.unlink(path.join(uploadsPath, req.file.filename)).catch(() => {});
    }
    return res.status(409).json({ message: `Floor ${level} sudah ada.` });
  }

  const imageUrl = req.file
    ? `${BACKEND_PUBLIC_URL}/uploads/${req.file.filename}`
    : typeof req.body.imageUrl === 'string'
      ? req.body.imageUrl
      : '';

  const created = await FloorModel.create({
    level,
    name,
    viewBox,
    imageUrl,
    rooms: [],
  });

  res.status(201).json(created.toObject());
});

router.put('/floors/:level', async (req, res) => {
  const level = Number(req.params.level);
  const { name, viewBox } = req.body as Partial<{ name: string; viewBox: string }>;

  if ((!name && !viewBox) || Number.isNaN(level)) {
    return res.status(400).json({ message: 'Tidak ada field yang bisa diupdate.' });
  }

  const floor = await FloorModel.findOne({ level });
  if (!floor) {
    return res.status(404).json(floorNotFound(level));
  }

  if (name) floor.name = name;
  if (viewBox) floor.viewBox = viewBox;
  await floor.save();

  res.json(floor.toObject());
});

router.delete('/floors/:level', async (req, res) => {
  const level = Number(req.params.level);
  if (Number.isNaN(level)) {
    return res.status(400).json({ message: 'Level tidak valid.' });
  }

  const floor = await FloorModel.findOneAndDelete({ level });
  if (!floor) {
    return res.status(404).json(floorNotFound(level));
  }

  await deleteLocalImage(floor.imageUrl);
  res.json({ message: `Floor ${level} dihapus.`, level });
});

router.post('/floors/:level/image', upload.single('image'), async (req, res) => {
  const level = Number(req.params.level);
  if (!req.file) {
    return res.status(400).json({ message: 'File gambar tidak ditemukan pada field `image`.' });
  }

  const floor = await FloorModel.findOne({ level });
  if (!floor) {
    await fs.unlink(path.join(uploadsPath, req.file.filename)).catch(() => {});
    return res.status(404).json(floorNotFound(level));
  }

  const previousImageUrl = floor.imageUrl;
  const imageUrl = `${BACKEND_PUBLIC_URL}/uploads/${req.file.filename}`;
  floor.imageUrl = imageUrl;
  await floor.save();

  await deleteLocalImage(previousImageUrl);

  res.json({ imageUrl });
});

router.post('/floors/:level/rooms', async (req, res) => {
  const level = Number(req.params.level);
  const { id, x, y, width, height, status, tenantName } = req.body;

  if (
    !id ||
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !isRoomStatus(status)
  ) {
    return res.status(400).json({ message: 'Salah satu field room tidak valid.' });
  }

  const floor = await FloorModel.findOne({ level });
  if (!floor) {
    return res.status(404).json(floorNotFound(level));
  }

  if (floor.rooms.some(room => room.id === id)) {
    return res.status(409).json({ message: `Room ${id} sudah ada di lantai ${level}.` });
  }

  const newRoom: Room = { id, x, y, width, height, status, tenantName };
  floor.rooms.push(newRoom);
  await floor.save();

  res.status(201).json(newRoom);
});

router.put('/rooms/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body as Partial<Room>;

  if (updates.status && !isRoomStatus(updates.status)) {
    return res.status(400).json({ message: 'Status room tidak valid.' });
  }

  const floor = await FloorModel.findOne({ 'rooms.id': id });
  if (!floor) {
    return res.status(404).json({ message: `Room ${id} tidak ditemukan.` });
  }

  const room = floor.rooms.find(room => room.id === id);
  if (!room) {
    return res.status(404).json({ message: `Room ${id} tidak ditemukan.` });
  }

  Object.assign(room, updates);
  await floor.save();

  res.json(room);
});

router.patch('/rooms/bulk-status', async (req, res) => {
  const { ids, status } = req.body;

  if (!Array.isArray(ids) || !ids.length || !isRoomStatus(status)) {
    return res.status(400).json({ message: 'Payload bulk status tidak valid.' });
  }

  const floors = await FloorModel.find({ 'rooms.id': { $in: ids } });
  const updated: Room[] = [];

  for (const floor of floors) {
    let touched = false;

    floor.rooms = floor.rooms.map((room: Room) => {
      if (ids.includes(room.id)) {
        touched = true;
        const merged = { ...room, status };
        updated.push(merged);
        return merged;
      }
      return room;
    });

    if (touched) {
      await floor.save();
    }
  }

  if (!updated.length) {
    return res.status(404).json({ message: 'Tidak ditemukan room untuk diupdate.' });
  }

  res.json({ updated });
});

router.delete('/rooms/:id', async (req, res) => {
  const { id } = req.params;
  const floor = await FloorModel.findOne({ 'rooms.id': id });

  if (!floor) {
    return res.status(404).json({ message: `Room ${id} tidak ditemukan.` });
  }

  const roomIndex = floor.rooms.findIndex((room: Room) => room.id === id);
  if (roomIndex === -1) {
    return res.status(404).json({ message: `Room ${id} tidak ditemukan.` });
  }

  const [deletedRoom] = floor.rooms.splice(roomIndex, 1);
  await floor.save();

  res.json(deletedRoom);
});

export default router;
