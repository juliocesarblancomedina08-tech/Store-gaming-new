
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_CACHE = {
  "Cache-Control": "no-store",
};

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      service: "STORE GAMING Partner API",
      endpoint: "orders",
      version: "v1",
      status: "sandbox",
      message: "Orders endpoint is ready for testing.",
    },
    {
      status: 200,
      headers: NO_CACHE,
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing API key",
        },
        {
          status: 401,
          headers: NO_CACHE,
        }
      );
    }

    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
        },
        {
          status: 400,
          headers: NO_CACHE,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        service: "STORE GAMING Partner API",
        endpoint: "orders",
        version: "v1",
        status: "sandbox",
        message: "Request received. No purchase was made.",
        received: {
          service: body.service ?? null,
          offer_id: body.offer_id ?? null,
        },
      },
      {
        status: 200,
        headers: NO_CACHE,
      }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON",
      },
      {
        status: 400,
        headers: NO_CACHE,
      }
    );
  }
}
