import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";

import { initPostgres, initAnalyticsStore } from "./database";
import { startEventQueue } from "./models/event";

import { apiRoutes } from "./routes/api";
import { redirectRoutes } from "./routes/redirect";
import { pixelRoutes } from "./routes/pixel";
import { demoRoutes } from "./routes/demo";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const fastify = Fastify({ logger: true });

// ─── Plugins ──────────────────────────────────────────────────────────────────

fastify.register(cors, { origin: "*" });

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "../../../packages/sdk/dist"),
  prefix: "/sdk/",
});

// ─── Routes ───────────────────────────────────────────────────────────────────

fastify.register(apiRoutes);
fastify.register(redirectRoutes);
fastify.register(pixelRoutes);
fastify.register(demoRoutes);

// ─── Startup ──────────────────────────────────────────────────────────────────

const start = async () => {
  try {
    // Initialize datastores
    await initPostgres();
    await initAnalyticsStore();

    // Start the background event queue consumer
    startEventQueue(fastify.log);

    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    fastify.log.info(`Server listening on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
