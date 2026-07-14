import { pgPool } from "../database";
import { redis } from "../redis";

const CACHE_TTL_SECONDS = 300; // 5 minutes
const cacheKey = (key: string) => `short-link:${key}`;

export interface ShortLink {
  key: string;
  url: string;
  user_id: string;
  contact_id: string | null;
  campaign_id: string | null;
  rules: any | null;
  type: string;
  created_at: Date;
}

/**
 * Look up a short link by key. Returns null if not found.
 */
export async function getShortLink(key: string): Promise<ShortLink | null> {
  if (redis) {
    try {
      const cached = await redis.get(cacheKey(key));
      if (cached) {
        return JSON.parse(cached) as ShortLink;
      }
    } catch (err) {
      console.error("[Redis] Cache read error:", err);
    }
  }

  const result = await pgPool.query<ShortLink>(
    `SELECT * FROM short_links WHERE key = $1`,
    [key]
  );
  const link = result.rows[0] ?? null;

  if (link && redis) {
    try {
      await redis.setex(cacheKey(key), CACHE_TTL_SECONDS, JSON.stringify(link));
    } catch (err) {
      console.error("[Redis] Cache write error:", err);
    }
  }

  return link;
}

/**
 * Create a new short link for a user. Throws if key already exists.
 */
export async function createShortLink(
  key: string,
  url: string,
  userId: string,
  contactId?: string,
  campaignId?: string,
  rules?: any,
  type?: string
): Promise<ShortLink> {
  const result = await pgPool.query<ShortLink>(
    `INSERT INTO short_links (key, url, user_id, contact_id, campaign_id, rules, type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [key, url, userId, contactId ?? null, campaignId ?? null, rules ? JSON.stringify(rules) : null, type ?? 'short']
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
  const deleted = (result.rowCount ?? 0) > 0;
  if (deleted && redis) {
    try {
      await redis.del(cacheKey(key));
    } catch (err) {
      console.error("[Redis] Cache delete error:", err);
    }
  }
  return deleted;
}

/**
 * Update a short link's URL, contact, campaign, or rules.
 */
export async function updateShortLink(
  key: string,
  userId: string,
  updates: { url?: string; contactId?: string | null; campaignId?: string | null; rules?: any; type?: string }
): Promise<ShortLink | null> {
  const result = await pgPool.query<ShortLink>(
    `UPDATE short_links 
     SET url = COALESCE($1, url), 
         contact_id = $2, 
         campaign_id = $3, 
         rules = $4,
         type = COALESCE($5, type) 
     WHERE key = $6 AND user_id = $7 
     RETURNING *`,
    [updates.url ?? null, updates.contactId ?? null, updates.campaignId ?? null, updates.rules ? JSON.stringify(updates.rules) : null, updates.type ?? null, key, userId]
  );
  const link = result.rows[0] ?? null;
  if (link && redis) {
    try {
      await redis.del(cacheKey(key));
    } catch (err) {
      console.error("[Redis] Cache update invalidation error:", err);
    }
  }
  return link;
}
