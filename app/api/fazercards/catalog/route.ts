
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
          error: "Falta FAZERCARDS_API_KEY",
        },
        { status: 500 }
      );
    }

    const categoryId =
      request.nextUrl.searchParams.get("category_id");

    if (!categoryId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debes indicar category_id",
          example:
            "/api/fazercards/catalog?category_id=mobile_legends_united_states",
        },
        { status: 400 }
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
      }
    );

    const data = await response.json();

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

    const catalog =
      data?.data ??
      data?.catalog ??
      data;

    const items = Array.isArray(catalog?.items)
      ? catalog.items
      : [];

    const game = items.find(
      (item: any) =>
        item?.category_id === categoryId
    );

    if (!game) {
      return NextResponse.json(
        {
          ok: false,
          error: "Juego no encontrado",
          category_id: categoryId,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      supplier: "FazerCards",
      game,
    });
  } catch (error) {
    console.error("[FazerCards Catalog]", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
