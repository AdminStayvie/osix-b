export enum RoomStatus {
  Booked = 'Booked',
  Temporary = 'Sementara',
}

export interface Room {
  id: string;
  outletId: number;
  floorId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  status: RoomStatus;
  tenantName?: string;
}

export interface Floor {
  id: number;
  outletId: number;
  outletSlug: string;
  level: number;
  name: string;
  imageUrl: string;
  viewBox: string;
  rooms: Room[];
}

export interface Outlet {
  id: number;
  slug: string;
  name: string;
  companyName: string;
}
