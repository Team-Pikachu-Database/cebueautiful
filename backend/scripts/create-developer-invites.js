import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import fs from "node:fs";
import { Pool } from "pg";
import { hashInviteCode } from "../src/auth.js";

dotenv.config({ path: "backend/.env" });

const count = Number(process.argv[2]);
if (!Number.isInteger(count) || count < 1 || count > 12) {
  throw new Error("Choose a number of invite codes from 1 through 12.");
}

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Set DATABASE_URL in backend/.env before issuing invite codes.");
}

const sslCaPath = process.env.DATABASE_SSL_CA;
if (!sslCaPath) {
  throw new Error("Set DATABASE_SSL_CA in backend/.env before issuing invite codes.");
}

const connectionUrl = new URL(databaseUrl);
for (const parameter of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
  connectionUrl.searchParams.delete(parameter);
}

const pool = new Pool({
  connectionString: connectionUrl.toString(),
  ssl: { ca: fs.readFileSync(sslCaPath, "utf8") },
  connectionTimeoutMillis: 5000
});
const client = await pool.connect();
const codes = Array.from({ length: count }, () =>
  `CBST-DEV-${randomBytes(24).toString("hex").toUpperCase()}`
);

try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock($1, $2)", [221104, 12]);

  const activeInvites = await client.query(
    `SELECT count(*)::int AS count
     FROM public.app_developer_invites
     WHERE used_at IS NULL AND (expires_at IS NULL OR expires_at > now())`
  );
  if (activeInvites.rows[0].count > 0) {
    throw new Error("Unused developer invite codes already exist; no additional codes were created.");
  }

  for (const code of codes) {
    await client.query(
      "INSERT INTO public.app_developer_invites (code_hash) VALUES ($1)",
      [hashInviteCode(code)]
    );
  }

  await client.query("COMMIT");
  console.log(`Created ${codes.length} one-time developer invite codes. Save them now; only their hashes are stored in the database.`);
  codes.forEach((code, index) => {
    console.log(`${String(index + 1).padStart(2, "0")}. ${code}`);
  });
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}