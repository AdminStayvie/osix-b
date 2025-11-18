export enum RoomStatus {
  Booked = 'Booked',
  Temporary = 'Sementara',
}

export interface Room {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: RoomStatus;
  tenantName?: string;
}

export interface Floor {
  level: number;
  name: string;
  imageUrl: string;
  viewBox: string;
  rooms: Room[];
}
