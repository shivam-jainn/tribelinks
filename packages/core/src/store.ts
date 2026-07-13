import { createClient, ClickHouseClient } from "@clickhouse/client";
import { TrackedEvent, AnalyticsFilter, AnalyticsReport } from "./types";

export interface AnalyticsStore {
  initialize(): Promise<void>;
  saveEvent(event: TrackedEvent): Promise<void>;
  getAnalytics(filter: AnalyticsFilter): Promise<AnalyticsReport>;
}

// In-Memory store implementation for quick testing or fallback
export class InMemoryAnalyticsStore implements AnalyticsStore {
  private events: TrackedEvent[] = [];

  async initialize(): Promise<void> {
    console.log("Initialized In-Memory Analytics Store.");
  }

  async saveEvent(event: TrackedEvent): Promise<void> {
    this.events.push(event);
  }

  async getAnalytics(filter: AnalyticsFilter): Promise<AnalyticsReport> {
    let filtered = this.events;

    if (filter.type) {
      filtered = filtered.filter(e => e.type === filter.type);
    }
    if (filter.targetId) {
      filtered = filtered.filter(e => e.targetId === filter.targetId);
    }
    if (filter.version) {
      filtered = filtered.filter(e => e.version === filter.version);
    }
    if (filter.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filter.endDate!);
    }

    const uniqueSessions = new Set(filtered.map(e => e.sessionId)).size;
    
    // Calculate avg duration of stay/duration heartbeats
    const durationEvents = filtered.filter(e => e.duration > 0);
    const averageDurationMs = durationEvents.length > 0
      ? durationEvents.reduce((acc, curr) => acc + curr.duration, 0) / durationEvents.length
      : 0;

    return {
      totalEvents: filtered.length,
      uniqueSessions,
      averageDurationMs,
      events: filtered
    };
  }
}

// Production-ready ClickHouse store adapter
export class ClickHouseAnalyticsStore implements AnalyticsStore {
  private client: ClickHouseClient;
  private tableName: string;

  constructor(config: { url: string; username?: string; password?: string; database?: string; tableName?: string }) {
    this.client = createClient({
      url: config.url,
      username: config.username || "default",
      password: config.password || "",
      database: config.database || "default",
      clickhouse_settings: {
        date_time_input_format: "best_effort"
      }
    });
    this.tableName = config.tableName || "events";
  }

  async initialize(): Promise<void> {
    // Create ClickHouse table optimized for analytics ingestion
    // Sorting by type, targetId, version and timestamp for lightning fast indexing
    await this.client.command({
      query: `
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id UUID,
          type LowCardinality(String),
          name LowCardinality(String),
          targetId String,
          sessionId UUID,
          timestamp DateTime64(3),
          duration UInt64,
          url String,
          referrer String,
          userAgent String,
          ip String,
          version String,
          metadata Map(String, String)
        ) ENGINE = MergeTree()
        ORDER BY (type, targetId, version, timestamp)
      `
    });
    console.log(`ClickHouse table '${this.tableName}' initialized.`);
  }

  async saveEvent(event: TrackedEvent): Promise<void> {
    // Columnar clickhouse insert
    await this.client.insert({
      table: this.tableName,
      values: [{
        id: event.id,
        type: event.type,
        name: event.name,
        targetId: event.targetId,
        sessionId: event.sessionId,
        timestamp: event.timestamp.toISOString(),
        duration: event.duration,
        url: event.url,
        referrer: event.referrer,
        userAgent: event.userAgent,
        ip: event.ip,
        version: event.version,
        metadata: event.metadata
      }],
      format: "JSONEachRow"
    });
  }

  async getAnalytics(filter: AnalyticsFilter): Promise<AnalyticsReport> {
    const conditions: string[] = [];
    const params: Record<string, any> = {};

    if (filter.type) {
      conditions.push("type = {type: String}");
      params.type = filter.type;
    }
    if (filter.targetId) {
      conditions.push("targetId = {targetId: String}");
      params.targetId = filter.targetId;
    }
    if (filter.version) {
      conditions.push("version = {version: String}");
      params.version = filter.version;
    }
    if (filter.startDate) {
      conditions.push("timestamp >= {startDate: DateTime64(3)}");
      params.startDate = filter.startDate.toISOString();
    }
    if (filter.endDate) {
      conditions.push("timestamp <= {endDate: DateTime64(3)}");
      params.endDate = filter.endDate.toISOString();
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Query 1: Total counts and averages
    const summaryQuery = `
      SELECT 
        count() as totalEvents,
        uniqExact(sessionId) as uniqueSessions,
        avgIf(duration, duration > 0) as averageDurationMs
      FROM ${this.tableName}
      ${whereClause}
    `;

    const summaryResult = await this.client.query({
      query: summaryQuery,
      query_params: params,
      format: "JSONEachRow"
    });
    const summaryData = (await summaryResult.json()) as any[];
    const summary = summaryData[0] || { totalEvents: 0, uniqueSessions: 0, averageDurationMs: 0 };

    // Query 2: Retrieve events listing (ordered by timestamp desc, limit to last 1000)
    const eventsQuery = `
      SELECT *
      FROM ${this.tableName}
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT 1000
    `;

    const eventsResult = await this.client.query({
      query: eventsQuery,
      query_params: params,
      format: "JSONEachRow"
    });
    const rawEvents = (await eventsResult.json()) as any[];

    const events: TrackedEvent[] = rawEvents.map(e => ({
      id: e.id,
      type: e.type,
      name: e.name,
      targetId: e.targetId,
      sessionId: e.sessionId,
      timestamp: new Date(e.timestamp),
      duration: Number(e.duration),
      url: e.url,
      referrer: e.referrer,
      userAgent: e.userAgent,
      ip: e.ip,
      version: e.version,
      metadata: e.metadata
    }));

    return {
      totalEvents: Number(summary.totalEvents),
      uniqueSessions: Number(summary.uniqueSessions),
      averageDurationMs: summary.averageDurationMs ? Math.round(Number(summary.averageDurationMs)) : 0,
      events
    };
  }
}
