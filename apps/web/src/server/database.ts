import { Pool } from "pg";
import { randomUUID } from "crypto";
import {
  InMemoryAnalyticsStore,
  ClickHouseAnalyticsStore,
  AnalyticsStore,
  TrackedEvent,
  AnalyticsFilter,
  AnalyticsReport
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

export class PostgresAnalyticsStore implements AnalyticsStore {
  private pool: Pool;
  private tableName: string;

  constructor(pool: Pool, tableName = "analytics_events") {
    this.pool = pool;
    this.tableName = tableName;
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id UUID PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        target_id TEXT NOT NULL,
        session_id UUID NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        duration BIGINT NOT NULL,
        url TEXT NOT NULL,
        referrer TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        ip TEXT NOT NULL,
        version TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      );
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_scoping ON ${this.tableName} (target_id, timestamp DESC);
    `);
  }

  async saveEvent(event: TrackedEvent): Promise<void> {
    await this.pool.query(`
      INSERT INTO ${this.tableName} (
        id, type, name, target_id, session_id, timestamp, duration, url, referrer, user_agent, ip, version, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING
    `, [
      event.id, event.type, event.name, event.targetId, event.sessionId,
      event.timestamp, event.duration, event.url, event.referrer, event.userAgent,
      event.ip, event.version, JSON.stringify(event.metadata)
    ]);
  }

  async getAnalytics(filter: AnalyticsFilter): Promise<AnalyticsReport> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.type) {
      params.push(filter.type);
      conditions.push(`type = $${params.length}`);
    }
    
    if (filter.targetId) {
      params.push(filter.targetId);
      conditions.push(`target_id = $${params.length}`);
    } else if (filter.targetIds && filter.targetIds.length > 0) {
      params.push(filter.targetIds);
      conditions.push(`target_id = ANY($${params.length})`);
    }

    if (filter.version) {
      params.push(filter.version);
      conditions.push(`version = $${params.length}`);
    }

    if (filter.startDate) {
      params.push(filter.startDate);
      conditions.push(`timestamp >= $${params.length}`);
    }

    if (filter.endDate) {
      params.push(filter.endDate);
      conditions.push(`timestamp <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const summaryQuery = `
      SELECT 
        COUNT(*)::integer as total_events,
        COUNT(DISTINCT session_id)::integer as unique_sessions,
        COALESCE(AVG(duration) FILTER (WHERE duration > 0), 0)::integer as average_duration_ms
      FROM ${this.tableName}
      ${whereClause}
    `;

    const summaryRes = await this.pool.query(summaryQuery, params);
    const summary = summaryRes.rows[0] || { total_events: 0, unique_sessions: 0, average_duration_ms: 0 };

    const eventsQuery = `
      SELECT *
      FROM ${this.tableName}
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT 1000
    `;

    const eventsRes = await this.pool.query(eventsQuery, params);
    const events: TrackedEvent[] = eventsRes.rows.map(r => ({
      id: r.id,
      type: r.type,
      name: r.name,
      targetId: r.target_id,
      sessionId: r.session_id,
      timestamp: r.timestamp,
      duration: Number(r.duration),
      url: r.url,
      referrer: r.referrer,
      userAgent: r.user_agent,
      ip: r.ip,
      version: r.version,
      metadata: r.metadata
    }));

    return {
      totalEvents: summary.total_events,
      uniqueSessions: summary.unique_sessions,
      averageDurationMs: summary.average_duration_ms,
      events
    };
  }
}

let _store: AnalyticsStore;
let initialized = false;
let initPromise: Promise<void> | null = null;

export function getAnalyticsStore(): AnalyticsStore {
  return _store;
}

export async function initAnalyticsStore(): Promise<void> {
  const analyticsDb = config.analytics.db;
  const chConfig = config.clickhouse;
  
  if (analyticsDb === "postgres") {
    _store = new PostgresAnalyticsStore(pgPool);
  } else {
    _store = new ClickHouseAnalyticsStore({
      url: chConfig.url,
      username: chConfig.user,
      password: chConfig.password,
      database: chConfig.db,
    });
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

