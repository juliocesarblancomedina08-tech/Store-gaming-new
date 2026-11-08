import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZERCARDS_API =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const API_KEY =
  process.env.FAZERCARDS_API_KEY;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Error desconocido";
  }
}

function isDdosGuard(
  status: number,
  text: string
): boolean {
  const body = text.toLowerCase();

  return (
    status === 403 &&
    (
      body.includes("ddos-guard") ||
      body.includes("check.ddos-guard.net") ||
      body.includes("ddos guard") ||
      body.includes("checking your browser")
    )
  );
}

async function testRequest(
  name: string,
  url: string,
  headers: Record<string, string>
) {
  const started = Date.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const text = await response.text();

    let json: unknown = null;

    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    return {
      test: name,
      status: response.status,
      ok: response.ok,
      duration_ms: Date.now() - started,

      content_type:
        response.headers.get(
          "content-type"
        ),

      is_json:
        json !== null,

      ddos_guard:
        isDdosGuard(
          response.status,
          text
        ),

      response:
        json !== null
          ? json
          : text.slice(0, 2000),
    };
  } catch (error) {
    return {
      test: name,
      status: null,
      ok: false,
      duration_ms: Date.now() - started,

      error:
        getErrorMessage(error),
    };
  }
}

export async function GET(
  request: Request
) {
  try {
    /*
     * ============================================================
     * CONFIGURACIÓN
     * ============================================================
     */

    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          step: "config",
          error:
            "Falta FAZERCARDS_API_KEY.",
        },
        { status: 500 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    /*
     * Podemos cambiar la categoría desde la URL.
     *
     * Por defecto:
     * delta_force
     */

    const categoryId =
      searchParams.get(
        "category_id"
      ) ||
      "delta_force";

    const endpoint =
      `${FAZERCARDS_API}/topups/offers`;

    const url =
      `${endpoint}?category_id=${encodeURIComponent(
        categoryId
      )}`;

    /*
     * ============================================================
     * PRUEBA 1
     *
     * X-API-Key
     * ============================================================
     */

    const xApiKey =
      await testRequest(
        "X-API-Key",
        url,
        {
          "X-API-Key":
            API_KEY,

          "Accept":
            "application/json",

          "User-Agent":
            "STORE-GAMING/1.0",
        }
      );

    /*
     * ============================================================
     * PRUEBA 2
     *
     * Authorization Bearer
     * ============================================================
     */

    const bearer =
      await testRequest(
        "Authorization Bearer",
        url,
        {
          "Authorization":
            `Bearer ${API_KEY}`,

          "Accept":
            "application/json",

          "User-Agent":
            "STORE-GAMING/1.0",
        }
      );

    /*
     * ============================================================
     * PRUEBA 3
     *
     * X-API-Key + headers adicionales
     *
     * Esto sirve para descartar que el servidor esté rechazando
     * una petición demasiado básica.
     * ============================================================
     */

    const browserLike =
      await testRequest(
        "X-API-Key + browser headers",
        url,
        {
          "X-API-Key":
            API_KEY,

          "Accept":
            "application/json,text/plain,*/*",

          "Accept-Language":
            "en-US,en;q=0.9",

          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",

          "Cache-Control":
            "no-cache",

          "Pragma":
            "no-cache",
        }
      );

    /*
     * ============================================================
     * PRUEBA 4
     *
     * Endpoint con la URL construida mediante URL()
     *
     * Es la misma consulta, pero sirve para descartar problemas
     * de construcción de la URL.
     * ============================================================
     */

    const urlObject =
      new URL(
        `${FAZERCARDS_API}/topups/offers`
      );

    urlObject.searchParams.set(
      "category_id",
      categoryId
    );

    const urlBuilder =
      await testRequest(
        "URL builder + X-API-Key",
        urlObject.toString(),
        {
          "X-API-Key":
            API_KEY,

          "Accept":
            "application/json",

          "User-Agent":
            "STORE-GAMING/1.0",
        }
      );

    /*
     * ============================================================
     * ANÁLISIS
     * ============================================================
     */

    const tests = [
      xApiKey,
      bearer,
      browserLike,
      urlBuilder,
    ];

    const successful =
      tests.filter(
        (test) =>
          test.ok
      ).length;

    const ddosBlocked =
      tests.filter(
        (test) =>
          test.ddos_guard === true
      ).length;

    /*
     * ============================================================
     * RESULTADO
     * ============================================================
     */

    return NextResponse.json({
      ok: true,

      diagnostic: true,

      supplier:
        "FazerCards",

      category_id:
        categoryId,

      endpoint,

      requested_url:
        url,

      total_tests:
        tests.length,

      successful_tests:
        successful,

      ddos_guard_tests:
        ddosBlocked,

      conclusion:
        successful > 0
          ? "Al menos una forma de consulta respondió correctamente."
          : ddosBlocked === tests.length
            ? "Todas las pruebas fueron bloqueadas por DDoS-Guard."
            : "Ninguna prueba obtuvo una respuesta correcta; revisar los resultados individuales.",

      tests: {
        x_api_key:
          xApiKey,

        authorization_bearer:
          bearer,

        browser_headers:
          browserLike,

        url_builder:
          urlBuilder,
      },
    });
  } catch (error) {
    console.error(
      "[FazerCards Diagnostic]",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        step:
          "diagnostic",

        error:
          getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
