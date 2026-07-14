import Redis from "ioredis";
import { config } from "@tracker/config";
import logger from "./logger";

let redis: Redis | null = null;

if (config.redis.url) {
  try {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    
    redis.on("connect", () => {
      logger.success("[Redis] Connected successfully to Redis/Valkey");
    });
    
    redis.on("error", (err) => {
      logger.error("[Redis] Redis error:", err);
    });

    redis.connect().catch((err) => {
      logger.error("[Redis] Failed to connect during lazy connect:", err);
    });
  } catch (err) {
    logger.error("[Redis] Failed to initialize Redis client:", err);
  }
} else {
  logger.info("[Redis] Redis URL is not configured. Caching is disabled.");
}

export { redis };
export default redis;
