import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_COST = 32768;
const PASSWORD_BLOCK_SIZE = 8;
const PASSWORD_PARALLELISM = 1;
const PASSWORD_MAX_MEMORY = 64 * 1024 * 1024;
const DUMMY_PASSWORD_HASH = `scrypt$${PASSWORD_COST}$${PASSWORD_BLOCK_SIZE}$${PASSWORD_PARALLELISM}$${"00".repeat(16)}$${"00".repeat(PASSWORD_KEY_LENGTH)}`;
const SESSION_BYTES = 32;
const DEFAULT_SESSION_TTL_HOURS = 168;

export class AuthError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function normalizeEmail(value) {
  if (typeof value !== "string") {
    throw new AuthError(400, "Enter a valid email address.", "INVALID_EMAIL");
  }

  const email = value.trim().toLowerCase();
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new AuthError(400, "Enter a valid email address.", "INVALID_EMAIL");
  }

  return email;
}

function validatePassword(password) {
  if (
    typeof password !== "string" ||
    [...password].length < 12 ||
    Buffer.byteLength(password, "utf8") > 128
  ) {
    throw new AuthError(
      400,
      "Use a password with at least 12 characters and no more than 128 bytes.",
      "INVALID_PASSWORD"
    );
  }
}

export async function hashPassword(password) {
  validatePassword(password);
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, PASSWORD_KEY_LENGTH, {
    N: PASSWORD_COST,
    r: PASSWORD_BLOCK_SIZE,
    p: PASSWORD_PARALLELISM,
    maxmem: PASSWORD_MAX_MEMORY
  });

  return [
    "scrypt",
    PASSWORD_COST,
    PASSWORD_BLOCK_SIZE,
    PASSWORD_PARALLELISM,
    salt.toString("hex"),
    Buffer.from(derived).toString("hex")
  ].join("$");
}

export async function verifyPassword(password, encodedHash) {
  if (typeof password !== "string" || typeof encodedHash !== "string") {
    return false;
  }

  const [algorithm, costText, blockText, parallelText, saltText, keyText, extra] =
    encodedHash.split("$");
  const cost = Number(costText);
  const blockSize = Number(blockText);
  const parallelism = Number(parallelText);
  const salt = Buffer.from(saltText ?? "", "hex");
  const expected = Buffer.from(keyText ?? "", "hex");

  if (
    algorithm !== "scrypt" ||
    extra !== undefined ||
    cost !== PASSWORD_COST ||
    blockSize !== PASSWORD_BLOCK_SIZE ||
    parallelism !== PASSWORD_PARALLELISM ||
    salt.length !== 16 ||
    expected.length !== PASSWORD_KEY_LENGTH
  ) {
    return false;
  }

  const derived = await scrypt(password, salt, expected.length, {
    N: cost,
    r: blockSize,
    p: parallelism,
    maxmem: PASSWORD_MAX_MEMORY
  });

  return timingSafeEqual(Buffer.from(derived), expected);
}

export function hashInviteCode(code) {
  if (typeof code !== "string" || code.length < 32 || code.length > 128) {
    throw new AuthError(403, "The developer invite code is invalid.", "INVALID_INVITE");
  }

  return createHash("sha256").update(code).digest("hex");
}

function publicAccount(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at
  };
}

function sessionTokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function createAuthService({
  pool,
  sessionTtlHours = DEFAULT_SESSION_TTL_HOURS
}) {
  const parsedTtl = Number(sessionTtlHours);
  const ttlHours = Number.isFinite(parsedTtl) && parsedTtl >= 1 && parsedTtl <= 720
    ? parsedTtl
    : DEFAULT_SESSION_TTL_HOURS;

  async function createSession(client, accountId) {
    const token = randomBytes(SESSION_BYTES).toString("base64url");
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await client.query("DELETE FROM public.app_sessions WHERE expires_at <= now()");
    await client.query(
      "INSERT INTO public.app_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [sessionTokenHash(token), accountId, expiresAt]
    );

    return token;
  }

  async function register(emailValue, password, role, inviteCode = "") {
    const email = normalizeEmail(emailValue);
    validatePassword(password);
    const passwordHash = await hashPassword(password);
    const client = await pool.connect();
    const accountId = randomUUID();

    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO public.app_users (id, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, role, created_at`,
        [accountId, email, passwordHash, role]
      );

      if (role === "developer") {
        const invite = await client.query(
          `UPDATE public.app_developer_invites
           SET used_at = now(), used_by = $2
           WHERE code_hash = $1
             AND used_at IS NULL
             AND (expires_at IS NULL OR expires_at > now())
           RETURNING code_hash`,
          [hashInviteCode(inviteCode), accountId]
        );
        if (invite.rowCount !== 1) {
          throw new AuthError(403, "The developer invite code is invalid or already used.", "INVALID_INVITE");
        }
      }

      const token = await createSession(client, inserted.rows[0].id);
      await client.query("COMMIT");

      return { user: publicAccount(inserted.rows[0]), token };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505") {
        throw new AuthError(409, "An account with this email already exists.", "EMAIL_EXISTS");
      }
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    sessionTtlSeconds: ttlHours * 60 * 60,

    registerStandard(email, password) {
      return register(email, password, "standard");
    },

    registerDeveloper(email, password, inviteCode) {
      return register(email, password, "developer", inviteCode);
    },

    async login(emailValue, password) {
      let email;
      try {
        email = normalizeEmail(emailValue);
      } catch {
        await verifyPassword(typeof password === "string" ? password : "", DUMMY_PASSWORD_HASH);
        throw new AuthError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
      }

      const result = await pool.query(
        "SELECT id, email, password_hash, role, created_at FROM public.app_users WHERE email = $1",
        [email]
      );
      const account = result.rows[0];
      const passwordMatches = await verifyPassword(
        typeof password === "string" ? password : "",
        account?.password_hash ?? DUMMY_PASSWORD_HASH
      );

      if (!account || !passwordMatches) {
        throw new AuthError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
      }

      const client = await pool.connect();
      try {
        const token = await createSession(client, account.id);
        return { user: publicAccount(account), token };
      } finally {
        client.release();
      }
    },

    async getSession(token) {
      if (typeof token !== "string" || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
        return null;
      }

      const result = await pool.query(
        `SELECT u.id, u.email, u.role, u.created_at
         FROM public.app_sessions AS s
         JOIN public.app_users AS u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [sessionTokenHash(token)]
      );

      return result.rows[0] ? publicAccount(result.rows[0]) : null;
    },

    async logout(token) {
      if (typeof token !== "string" || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
        return;
      }
      await pool.query(
        "DELETE FROM public.app_sessions WHERE token_hash = $1",
        [sessionTokenHash(token)]
      );
    }
  };
}