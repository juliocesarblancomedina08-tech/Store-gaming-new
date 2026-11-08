import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FAZERCARDS_API = "https://api.fzr.cards/api/v2";

export async function GET() {
  const startedAt = Date.now();

  try {
    const apiKey = process.env.FAZERCARDS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          step: "env",
          error: "FAZERCARDS_API_KEY no está configurada",
        },
        { status: 500 }
      );
    }

    const url = `${FAZERCARDS_API}/me`;

    let response: Response;

    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
          "User-Agent": "STORE-GAMING/1.0",
        },
        cache: "no-store",
      });
    } catch (fetchError) {
      return NextResponse.json(
        {
          ok: false,
          step: "fetch",
          error:
            fetchError instanceof Error
              ? fetchError.message
              : String(fetchError),
          url,
          elapsed_ms: Date.now() - startedAt,
        },
        { status: 502 }
      );
    }

    const text = await response.text();

    let data: unknown = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = {
        raw: text,
      };
    }

    return NextResponse.json({
      ok: response.ok,
      step: "response",
      status: response.status,
      status_text: response.statusText,
      url,
      elapsed_ms: Date.now() - startedAt,
      response: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        step: "unknown",
        error:
          error instanceof Error
            ? error.message
            : String(error),
        elapsed_ms: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }
}
