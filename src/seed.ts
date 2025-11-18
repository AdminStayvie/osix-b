import { FloorModel } from './models/floor';
import { osixFloorSeed } from './data/osixFloors';

export async function ensureSeeded(): Promise<void> {
  for (const floor of osixFloorSeed) {
    const existing = await FloorModel.findOne({ level: floor.level });
    if (!existing) {
      await FloorModel.create(floor);
    }
  }
}
