import { pgPool } from "../database";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

export interface User {
  id: string;
  name: string;
  email: string | null;
  created_at: Date;
}

export interface ApiKey {
  key: string;
  user_id: string;
  label: string | null;
  created_at: Date;
}

export interface Session {
  token: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
}

// ─── Hash Helpers ─────────────────────────────────────────────────────────────
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${hash}:${salt}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [hash, salt] = storedHash.split(":");
  const testHash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return timingSafeEqual(Buffer.from(hash), Buffer.from(testHash));
}

// ─── User Ops ─────────────────────────────────────────────────────────────────
export async function createUser(name: string, email: string, password?: string): Promise<User> {
  const passwordHash = password ? hashPassword(password) : null;
  const result = await pgPool.query<User>(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at`,
    [name, email, passwordHash]
  );
  return result.rows[0];
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const result = await pgPool.query<{ id: string; name: string; email: string; password_hash: string | null }>(
    `SELECT id, name, email, password_hash FROM users WHERE email = $1`,
    [email]
  );
  const dbUser = result.rows[0];
  if (!dbUser || !dbUser.password_hash) return null;

  if (verifyPassword(password, dbUser.password_hash)) {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      created_at: new Date() // placeholder, we just need user info
    };
  }
  return null;
}

// ─── API Key Ops ──────────────────────────────────────────────────────────────
export async function getUserByApiKey(key: string): Promise<User | null> {
  const result = await pgPool.query<User>(
    `SELECT u.id, u.name, u.email, u.created_at
     FROM users u
     INNER JOIN api_keys ak ON ak.user_id = u.id
     WHERE ak.key = $1`,
    [key]
  );
  return result.rows[0] ?? null;
}

export async function createApiKey(userId: string, label?: string): Promise<ApiKey> {
  const key = `ak_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const result = await pgPool.query<ApiKey>(
    `INSERT INTO api_keys (key, user_id, label) VALUES ($1, $2, $3) RETURNING *`,
    [key, userId, label ?? null]
  );
  return result.rows[0];
}

export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  const result = await pgPool.query<ApiKey>(
    `SELECT * FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

// ─── Session Ops ──────────────────────────────────────────────────────────────
export async function createSession(userId: string): Promise<string> {
  const token = `sess_${Date.now()}_${randomBytes(16).toString("hex")}`;
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
  await pgPool.query(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)`,
    [token, userId, expiresAt]
  );
  return token;
}

export async function getUserBySessionToken(token: string): Promise<User | null> {
  const result = await pgPool.query<User>(
    `SELECT u.id, u.name, u.email, u.created_at
     FROM users u
     INNER JOIN sessions s ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );
  return result.rows[0] ?? null;
}

export async function deleteSessionToken(token: string): Promise<void> {
  await pgPool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
}

