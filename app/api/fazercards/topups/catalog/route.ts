import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const FAZERCARDS_API = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const API_KEY = process.env.FAZERCARDS_API_KEY;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, max-age=0",
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

async function fetchTopupPage(cursor?: string) {
  const params = new URLSearchParams({
    limit: "500",
    include_ui: "true",
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  const response = await fetch(
    `${FAZERCARDS_API}/topups?${params.toString()}`,
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

  const text = await response.text();

  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    raw: text,
  };
}

export async function GET() {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta configurar FAZERCARDS_API_KEY en Vercel.",
        },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const allItems: unknown[] = [];
    const seenCategoryIds = new Set<string>();
    const seenCursors = new Set<string>();

    let cursor: string | undefined;
    let pagesFetched = 0;
    let providerTotal: number | null = null;
    let hasMore = true;

    // Protección para evitar ciclos o consultas ilimitadas.
    const MAX_PAGES = 20;

    while (hasMore && pagesFetched < MAX_PAGES) {
      const result = await fetchTopupPage(cursor);

      if (!result.ok) {
        console.error(
          "[STORE GAMING TOP UP CATALOG]",
          result.status,
          result.data
        );

        return NextResponse.json(
          {
            success: false,
            supplier: "FazerCards",
            error: "Error consultando el catálogo TOP UP.",
            status: result.status,
            details: result.data,
            pagesFetched,
          },
          { status: 502, headers: NO_CACHE_HEADERS }
        );
      }

      if (!isObject(result.data)) {
        return NextResponse.json(
          {
            success: false,
            supplier: "FazerCards",
            error: "FazerCards devolvió una respuesta inválida.",
            raw: result.raw.slice(0, 3000),
          },
          { status: 502, headers: NO_CACHE_HEADERS }
        );
      }

      const data = result.data;

      if (data.ok === false) {
        return NextResponse.json(
          {
            success: false,
            supplier: "FazerCards",
            error: data.error ?? "El proveedor rechazó la consulta.",
            code: data.code ?? null,
          },
          { status: 502, headers: NO_CACHE_HEADERS }
        );
      }

      const items = Array.isArray(data.items) ? data.items : [];

      const meta = isObject(data.meta) ? data.meta : {};

      if (typeof meta.total === "number") {
        providerTotal = meta.total;
      }

      for (const item of items) {
        if (!isObject(item)) continue;

        const categoryId =
          typeof item.category_id === "string"
            ? item.category_id
            : null;

        // Evitar duplicados entre páginas.
        if (categoryId && seenCategoryIds.has(categoryId)) {
          continue;
        }

        if (categoryId) {
          seenCategoryIds.add(categoryId);
        }

        allItems.push(item);
      }

      pagesFetched++;

      hasMore = meta.has_more === true;

      const nextCursor =
        typeof meta.next_cursor === "string" &&
        meta.next_cursor.trim()
          ? meta.next_cursor.trim()
          : undefined;

      if (!hasMore || !nextCursor) {
        hasMore = false;
        break;
      }

      // Evita repetir un cursor y entrar en un ciclo.
      if (seenCursors.has(nextCursor)) {
        console.error(
          "[STORE GAMING] FazerCards repitió un cursor."
        );

        hasMore = false;
        break;
      }

      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }

    return NextResponse.json(
      {
        success: true,
        supplier: "FazerCards",
        type: "topup_catalog",
        count: allItems.length,
        catalog: allItems,
        pagination: {
          provider_total: providerTotal,
          pages_fetched: pagesFetched,
          has_more: hasMore,
          complete: !hasMore,
        },
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error(
      "[STORE GAMING TOP UP CATALOG ERROR]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        supplier: "FazerCards",
        error: getErrorMessage(error),
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
