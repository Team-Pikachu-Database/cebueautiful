# CebuStays Deployment

## Current status

- The configured remote is `Team-Pikachu-Database/frontend_DB`, with `main` as its default branch.
- The repository is private and GitHub Pages is not enabled. GitHub CLI access did not allow changing repository Actions settings.
- The chosen website domain is `www.pikachubookingsite.com`; the chosen API domain is `api.pikachubookingsite.com`.
- The new public static-only repository name chosen is `cebueautiful`.
- The frontend uses a Node API for hotel data and accounts. GitHub Pages cannot host that API.
- The existing sign-in uses HttpOnly cookies. To preserve it reliably, put the frontend and API on subdomains of the same custom domain, for example `www.example.com` and `api.example.com`.
- The working tree contains uncommitted changes. Review and commit the intended changes before pushing; this work does not commit or push them.

## Prepare the backend

1. Create the Render service from `render.yaml`; it runs `npm run start:api` and binds to Render's `PORT`.
2. Before the first deploy, rotate the exposed Supabase database password and update `DATABASE_URL` in Render's secret environment settings. Never paste the password in chat or into a frontend/repository variable.
3. Upload the current Supabase CA certificate to Render as a secret file named `supabase-prod-ca-2021.crt`; the blueprint sets `DATABASE_SSL_CA=/etc/secrets/supabase-prod-ca-2021.crt`.
4. Attach `api.pikachubookingsite.com` to the Render service and add the DNS record Render requests. Render's assigned `onrender.com` target is not known until the service is created.
5. Check `https://api.pikachubookingsite.com/api/health` after deployment. It should return `{"status":"ok"}`.
6. Before public use, replace the current privileged database connection with a dedicated least-privilege role and review Supabase RLS policies.

Keep `DATABASE_URL`, the CA certificate, developer invites, and Supabase secret/service-role keys in the backend host's secret manager only. `CEBUSTAYS_API_BASE_URL` is a public origin, not a secret.

## Publish the frontend

1. The current repository stays private: its history contains a database URL with a non-placeholder password. Rotate that password first. Do not try to publish `frontend_DB` or alter its Git history as part of this step.
2. After setting `CEBUSTAYS_API_BASE_URL=https://api.pikachubookingsite.com` and `CEBUSTAYS_SITE_DOMAIN=www.pikachubookingsite.com` in your local shell, run `npm run export:pages-repo`. This creates a new `public-pages/` staging directory only if one does not already exist. Review it before using it to create `Team-Pikachu-Database/cebueautiful`; it contains the Pages workflow and frontend assets, not `backend/`, Prisma files, certificates, `backend/.env`, or the old Git history.
3. Once the Render API and DNS are ready, create and push the clean public repository from that staging directory:

	```bash
	cd public-pages
	git init -b main
	git add .
	git commit -m "Prepare CebuStays Pages site"
	gh repo create Team-Pikachu-Database/cebueautiful --public --source . --remote origin --push
	```

	These commands initialize Git inside `public-pages/`; they do not commit or push the private source repository.
4. In the new repository's **Settings → Secrets and variables → Actions → Variables**, set `CEBUSTAYS_API_BASE_URL` to `https://api.pikachubookingsite.com`. This is a public API origin, not a secret.
5. In **Settings → Pages**, set the publishing source to **GitHub Actions**.
6. Point `www.pikachubookingsite.com` to the Pages target shown in repository settings (typically a CNAME to `Team-Pikachu-Database.github.io`). The Pages artifact includes a `CNAME` file for this confirmed hostname. Enable **Enforce HTTPS** after DNS is verified and GitHub offers it.
7. Check the new repository's **Actions** tab for a successful deployment. Its default project URL format is `https://team-pikachu-database.github.io/cebueautiful/`; the custom URL will be `https://www.pikachubookingsite.com/` after DNS/Pages setup. Neither is live yet.

## Local validation

Run `npm run build:pages` to create the static artifact locally. It includes `index.html`, `style.css`, `script.js`, generated `config.js`, and `images/` through `images8/`; it excludes backend code, certificates, database configuration, and `.env` files. The production workflow requires an HTTPS API origin before it can publish.

Run `npm test` and `npm run db:validate` before pushing. GitHub Pages does not run the Node API, so hotel data, registration, sign-in, and sign-out require the separately deployed API to be healthy.

## Still needed

- Rotate the Supabase database password exposed through `backend/.env` history and update the Render secret `DATABASE_URL`.
- Upload the Supabase CA certificate to Render as a secret file.
- Configure DNS for `api.pikachubookingsite.com` and `www.pikachubookingsite.com` using the targets provided by Render and GitHub Pages.
- Audit the exact static-only file list before creating/pushing the new public repository `cebueautiful`.
- GitHub Pages/Actions settings on the new repository must be enabled; the current GitHub integration could not access Actions settings remotely.