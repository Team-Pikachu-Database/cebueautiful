import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

dotenv.config({ path: "backend/.env" });

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Set DATABASE_URL in backend/.env before migrating accounts.");
}

const sslCaPath = process.env.DATABASE_SSL_CA;
if (!sslCaPath) {
  throw new Error("Set DATABASE_SSL_CA in backend/.env before migrating accounts.");
}

const connectionUrl = new URL(databaseUrl);
for (const parameter of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
  connectionUrl.searchParams.delete(parameter);
}

const migrationsPath = fileURLToPath(new URL("../prisma/migrations/", import.meta.url));
const migrations = fs.readdirSync(migrationsPath, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();
const pool = new Pool({
  connectionString: connectionUrl.toString(),
  ssl: { ca: fs.readFileSync(sslCaPath, "utf8") },
  connectionTimeoutMillis: 5000
});

try {
  for (const migration of migrations) {
    const migrationPath = path.join(migrationsPath, migration, "migration.sql");
    if (!fs.existsSync(migrationPath)) continue;
    await pool.query(fs.readFileSync(migrationPath, "utf8"));
    console.log(`Applied or verified ${migration}.`);
  }
} finally {
  await pool.end();
}