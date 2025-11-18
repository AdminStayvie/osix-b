import mongoose, { Document, Schema } from 'mongoose';
import { Floor, Room, RoomStatus } from '../types';

const roomSchema = new Schema<Room>(
  {
    id: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(RoomStatus),
      required: true,
    },
    tenantName: { type: String },
  },
  { _id: false }
);

export interface FloorDocument extends Document, Floor {}

const floorSchema = new Schema<FloorDocument>(
  {
    level: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    imageUrl: { type: String, required: false, default: '' },
    viewBox: { type: String, required: true },
    rooms: { type: [roomSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const FloorModel = mongoose.model<FloorDocument>('Floor', floorSchema);
