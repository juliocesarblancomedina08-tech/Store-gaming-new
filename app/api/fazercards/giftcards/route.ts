import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const FAZERCARDS_API = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const API_KEY = process.env.FAZERCARDS_API_KEY;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Error desconocido";
  }
}

async function fazerCardsFetch(endpoint: string) {
  const response = await fetch(
    `${FAZERCARDS_API}${endpoint}`,
    {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY!,
        Accept: "application/json",
        "User-Agent": "STORE-GAMING/1.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    }
  );

  const raw = await response.text();

  let data: unknown = null;

  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta configurar FAZERCARDS_API_KEY en Vercel.",
        },
        { status: 500 }
      );
    }

    const categoryId =
      request.nextUrl.searchParams.get("category_id");

    // Con category_id consultamos las ofertas de esa categoría.
    // Sin category_id solicitamos las categorías de Gift Cards.
    const endpoint = categoryId
      ? `/giftcards/cards?category_id=${encodeURIComponent(categoryId)}`
      : "/giftcards?limit=50";

    const result = await fazerCardsFetch(endpoint);

    if (!result.ok) {
      console.error(
        "[STORE GAMING] Error de FazerCards:",
        result.status,
        result.data
      );

      return NextResponse.json(
        {
          ok: false,
          supplier: "FazerCards",
          status: result.status,
          error: result.data,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        supplier: "FazerCards",
        type: categoryId ? "offers" : "categories",
        category_id: categoryId,
        data: result.data,
      },
      {
        headers: {
          "Cache-Control":
            "s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error(
      "[STORE GAMING] Error consultando Gift Cards:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
