import { pgPool } from "../database";

export interface ShortLink {
  key: string;
  url: string;
  user_id: string;
  contact_id: string | null;
  created_at: Date;
}

/**
 * Look up a short link by key. Returns null if not found.
 */
export async function getShortLink(key: string): Promise<ShortLink | null> {
  const result = await pgPool.query<ShortLink>(
    `SELECT * FROM short_links WHERE key = $1`,
    [key]
  );
  return result.rows[0] ?? null;
}

/**
 * Create a new short link for a user. Throws if key already exists.
 */
export async function createShortLink(
  key: string,
  url: string,
  userId: string,
  contactId?: string
): Promise<ShortLink> {
  const result = await pgPool.query<ShortLink>(
    `INSERT INTO short_links (key, url, user_id, contact_id) VALUES ($1, $2, $3, $4) RETURNING *`,
    [key, url, userId, contactId ?? null]
  );
  return result.rows[0];
}

/**
 * List all short links belonging to a specific user.
 */
export async function listShortLinks(userId: string): Promise<ShortLink[]> {
  const result = await pgPool.query<ShortLink>(
    `SELECT * FROM short_links WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Delete a short link owned by a user. Returns true if deleted, false if not found/owned.
 */
export async function deleteShortLink(
  key: string,
  userId: string
): Promise<boolean> {
  const result = await pgPool.query(
    `DELETE FROM short_links WHERE key = $1 AND user_id = $2`,
    [key, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
