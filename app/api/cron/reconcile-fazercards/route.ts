
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// ============================================================
// CONFIGURACIÓN
// ============================================================

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const FAZERCARDS_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const FAZERCARDS_CRON_SECRET =
  process.env.FAZERCARDS_CRON_SECRET || "";

const FAZERCARDS_BASE_URL = (
  process.env.FAZERCARDS_API_URL ||
  process.env.FAZERCARDS_BASE_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const MAX_ORDERS_PER_RUN = 40;
const CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 12000;

const FAZERCARDS_HEADERS = {
  "X-API-Key": FAZERCARDS_API_KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
  Referer: "https://reseller.fazercards.com/",
  Origin: "https://reseller.fazercards.com",
};

const supabase = createClient(
  SUPABASE_URL || "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY || "missing-service-role-key",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============================================================
// TIPOS
// ============================================================

type TopupOrder = {
  id: string;
  game: string | null;
  status: string;
  supplier_order_id: string | null;
  supplier_response: Record<string, unknown> | null;
};

type ProviderResponse = Record<string, any>;

type ProcessResult = {
  orderId: string;
  game: string | null;
  supplierOrderId?: string;
  providerStatus?: string;
  localAction?: string;
  processed: boolean;
  reason?: string;
  error?: string;
  result?: unknown;
};

// ============================================================
// RESPUESTAS
// ============================================================

function jsonError(message: string, status = 500) {
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

// ============================================================
// UTILIDADES
// ============================================================

function normalizeStatus(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getProviderStatus(
  response: ProviderResponse
): string {
  return normalizeStatus(
    response.status ||
    response.order_status ||
    response.state ||
    response.order?.status ||
    response.data?.status ||
    response.data?.order?.status ||
    response.result?.status ||
    ""
  );
}

function getFailureReason(
  response: ProviderResponse
): string | null {
  const reason =
    response.fail_reason ||
    response.error ||
    response.message ||
    response.order?.fail_reason ||
    response.data?.fail_reason ||
    response.data?.message ||
    response.data?.order?.fail_reason ||
    null;

  return reason ? String(reason) : null;
}

function isSuccessfulStatus(status: string) {
  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "done",
  ].includes(status);
}

function isFailedStatus(status: string) {
  return [
    "failed",
    "failure",
    "refund",
    "refunded",
    "rejected",
    "cancelled",
    "canceled",
    "error",
    "declined",
    "denied",
  ].includes(status);
}

function getLocalPendingStatus(
  providerStatus: string,
  currentStatus: string
): string | null {
  if (
    providerStatus === "processing" ||
    providerStatus === "in_progress"
  ) {
    return "PROCESSING";
  }

  if (
    providerStatus === "confirmed" ||
    providerStatus === "accepted"
  ) {
    return "CONFIRMED";
  }

  if (
    providerStatus === "created" ||
    providerStatus === "pending" ||
    providerStatus === "queued" ||
    providerStatus === "waiting"
  ) {
    return "SUPPLIER_PENDING";
  }

  // No modificar estados desconocidos.
  return null;
}

function getPreviousSupplierResponse(
  value: unknown
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

// ============================================================
// CONSULTAR FAZERCARDS
// ============================================================

async function getFazerCardsOrder(
  supplierOrderId: string
): Promise<{
  httpStatus: number;
  response: ProviderResponse;
}> {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `${FAZERCARDS_BASE_URL}/orders/${encodeURIComponent(
        supplierOrderId
      )}`,
      {
        method: "GET",
        headers: FAZERCARDS_HEADERS,
        cache: "no-store",
        signal: controller.signal,
      }
    );

    const responseText = await response.text();

    let result: ProviderResponse;

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Respuesta no JSON de FazerCards. HTTP ${response.status}: ${responseText.slice(
          0,
          250
        )}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `FazerCards HTTP ${response.status}: ${
          result.message ||
          result.error ||
          responseText.slice(0, 250)
        }`
      );
    }

    return {
      httpStatus: response.status,
      response: result,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// GUARDAR RESULTADO DE RECONCILIACIÓN
// ============================================================

async function saveReconciliation(
  order: TopupOrder,
  details: Record<string, unknown>,
  newStatus?: string
) {
  const previousResponse =
    getPreviousSupplierResponse(order.supplier_response);

  const updatedResponse = {
    ...previousResponse,
    reconciliation: {
      ...details,
      checked_at: new Date().toISOString(),
    },
  };

  const updateData: Record<string, unknown> = {
    supplier_response: updatedResponse,
    updated_at: new Date().toISOString(),
  };

  if (newStatus) {
    updateData.status = newStatus;
  }

  const { error } = await supabase
    .from("topup_orders")
    .update(updateData)
    .eq("id", order.id);

  if (error) {
    throw new Error(
      `Error actualizando orden ${order.id}: ${error.message}`
    );
  }
}

// ============================================================
// RPC UNIVERSALES
// ============================================================

async function completeOrder(orderId: string) {
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
      `La función de finalización no confirmó el pedido: ${JSON.stringify(
        data
      )}`
    );
  }

  return data;
}

async function refundOrder(orderId: string) {
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
      `La función de reembolso no confirmó la operación: ${JSON.stringify(
        data
      )}`
    );
  }

  return data;
}

// ============================================================
// PROCESAR UNA ORDEN
// ============================================================

