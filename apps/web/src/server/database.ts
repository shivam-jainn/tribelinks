import { Pool } from "pg";
import { randomUUID } from "crypto";
import {
  InMemoryAnalyticsStore,
  ClickHouseAnalyticsStore,
  AnalyticsStore,
} from "@tracker/core";
import { config } from "@tracker/config";

// ─── Postgres ────────────────────────────────────────────────────────────────

const pgConfig = config.postgres;

export const pgPool = pgConfig.connectionString
  ? new Pool({
      connectionString: pgConfig.connectionString,
      ssl: pgConfig.connectionString.includes("localhost") || pgConfig.connectionString.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      host: pgConfig.host,
      port: pgConfig.port,
      database: pgConfig.database,
      user: pgConfig.user,
      password: pgConfig.password,
    });

/**
 * Run schema migrations and seed default data.
 * Tables: users, api_keys, short_links
 */
export async function initPostgres(): Promise<void> {
  const client = await pgPool.connect();
  try {
    // Drop old sessions table if it does not have the 'id' column required by Better Auth
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name='sessions'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='id'
        ) THEN
          DROP TABLE IF EXISTS sessions CASCADE;
        END IF;
      END $$;
    `);

    // ── Core tables ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        key TEXT PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        expires_at TIMESTAMPTZ NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ip_address TEXT,
        user_agent TEXT,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        access_token_expires_at TIMESTAMPTZ,
        refresh_token_expires_at TIMESTAMPTZ,
        scope TEXT,
        password TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS verifications (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Contacts (persons of interest) — owned by a user
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'link',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS campaign_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
        custom_name TEXT,
        custom_email TEXT,
        custom_notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS short_links (
        key TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
        campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Add Better Auth columns to users table if they don't exist yet
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);

    // ── Idempotent migrations for existing deployments ────────────────────────
    // Add password_hash if it doesn't exist yet
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='password_hash'
        ) THEN
          ALTER TABLE users ADD COLUMN password_hash TEXT;
        END IF;
      END $$;
    `);

    // Add contact_id if it doesn't exist yet
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='short_links' AND column_name='contact_id'
        ) THEN
          ALTER TABLE short_links
            ADD COLUMN contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Add campaign_id if it doesn't exist yet
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='short_links' AND column_name='campaign_id'
        ) THEN
          ALTER TABLE short_links
            ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Add rules if it doesn't exist yet
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='short_links' AND column_name='rules'
        ) THEN
          ALTER TABLE short_links ADD COLUMN rules JSONB DEFAULT NULL;
        END IF;
      END $$;
    `);

    // Add type if it doesn't exist yet
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='short_links' AND column_name='type'
        ) THEN
          ALTER TABLE short_links ADD COLUMN type TEXT NOT NULL DEFAULT 'short';
        END IF;
      END $$;
    `);

    // ── Seed default user + API key if none exist ────────────────────────────
    const { rows } = await client.query("SELECT id FROM users LIMIT 1");
    if (rows.length === 0) {
      const userId = randomUUID();
      // default seed password: "adminpassword"
      const defaultHash = "8d06b5bc93fbc3f6b4e7b411df8b8b9a1eb3d5c90731df8398cb151e18cc8c5d:salt123";
      await client.query(
        `INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)`,
        [userId, "Default User", "admin@example.com", defaultHash]
      );
      await client.query(
        `INSERT INTO api_keys (key, user_id, label) VALUES ($1, $2, $3)`,
        ["test-api-key-123", userId, "Default test key"]
      );

      // Seed default short links
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
let initialized = false;
let initPromise: Promise<void> | null = null;

export function getAnalyticsStore(): AnalyticsStore {
  return _store;
}

export async function initAnalyticsStore(): Promise<void> {
  const chConfig = config.clickhouse;
  const clickhouseUrl = chConfig.url;
  if (clickhouseUrl) {
    _store = new ClickHouseAnalyticsStore({
      url: clickhouseUrl,
      username: chConfig.user,
      password: chConfig.password,
      database: chConfig.db,
    });
  } else {
    _store = new InMemoryAnalyticsStore();
  }
  await _store.initialize();
}

export async function ensureInit(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await initPostgres();
    await initAnalyticsStore();
    const { startEventQueue } = await import("./models/event");
    startEventQueue();
    initialized = true;
  })();

  return initPromise;
}

