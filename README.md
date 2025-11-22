# StayVie Backend (PostgreSQL)

Express + TypeScript backend that persists outlets, floors, and rooms in PostgreSQL and exposes `/api` routes for the Stayvie backoffice UI.

## Setup
1. `cd Backend`
2. `npm install`
3. Configure `.env` (sample values already filled):
   - `DATABASE_URL=postgres://...` (public Stayvie URL already included)
   - `JWT_SECRET=your-secret`
   - `BACKEND_PUBLIC_URL=http://localhost:4000`
   - `UPLOADS_DIR=uploads`
   - `DEFAULT_OUTLET_SLUG=bhaskara-osix`
   - `COMPANY_NAME=Stayvie Co-Living`
4. `npm run dev` for hot reload or `npm run build && npm start` for production.

On boot the server:
- Ensures PostgreSQL tables exist (outlets, floors, rooms)
- Seeds the Bhaskara Osix outlet + floors/rooms if missing
- Serves static uploads from `/uploads`

## Key routes (prefixed with `/api`)
- `GET /outlets` — list outlets
- `POST /outlets` — create outlet
- `PUT /outlets/:outletSlug` — update outlet name/company
- `GET /outlets/:outletSlug/floors` — list floors + rooms for an outlet
- `POST /outlets/:outletSlug/floors` — create floor (JSON or multipart)
- `PUT /outlets/:outletSlug/floors/:level` — update floor meta
- `DELETE /outlets/:outletSlug/floors/:level` — delete floor + rooms
- `POST /outlets/:outletSlug/floors/:level/image` — upload/replace floor image
- `POST /outlets/:outletSlug/floors/:level/rooms` — add room
- `PUT /outlets/:outletSlug/rooms/:id` — update room (rename/move/status/etc)
- `PATCH /outlets/:outletSlug/rooms/bulk-status` — bulk status change
- `DELETE /outlets/:outletSlug/rooms/:id` — delete room

Legacy aliases (`/floors`, `/rooms/...`) still hit the default outlet for backward compatibility.

## Uploading a floor plan image
```
curl -X POST 'http://localhost:4000/api/outlets/bhaskara-osix/floors/1/image' \
  -F 'image=@/path/to/floor.png' \
  -H 'Content-Type: multipart/form-data'
```

The response returns `imageUrl`, which is stored in PostgreSQL and served via `/uploads`.
