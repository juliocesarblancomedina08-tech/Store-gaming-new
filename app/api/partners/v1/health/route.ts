import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      service: "STORE GAMING Partner API",
      version: "v1",
      status: "online",
    },
    { status: 200 }
  );
}
