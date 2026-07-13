import { FastifyInstance } from "fastify";
import { getShortLink } from "../models/short-link";
import { trackEvent } from "../models/event";

export async function redirectRoutes(fastify: FastifyInstance) {
  /**
   * GET /r/:key
   * Short link redirector. Tracks the redirect as a "redirect" analytics event.
   *
   * Usage: GET /r/resume?v=CampaignA
   */
  fastify.get("/r/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const query = request.query as Record<string, string>;
    const version = query.v || "default";

    const link = await getShortLink(key);
    if (!link) {
      return reply.status(404).send({ error: `Short link '${key}' not found` });
    }

    // Optionally append version tag to destination
    const destination =
      version !== "default"
        ? `${link.url}${link.url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`
        : link.url;

    await trackEvent({
      type: "redirect",
      name: "link_redirect",
      targetId: key,
      url: destination,
      referrer: (request.headers["referer"] as string) || "",
      userAgent: (request.headers["user-agent"] as string) || "",
      ip: request.ip || "",
      version,
      metadata: { originalKey: key, ...query },
    });

    return reply.status(302).redirect(destination);
  });

  /**
   * GET /redirect
   * Dynamic base64-encoded redirector — stateless, no DB lookup required.
   * Useful for encoded links embedded in emails.
   *
   * Usage: GET /redirect?dest=<base64url>&v=CampaignA&id=email_cta
   */
  fastify.get("/redirect", async (request, reply) => {
    const query = request.query as Record<string, string>;
    const encodedDest = query.dest;
    const version = query.v || "default";
    const targetId = query.id || "dynamic";

    if (!encodedDest) {
      return reply.status(400).send({ error: "Missing required query param: dest" });
    }

    let destination: string;
    try {
      destination = Buffer.from(encodedDest, "base64").toString("utf-8");
      // Basic sanity check
      new URL(destination);
    } catch {
      return reply.status(400).send({ error: "Invalid base64 encoded destination URL" });
    }

    await trackEvent({
      type: "redirect",
      name: "dynamic_redirect",
      targetId,
      url: destination,
      referrer: (request.headers["referer"] as string) || "",
      userAgent: (request.headers["user-agent"] as string) || "",
      ip: request.ip || "",
      version,
      metadata: { ...query },
    });

    return reply.status(302).redirect(destination);
  });
}
