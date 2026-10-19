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
const publicHost = process.env.CENTRAL_HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
const publicPort = Number(process.env.PORT || process.env.CENTRAL_PORT || 3000);
const frontendPort = Number(
  process.env.CENTRAL_FRONTEND_PORT || (process.env.PORT ? publicPort : 5505)
);
const singleOrigin = process.env.CENTRAL_SINGLE_ORIGIN === "true";
const apiHost = singleOrigin ? "127.0.0.1" : publicHost;
const apiPort = singleOrigin
  ? Number(process.env.CENTRAL_API_INTERNAL_PORT || 3101)
  : publicPort;
const serveSite = process.env.CENTRAL_SERVE_SITE !== "false";

if (
  !Number.isInteger(publicPort) || publicPort < 1 || publicPort > 65535 ||
  !Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535 ||
  (serveSite && (
    !Number.isInteger(frontendPort) ||
    frontendPort < 1 ||
    frontendPort > 65535 ||
    (!singleOrigin && frontendPort === publicPort)
  )) ||
  (singleOrigin && (!serveSite || apiPort === publicPort))
) {
  throw new Error("Configured API and website ports must be valid and distinct where required.");
}

const configuredOrigins = process.env.CENTRAL_ALLOWED_ORIGINS;
const apiOrigins = singleOrigin
  ? [configuredOrigins, `http://127.0.0.1:${apiPort}`].filter(Boolean).join(",")
  : configuredOrigins;

const server = createServer({
  prisma,
  configuredOrigins: apiOrigins,
  codespaceName: process.env.CODESPACE_NAME,
  supabaseUrl,
  auth,
  apiPort
});
const siteServer = serveSite ? createSiteServer({
  apiPort,
  frontendPort,
  configuredOrigins,
  codespaceName: process.env.CODESPACE_NAME
}) : null;

if (siteServer && singleOrigin) {
  server.listen(apiPort, apiHost, () => {
    console.log(`CebuStays internal API listening on http://${apiHost}:${apiPort}`);
    siteServer.listen(publicPort, publicHost, () => {
      console.log(`CebuStays website/API listening on http://${publicHost}:${publicPort}`);
    });
  });
} else {
  server.listen(publicPort, publicHost, () => {
    console.log(`CebuStays API listening on http://${publicHost}:${publicPort}`);
    if (siteServer) {
      siteServer.listen(frontendPort, publicHost, () => {
        console.log(`CebuStays website listening on http://${publicHost}:${frontendPort}`);
      });
    }
  });
}

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
