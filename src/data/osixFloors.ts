import { RoomStatus } from '../types';

export interface SeedRoom {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: RoomStatus;
  tenantName?: string;
}

export interface SeedFloor {
  level: number;
  name: string;
  imageUrl: string;
  viewBox: string;
  rooms: SeedRoom[];
}

export const osixFloorSeed: SeedFloor[] = [
  {
    level: 1,
    name: "Floor 1",
    imageUrl: "https://api.stayvie.com/uploads/gallery/gallery-1763359927129-Denah-O-Six---Lantai-1.webp",
    viewBox: "0 0 1500 3000",
    rooms: [
      { id: "C-120", x: 350, y: 150, width: 150, height: 350, status: RoomStatus.Booked, tenantName: "Andi Wijaya" },
      { id: "C-121", x: 650, y: 150, width: 150, height: 350, status: RoomStatus.Booked },
      { id: "C-122", x: 950, y: 150, width: 150, height: 350, status: RoomStatus.Booked },
      { id: "C-123", x: 1250, y: 150, width: 150, height: 350, status: RoomStatus.Temporary },
      { id: "B-119", x: 400, y: 675, width: 100, height: 375, status: RoomStatus.Booked },
      { id: "B-118", x: 500, y: 675, width: 100, height: 375, status: RoomStatus.Booked },
      { id: "B-117", x: 700, y: 675, width: 100, height: 375, status: RoomStatus.Booked },
      { id: "B-116", x: 800, y: 675, width: 100, height: 375, status: RoomStatus.Booked },
      { id: "A-110", x: 400, y: 1200, width: 100, height: 250, status: RoomStatus.Booked },
      { id: "A-111", x: 500, y: 1200, width: 100, height: 250, status: RoomStatus.Booked },
      { id: "A-112", x: 700, y: 1200, width: 100, height: 250, status: RoomStatus.Booked },
      { id: "A-115", x: 800, y: 1200, width: 100, height: 250, status: RoomStatus.Booked },
      { id: "B-109", x: 400, y: 1625, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "B-108", x: 550, y: 1625, width: 150, height: 375, status: RoomStatus.Temporary },
      { id: "B-107", x: 750, y: 1625, width: 150, height: 375, status: RoomStatus.Temporary },
      { id: "B-106", x: 900, y: 1625, width: 150, height: 375, status: RoomStatus.Booked, tenantName: "Budi Santoso" },
      { id: "B-101", x: 400, y: 2150, width: 150, height: 350, status: RoomStatus.Temporary },
      { id: "B-102", x: 550, y: 2150, width: 150, height: 350, status: RoomStatus.Booked, tenantName: "Citra Lestari" },
      { id: "B-103", x: 750, y: 2150, width: 150, height: 350, status: RoomStatus.Temporary },
      { id: "B-105", x: 900, y: 2150, width: 150, height: 350, status: RoomStatus.Booked },
    ],
  },
  {
    level: 2,
    name: "Floor 2",
    imageUrl: "https://api.stayvie.com/uploads/gallery/gallery-1763359927608-Denah-O-Six---Lantai-2.webp",
    viewBox: "0 0 1500 3000",
    rooms: [
      { id: "C-222", x: 350, y: 150, width: 150, height: 350, status: RoomStatus.Temporary },
      { id: "C-223", x: 500, y: 150, width: 150, height: 350, status: RoomStatus.Temporary },
      { id: "C-225", x: 700, y: 150, width: 150, height: 350, status: RoomStatus.Temporary },
      { id: "C-226", x: 850, y: 150, width: 150, height: 350, status: RoomStatus.Booked },
      { id: "C-227", x: 1050, y: 150, width: 150, height: 350, status: RoomStatus.Booked },
      { id: "C-228", x: 1200, y: 150, width: 150, height: 350, status: RoomStatus.Temporary },
      { id: "B-221", x: 400, y: 675, width: 100, height: 375, status: RoomStatus.Booked },
      { id: "B-220", x: 500, y: 675, width: 100, height: 375, status: RoomStatus.Booked },
      { id: "B-219", x: 700, y: 675, width: 100, height: 375, status: RoomStatus.Booked },
      { id: "B-218", x: 800, y: 675, width: 100, height: 375, status: RoomStatus.Booked },
      { id: "B-217", x: 1000, y: 675, width: 100, height: 375, status: RoomStatus.Booked },
      { id: "A-210", x: 400, y: 1200, width: 100, height: 250, status: RoomStatus.Booked },
      { id: "A-211", x: 500, y: 1200, width: 100, height: 250, status: RoomStatus.Booked },
      { id: "A-212", x: 700, y: 1200, width: 100, height: 250, status: RoomStatus.Booked },
      { id: "A-215", x: 800, y: 1200, width: 100, height: 250, status: RoomStatus.Temporary },
      { id: "B-216", x: 1000, y: 1200, width: 100, height: 250, status: RoomStatus.Booked },
      { id: "B-209", x: 400, y: 1625, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "B-208", x: 550, y: 1625, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "B-207", x: 750, y: 1625, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "B-206", x: 900, y: 1625, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "B-201", x: 400, y: 2150, width: 150, height: 350, status: RoomStatus.Booked },
      { id: "B-202", x: 550, y: 2150, width: 150, height: 350, status: RoomStatus.Temporary },
      { id: "B-203", x: 750, y: 2150, width: 150, height: 350, status: RoomStatus.Booked },
      { id: "B-205", x: 900, y: 2150, width: 150, height: 350, status: RoomStatus.Booked },
    ],
  },
  {
    level: 3,
    name: "Floor 3",
    imageUrl: "https://api.stayvie.com/uploads/gallery/gallery-1763359927973-Denah-O-Six---Lantai-3.webp",
    viewBox: "0 0 1500 3000",
    rooms: [
      { id: "C-319", x: 350, y: 150, width: 150, height: 350, status: RoomStatus.Booked },
      { id: "C-320", x: 500, y: 150, width: 150, height: 350, status: RoomStatus.Temporary },
      { id: "C-321", x: 700, y: 150, width: 150, height: 350, status: RoomStatus.Temporary },
      { id: "C-322", x: 850, y: 150, width: 150, height: 350, status: RoomStatus.Temporary },
      { id: "C-323", x: 1050, y: 150, width: 150, height: 350, status: RoomStatus.Temporary },
      { id: "C-325", x: 1200, y: 150, width: 150, height: 350, status: RoomStatus.Booked },
      { id: "D-318", x: 400, y: 675, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "D-317", x: 550, y: 675, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "D-316", x: 750, y: 675, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "D-315", x: 900, y: 675, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "B-309", x: 400, y: 1200, width: 150, height: 250, status: RoomStatus.Booked },
      { id: "B-310", x: 550, y: 1200, width: 150, height: 250, status: RoomStatus.Booked },
      { id: "B-311", x: 750, y: 1200, width: 150, height: 250, status: RoomStatus.Temporary },
      { id: "B-312", x: 900, y: 1200, width: 150, height: 250, status: RoomStatus.Booked },
      { id: "D-308", x: 400, y: 1625, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "D-307", x: 550, y: 1625, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "D-306", x: 750, y: 1625, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "D-301", x: 400, y: 2150, width: 150, height: 350, status: RoomStatus.Booked },
      { id: "D-302", x: 550, y: 2150, width: 150, height: 350, status: RoomStatus.Booked },
      { id: "D-303", x: 750, y: 2150, width: 150, height: 350, status: RoomStatus.Booked },
      { id: "D-305", x: 900, y: 2150, width: 150, height: 350, status: RoomStatus.Booked },
    ],
  },
  {
    level: 4,
    name: "Floor 5 (Rooftop)",
    imageUrl: "https://api.stayvie.com/uploads/gallery/gallery-1763359928337-Denah-O-Six---Lantai-5.webp",
    viewBox: "0 0 1500 3000",
    rooms: [
      { id: "D-515", x: 400, y: 675, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "D-512", x: 550, y: 675, width: 150, height: 375, status: RoomStatus.Temporary },
      { id: "D-511", x: 750, y: 675, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "B-508", x: 400, y: 1200, width: 150, height: 250, status: RoomStatus.Booked, tenantName: "Dewi K." },
      { id: "B-509", x: 550, y: 1200, width: 150, height: 250, status: RoomStatus.Temporary },
      { id: "B-510", x: 750, y: 1200, width: 150, height: 250, status: RoomStatus.Temporary },
      { id: "D-507", x: 400, y: 1625, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "D-506", x: 550, y: 1625, width: 150, height: 375, status: RoomStatus.Booked },
      { id: "D-505", x: 750, y: 1625, width: 150, height: 375, status: RoomStatus.Temporary },
      { id: "D-501", x: 400, y: 2150, width: 150, height: 350, status: RoomStatus.Booked },
      { id: "D-502", x: 550, y: 2150, width: 150, height: 350, status: RoomStatus.Booked },
      { id: "D-503", x: 750, y: 2150, width: 150, height: 350, status: RoomStatus.Temporary },
    ],
  },
];
