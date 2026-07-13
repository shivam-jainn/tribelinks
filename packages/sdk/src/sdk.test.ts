import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test";
import { WebTracker } from "./sdk";

// Mock environment globals
const mockStorage: Record<string, string> = {};
const mockSessionStorage: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; }
};

const mockSession = {
  getItem: (key: string) => mockSessionStorage[key] || null,
  setItem: (key: string, val: string) => { mockSessionStorage[key] = val; },
};

describe("WebTracker", () => {
  let originalWindow: any;
  let originalDocument: any;
  let originalNavigator: any;

  beforeAll(() => {
    originalWindow = (globalThis as any).window;
    originalDocument = (globalThis as any).document;
    originalNavigator = (globalThis as any).navigator;

    // Inject mock browser APIs into global scope
    (globalThis as any).window = {
      location: { href: "https://example.com/test-page?ref=xyz" },
      localStorage: mockLocalStorage,
      sessionStorage: mockSession,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as any;

    (globalThis as any).document = {
      referrer: "https://google.com",
      addEventListener: () => {},
      currentScript: null,
    } as any;

    (globalThis as any).navigator = {
      userAgent: "Mozilla/5.0 TestBrowser",
      onLine: true,
      sendBeacon: () => true
    } as any;
  });

  afterAll(() => {
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDocument;
    (globalThis as any).navigator = originalNavigator;
  });

  test("generates and hydrates session id and configurations", () => {
    mockStorage["tracker_offline_queue_test-link"] = JSON.stringify([
      { id: "stored-event-1", type: "custom", name: "offline_action" }
    ]);

    const tracker = new WebTracker({
      endpoint: "http://localhost:3001",
      targetId: "test-link",
      version: "v1.0"
    });

    // Check configuration and session storage hydration
    expect(mockSessionStorage["tracker_session_id"]).toBeDefined();
    // Check offline queue hydration
    expect((tracker as any).queue.length).toBe(1);
    expect((tracker as any).queue[0].id).toBe("stored-event-1");
  });

  test("track and batch flushing threshold", async () => {
    const fetchCalls: any[] = [];
    global.fetch = mock((url, init) => {
      fetchCalls.push({ url, body: JSON.parse(init.body) });
      return Promise.resolve({ ok: true } as any);
    });

    const tracker = new WebTracker({
      endpoint: "http://localhost:3001",
      targetId: "test-link",
      version: "v1.0"
    });

    // Clear queue loaded from storage
    (tracker as any).queue = [];

    // Track less than 5 events: should not trigger auto-flush
    tracker.track("custom", "click_button_1");
    expect((tracker as any).queue.length).toBe(1);
    expect(fetchCalls.length).toBe(0);

    // Track up to 5 events: should trigger auto-flush
    tracker.track("custom", "click_button_2");
    tracker.track("custom", "click_button_3");
    tracker.track("custom", "click_button_4");
    tracker.track("custom", "click_button_5");

    // Wait a brief tick for async flush to finish
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(fetchCalls.length).toBe(1);
    expect(fetchCalls[0].url).toBe("http://localhost:3001/api/events");
    expect(fetchCalls[0].body.events.length).toBe(5);
    expect((tracker as any).queue.length).toBe(0); // queue cleared on ok response
  });
});
