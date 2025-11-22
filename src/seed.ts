import { DEFAULT_COMPANY_NAME, DEFAULT_OUTLET_SLUG } from './config';
import { osixFloorSeed } from './data/osixFloors';
import { query } from './db';

const DEFAULT_OUTLET_NAME = 'Bhaskara Osix';

export async function ensureSeeded(): Promise<void> {
  const existingOutlet = await query<{ id: number }>('SELECT id FROM outlets WHERE slug = $1', [
    DEFAULT_OUTLET_SLUG,
  ]);

  const outletId =
    existingOutlet[0]?.id ??
    (
      await query<{ id: number }>(
        'INSERT INTO outlets (slug, name, company_name) VALUES ($1, $2, $3) RETURNING id',
        [DEFAULT_OUTLET_SLUG, DEFAULT_OUTLET_NAME, DEFAULT_COMPANY_NAME]
      )
    )[0].id;

  for (const floor of osixFloorSeed) {
    const existingFloor = await query<{ id: number }>(
      'SELECT id FROM floors WHERE outlet_id = $1 AND level = $2',
      [outletId, floor.level]
    );

    const floorId =
      existingFloor[0]?.id ??
      (
        await query<{ id: number }>(
          `INSERT INTO floors (outlet_id, level, name, image_url, view_box)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [outletId, floor.level, floor.name, floor.imageUrl, floor.viewBox]
        )
      )[0].id;

    if (existingFloor[0]?.id) {
      await query(
        'UPDATE floors SET name = $1, image_url = $2, view_box = $3, updated_at = NOW() WHERE id = $4',
        [floor.name, floor.imageUrl, floor.viewBox, floorId]
      );
    }

    for (const room of floor.rooms) {
      await query(
        `INSERT INTO rooms (outlet_id, floor_id, room_code, x, y, width, height, status, tenant_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (outlet_id, room_code) DO UPDATE
         SET floor_id = EXCLUDED.floor_id,
             x = EXCLUDED.x,
             y = EXCLUDED.y,
             width = EXCLUDED.width,
             height = EXCLUDED.height,
             status = EXCLUDED.status,
             tenant_name = EXCLUDED.tenant_name,
             updated_at = NOW();`,
        [outletId, floorId, room.id, room.x, room.y, room.width, room.height, room.status, room.tenantName ?? null]
      );
    }
  }
}
