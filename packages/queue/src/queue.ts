export interface QueueAdapter<T> {
  enqueue(job: T): Promise<void>;
  process(handler: (job: T, ack?: () => void) => Promise<void>): void;
}

export class InMemoryQueueAdapter<T> implements QueueAdapter<T> {
  private queue: T[] = [];
  private processing = false;
  private handler?: (job: T, ack?: () => void) => Promise<void>;

  async enqueue(job: T): Promise<void> {
    this.queue.push(job);
    this.triggerProcessing();
  }

  process(handler: (job: T, ack?: () => void) => Promise<void>): void {
    this.handler = handler;
    this.triggerProcessing();
  }

  private triggerProcessing(): void {
    if (this.processing || !this.handler || this.queue.length === 0) {
      return;
    }
    this.processing = true;
    // Process next item asynchronously in event loop to avoid blocking ingestion response
    setImmediate(async () => {
      while (this.queue.length > 0 && this.handler) {
        const job = this.queue.shift();
        if (job) {
          try {
            await this.handler(job, () => {});
          } catch (error) {
            console.error("Queue worker error processing job:", error);
          }
        }
      }
      this.processing = false;
    });
  }
}
