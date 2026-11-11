
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
      return NextResponse.json(
        {
          ok: false,
          error: "Falta FAZERCARDS_API_KEY en las variables de entorno."
        },
        { status: 500 }
      );
    }

    const categoryId = request.nextUrl.searchParams
      .get("category_id")
      ?.trim();

    // Si hay categoría, consultar sus ofertas.
    // Si no hay categoría, consultar el catálogo general.
    const endpoint = categoryId
      ? `${FAZERCARDS_API}/topups/offers?category_id=${encodeURIComponent(categoryId)}`
      : `${FAZERCARDS_API}/topups?limit=200`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
        Accept: "application/json",
        "User-Agent": "STORE-GAMING/1.0"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20000)
    });

    const text = await response.text();

    let data: any;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          supplier: "FazerCards",
          error: "Respuesta JSON inválida.",
          raw: text.slice(0, 2000)
        },
        { status: 502 }
      );
    }

    if (!response.ok || data?.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          supplier: "FazerCards",
          status: response.status,
          error: data?.error ?? data
        },
        { status: 502 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error("[FazerCards Catalog]", error);

    return NextResponse.json(
      {
        ok: false,
        supplier: "FazerCards",
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
