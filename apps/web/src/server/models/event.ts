import { randomUUID } from "crypto";
import { InMemoryQueueAdapter, QueueAdapter } from "@tracker/queue";
import { TrackedEvent } from "@tracker/core";
import { getAnalyticsStore } from "../database";
import { config } from "@tracker/config";
import { RabbitMQQueueAdapter } from "../rabbitmq-queue";

// Singleton queue — shared across all route modules
export const eventQueue: QueueAdapter<TrackedEvent> = config.rabbitmq.url
  ? new RabbitMQQueueAdapter<TrackedEvent>()
  : new InMemoryQueueAdapter<TrackedEvent>();

let queueStarted = false;

let buffer: { event: TrackedEvent; ack?: () => void }[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

async function flushBuffer(logger: { info: Function; error: Function }) {
  if (buffer.length === 0) return;
  const batch = [...buffer];
  buffer = [];
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  const events = batch.map(b => b.event);

  try {
    await getAnalyticsStore().saveEventsBatch(events);
    logger.info(`[Queue] Saved batch of ${events.length} events to analytics store.`);
    for (const item of batch) {
      if (item.ack) item.ack();
    }
  } catch (err) {
    logger.error(`[Queue] Batch saving failed, attempting item-by-item fallback:`, err);
    for (const item of batch) {
      try {
        await getAnalyticsStore().saveEvent(item.event);
        if (item.ack) item.ack();
      } catch (subErr) {
        logger.error(`[Queue] Failed to save individual event ${item.event.id}:`, subErr);
      }
    }
  }
}

/**
 * Start processing queued events. Should be called once on startup.
 */
export function startEventQueue(logger: { info: Function; error: Function } = console): void {
  if (queueStarted) return;
  queueStarted = true;

  eventQueue.process(async (event, ack) => {
    buffer.push({ event, ack });
    if (buffer.length >= 100) {
      await flushBuffer(logger);
    } else if (!flushTimeout) {
      flushTimeout = setTimeout(async () => {
        await flushBuffer(logger);
      }, 1000);
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
