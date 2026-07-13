import { describe, test, expect } from "bun:test";
import { InMemoryAnalyticsStore } from "./store";
import { TrackedEvent } from "./types";

describe("InMemoryAnalyticsStore", () => {
  test("initialization and basic operations", async () => {
    const store = new InMemoryAnalyticsStore();
    await store.initialize();

    const reportEmpty = await store.getAnalytics({});
    expect(reportEmpty.totalEvents).toBe(0);
    expect(reportEmpty.uniqueSessions).toBe(0);
    expect(reportEmpty.averageDurationMs).toBe(0);
    expect(reportEmpty.events).toEqual([]);
  });

  test("event saving and statistics calculation", async () => {
    const store = new InMemoryAnalyticsStore();
    await store.initialize();

    const event1: TrackedEvent = {
      id: "uuid-1",
      type: "pageview",
      name: "home_load",
      targetId: "link-1",
      sessionId: "session-a",
      timestamp: new Date("2026-07-13T10:00:00Z"),
      duration: 0,
      url: "https://example.com/",
      referrer: "",
      userAgent: "Mozilla",
      ip: "127.0.0.1",
      version: "v1",
      metadata: {}
    };

    const event2: TrackedEvent = {
      id: "uuid-2",
      type: "duration",
      name: "heartbeat",
      targetId: "link-1",
      sessionId: "session-a",
      timestamp: new Date("2026-07-13T10:00:05Z"),
      duration: 5000,
      url: "https://example.com/",
      referrer: "",
      userAgent: "Mozilla",
      ip: "127.0.0.1",
      version: "v1",
      metadata: {}
    };

    const event3: TrackedEvent = {
      id: "uuid-3",
      type: "pageview",
      name: "about_load",
      targetId: "link-2",
      sessionId: "session-b",
      timestamp: new Date("2026-07-13T10:05:00Z"),
      duration: 10000,
      url: "https://example.com/about",
      referrer: "https://example.com/",
      userAgent: "Mozilla",
      ip: "127.0.0.1",
      version: "v2",
      metadata: {}
    };

    await store.saveEvent(event1);
    await store.saveEvent(event2);
    await store.saveEvent(event3);

    // Get all events
    const all = await store.getAnalytics({});
    expect(all.totalEvents).toBe(3);
    expect(all.uniqueSessions).toBe(2); // session-a, session-b
    // averageDurationMs: event2 has 5000, event3 has 10000. event1 has 0 (ignored in avg duration if <= 0).
    // (5000 + 10000) / 2 = 7500
    expect(all.averageDurationMs).toBe(7500);

    // Filter by type
    const pageviews = await store.getAnalytics({ type: "pageview" });
    expect(pageviews.totalEvents).toBe(2);
    expect(pageviews.events.map(e => e.id)).toEqual(["uuid-1", "uuid-3"]);

    // Filter by targetId
    const target1 = await store.getAnalytics({ targetId: "link-1" });
    expect(target1.totalEvents).toBe(2);
    expect(target1.events.map(e => e.id)).toEqual(["uuid-1", "uuid-2"]);

    // Filter by version
    const version2 = await store.getAnalytics({ version: "v2" });
    expect(version2.totalEvents).toBe(1);
    expect(version2.events[0].id).toBe("uuid-3");

    // Filter by date range
    const range1 = await store.getAnalytics({
      startDate: new Date("2026-07-13T09:59:00Z"),
      endDate: new Date("2026-07-13T10:01:00Z")
    });
    expect(range1.totalEvents).toBe(2); // event1, event2
    expect(range1.events.map(e => e.id)).toEqual(["uuid-1", "uuid-2"]);
  });
});
