
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const FAZERCARDS_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const FAZERCARDS_CRON_SECRET =
  process.env.FAZERCARDS_CRON_SECRET || "";

const FAZERCARDS_BASE_URL = (
  process.env.FAZERCARDS_BASE_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZERCARDS_ORIGIN =
  process.env.FAZERCARDS_ORIGIN || "";

const MAX_ORDERS_PER_RUN = 80;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

type TopupOrder = {
  id: string;
  game: string | null;
  status: string;
  supplier_order_id: string | null;
};

type FazerCardsResponse = {
  status?: string;
  orderId?: string;
  id?: string;
  fail_reason?: string;
  message?: string;
  data?: {
    status?: string;
    order?: {
      status?: string;
      orderId?: string;
      fail_reason?: string;
    };
  };
  order?: {
    status?: string;
    orderId?: string;
    fail_reason?: string;
  };
};

function jsonError(
  message: string,
  status = 500
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function isAuthorized(request: NextRequest) {
  if (!FAZERCARDS_CRON_SECRET) {
    return false;
  }

  const authorization =
    request.headers.get("authorization") || "";

  const bearerToken = authorization
    .replace(/^Bearer\s+/i, "")
    .trim();

  const cronHeader =
    request.headers.get("x-cron-secret") || "";

  return (
    bearerToken === FAZERCARDS_CRON_SECRET ||
    cronHeader === FAZERCARDS_CRON_SECRET
  );
}

function getProviderStatus(
  response: FazerCardsResponse
): string {
  return String(
    response.status ||
    response.data?.status ||
    response.data?.order?.status ||
    response.order?.status ||
    ""
  )
    .trim()
    .toLowerCase();
}

function getFailureReason(
  response: FazerCardsResponse
): string | null {
  return (
    response.fail_reason ||
    response.data?.order?.fail_reason ||
    response.order?.fail_reason ||
    response.message ||
    null
  );
}

async function getFazerCardsOrder(
  orderId: string
): Promise<FazerCardsResponse> {
  const headers: Record<string, string> = {
    "X-API-Key": FAZERCARDS_API_KEY,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (FAZERCARDS_ORIGIN.trim()) {
    try {
      headers.Origin = new URL(
        FAZERCARDS_ORIGIN.trim()
      ).origin;
    } catch {
      throw new Error(
        "FAZERCARDS_ORIGIN no contiene un origen válido."
      );
    }
  }

  const response = await fetch(
    `${FAZERCARDS_BASE_URL}/orders/${encodeURIComponent(
      orderId
    )}`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    }
  );

  const responseText = await response.text();

  let result: FazerCardsResponse;

  try {
    result = JSON.parse(
      responseText
    ) as FazerCardsResponse;
  } catch {
    throw new Error(
      `FazerCards devolvió una respuesta no JSON. HTTP ${response.status}.`
    );
  }

  if (!response.ok) {
    throw new Error(
      `FazerCards HTTP ${response.status}: ${
        result.message || responseText.slice(0, 300)
      }`
    );
  }

  return result;
}

async function completeOrder(
  orderId: string
) {
  const { data, error } = await supabase.rpc(
    "store_gaming_complete_order_by_id",
    {
      p_order_id: orderId,
    }
  );

  if (error) {
    throw new Error(
      `Error completando pedido: ${error.message}`
    );
  }

  if (!data || data.ok !== true) {
    throw new Error(
      `La función de finalización no confirmó el pedido: ${
        JSON.stringify(data)
      }`
    );
  }

  return data;
}

async function refundOrder(
  orderId: string
) {
  const { data, error } = await supabase.rpc(
    "store_gaming_refund_order_balance",
    {
      p_order_id: orderId,
    }
  );

  if (error) {
    throw new Error(
      `Error reembolsando pedido: ${error.message}`
    );
  }

  if (!data || data.ok !== true) {
    throw new Error(
      `La función de reembolso no confirmó la operación: ${
        JSON.stringify(data)
      }`
    );
  }

  return data;
}

async function processOrder(
  order: TopupOrder
) {
  const supplierOrderId =
    String(order.supplier_order_id || "").trim();

  if (!supplierOrderId) {
    return {
      orderId: order.id,
      game: order.game,
      processed: false,
      reason: "missing_supplier_order_id",
    };
  }

  /*
   * Consultar la orden original en FazerCards.
   */
  const providerResponse =
    await getFazerCardsOrder(supplierOrderId);

  const providerStatus =
    getProviderStatus(providerResponse);

  /*
   * Pedido completado por FazerCards.
   */
  if (providerStatus === "completed") {
    const result = await completeOrder(
      order.id
    );

    return {
      orderId: order.id,
      supplierOrderId,
      game: order.game,
      providerStatus,
      localAction: "COMPLETED",
      processed: true,
      result,
    };
  }

  /*
   * Pedido rechazado o cancelado por FazerCards.
   */
  if (
    providerStatus === "failed" ||
    providerStatus === "refund"
  ) {
    const failureReason =
      getFailureReason(providerResponse);

    const result = await refundOrder(
      order.id
    );

    return {
      orderId: order.id,
      supplierOrderId,
      game: order.game,
      providerStatus,
      failureReason,
      localAction: "REFUNDED",
      processed: true,
      result,
    };
  }

  /*
   * Pedido creado o todavía en procesamiento.
   */
  if (
    providerStatus === "created" ||
    providerStatus === "processing"
  ) {
    return {
      orderId: order.id,
      supplierOrderId,
      game: order.game,
      providerStatus,
      localAction: "KEEP_PENDING",
      processed: false,
      reason: "provider_still_processing",
    };
  }

  /*
   * No cambiar estados desconocidos.
   */
  return {
    orderId: order.id,
    supplierOrderId,
    game: order.game,
    providerStatus: providerStatus || "unknown",
    processed: false,
    reason: "unknown_provider_status",
  };
}

export async function GET(
  request: NextRequest
) {
  if (!isAuthorized(request)) {
    return jsonError(
      "No autorizado.",
      401
    );
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return jsonError(
      "Faltan las variables de Supabase.",
      500
    );
  }

  if (!FAZERCARDS_API_KEY) {
    return jsonError(
      "Falta configurar FAZERCARDS_API_KEY.",
      500
    );
  }

  try {
    /*
     * Buscar pedidos que todavía pueden necesitar
     * reconciliación en la tabla central.
     *
     * Se incluyen pedidos con ID del proveedor,
     * aunque su estado local sea RESERVED.
     */
    const { data: orders, error } = await supabase
      .from("topup_orders")
      .select(
        "id, game, status, supplier_order_id"
      )
      .in("status", [
        "RESERVED",
        "PROCESSING",
        "SUPPLIER_PENDING",
        "CONFIRMED",
      ])
      .not(
        "supplier_order_id",
        "is",
        null
      )
      .limit(MAX_ORDERS_PER_RUN);

    if (error) {
      throw new Error(
        `Error consultando topup_orders: ${error.message}`
      );
    }

    const pendingOrders =
      (orders || []) as TopupOrder[];

    const results: Array<
      Record<string, unknown>
    > = [];

    let completed = 0;
    let refunded = 0;
    let pending = 0;
    let unknown = 0;
    let failed = 0;

    /*
     * Consultar las órdenes una por una
     * para respetar el límite de FazerCards.
     */
    for (const order of pendingOrders) {
      try {
        const result = await processOrder(order);

        results.push(result);

        if (result.localAction === "COMPLETED") {
          completed++;
        } else if (
          result.localAction === "REFUNDED"
        ) {
          refunded++;
        } else if (
          result.localAction === "KEEP_PENDING"
        ) {
          pending++;
        } else {
          unknown++;
        }
      } catch (error) {
        failed++;

        results.push({
          orderId: order.id,
          game: order.game,
          supplierOrderId:
            order.supplier_order_id,
          processed: false,
          error:
            error instanceof Error
              ? error.message
              : "Error desconocido.",
        });
      }
    }

    return NextResponse.json({
      ok: failed === 0,
      reconciler: "FAZERCARDS",
      table: "topup_orders",
      scanned: pendingOrders.length,
      completed,
      refunded,
      pending,
      unknown,
      failed,
      limit: MAX_ORDERS_PER_RUN,
      results,
    });
  } catch (error) {
    console.error(
      "[RECONCILE-FAZERCARDS]",
      error
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Error ejecutando el reconciliador."
    );
  }
}
