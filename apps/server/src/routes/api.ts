import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { authenticate } from "./users";
import {
  createShortLink,
  listShortLinks,
  deleteShortLink,
} from "../models/short-link";
import { trackEvent } from "../models/event";
import { getAnalyticsStore } from "../database";
import { TrackedEvent } from "@tracker/core";


export async function apiRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/event
   * Ingest generic analytics event from the browser SDK or a server call.
   */
  fastify.post("/api/event", async (request, reply) => {
    const body = request.body as any;

    const event = await trackEvent({
      id: body.id,
      type: body.type || "custom",
      name: body.name || "event",
      targetId: body.targetId || "unknown",
      sessionId: body.sessionId,
      timestamp: body.timestamp ? new Date(body.timestamp) : undefined,
      duration: body.duration || 0,
      url: body.url || "",
      referrer: body.referrer || "",
      userAgent: body.userAgent || (request.headers["user-agent"] as string) || "",
      ip: request.ip || "",
      version: body.version || "default",
      metadata: body.metadata || {},
    });

    return reply.status(202).send({ success: true, eventId: event.id });
  });

  /**
   * GET /api/analytics
   * Retrieve an analytics report. Optionally filter by targetId, type, version, date range.
   *
   * Query params: targetId, type, version, startDate, endDate
   */
  fastify.get("/api/analytics", async (request, reply) => {
    const query = request.query as Record<string, string>;

    const report = await getAnalyticsStore().getAnalytics({
      type: query.type,
      targetId: query.targetId,
      version: query.version,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    return report;
  });

  /**
   * POST /api/shorten
   * Create a new short link (requires API key).
   *
   * Body: { key: string, url: string }
   * Header: Authorization: Bearer <api_key>
   */
  fastify.post("/api/shorten", async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;

    const body = request.body as { key?: string; url?: string };

    if (!body.url) {
      return reply.status(400).send({ error: "Missing required field: url" });
    }

    // Generate a random key if not provided
    const key = body.key?.trim() || randomUUID().slice(0, 8);

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return reply.status(400).send({ error: "Invalid URL format" });
    }

    try {
      const link = await createShortLink(key, body.url, user.id);
      return reply.status(201).send({
        key: link.key,
        url: link.url,
        shortUrl: `${process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`}/r/${link.key}`,
        createdAt: link.created_at,
      });
    } catch (err: any) {
      if (err.code === "23505") {
        // Postgres unique violation
        return reply.status(409).send({ error: `Key '${key}' is already taken` });
      }
      throw err;
    }
  });

  /**
   * GET /api/shorten
   * List all short links for the authenticated user.
   *
   * Header: Authorization: Bearer <api_key>
   */
  fastify.get("/api/shorten", async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;

    const links = await listShortLinks(user.id);
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    return links.map((l) => ({
      key: l.key,
      url: l.url,
      shortUrl: `${baseUrl}/r/${l.key}`,
      createdAt: l.created_at,
    }));
  });

  /**
   * DELETE /api/shorten/:key
   * Delete a short link owned by the authenticated user.
   *
   * Header: Authorization: Bearer <api_key>
   */
  fastify.delete("/api/shorten/:key", async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;

    const { key } = request.params as { key: string };
    const deleted = await deleteShortLink(key, user.id);

    if (!deleted) {
      return reply.status(404).send({ error: "Short link not found or not owned by you" });
    }

    return reply.status(200).send({ success: true, key });
  });
}
