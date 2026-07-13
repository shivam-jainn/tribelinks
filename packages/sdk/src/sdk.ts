export interface TrackerConfig {
  endpoint: string;       // Ingestion URL (e.g., 'http://localhost:3000')
  targetId: string;       // Short link campaign / Website identifier
  version?: string;       // Dynamic version (e.g., candidate/applicant identifier)
  heartbeatIntervalMs?: number; // How often to send duration updates (default 5000ms)
}

export class WebTracker {
  private config: TrackerConfig;
  private sessionId: string;
  private startTime: number;
  private heartbeatTimer?: any;
  private cumulativeTimeMs: number = 0;

  constructor(config: TrackerConfig) {
    this.config = {
      heartbeatIntervalMs: 5000,
      version: "default",
      ...config
    };
    this.sessionId = this.getOrCreateSessionId();
    this.startTime = Date.now();
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

    // 2. Setup stay-duration heartbeats
    this.startHeartbeats();

    // 3. Setup window event listeners for exit beacons
    this.setupExitListeners();
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

    // Use keepalive fetch for normal event tracking to ensure request goes through on page transition
    fetch(`${this.config.endpoint}/api/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(err => console.error("Tracker: Error sending event:", err));
  }

  private startHeartbeats(): void {
    if (typeof window === "undefined") return;

    this.heartbeatTimer = setInterval(() => {
      this.cumulativeTimeMs += Date.now() - this.startTime;
      this.startTime = Date.now();

      this.track("duration", "heartbeat");
    }, this.config.heartbeatIntervalMs);
  }

  private setupExitListeners(): void {
    if (typeof window === "undefined") return;

    const sendExitBeacon = () => {
      // Calculate final duration spent
      const finalDuration = Math.round(this.cumulativeTimeMs + (Date.now() - this.startTime));
      
      const payload = {
        id: this.generateUUID(),
        type: "duration",
        name: "unload",
        targetId: this.config.targetId,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        duration: finalDuration,
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        version: this.config.version || "default",
        metadata: {}
      };

      const url = `${this.config.endpoint}/api/event`;
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, blob);
      } else {
        // Fallback for older browsers
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: blob,
          keepalive: true
        });
      }
    };

    // Handle both visibility change and page unload
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        sendExitBeacon();
      } else {
        // Tab is active again, reset start time
        this.startTime = Date.now();
      }
    });

    window.addEventListener("pagehide", sendExitBeacon);
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
    // Basic RFC4122 version 4 compliant UUID generator
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
