import amqp from "amqplib";
import { QueueAdapter } from "@tracker/queue";
import { config } from "@tracker/config";
import logger from "./logger";

export class RabbitMQQueueAdapter<T> implements QueueAdapter<T> {
  private queueName: string;
  private connection: any = null;
  private channel: any = null;
  private pendingJobs: T[] = [];
  private handler?: (job: T, ack?: () => void) => Promise<void>;
  private isConnecting = false;

  constructor(queueName = "analytics_events") {
    this.queueName = queueName;
    this.init().catch((err) => {
      logger.error("[RabbitMQ] Failed to initialize connection:", err);
    });
  }

  private async init() {
    if (this.connection || this.isConnecting) return;
    this.isConnecting = true;

    try {
      const url = config.rabbitmq.url || "amqp://localhost:5672";
      logger.info(`[RabbitMQ] Connecting to ${url}...`);
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(this.queueName, { durable: true });
      logger.success("[RabbitMQ] Connected and asserted queue successfully.");
      
      this.isConnecting = false;

      // Send any pending jobs enqueued before connection was ready
      while (this.pendingJobs.length > 0) {
        const job = this.pendingJobs.shift();
        if (job) {
          await this.enqueue(job);
        }
      }

      // If handler was registered, start consuming
      if (this.handler) {
        this.startConsuming();
      }
    } catch (err) {
      this.isConnecting = false;
      logger.error("[RabbitMQ] Initialization error:", err);
      // Retry connection after 5 seconds
      setTimeout(() => this.init(), 5000);
    }
  }

  async enqueue(job: T): Promise<void> {
    if (!this.channel) {
      this.pendingJobs.push(job);
      return;
    }
    const msg = Buffer.from(JSON.stringify(job));
    this.channel.sendToQueue(this.queueName, msg, { persistent: true });
  }

  process(handler: (job: T, ack?: () => void) => Promise<void>): void {
    this.handler = handler;
    if (this.channel) {
      this.startConsuming();
    }
  }

  private async startConsuming() {
    if (!this.channel || !this.handler) return;
    
    await this.channel.prefetch(100);

    const handler = this.handler;
    await this.channel.consume(this.queueName, async (msg: any) => {
      if (!msg) return;
      try {
        const content = JSON.parse(msg.content.toString()) as T;
        await handler(content, () => {
          try {
            this.channel?.ack(msg);
          } catch (ackErr) {
            logger.error("[RabbitMQ] Failed to ack message:", ackErr);
          }
        });
      } catch (err) {
        logger.error("[RabbitMQ] Error processing message:", err);
        // Nack and requeue
        try {
          this.channel?.nack(msg, false, true);
        } catch (nackErr) {
          logger.error("[RabbitMQ] Failed to nack message:", nackErr);
        }
      }
    });
  }
}
