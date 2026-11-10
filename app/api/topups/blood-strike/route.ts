
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { BLOOD_STRIKE } from "../../../../lib/games/blood-strike";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZERCARDS_BASE_URL = (
  process.env.FAZERCARDS_BASE_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZERCARDS_API_KEY = process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID = BLOOD_STRIKE.categoryId;
const REQUEST_TIMEOUT = 30000;
const VIP_MARKUP = 0.08;

type SupplierOrder = {
  id?: string;
  order_id?: string;
  status?: string;
  state?: string;
};

type SupplierResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  message?: string;
  order?: SupplierOrder;
  data?: SupplierOrder;
  result?: SupplierOrder;
  id?: string;
  order_id?: string;
  status?: string;
  state?: string;
};

function jsonError(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...extra,
    },
    { status }
  );
}

function jsonSuccess(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    {
      ok: true,
      ...data,
    },
    { status }
  );
}

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function getSupplierOrder(data: SupplierResponse): SupplierOrder {
  return (
    data.order ||
    data.data ||
    data.result ||
    {
      id: data.id,
      order_id: data.order_id,
      status: data.status,
      state: data.state,
    }
  );
}

function getSupplierOrderId(order: SupplierOrder) {
  return String(order.id || order.order_id || "").trim();
}

function getSupplierStatus(order: SupplierOrder) {
  return normalizeStatus(order.status || order.state);
}

function isSuccessfulStatus(status: string) {
  return [
    "SUCCESS",
    "COMPLETED",
    "COMPLETE",
    "DELIVERED",
    "DONE",
  ].includes(status);
}

function isFailedStatus(status: string) {
  return [
    "FAILED",
    "FAIL",
    "ERROR",
    "REJECTED",
    "CANCELLED",
    "CANCELED",
  ].includes(status);
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = REQUEST_TIMEOUT
) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

async function getProfileBalance(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("No se pudo consultar el saldo de la cuenta.");
  }

  const balance = Number(data.balance);

  if (!Number.isFinite(balance)) {
    throw new Error("El saldo de la cuenta no es válido.");
  }

  return balance;
}

async function reserveBalance(
  userId: string,
  amount: number,
  orderId: string
) {
  const { data, error } = await supabaseAdmin.rpc(
    "debit_store_gaming_balance",
    {
      p_user_id: userId,
      p_amount: amount,
      p_order_id: orderId,
    }
  );

  if (error) {
    throw new Error(
      error.message || "No se pudo reservar el saldo."
    );
  }

  return data;
}

async function refundOrder(orderId: string) {
  const { error } = await supabaseAdmin.rpc(
    "refund_store_gaming_order",
    {
      p_order_id: orderId,
    }
  );

  return !error;
}

async function updateOrderStatus(
  orderId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const { error } = await supabaseAdmin
    .from("store_gaming_orders")
    .update({
      status,
      ...extra,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(
      error.message || "No se pudo actualizar el pedido."
    );
  }
}

async function getOrderById(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from("store_gaming_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo consultar el pedido.");
  }

  return data;
}

async function createSupplierOrder(
  playerId: string,
  amount: number,
  orderId: string
): Promise<SupplierResponse> {
  if (!FAZERCARDS_API_KEY) {
    throw new Error("Falta configurar FAZERCARDS_API_KEY.");
  }

  const response = await fetchWithTimeout(
    `${FAZERCARDS_BASE_URL}/orders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FAZERCARDS_API_KEY}`,
      },
      body: JSON.stringify({
        category_id: CATEGORY_ID,
        player_id: playerId,
        quantity: amount,
        reference: orderId,
      }),
    }
  );

  const result = (await response.json().catch(() => ({}))) as SupplierResponse;

  if (!response.ok || result.ok === false) {
    throw new Error(
      result.error ||
        result.message ||
        "El proveedor no pudo aceptar el pedido."
    );
  }

  return result;
}

function calculatePrice(basePrice: number) {
  return Number((basePrice * (1 + VIP_MARKUP)).toFixed(2));
}

