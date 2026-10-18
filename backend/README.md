# CebuStays API

`npm start` runs the private API on port `3000` and the website with a same-origin API proxy on port `5505`. The browser calls only port `5505`; the site server forwards `/api/*` requests internally to port `3000`. This avoids Codespaces cross-port preflight failures without exposing the database API publicly.

- `GET /api/hotels` returns selected fields from `public.sen` and ordered photos from `public.sen_images`. Photos in Supabase Storage use public bucket URLs; local-development photos in `images2` through `images8` use paths served by the frontend on port `5505`.
- `GET /api/health` checks database connectivity.
- `/api/auth/*` provides email/password registration, sign-in, sign-out, and session lookup. Passwords use scrypt hashes; sessions are stored as hashes in PostgreSQL and sent as HttpOnly cookies. Developer registration requires a private invite code.

## Run locally

1. Keep the existing `backend/.env`; do not overwrite it. Ensure it contains a server-side Postgres URL in `DATABASE_URL` (preferred) or `SUPABASE_DATABASE_URL`. For this persistent server, use the Supabase shared session pooler on port `5432`. Use `DIRECT_URL` for Prisma schema operations where direct database networking is available.
2. Download the database CA certificate from Supabase **Database Settings → SSL Configuration** and set `DATABASE_SSL_CA` to its local path. The server requires this CA and verifies the TLS certificate; it does not fall back to insecure TLS.
3. Run on Node.js 24 or later and start the app with `npm start`; the prestart script generates the Prisma client. Open the frontend at `http://127.0.0.1:5505` or use the forwarded Codespaces port 5505. Do not run VS Code Live Server at the same time; `npm start` now owns port `5505`. Port `3000` remains the private API service.

4. Run `npm run db:accounts` to create or verify the account, session, and invite tables. To issue unique, one-use developer codes, run `npm run accounts:invites -- 12`. The command prints the codes once and stores only their hashes; save the printed codes securely. Standard accounts do not need an invite code. Each developer code can create only one account.

## GitHub Pages frontend with a hosted API

GitHub Pages hosts only the static frontend. Build it with `npm run build:pages`; the allowlisted output contains the HTML, CSS, JavaScript, and image folders, not backend source or secrets. The Pages workflow requires the public `CEBUSTAYS_API_BASE_URL` repository variable to be set to the HTTPS origin of a separately hosted API.

Run the API on a Node.js host with `npm run start:api`. Configure its environment with the private `DATABASE_URL`, `DATABASE_SSL_CA` pointing to a mounted CA certificate file, `NODE_ENV=production`, and `CENTRAL_ALLOWED_ORIGINS` set to the exact HTTPS origin of the website. The API binds to the host-provided `PORT` and does not start the local website listener in API-only mode. Add a custom domain so the website and API are same-site subdomains (for example, `www.example.com` and `api.example.com`); the existing HttpOnly, SameSite=Lax session cookies are not reliable across unrelated domains.

Before production, replace any privileged database connection with a dedicated, least-privilege database role and review RLS policies. Never put `DATABASE_URL`, the CA contents, invite codes, or service-role keys in the Pages build or repository variables. The API origin is public and may be stored as a repository variable.

Never place database credentials or Supabase secret keys in frontend code or commit them. `.gitignore` excludes `backend/.env`.

## Database access boundary

This server exposes only the hotel's public catalogue and has no write routes. It selects only fields required by the listing UI. The live table has RLS enabled but no policies; the current server-side database connection may bypass RLS if it uses an owner or privileged role. Before production, use a dedicated database login limited to `SELECT` on `public.sen` and configure an explicit, reviewed read policy for that login. Do not use this connection for guest data, bookings, payments, or role management.

Booking, password reset, email verification, payment, and persistent rate limiting are not implemented. A developer invite grants a developer role only; authorization for future developer-only features must still be enforced by the API.
