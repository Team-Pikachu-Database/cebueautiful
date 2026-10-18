import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { createAuthService } from "./auth.js";
import { createServer } from "./server.js";
import { createSiteServer } from "./site.js";

dotenv.config({ path: "backend/.env" });

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Set DATABASE_URL in backend/.env before starting the server.");
}

const databaseUsername = decodeURIComponent(new URL(databaseUrl).username);
const supabaseProjectRef = databaseUsername.match(/^postgres\.([a-z0-9]+)$/i)?.[1];
const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "") ||
  (supabaseProjectRef ? `https://${supabaseProjectRef}.supabase.co` : null);
if (!supabaseUrl) {
  throw new Error("Set SUPABASE_URL or use a Supabase database username containing the project reference.");
}

const sslCaPath = process.env.DATABASE_SSL_CA;
if (!sslCaPath) {
  throw new Error(
    "Set DATABASE_SSL_CA to the Supabase database CA certificate path."
  );
}

const connectionUrl = new URL(databaseUrl);
for (const parameter of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
  connectionUrl.searchParams.delete(parameter);
}

const pool = new Pool({
  connectionString: connectionUrl.toString(),
  ssl: { ca: readFileSync(sslCaPath, "utf8") },
  max: 5,
  connectionTimeoutMillis: 5000
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const auth = createAuthService({
  pool,
  sessionTtlHours: process.env.CENTRAL_SESSION_TTL_HOURS
});
const host = process.env.CENTRAL_HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
const port = Number(process.env.PORT || process.env.CENTRAL_PORT || 3000);
const frontendPort = Number(process.env.CENTRAL_FRONTEND_PORT || 5505);
const serveSite = process.env.CENTRAL_SERVE_SITE !== "false";

if (
  !Number.isInteger(port) || port < 1 || port > 65535 ||
  (serveSite && (
    !Number.isInteger(frontendPort) ||
    frontendPort < 1 ||
    frontendPort > 65535 ||
    frontendPort === port
  ))
) {
  throw new Error("CENTRAL_PORT and CENTRAL_FRONTEND_PORT must be distinct valid TCP ports.");
}

const server = createServer({
  prisma,
  configuredOrigins: process.env.CENTRAL_ALLOWED_ORIGINS,
  codespaceName: process.env.CODESPACE_NAME,
  supabaseUrl,
  auth,
  apiPort: port
});
const siteServer = serveSite ? createSiteServer({
  apiPort: port,
  frontendPort,
  configuredOrigins: process.env.CENTRAL_ALLOWED_ORIGINS,
  codespaceName: process.env.CODESPACE_NAME
}) : null;

server.listen(port, host, () => {
  console.log(`CebuStays API listening on http://${host}:${port}`);
  if (siteServer) {
    siteServer.listen(frontendPort, host, () => {
      console.log(`CebuStays website listening on http://${host}:${frontendPort}`);
    });
  }
});

async function shutdown() {
  const close = instance => new Promise((resolve, reject) => {
    instance.close(error => error ? reject(error) : resolve());
  });

  try {
    await Promise.all([server, siteServer].filter(Boolean).map(close));
    await prisma.$disconnect();
  } catch {
    console.error("Server shutdown failed.");
    process.exitCode = 1;
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
