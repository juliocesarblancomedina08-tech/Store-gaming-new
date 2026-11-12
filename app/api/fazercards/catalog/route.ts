
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZERCARDS_API =
  (
    process.env.FAZERCARDS_API_URL ||
    "https://api.fzr.cards/api/v2"
  ).replace(/\/+$/, "");

const API_KEY = process.env.FAZERCARDS_API_KEY?.trim();

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Error desconocido";
  }
}

export async function GET(request: Request) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          supplier: "FazerCards",
          error: "Falta configurar FAZERCARDS_API_KEY en Vercel.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id")?.trim();

    // Sin category_id: consultar todas las categorías.
    // Con category_id: consultar las ofertas de esa categoría.
    const supplierUrl = categoryId
      ? `${FAZERCARDS_API}/topups/offers?category_id=${encodeURIComponent(categoryId)}`
      : `${FAZERCARDS_API}/topups?limit=200`;

    const response = await fetch(supplierUrl, {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
        Accept: "application/json",
        "User-Agent": "STORE-GAMING/1.0",
      },
      cache: "no-store",
    });

    const raw = await response.text();

    let data: unknown;

    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error("[FazerCards Catalog]", {
        status: response.status,
        response: data ?? raw.slice(0, 1000),
      });

      return NextResponse.json(
        {
          ok: false,
          supplier: "FazerCards",
          upstream_status: response.status,
          category_id: categoryId ?? null,
          error:
            response.status === 401 || response.status === 403
              ? "FazerCards rechazó la autenticación. Revisa la API key y los permisos de tu cuenta."
              : "FazerCards rechazó la consulta.",
          details: data ?? raw.slice(0, 3000),
        },
        { status: 502 }
      );
    }

    if (data === null) {
      return NextResponse.json(
        {
          ok: false,
          supplier: "FazerCards",
          error: "FazerCards no devolvió JSON válido.",
          raw: raw.slice(0, 3000),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      supplier: "FazerCards",
      mode: categoryId ? "offers" : "categories",
      category_id: categoryId ?? null,
      catalog: data,
    });
  } catch (error) {
    console.error("[FazerCards Catalog]", error);

    return NextResponse.json(
      {
        ok: false,
        supplier: "FazerCards",
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
