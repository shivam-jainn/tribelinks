export interface TrackedEvent {
  id: string;          // UUID
  type: string;        // 'pageview' | 'click' | 'pixel' | 'redirect' | 'duration' | 'custom'
  name: string;        // Specific event name (e.g. 'resume_view', 'cta_click')
  targetId: string;    // Associated short link key, pixel ID, or tracking campaign ID
  sessionId: string;   // Unique session ID to correlate stays & path navigation
  timestamp: Date;
  duration: number;    // Stay duration / heartbeats in milliseconds
  url: string;
  referrer: string;
  userAgent: string;
  ip: string;          // Anonymized/hashed for privacy
  version: string;     // Specific applicant / version ID (e.g., candidate name or dynamic tag)
  metadata: Record<string, string>; // Flat Map for extensible attributes
}

export interface AnalyticsFilter {
  type?: string;
  targetId?: string;
  targetIds?: string[];
  version?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AnalyticsReport {
  totalEvents: number;
  uniqueSessions: number;
  averageDurationMs: number;
  events: TrackedEvent[];
}
