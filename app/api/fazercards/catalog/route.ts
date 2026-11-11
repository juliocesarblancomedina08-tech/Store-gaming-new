
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
          error: "Falta FAZERCARDS_API_KEY en las variables de entorno.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${FAZERCARDS_API}/topups`,
      {
        method: "GET",
        headers: {
          "X-API-Key": API_KEY,
          Accept: "application/json",
          "User-Agent": "STORE-GAMING/1.0",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      }
    );

    const text = await response.text();
    let data: any;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          supplier: "FazerCards",
          status: response.status,
          error: "FazerCards no devolvió JSON válido.",
          raw: text.slice(0, 3000),
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          supplier: "FazerCards",
          status: response.status,
          error: data,
        },
        { status: 502 }
      );
    }

    const catalog = data?.data ?? data?.catalog ?? data;

    const items = Array.isArray(catalog?.items)
      ? catalog.items
      : Array.isArray(catalog)
        ? catalog
        : [];

    const categoryId = request.nextUrl.searchParams
      .get("category_id")
      ?.trim();

    // CONSULTAR UNA CATEGORÍA ESPECÍFICA
    if (categoryId) {
      const game = items.find(
        (item: any) =>
          String(item?.category_id ?? "") === categoryId
      );

      if (!game) {
        return NextResponse.json(
          {
            ok: false,
            supplier: "FazerCards",
            error: "Juego no encontrado en el catálogo.",
            category_id: categoryId,
            available_categories: items.map((item: any) => ({
              category_id: item?.category_id ?? null,
              name: item?.name ?? item?.title ?? null,
            })),
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        supplier: "FazerCards",
        category_id: categoryId,
        game,
      });
    }

    // CONSULTAR TODOS LOS JUEGOS
    return NextResponse.json({
      ok: true,
      supplier: "FazerCards",
      count: items.length,
      catalog: items.length ? items : catalog,
    });

  } catch (error) {
    console.error("[FazerCards Catalog]", error);

    return NextResponse.json(
      {
        ok: false,
        supplier: "FazerCards",
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
