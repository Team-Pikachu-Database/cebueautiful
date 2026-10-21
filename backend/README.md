# CebuStays API

`npm start` runs the private API on port `3000` and the website with a same-origin API proxy on port `5505`. The browser calls only port `5505`; the site server forwards `/api/*` requests internally to port `3000`. This avoids Codespaces cross-port preflight failures without exposing the database API publicly.

- `GET /api/hotels` returns selected fields from `public.sen` and ordered photos from `public.sen_images`. Photos in Supabase Storage use public bucket URLs; local-development photos in `images2` through `images8` use paths served by the frontend on port `5505`.
- `GET /api/hotels/:id/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD` returns remaining rooms for a date range.
- `POST /api/bookings` creates a no-online-payment reservation. Inventory is locked per property during checkout so concurrent reservations cannot exceed its room limit. The API calculates the total from the stored nightly rate.
- `GET /api/health` checks database connectivity.
- `/api/auth/*` provides email/password registration, sign-in, sign-out, session lookup, and signed-in display-name updates. Passwords use scrypt hashes; sessions are stored as hashes in PostgreSQL and sent as HttpOnly cookies. Developer registration requires a private invite code.
- `GET /api/bookings/mine` returns up to 100 reservations linked to the signed-in account. New bookings store their owner from the server-side session; the browser cannot choose another account as the owner.

## Run locally

1. Keep the existing `backend/.env`; do not overwrite it. Ensure it contains a server-side Postgres URL in `DATABASE_URL` (preferred) or `SUPABASE_DATABASE_URL`. For this persistent server, use the Supabase shared session pooler on port `5432`. Use `DIRECT_URL` for Prisma schema operations where direct database networking is available.
2. Download the database CA certificate from Supabase **Database Settings → SSL Configuration** and set `DATABASE_SSL_CA` to its local path. The server requires this CA and verifies the TLS certificate; it does not fall back to insecure TLS.
3. Run on Node.js 24 or later and start the app with `npm start`; the prestart script generates the Prisma client. Open the frontend at `http://127.0.0.1:5505` or use the forwarded Codespaces port 5505. Do not run VS Code Live Server at the same time as `npm start`; `npm start` owns port `5505`. Port `3000` remains the private API service. For a static Live Server preview on port `5500`, the checked-in frontend config uses the shared hosted API; that preview reads live property data and booking submissions are real reservations, not test data.

4. Run `npm run db:accounts` to create or verify the account, display-name, session, invite, reservation-owner, and room-booking schema. Existing reservations remain unowned and will not appear in a user's history automatically. Existing properties receive an initial limit of five rooms each. To change a property's limit, update `public.hotel_room_inventory.total_rooms` for its `hotel_id`. To issue unique, one-use developer codes, run `npm run accounts:invites -- 12`. The command prints the codes once and stores only their hashes; save the printed codes securely. Standard accounts do not need an invite code. Each developer code can create only one account.

## GitHub Pages frontend with a hosted API

GitHub Pages hosts only the static frontend. Build it with `npm run build:pages`; the allowlisted output contains the HTML, CSS, JavaScript, and image folders, not backend source or secrets. The current free deployment uses `https://team-pikachu-database.github.io/cebueautiful/` for the site and `https://cebustays-api.onrender.com` for the API. The Pages workflow requires the public `CEBUSTAYS_API_BASE_URL` repository variable to be set to the HTTPS origin of the separately hosted API.

Run the API on a Node.js host with `npm run start:api`. Configure its environment with the private `DATABASE_URL`, `DATABASE_SSL_CA` pointing to a mounted CA certificate file, `NODE_ENV=production`, and `CENTRAL_ALLOWED_ORIGINS` set to `https://team-pikachu-database.github.io`. The API binds to the host-provided `PORT` and does not start the local website listener in API-only mode. The public hotel catalogue also accepts HTTPS GitHub Codespaces preview origins; other API routes remain restricted to configured origins. Secure deployments set the HttpOnly session cookie to `SameSite=None; Secure` so cross-site requests can include it. Browser privacy settings may still block third-party cookies; use same-site custom subdomains if reliable account sessions are required.

Before production, replace any privileged database connection with a dedicated, least-privilege database role and review RLS policies. Never put `DATABASE_URL`, the CA contents, invite codes, or service-role keys in the Pages build or repository variables. The API origin is public and may be stored as a repository variable.

Never place database credentials or Supabase secret keys in frontend code or commit them. `.gitignore` excludes `backend/.env`.

## Database access boundary

The hotel catalogue selects only fields required by the listing UI. Booking writes are handled server-side; the browser never connects directly to the database. The booking and inventory tables have RLS enabled and direct access revoked from `anon` and `authenticated`. The server database connection must be allowed to insert and update these tables. Before production, use a dedicated least-privilege database login with only the required catalogue read and booking/inventory permissions.

Online payment, booking email notifications, password reset, email verification, and persistent rate limiting are not implemented. The reservation confirmation is displayed to the guest with a booking reference. A developer invite grants a developer role only; authorization for future developer-only features must still be enforced by the API.
