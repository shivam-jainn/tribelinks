import { NextRequest, NextResponse } from "next/server";
import { ensureInit, pgPool } from "../../../../server/database";
import { getShortLink } from "../../../../server/models/short-link";
import { trackEvent } from "../../../../server/models/event";
import logger from "../../../../server/logger";

export const dynamic = "force-dynamic";

// 1x1 transparent PNG image buffer
const PIXEL_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params;
  logger.info(`[PIXEL] Hit pixel for key: ${key}`);

  await ensureInit();

  const link = await getShortLink(key);
  
  if (link) {
    const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "";
    const ua = req.headers.get("user-agent") || "";

    // If campaign contact, update status
    if (link.contact_id && link.campaign_id) {
      await pgPool.query(
        `UPDATE campaign_contacts 
         SET status = 'clicked' 
         WHERE campaign_id = $1 AND contact_id = $2`,
        [link.campaign_id, link.contact_id]
      );
      logger.success(`[PIXEL] Contact ${link.contact_id} marked as clicked/opened in campaign ${link.campaign_id}`);
    }

    // Track pixel open event
    await trackEvent({
      type: "pixel",
      name: "email_pixel_open",
      targetId: key,
      url: req.url,
      referrer: req.headers.get("referer") || "",
      userAgent: ua,
      ip,
      version: "default",
      metadata: {
        originalKey: key,
        contactId: link.contact_id || "",
        campaignId: link.campaign_id || "",
      },
    });
  } else {
    logger.warn(`[PIXEL] Link not found for key: ${key}`);
  }

  return new Response(new Uint8Array(PIXEL_BUFFER), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
