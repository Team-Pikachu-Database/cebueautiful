import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeDatabaseUrl } from "../src/database-url.js";

test("database URL normalization removes libpq SSL query options", () => {
  assert.equal(
    normalizeDatabaseUrl(
      "postgresql://db-user:encoded%40password@db.example.test:5432/postgres?sslmode=require&pgbouncer=true"
    ),
    "postgresql://db-user:encoded%40password@db.example.test:5432/postgres?pgbouncer=true"
  );
});

test("database URL errors do not reveal credentials", () => {
  assert.throws(
    () => normalizeDatabaseUrl("postgresql://db-user:private-secret@<project-ref>.pooler.supabase.com:6543/postgres"),
    error => !error.message.includes("private-secret") &&
      error.message.includes("URL-encoded password")
  );
});

test("database URLs require a PostgreSQL host and credentials", () => {
  assert.throws(
    () => normalizeDatabaseUrl("https://example.test/"),
    { message: "DATABASE_URL must include a PostgreSQL host, username, and password." }
  );
});
