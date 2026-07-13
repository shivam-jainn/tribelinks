import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Resolve relative path to packages/sdk/dist/sdk.js
    const sdkPath = path.join(process.cwd(), "../../packages/sdk/dist/sdk.js");
    if (!fs.existsSync(sdkPath)) {
      return NextResponse.json({ error: "SDK file not found. Run sdk build first." }, { status: 404 });
    }

    const fileContent = fs.readFileSync(sdkPath, "utf-8");

    return new Response(fileContent, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("Failed to serve SDK script:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
