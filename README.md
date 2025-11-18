# StayVie Backend (Osix)

This Express/TypeScript backend powers the Osix floor/room management UI by persisting floor layouts inside MongoDB and exposing the `/api` routes that the Vite frontend consumes.

## Setup
1. `cd Backend`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in the values. For Osix you can reuse the credentials provided earlier:
   - `DB_NAME=RoomDB`
   - `JWT_SECRET=kunci-rahasia-anda-yang-sangat-aman`
   - `MONGO_URI=mongodb://root:Efz4AcPZEa32Ai8tg9ejLKOWpXcd7Qgmk3tjAurB5lUqqOS4Xcs6FLZXqSXfmvNy@148.230.97.197:5432/RoomDB?authSource=admin&directConnection=true`
4. `npm run dev` to start the server with hot reload.

## Available routes (prefixed by `/api`)
- `GET /floors` – list all floors.
- `GET /floors/:level` – fetch a single floor layout.
- `POST /floors/:level/rooms` – add a room to the floor.
- `PUT /rooms/:id` – update a room's metadata.
- `PATCH /rooms/bulk-status` – change the status for multiple rooms.
- `DELETE /rooms/:id` – remove a room.

## Notes
- The first server boot seeds the Osix layout (levels 1-4) if the database is empty.
- The `JWT_SECRET` is available for future auth needs (reported by `/`).
- Once running, point the Osix frontend to `http://localhost:4000/api`.
- Uploaded floor plan images are served from the `/uploads` static path and their URLs are persisted on each floor document (so Mongo knows what file a floor is using).

## Uploading a new floor plan image

1. Start the backend so `/uploads` is exposed and `BACKEND_PUBLIC_URL` reflects the running host (defaults to `http://localhost:4000`).
2. Upload a file via multipart form data (default limit 20 MB, configurable with `UPLOAD_MAX_SIZE_BYTES`):

```
curl -X POST 'http://localhost:4000/api/floors/1/image' \
  -F 'image=@/path/to/osix-floor1.png' \
  -H 'Content-Type: multipart/form-data'
```

3. The response returns `imageUrl`, which is written into the matching floor entry so the frontend can reference the new design.
