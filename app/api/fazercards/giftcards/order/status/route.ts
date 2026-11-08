
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const FAZER_ORIGIN =
  process.env.FAZERCARDS_ORIGIN || "";

const admin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : null;

type JsonObject = Record<string, unknown>;

const FINAL_STATUSES = [
  "COMPLETED",
  "REFUNDED",
];

const ACTIVE_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SUPPLIER_PENDING",
  "RESERVED",
  "CONFIRMED",
];

function fail(error: string, status: number) {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

function isObject(value: unknown): value is JsonObject {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function extractOrder(payload: unknown): JsonObject {
  if (!isObject(payload)) return {};

  if (isObject(payload.order)) {
    return payload.order;
  }

  if (isObject(payload.data)) {
    const data = payload.data;

    if (isObject(data.order)) {
      return data.order;
    }

    return data;
  }

  return payload;
}

function extractStatus(payload: unknown): string {
  const order = extractOrder(payload);

  return String(
    order.status ??
    order.state ??
    ""
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function extractCodes(payload: unknown): JsonObject[] {
  const order = extractOrder(payload);

  const candidates = [
    order.cards,
    order.gift_codes,
    order.codes,
    order.items,
  ];

  const items = candidates.find(
    (value) => Array.isArray(value)
  );

  if (!Array.isArray(items)) return [];

  const result: JsonObject[] = [];

  for (const item of items) {
    if (typeof item === "string") {
      const code = item.trim();

      if (code) result.push({ code });

      continue;
    }

    if (!isObject(item)) continue;

    const rawCode =
      item.code ??
      item.card_code ??
      item.gift_code ??
      item.pin ??
      item.serial ??
      item.key;

    if (
      typeof rawCode === "string" &&
      rawCode.trim()
    ) {
      result.push({
        ...item,
        code: rawCode.trim(),
      });
    }
  }

  return result;
}

function extractSupplierOrderId(
  payload: unknown
): string | null {
  const order = extractOrder(payload);

  const value =
    order.order_id ??
    order.id ??
    order.reference ??
    order.reference_id;

  if (value === undefined || value === null) {
    return null;
  }

  return String(value);
}

function isCompletedStatus(status: string): boolean {
  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "finished",
  ].includes(status);
}

function isFailedStatus(status: string): boolean {
  return [
    "failed",
    "failure",
    "rejected",
    "cancelled",
    "canceled",
    "declined",
  ].includes(status);
}

function safeOrder(order: JsonObject) {
  // Nunca devolver supplier_response al cliente:
  // puede contener información interna del proveedor.
  return order;
}

async function supplierGet(orderId: string) {
  const headers = new Headers({
    Accept: "application/json",
    "X-API-Key": FAZER_API_KEY,
  });

  if (FAZER_ORIGIN) {
    headers.set("Origin", FAZER_ORIGIN);
  }

  return fetch(
    `${FAZER_API_BASE}/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    }
  );
}

async function getCurrentOrder(
  orderId: string,
  userId: string
) {
  if (!admin) return null;

  const { data, error } = await admin
    .from("gift_card_orders")
    .select(`
      id,
      user_id,
      game,
      offer_name,
      quantity,
      retail_price,
      status,
      supplier_order_id,
      gift_codes,
      created_at,
      completed_at,
      refunded_at,
      failed_at,
      updated_at
    `)
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Error leyendo orden actual:",
      error.message
    );

    return null;
  }

  return data as JsonObject | null;
}

export async function GET(request: NextRequest) {
  if (!admin) {
    return fail(
      "La configuración de Supabase está incompleta.",
      500
    );
  }

  if (!FAZER_API_KEY) {
    return fail(
      "Falta configurar FAZERCARDS_API_KEY.",
      500
    );
  }

  const authorization =
    request.headers.get("authorization") || "";

  const match = authorization.match(
    /^Bearer\s+(.+)$/i
  );

  if (!match) {
    return fail(
      "Debes iniciar sesión para consultar tus órdenes.",
      401
    );
  }

  const {
    data: authData,
    error: authError,
  } = await admin.auth.getUser(match[1].trim());

  if (authError || !authData.user) {
    return fail("Tu sesión no es válida.", 401);
  }

  const userId = authData.user.id;

  const orderId = request.nextUrl.searchParams
    .get("id")
    ?.trim();

  if (!orderId) {
    return fail(
      "Falta el identificador de la orden.",
      400
    );
  }

  const { data: initialOrder, error: orderError } =
    await admin
      .from("gift_card_orders")
      .select(`
        id,
        user_id,
        game,
        offer_name,
        quantity,
        retail_price,
        status,
        supplier_order_id,
        gift_codes,
        created_at,
        completed_at,
        refunded_at,
        failed_at,
        updated_at
      `)
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();

  if (orderError) {
    console.error(
      "Error consultando orden:",
      orderError.message
    );

    return fail(
      "No pudimos consultar tu pedido.",
      500
    );
  }

  if (!initialOrder) {
    return fail(
      "No encontramos esa orden en tu cuenta.",
      404
    );
  }

  const currentStatus = String(
    initialOrder.status || ""
  ).toUpperCase();

  // Una orden final no necesita volver a consultar al proveedor.
  if (FINAL_STATUSES.includes(currentStatus)) {
    return NextResponse.json({
      success: true,
      refreshed: false,
      order: safeOrder(initialOrder as JsonObject),
    });
  }

  // No consultar si la compra todavía no tiene ID del proveedor.
  if (!initialOrder.supplier_order_id) {
    return NextResponse.json({
      success: true,
      refreshed: false,
      order: initialOrder,
      message:
        "La compra aún no tiene referencia del proveedor. Requiere verificación.",
    });
  }

  let response: Response;

  try {
    response = await supplierGet(
      String(initialOrder.supplier_order_id)
    );
  } catch (error) {
    console.error(
      "Error de conexión con FazerCards:",
      error
    );

    return NextResponse.json({
      success: true,
      refreshed: false,
      order: initialOrder,
      message:
        "No se pudo consultar al proveedor. La orden conserva su estado.",
    });
  }

  if (!response.ok) {
    console.error(
      "FazerCards devolvió HTTP:",
      response.status
    );

    return NextResponse.json({
      success: true,
      refreshed: false,
      order: initialOrder,
      message:
        "El proveedor no confirmó el estado. No se realizó ningún reembolso.",
    });
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return NextResponse.json({
      success: true,
      refreshed: false,
      order: initialOrder,
      message:
        "La respuesta del proveedor no es JSON válido.",
    });
  }

  const supplierStatus = extractStatus(payload);
  const codes = extractCodes(payload);

  const supplierOrderId =
    extractSupplierOrderId(payload) ||
    String(initialOrder.supplier_order_id);

  const now = new Date().toISOString();

  /*
   * Los códigos son la prueba de entrega más útil que
   * reconoce esta integración. Solo guardar códigos si
   * existen en la respuesta del proveedor.
   */
  if (codes.length > 0) {
    const { data: updated, error: updateError } =
      await admin
        .from("gift_card_orders")
        .update({
          status: "COMPLETED",
          supplier_order_id: supplierOrderId,
          supplier_response: payload,
          gift_codes: codes,
          completed_at: now,
          updated_at: now,
        })
        .eq("id", initialOrder.id)
        .eq("user_id", userId)
        .in("status", ACTIVE_STATUSES)
        .select(`
          id,
          user_id,
          game,
          offer_name,
          quantity,
          retail_price,
          status,
          supplier_order_id,
          gift_codes,
          created_at,
          completed_at,
          refunded_at,
          failed_at,
          updated_at
        `)
        .maybeSingle();

    if (updateError) {
      console.error(
        "Error guardando códigos:",
        updateError.message
      );

      return fail(
        "No pudimos guardar los códigos. Contacta con soporte antes de volver a comprar.",
        500
      );
    }

    // Si otra operación cambió el estado, no sobrescribirla.
    const latest =
      updated ||
      await getCurrentOrder(
        initialOrder.id,
        userId
      );

    return NextResponse.json({
      success: true,
      refreshed: Boolean(updated),
      order: latest,
      message: updated
        ? "Los códigos se guardaron correctamente."
        : "La orden cambió durante la consulta. Se conserva su estado actual.",
    });
  }

  /*
   * COMPLETED sin códigos no equivale a entrega de códigos.
   * Se conserva el estado para evitar una falsa entrega.
   */
  if (isCompletedStatus(supplierStatus)) {
    return NextResponse.json({
      success: true,
      refreshed: false,
      order: initialOrder,
      message:
        "El proveedor indica que terminó el pedido, pero no devolvió códigos reconocibles. Se requiere verificar el formato de respuesta.",
    });
  }

  /*
   * No reembolsar automáticamente desde esta ruta:
   * un estado fallido o una respuesta inesperada debe
   * verificarse antes de devolver el saldo al cliente.
   */
  if (isFailedStatus(supplierStatus)) {
    const { data: updated, error: updateError } =
      await admin
        .from("gift_card_orders")
        .update({
          status: "FAILED",
          supplier_order_id: supplierOrderId,
          supplier_response: payload,
          failed_at: now,
          updated_at: now,
        })
        .eq("id", initialOrder.id)
        .eq("user_id", userId)
        .in("status", ACTIVE_STATUSES)
        .select(`
          id,
          user_id,
          game,
          offer_name,
          quantity,
          retail_price,
          status,
          supplier_order_id,
          gift_codes,
          created_at,
          completed_at,
          refunded_at,
          failed_at,
          updated_at
        `)
        .maybeSingle();

    if (updateError) {
      console.error(
        "Error actualizando orden fallida:",
        updateError.message
      );

      return fail(
        "No pudimos actualizar el estado del pedido.",
        500
      );
    }

    const latest =
      updated ||
      await getCurrentOrder(
        initialOrder.id,
        userId
      );

    return NextResponse.json({
      success: true,
      refreshed: Boolean(updated),
      order: latest,
      message:
        "El proveedor informa un fallo. El reembolso requiere verificación antes de ejecutarse.",
    });
  }

  // Estados pendientes, processing o desconocidos:
  // no repetir la compra y no realizar reembolsos.
  const { data: updated, error: updateError } =
    await admin
      .from("gift_card_orders")
      .update({
        status: "PROCESSING",
        supplier_order_id: supplierOrderId,
        supplier_response: payload,
        updated_at: now,
      })
      .eq("id", initialOrder.id)
      .eq("user_id", userId)
      .in("status", ACTIVE_STATUSES)
      .select(`
        id,
        user_id,
        game,
        offer_name,
        quantity,
        retail_price,
        status,
        supplier_order_id,
        gift_codes,
        created_at,
        completed_at,
        refunded_at,
        failed_at,
        updated_at
      `)
      .maybeSingle();

  if (updateError) {
    console.error(
      "Error actualizando orden:",
      updateError.message
    );

    return fail(
      "No pudimos actualizar el pedido.",
      500
    );
  }

  const latest =
    updated ||
    await getCurrentOrder(
      initialOrder.id,
      userId
    );

  return NextResponse.json({
    success: true,
    refreshed: Boolean(updated),
    order: latest,
    message:
      "El pedido sigue pendiente de confirmación del proveedor.",
  });
}
