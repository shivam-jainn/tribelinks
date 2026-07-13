import { FastifyInstance } from "fastify";
import { trackEvent } from "../models/event";

// 1x1 Transparent GIF
const PIXEL_BUFFER = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const PIXEL_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function pixelRoutes(fastify: FastifyInstance) {
  const pixelHandler = async (request: any, reply: any) => {
    const { pixelId, version: rawVersion } = request.params as {
      pixelId: string;
      version?: string;
    };
    const query = request.query as Record<string, string>;

    // Strip trailing .png extension from version or pixelId
    const version = rawVersion?.endsWith(".png")
      ? rawVersion.slice(0, -4)
      : rawVersion;
    const cleanPixelId = !version && pixelId.endsWith(".png")
      ? pixelId.slice(0, -4)
      : pixelId;

    await trackEvent({
      type: "pixel",
      name: "pixel_open",
      targetId: cleanPixelId,
      url: request.url,
      referrer: (request.headers["referer"] as string) || "",
      userAgent: (request.headers["user-agent"] as string) || "",
      ip: request.ip || "",
      version: version || query.v || "default",
      metadata: { ...query },
    });

    return reply
      .type("image/gif")
      .headers(PIXEL_HEADERS)
      .send(PIXEL_BUFFER);
  };

  /**
   * GET /pixel/:pixelId
   * GET /pixel/:pixelId/:version
   *
   * Returns a 1x1 transparent GIF and tracks an email-open event.
   * Usage: <img src="http://localhost:3001/pixel/campaign123/recipientA.png" />
   */
  fastify.get("/pixel/:pixelId", pixelHandler);
  fastify.get("/pixel/:pixelId/:version", pixelHandler);
}
