# CebuStays API

The Node server is an API-only service on port `3000`. Serve the frontend separately on port `5505` (for example, with VS Code Live Server). This keeps the API's security headers from blocking the hotel's Supabase-hosted photos.

- `GET /api/hotels` returns selected fields from `public.sen` and ordered photos from `public.sen_images`. Photos in Supabase Storage use public bucket URLs; local-development photos in `images2` through `images8` use paths served by the frontend on port `5505`.
- `GET /api/health` checks database connectivity.

## Run locally

1. Keep the existing `backend/.env`; do not overwrite it. Ensure it contains a server-side Postgres URL in `DATABASE_URL` (preferred) or `SUPABASE_DATABASE_URL`. For this persistent server, use the Supabase shared session pooler on port `5432`. Use `DIRECT_URL` for Prisma schema operations where direct database networking is available.
2. Download the database CA certificate from Supabase **Database Settings → SSL Configuration** and set `DATABASE_SSL_CA` to its local path. The server requires this CA and verifies the TLS certificate; it does not fall back to insecure TLS.
3. Run on Node.js 24 or later and start the API with `npm start`; the prestart script generates the Prisma client. Open the frontend at `http://127.0.0.1:5505` using VS Code Live Server. Do not use port `3000` as the website; it is reserved for `/api/hotels` and `/api/health`. In GitHub Codespaces previews, the frontend on port 5505 targets the same workspace's forwarded API port 3000; the server allows that matching Codespaces origin. For other deployments with a separate browser origin, list exact origins in `CENTRAL_ALLOWED_ORIGINS`.

Never place database credentials or Supabase secret keys in frontend code or commit them. `.gitignore` excludes `backend/.env`.

## Database access boundary

This server exposes only the hotel's public catalogue and has no write routes. It selects only fields required by the listing UI. The live table has RLS enabled but no policies; the current server-side database connection may bypass RLS if it uses an owner or privileged role. Before production, use a dedicated database login limited to `SELECT` on `public.sen` and configure an explicit, reviewed read policy for that login. Do not use this connection for guest data, bookings, payments, or role management.

Booking, authentication, payment, email, and rate-limiting APIs are not implemented.