async function processOrder(
  order: TopupOrder
): Promise<ProcessResult> {
  const supplierOrderId = String(
    order.supplier_order_id || ""
  ).trim();

  if (!supplierOrderId) {
    return {
      orderId: order.id,
      game: order.game,
      processed: false,
      reason: "missing_supplier_order_id",
    };
  }

  try {
    const providerResult =
      await getFazerCardsOrder(supplierOrderId);

    const providerResponse =
      providerResult.response;

    const providerStatus =
      getProviderStatus(providerResponse);

    const failureReason =
      getFailureReason(providerResponse);

    // --------------------------------------------------------
    // REGISTRAR RESPUESTA DEL PROVEEDOR
    // --------------------------------------------------------

    const reconciliationData = {
      http_status: providerResult.httpStatus,
      provider_status: providerStatus || "unknown",
      response: providerResponse,
      failure_reason: failureReason,
    };

    await saveReconciliation(
      order,
      reconciliationData
    );

    // --------------------------------------------------------
    // COMPLETADA
    // --------------------------------------------------------

    if (isSuccessfulStatus(providerStatus)) {
      const result = await completeOrder(order.id);

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

    // --------------------------------------------------------
    // FALLIDA / REEMBOLSO
    // --------------------------------------------------------

    if (isFailedStatus(providerStatus)) {
      const result = await refundOrder(order.id);

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

    // --------------------------------------------------------
    // SIGUE EN PROCESO
    // --------------------------------------------------------

    const pendingStatus = getLocalPendingStatus(
      providerStatus,
      order.status
    );

    if (pendingStatus) {
      await saveReconciliation(
        order,
        reconciliationData,
        pendingStatus
      );

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

    // --------------------------------------------------------
    // ESTADO DESCONOCIDO
    // --------------------------------------------------------

    return {
      orderId: order.id,
      supplierOrderId,
      game: order.game,
      providerStatus: providerStatus || "unknown",
      localAction: "UNKNOWN",
      processed: false,
      reason: "unknown_provider_status",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Error desconocido consultando FazerCards.";

    // Registrar el error sin cambiar el estado
    // ni devolver dinero por una respuesta ambigua.
    try {
      await saveReconciliation(order, {
        provider_status: "query_error",
        reconcile_error: errorMessage,
      });
    } catch (saveError) {
      console.error(
        "[RECONCILE-FAZERCARDS] Error guardando consulta:",
        order.id,
        saveError
      );
    }

    throw new Error(errorMessage);
  }
}

// ============================================================
// GET - CRON RECONCILIADOR
// ============================================================

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return jsonError("No autorizado.", 401);
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
    // --------------------------------------------------------
    // CONSULTAR TABLA CENTRAL
    // --------------------------------------------------------

    const { data: orders, error } = await supabase
      .from("topup_orders")
      .select(
        "id, game, status, supplier_order_id, supplier_response"
      )
      .in("status", [
        "PENDING",
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
      .order("updated_at", {
        ascending: true,
      })
      .limit(MAX_ORDERS_PER_RUN);

    if (error) {
      throw new Error(
        `Error consultando topup_orders: ${error.message}`
      );
    }

    const pendingOrders =
      (orders || []) as TopupOrder[];

    // --------------------------------------------------------
    // PROCESAMIENTO CONCURRENTE
    // --------------------------------------------------------

    const results: ProcessResult[] = [];

    let nextIndex = 0;

    const workers = Array.from(
      {
        length: Math.min(
          CONCURRENCY,
          pendingOrders.length
        ),
      },
      async () => {
        while (true) {
          const currentIndex = nextIndex++;

          if (currentIndex >= pendingOrders.length) {
            break;
          }

          const order = pendingOrders[currentIndex];

          try {
            const result = await processOrder(order);
            results[currentIndex] = result;
          } catch (error) {
            results[currentIndex] = {
              orderId: order.id,
              game: order.game,
              supplierOrderId:
                order.supplier_order_id || undefined,
              processed: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Error desconocido.",
            };

            console.error(
              "[RECONCILE-FAZERCARDS] Error procesando:",
              order.id,
              error
            );
          }
        }
      }
    );

    await Promise.all(workers);

    // --------------------------------------------------------
    // ESTADÍSTICAS
    // --------------------------------------------------------

    const completed = results.filter(
      (item) => item.localAction === "COMPLETED"
    ).length;

    const refunded = results.filter(
      (item) => item.localAction === "REFUNDED"
    ).length;

    const pending = results.filter(
      (item) => item.localAction === "KEEP_PENDING"
    ).length;

    const unknown = results.filter(
      (item) =>
        item.localAction === "UNKNOWN" ||
        item.reason === "missing_supplier_order_id"
    ).length;

    const failed = results.filter(
      (item) => Boolean(item.error)
    ).length;

    console.log("[RECONCILE-FAZERCARDS]", {
      scanned: pendingOrders.length,
      completed,
      refunded,
      pending,
      unknown,
      failed,
    });

    return NextResponse.json({
      ok: failed === 0,
      reconciler: "FAZERCARDS",
      table: "topup_orders",
      scope: "ALL_GAMES",
      scanned: pendingOrders.length,
      completed,
      refunded,
      pending,
      unknown,
      failed,
      limit: MAX_ORDERS_PER_RUN,
      concurrency: CONCURRENCY,
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
