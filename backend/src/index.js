import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { createServer } from "./server.js";

dotenv.config({ path: "backend/.env" });

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Set DATABASE_URL in backend/.env before starting the server.");
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
const host = process.env.CENTRAL_HOST || "127.0.0.1";
const port = Number(process.env.CENTRAL_PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("CENTRAL_PORT must be a valid TCP port.");
}

const server = createServer({
  prisma,
  configuredOrigins: process.env.CENTRAL_ALLOWED_ORIGINS,
  apiPort: port
});

server.listen(port, host, () => {
  console.log(`CebuStays server listening on http://${host}:${port}`);
});

async function shutdown() {
  server.close(async error => {
    await prisma.$disconnect();
    if (error) {
      console.error("Server shutdown failed.");
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
