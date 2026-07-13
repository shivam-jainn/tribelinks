import { randomUUID } from "crypto";
import { InMemoryQueueAdapter } from "@tracker/queue";
import { TrackedEvent } from "@tracker/core";
import { getAnalyticsStore } from "../database";

// Singleton queue — shared across all route modules
export const eventQueue = new InMemoryQueueAdapter<TrackedEvent>();

let queueStarted = false;

/**
 * Start processing queued events. Should be called once on startup.
 */
export function startEventQueue(logger: { info: Function; error: Function } = console): void {
  if (queueStarted) return;
  queueStarted = true;

  eventQueue.process(async (event) => {
    try {
      await getAnalyticsStore().saveEvent(event);
      logger.info(`[Queue] Saved event to analytics store: ${event.id} (${event.type})`);
    } catch (err) {
      logger.error(`[Queue] Queue processing error saving event to store:`, err);
    }
  });
}

/**
 * Build and enqueue a tracking event.
 */
export async function trackEvent(
  partial: Omit<TrackedEvent, "id" | "timestamp" | "sessionId" | "duration"> & {
    sessionId?: string;
    timestamp?: Date;
    id?: string;
    duration?: number;
  }
): Promise<TrackedEvent> {
  const event: TrackedEvent = {
    id: partial.id ?? randomUUID(),
    sessionId: partial.sessionId ?? randomUUID(),
    timestamp: partial.timestamp ?? new Date(),
    type: partial.type,
    name: partial.name,
    targetId: partial.targetId,
    duration: partial.duration ?? 0,
    url: partial.url ?? "",
    referrer: partial.referrer ?? "",
    userAgent: partial.userAgent ?? "",
    ip: partial.ip ?? "",
    version: partial.version ?? "default",
    metadata: partial.metadata ?? {},
  };

  await eventQueue.enqueue(event);
  return event;
}
