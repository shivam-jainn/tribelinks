export interface TrackerConfig {
  endpoint: string;       // Ingestion URL (e.g., 'http://localhost:3000')
  targetId: string;       // Short link campaign / Website identifier
  version?: string;       // Dynamic version (e.g., candidate/applicant identifier)
  heartbeatIntervalMs?: number; // How often to send duration updates and flush (default 5000ms)
}

export class WebTracker {
  private config: TrackerConfig;
  private sessionId: string;
  private startTime: number;
  private heartbeatTimer?: any;
  private cumulativeTimeMs: number = 0;
  private queue: any[] = [];
  private flushing: boolean = false;

  constructor(config: TrackerConfig) {
    this.config = {
      heartbeatIntervalMs: 5000,
      version: "default",
      ...config
    };
    this.sessionId = this.getOrCreateSessionId();
    this.startTime = Date.now();

    // Hydrate offline queue
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem(`tracker_offline_queue_${this.config.targetId}`);
      if (stored) {
        try {
          this.queue = JSON.parse(stored);
        } catch {
          this.queue = [];
        }
      }
    }
  }

  /**
   * Automatically initializes tracker from script dataset attributes.
   * Useful when loaded via a script tag.
   */
  static autoInit(): WebTracker | null {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return null;
    }
    const script = document.currentScript as HTMLScriptElement;
    if (!script) return null;

    const endpoint = script.getAttribute("data-endpoint");
    const targetId = script.getAttribute("data-target-id");
    const version = script.getAttribute("data-version") || undefined;

    if (!endpoint || !targetId) {
      console.warn("Tracker: Missing data-endpoint or data-target-id. Auto-initialization skipped.");
      return null;
    }

    const tracker = new WebTracker({
      endpoint,
      targetId,
      version
    });

    tracker.start();
    return tracker;
  }

  public start(): void {
    if (typeof window === "undefined") return;

    // 1. Track initial Pageview
    this.track("pageview", "page_load", {
      url: window.location.href,
      referrer: document.referrer
    });

    // 2. Setup stay-duration heartbeats & periodic flush
    this.startHeartbeats();

    // 3. Setup window event listeners for exit beacons
    this.setupExitListeners();

    // 4. Flush offline events on start if online
    if (navigator.onLine) {
      this.flush();
    }
  }

  public track(type: string, name: string, metadata: Record<string, string> = {}): void {
    if (typeof window === "undefined") return;

    const payload = {
      id: this.generateUUID(),
      type,
      name,
      targetId: this.config.targetId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      duration: Math.round(this.cumulativeTimeMs + (Date.now() - this.startTime)),
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      version: this.config.version || "default",
      metadata
    };

    this.queue.push(payload);
    this.saveQueue();

    // If queue is building up, trigger flush
    if (this.queue.length >= 5 && navigator.onLine) {
      this.flush();
    }
  }

  private saveQueue(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        `tracker_offline_queue_${this.config.targetId}`,
        JSON.stringify(this.queue)
      );
    } catch (e) {
      console.error("Tracker: Failed to save offline queue", e);
    }
  }

  public async flush(): Promise<void> {
    if (typeof window === "undefined" || this.queue.length === 0 || this.flushing) return;
    if (!navigator.onLine) return;

    this.flushing = true;
    const batch = [...this.queue];

    try {
      const response = await fetch(`${this.config.endpoint}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ events: batch }),
        keepalive: true
      });

      if (response.ok) {
        // Keep elements added to queue *while* fetch was in progress
        this.queue = this.queue.filter(item => !batch.some(b => b.id === item.id));
        this.saveQueue();
      }
    } catch (err) {
      console.warn("Tracker: Event batch dispatch failed, retaining events offline.", err);
    } finally {
      this.flushing = false;
    }
  }

  private startHeartbeats(): void {
    if (typeof window === "undefined") return;

    this.heartbeatTimer = setInterval(() => {
      this.cumulativeTimeMs += Date.now() - this.startTime;
      this.startTime = Date.now();

      // Track heartbeat to calculate accurate session times
      this.track("duration", "heartbeat");
      
      // Periodically flush events
      this.flush();
    }, this.config.heartbeatIntervalMs);
  }

  private setupExitListeners(): void {
    if (typeof window === "undefined") return;

    const flushExitEvents = () => {
      // Calculate final duration spent
      this.cumulativeTimeMs += Date.now() - this.startTime;
      this.startTime = Date.now();

      const finalEvent = {
        id: this.generateUUID(),
        type: "duration",
        name: "unload",
        targetId: this.config.targetId,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        duration: Math.round(this.cumulativeTimeMs),
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        version: this.config.version || "default",
        metadata: {}
      };

      this.queue.push(finalEvent);
      this.saveQueue();

      const url = `${this.config.endpoint}/api/events`;
      const payloadString = JSON.stringify({ events: this.queue });
      
      // Use sendBeacon if available, otherwise fetch keepalive
      if (navigator.sendBeacon) {
        const blob = new Blob([payloadString], { type: "application/json" });
        navigator.sendBeacon(url, blob);
        // Clear queue assuming it succeeds via beacon
        this.queue = [];
        this.saveQueue();
      } else {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payloadString,
          keepalive: true
        });
        this.queue = [];
        this.saveQueue();
      }
    };

    // Handle visibility changes and offline sync attempts
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushExitEvents();
      } else {
        // Tab is active again
        this.startTime = Date.now();
        if (navigator.onLine) {
          this.flush();
        }
      }
    });

    window.addEventListener("pagehide", flushExitEvents);
    window.addEventListener("online", () => this.flush());
  }

  private getOrCreateSessionId(): string {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return this.generateUUID();
    }
    let sid = window.sessionStorage.getItem("tracker_session_id");
    if (!sid) {
      sid = this.generateUUID();
      window.sessionStorage.setItem("tracker_session_id", sid);
    }
    return sid;
  }

  private generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// Auto-initialize when loaded as a browser script tag
if (typeof window !== "undefined") {
  (window as any).WebTracker = WebTracker;
  WebTracker.autoInit();
}
