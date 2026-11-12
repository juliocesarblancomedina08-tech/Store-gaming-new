
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZERCARDS_API = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const API_KEY = process.env.FAZERCARDS_API_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({
        ok: false,
        error: "FAZERCARDS_API_KEY no configurada."
      }, { status: 500 });
    }

    const categoryId = request.nextUrl.searchParams
      .get("category_id")
      ?.trim();

    const endpoint = categoryId
      ? `${FAZERCARDS_API}/topups/offers?category_id=${encodeURIComponent(categoryId)}`
      : `${FAZERCARDS_API}/topups?limit=200`;

    console.log("[FAZERCARDS CATALOG] Consultando:", endpoint);

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
        "Accept": "application/json",
        "User-Agent": "STORE-GAMING/1.0"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(30000)
    });

    const raw = await response.text();

    let data: any;

    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json({
        ok: false,
        supplier: "FazerCards",
        error: "FazerCards devolvió una respuesta no válida.",
        httpStatus: response.status,
        raw: raw.slice(0, 3000)
      }, { status: 502 });
    }

    if (!response.ok || data?.ok === false) {
      return NextResponse.json({
        ok: false,
        supplier: "FazerCards",
        httpStatus: response.status,
        error: data?.error || "Error consultando catálogo.",
        response: data
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      supplier: "FazerCards",
      source: endpoint,
      categoryId: categoryId || null,
      consultedAt: new Date().toISOString(),
      catalog: data
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });

  } catch (error) {
    console.error("[FAZERCARDS CATALOG ERROR]", error);

    return NextResponse.json({
      ok: false,
      supplier: "FazerCards",
      error: error instanceof Error
        ? error.message
        : "Error desconocido."
    }, { status: 500 });
  }
}
