import { NextRequest, NextResponse } from "next/server";
import { ensureInit } from "../../../../server/database";
import { getShortLink } from "../../../../server/models/short-link";
import { config } from "@tracker/config";
import QRCode from "qrcode";
import logger from "../../../../server/logger";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params;
  logger.info(`[QR] Generating QR code for key: ${key}`);

  await ensureInit();

  const link = await getShortLink(key);
  if (!link) {
    logger.warn(`[QR] Link not found for key: ${key}`);
    return NextResponse.json({ error: `Short link '${key}' not found` }, { status: 404 });
  }

  try {
    const shortUrl = `${config.server.baseUrl}/r/${key}`;
    const qrBuffer = await QRCode.toBuffer(shortUrl, {
      type: "png",
      margin: 2,
      width: 400,
    });

    logger.success(`[QR] Successfully generated QR code for key '${key}' -> ${shortUrl}`);

    return new Response(new Uint8Array(qrBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err: any) {
    logger.error(`[QR] Failed to generate QR code for key '${key}':`, err);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
