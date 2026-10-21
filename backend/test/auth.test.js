import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAuthService,
  hashInviteCode,
  hashPassword,
  verifyPassword
} from "../src/auth.js";

test("passwords are stored as scrypt hashes and verified without plaintext storage", async () => {
  const password = "a-long-and-unique-passphrase";
  const hash = await hashPassword(password);

  assert.match(hash, /^scrypt\$32768\$8\$1\$/);
  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("a-different-password", hash), false);
});

test("developer invite codes are stored as one-way hashes", () => {
  const inviteCode = "a".repeat(64);
  const hash = hashInviteCode(inviteCode);

  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, inviteCode);
  assert.throws(() => hashInviteCode("short"), { code: "INVALID_INVITE" });
});

test("standard registration persists a standard role and only a password hash", async () => {
  const queries = [];
  const pool = {
    connect: async () => ({
      query: async (sql, values = []) => {
        queries.push({ sql, values });
        if (sql.startsWith("INSERT INTO public.app_users")) {
          return { rows: [{
            id: values[0],
            email: values[1],
            role: values[3],
            full_name: values[4],
            created_at: new Date("2026-01-01T00:00:00.000Z")
          }] };
        }
        return { rows: [] };
      },
      release() {}
    })
  };
  const auth = createAuthService({ pool });

  const result = await auth.registerStandard(
    "  GUEST@EXAMPLE.COM ",
    "a-long-and-unique-passphrase",
    "Dave Guest"
  );
  const insert = queries.find(query => query.sql.startsWith("INSERT INTO public.app_users"));

  assert.equal(result.user.email, "guest@example.com");
  assert.equal(result.user.role, "standard");
  assert.equal(result.user.displayName, "Dave Guest");
  assert.equal(insert.values[4], "Dave Guest");
  assert.match(insert.values[2], /^scrypt\$/);
  assert.notEqual(insert.values[2], "a-long-and-unique-passphrase");
  assert.match(result.token, /^[A-Za-z0-9_-]{40,50}$/);
});

test("developer registration rejects missing and already-used invite hashes", async () => {
  let transactionRolledBack = false;
  let transactionCommitted = false;
  const auth = createAuthService({
    pool: {
      connect: async () => ({
        query: async sql => {
          if (sql === "COMMIT") transactionCommitted = true;
          if (sql === "ROLLBACK") transactionRolledBack = true;
          if (sql.startsWith("INSERT INTO public.app_users")) {
            return { rows: [{ id: "rolled-back-user" }] };
          }
          return { rows: [], rowCount: 0 };
        },
        release() {}
      })
    }
  });

  await assert.rejects(
    auth.registerDeveloper(
      "dev@example.com",
      "a-long-and-unique-passphrase",
      "wrong"
    ),
    { status: 403, code: "INVALID_INVITE" }
  );
  assert.equal(transactionRolledBack, true);
  assert.equal(transactionCommitted, false);
});

test("developer registration assigns the protected developer role with a valid invite", async () => {
  const inviteCode = "CBST-DEV-" + "A".repeat(48);
  let insertedRole = "";
  let inviteWasClaimed = false;
  const pool = {
    connect: async () => ({
      query: async (sql, values = []) => {
        if (sql.startsWith("UPDATE public.app_developer_invites")) {
          inviteWasClaimed = true;
          return { rows: [{ code_hash: values[0] }], rowCount: 1 };
        }
        if (sql.startsWith("INSERT INTO public.app_users")) {
          insertedRole = values[3];
          return { rows: [{
            id: values[0],
            email: values[1],
            role: values[3],
            full_name: values[4],
            created_at: new Date("2026-01-01T00:00:00.000Z")
          }] };
        }
        return { rows: [] };
      },
      release() {}
    })
  };
  const auth = createAuthService({ pool });

  const result = await auth.registerDeveloper(
    "dev@example.com",
    "a-long-and-unique-passphrase",
    inviteCode
  );

  assert.equal(insertedRole, "developer");
  assert.equal(result.user.role, "developer");
  assert.equal(result.user.displayName, "dev");
  assert.equal(inviteWasClaimed, true);
});

test("profile updates normalize and persist the display name", async () => {
  let values;
  const auth = createAuthService({
    pool: {
      query: async (sql, parameters) => {
        values = parameters;
        return { rows: [{
          id: parameters[0],
          email: "guest@example.com",
          role: "standard",
          full_name: parameters[1],
          created_at: new Date("2026-01-01T00:00:00.000Z")
        }] };
      }
    }
  });

  const user = await auth.updateProfile("user-1", "  Dave   Guest  ");

  assert.deepEqual(values, ["user-1", "Dave Guest"]);
  assert.equal(user.displayName, "Dave Guest");
});