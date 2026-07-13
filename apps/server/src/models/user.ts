import { pgPool } from "../database";

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

/**
 * Validate an API key and return the associated user, or null if invalid.
 */
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

/**
 * Create a new API key for a user.
 */
export async function createApiKey(
  userId: string,
  label?: string
): Promise<ApiKey> {
  const key = `ak_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const result = await pgPool.query<ApiKey>(
    `INSERT INTO api_keys (key, user_id, label) VALUES ($1, $2, $3) RETURNING *`,
    [key, userId, label ?? null]
  );
  return result.rows[0];
}

/**
 * List all API keys for a user.
 */
export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  const result = await pgPool.query<ApiKey>(
    `SELECT * FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}
