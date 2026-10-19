# CebuStays Deployment

## Current status

- The configured remote is `Team-Pikachu-Database/frontend_DB`, with `main` as its default branch.
- The source repository is private; `Team-Pikachu-Database/cebueautiful` is the separate public static-only GitHub Pages repository.
- The website uses GitHub Pages' free project URL: `https://team-pikachu-database.github.io/cebueautiful/`.
- The API uses Render's free service URL: `https://cebustays-api.onrender.com`.
- The public static-only repository is `Team-Pikachu-Database/cebueautiful`; backend code and database credentials remain in the private source repository.
- The frontend uses a Node API for hotel data and accounts. GitHub Pages cannot host that API.
- No paid domain or separate DNS provider is required for the free URLs. However, GitHub Pages and Render are on different site domains, so browsers may block the cross-site HttpOnly account cookie. The public hotel catalogue can still use the API; sign-in and registration are not reliable in this setup.
- The free deployment uses GitHub Pages for static files and Render for the API; custom DNS is not needed.

## Prepare the backend

1. The Render service from `render.yaml` runs `npm run start:api` and binds to Render's `PORT`; its default URL is `https://cebustays-api.onrender.com`.
2. Before the first deploy, rotate the exposed Supabase database password and update `DATABASE_URL` in Render's secret environment settings. Never paste the password in chat or into a frontend/repository variable.
3. Upload the current Supabase CA certificate to Render as a secret file named `supabase-prod-ca-2021.crt`; the blueprint sets `DATABASE_SSL_CA=/etc/secrets/supabase-prod-ca-2021.crt`.
4. `render.yaml` allows the GitHub Pages origin `https://team-pikachu-database.github.io` and does not require custom DNS.
5. Check `https://cebustays-api.onrender.com/api/health` after deployment. It should return `{"status":"ok"}`.
6. Before public use, replace the current privileged database connection with a dedicated least-privilege role and review Supabase RLS policies.

Keep `DATABASE_URL`, the CA certificate, developer invites, and Supabase secret/service-role keys in the backend host's secret manager only. `CEBUSTAYS_API_BASE_URL` is a public origin, not a secret.

## Publish the frontend

1. The current repository stays private: its history contains a database URL with a non-placeholder password. Rotate that password first. Do not try to publish `frontend_DB` or alter its Git history as part of this step.
2. The separate public repository contains only the static site and Pages workflow, not `backend/`, Prisma files, certificates, `backend/.env`, or the private repository's history.
3. Set the public repository Actions variable `CEBUSTAYS_API_BASE_URL` to `https://cebustays-api.onrender.com` and enable GitHub Pages with the GitHub Actions source.
4. The Actions workflow checks the Render API health route before publishing. Check the repository's **Actions** tab for a successful deployment.
5. The site URL is `https://team-pikachu-database.github.io/cebueautiful/`; no DNS records or custom domain are needed.

## Local validation

Run `npm run build:pages` to create the static artifact locally. It includes `index.html`, `developer.html`, `style.css`, `script.js`, `developer.js`, generated `config.js`, and the logo/image folders; it excludes backend code, certificates, database configuration, and `.env` files. Developer sign-ins open a page with links to the Supabase project and GitHub organization. Room availability and no-payment reservations require the room-booking database migration to be applied with `npm run db:accounts` before deploying the updated API. The initial capacity is five rooms per property. The production workflow requires an HTTPS API origin before it can publish.

Run `npm test` and `npm run db:validate` before pushing. GitHub Pages does not run the Node API, so hotel data, registration, sign-in, and sign-out require the separately deployed API to be healthy.

For a local VS Code Live Server preview on port `5500`, `config.js` points to the hosted Render API, so collaborators do not need database credentials just to load listings. The API must be redeployed after changes to its CORS allowlist. Local Live Server bookings use the shared database and create real reservations; use the Node backend on port `5505` with a separate test database for booking tests.

## Still needed

- Rotate the Supabase database password exposed through `backend/.env` history and update the Render secret `DATABASE_URL`.
- Upload the Supabase CA certificate to Render as a secret file.
- Verify the Render blueprint's allowed GitHub Pages origin has synced to the running API.
- Verify the latest GitHub Pages workflow deployment completes successfully.