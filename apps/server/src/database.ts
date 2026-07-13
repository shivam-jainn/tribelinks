import { Pool } from "pg";
import { randomUUID } from "crypto";
import {
  InMemoryAnalyticsStore,
  ClickHouseAnalyticsStore,
  AnalyticsStore,
} from "@tracker/core";

// ─── Postgres ────────────────────────────────────────────────────────────────

export const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : 5432,
  database: process.env.POSTGRES_DB || "tracker_db",
  user: process.env.POSTGRES_USER || "tracker",
  password: process.env.POSTGRES_PASSWORD || "tracker_secret",
});

/**
 * Run schema migrations and seed default data.
 * Tables: users, api_keys, short_links
 */
export async function initPostgres(): Promise<void> {
  const client = await pgPool.connect();
  try {
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        key TEXT PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS short_links (
        key TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Seed a default user and API key if none exist
    const { rows } = await client.query("SELECT id FROM users LIMIT 1");
    if (rows.length === 0) {
      const userId = randomUUID();
      await client.query(
        `INSERT INTO users (id, name, email) VALUES ($1, $2, $3)`,
        [userId, "Default User", "admin@example.com"]
      );
      await client.query(
        `INSERT INTO api_keys (key, user_id, label) VALUES ($1, $2, $3)`,
        ["test-api-key-123", userId, "Default test key"]
      );

      // Seed default short links (previously hardcoded in server.ts)
      const seedLinks = [
        { key: "resume", url: "https://www.shivamja.in/resume" },
        { key: "linkedin", url: "https://linkedin.com/in/shivamjain" },
        { key: "github", url: "https://github.com/shivamjain" },
      ];
      for (const link of seedLinks) {
        await client.query(
          `INSERT INTO short_links (key, url, user_id) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`,
          [link.key, link.url, userId]
        );
      }

      console.log(
        "[db] Seeded default user (id=%s) and API key 'test-api-key-123'",
        userId
      );
    }

    console.log("[db] Postgres schema ready.");
  } finally {
    client.release();
  }
}

// ─── Analytics Store (ClickHouse or InMemory) ────────────────────────────────

let _store: AnalyticsStore;

export function getAnalyticsStore(): AnalyticsStore {
  return _store;
}

export async function initAnalyticsStore(): Promise<void> {
  const clickhouseUrl = process.env.CLICKHOUSE_URL || "";
  if (clickhouseUrl) {
    _store = new ClickHouseAnalyticsStore({
      url: clickhouseUrl,
      username: process.env.CLICKHOUSE_USER,
      password: process.env.CLICKHOUSE_PASSWORD,
      database: process.env.CLICKHOUSE_DB,
    });
  } else {
    _store = new InMemoryAnalyticsStore();
  }
  await _store.initialize();
}