export async function POST(request: NextRequest) {
  let insertedOrderId = "";
  let reservedBalance = false;
  let supplierRequestStarted = false;

  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return jsonError(
        "Debes iniciar sesión para realizar una compra.",
        401
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonError("Los datos enviados no son válidos.");
    }

    const playerId = String(body.playerId || body.player_id || "").trim();
    const rawAmount = Number(body.amount);
    const basePrice = Number(body.price);

    if (!playerId) {
      return jsonError("Debes introducir tu ID de jugador.");
    }

    if (
      !Number.isFinite(rawAmount) ||
      rawAmount <= 0 ||
      !Number.isInteger(rawAmount)
    ) {
      return jsonError("La cantidad seleccionada no es válida.");
    }

    if (
      !Number.isFinite(basePrice) ||
      basePrice <= 0
    ) {
      return jsonError("El precio seleccionado no es válido.");
    }

    const price = calculatePrice(basePrice);

    const balance = await getProfileBalance(user.id);

    if (balance < price) {
      return jsonError(
        "No tienes saldo suficiente para realizar esta compra.",
        400,
        {
          balance,
          required: price,
        }
      );
    }

    const { data: insertedOrder, error: insertError } =
      await supabaseAdmin
        .from("store_gaming_orders")
        .insert({
          user_id: user.id,
          product_name: "Blood Strike",
          product_type: "topup",
          amount: rawAmount,
          price,
          player_id: playerId,
          status: "PROCESSING",
          provider: "FAZERCARDS",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

    if (insertError || !insertedOrder?.id) {
      return jsonError(
        "No se pudo crear el pedido. Inténtalo nuevamente.",
        500
      );
    }

    insertedOrderId = String(insertedOrder.id);

    await reserveBalance(user.id, price, insertedOrderId);
    reservedBalance = true;

    supplierRequestStarted = true;

    const supplierResult = await createSupplierOrder(
      playerId,
      rawAmount,
      insertedOrderId
    );

    const supplierOrder = getSupplierOrder(supplierResult);
    const supplierOrderId = getSupplierOrderId(supplierOrder);
    const supplierStatus = getSupplierStatus(supplierOrder);

    if (!supplierOrderId) {
      throw new Error(
        "El proveedor no devolvió un identificador de pedido."
      );
    }

    const newStatus = isSuccessfulStatus(supplierStatus)
      ? "COMPLETED"
      : isFailedStatus(supplierStatus)
        ? "FAILED"
        : "PROCESSING";

    await updateOrderStatus(insertedOrderId, newStatus, {
      provider_order_id: supplierOrderId,
      provider_status: supplierStatus,
      provider_response: supplierResult,
    });

    if (newStatus === "FAILED") {
      const refunded = await refundOrder(insertedOrderId);

      if (refunded) {
        reservedBalance = false;
        await updateOrderStatus(insertedOrderId, "REFUNDED");
      } else {
        await updateOrderStatus(insertedOrderId, "REFUND_PENDING");
      }

      return jsonError(
        "El proveedor rechazó el pedido. Se ha gestionado la devolución del saldo.",
        400,
        {
          orderId: insertedOrderId,
          providerOrderId: supplierOrderId,
        }
      );
    }

    const finalOrder = await getOrderById(insertedOrderId);

    return jsonSuccess({
      message: "Pedido enviado correctamente.",
      order: finalOrder,
      orderId: insertedOrderId,
      providerOrderId: supplierOrderId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error interno al procesar el pedido.";

    if (insertedOrderId) {
      if (supplierRequestStarted) {
        // Si la solicitud al proveedor pudo haberse iniciado,
        // no se devuelve el saldo automáticamente.
        await updateOrderStatus(
          insertedOrderId,
          "REVIEW_REQUIRED",
          {
            error_message: message,
          }
        ).catch(() => undefined);
      } else {
        // Todavía no se había iniciado la solicitud al proveedor.
        const refunded = await refundOrder(insertedOrderId);

        if (refunded) {
          reservedBalance = false;

          await updateOrderStatus(
            insertedOrderId,
            "REJECTED",
            {
              failed_at: new Date().toISOString(),
            }
          );
        } else {
          await updateOrderStatus(
            insertedOrderId,
            "REFUND_PENDING"
          );
        }
      }
    }

    return jsonError(
      "Error interno al procesar la orden. Revisa el estado antes de volver a comprar.",
      500
    );
  }
}
