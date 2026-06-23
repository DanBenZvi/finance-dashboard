import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({
    anthropic_key: key ? `set (${key.slice(0, 10)}…)` : "MISSING",
    google_sheet_id: process.env.GOOGLE_SHEET_ID ? "set" : "MISSING",
    google_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "set" : "MISSING",
    node_env: process.env.NODE_ENV,
  });
}
