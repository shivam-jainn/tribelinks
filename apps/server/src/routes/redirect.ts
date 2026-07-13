import { FastifyInstance } from "fastify";
import { getShortLink } from "../models/short-link";
import { trackEvent } from "../models/event";

/**
 * Extract geo-location information from request headers.
 * Supports Cloudflare (cf-ipcountry, cf-ipcity) and common proxy headers.
 */
function extractGeoMeta(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const get = (h: string) => (Array.isArray(headers[h]) ? (headers[h] as string[])[0] : headers[h] as string) || "";
  return {
    country: get("cf-ipcountry") || get("x-vercel-ip-country") || "",
    city: get("cf-ipcity") || get("x-vercel-ip-city") || "",
    region: get("cf-ipregion") || get("x-vercel-ip-country-region") || "",
    latitude: get("cf-iplatitude") || "",
    longitude: get("cf-iplongitude") || "",
    timezone: get("cf-timezone") || get("x-vercel-ip-timezone") || "",
    forwardedFor: get("x-forwarded-for") || "",
  };
}

/**
 * Parse basic device/OS info from User-Agent string.
 */
function parseUserAgent(ua: string): Record<string, string> {
  const mobile = /mobile|android|iphone|ipad/i.test(ua);
  const os =
    /windows/i.test(ua) ? "Windows" :
    /mac os x/i.test(ua) ? "macOS" :
    /android/i.test(ua) ? "Android" :
    /iphone|ipad/i.test(ua) ? "iOS" :
    /linux/i.test(ua) ? "Linux" : "Unknown";
  const browser =
    /firefox\//i.test(ua) ? "Firefox" :
    /edg\//i.test(ua) ? "Edge" :
    /chrome\//i.test(ua) ? "Chrome" :
    /safari\//i.test(ua) ? "Safari" : "Unknown";

  return { device: mobile ? "mobile" : "desktop", os, browser };
}

export async function redirectRoutes(fastify: FastifyInstance) {
  /**
   * GET /r/:key
   * Short link redirector. Tracks the redirect as a "redirect" analytics event
   * with enriched geo, device, and timing metadata.
   *
   * Usage: GET /r/resume?v=CampaignA
   */
  fastify.get("/r/:key", async (request, reply) => {
    const start = Date.now();
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

    const ua = (request.headers["user-agent"] as string) || "";
    const geo = extractGeoMeta(request.headers as Record<string, string | string[] | undefined>);
    const device = parseUserAgent(ua);
    const processingMs = Date.now() - start;

    await trackEvent({
      type: "redirect",
      name: "link_redirect",
      targetId: key,
      url: destination,
      referrer: (request.headers["referer"] as string) || "",
      userAgent: ua,
      ip: request.ip || "",
      version,
      metadata: {
        originalKey: key,
        contactId: link.contact_id || "",
        processingMs: String(processingMs),
        ...geo,
        ...device,
        ...query,
      },
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
    const start = Date.now();
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
      new URL(destination);
    } catch {
      return reply.status(400).send({ error: "Invalid base64 encoded destination URL" });
    }

    const ua = (request.headers["user-agent"] as string) || "";
    const geo = extractGeoMeta(request.headers as Record<string, string | string[] | undefined>);
    const device = parseUserAgent(ua);
    const processingMs = Date.now() - start;

    await trackEvent({
      type: "redirect",
      name: "dynamic_redirect",
      targetId,
      url: destination,
      referrer: (request.headers["referer"] as string) || "",
      userAgent: ua,
      ip: request.ip || "",
      version,
      metadata: {
        processingMs: String(processingMs),
        ...geo,
        ...device,
        ...query,
      },
    });

    return reply.status(302).redirect(destination);
  });
}

