
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { BLOOD_STRIKE } from "../../../../lib/games/blood-strike";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const FAZERCARDS_BASE_URL = (
  process.env.FAZERCARDS_BASE_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZERCARDS_API_KEY = process.env.FAZERCARDS_API_KEY || "";
const FAZERCARDS_ORIGIN =
  process.env.FAZERCARDS_ORIGIN?.trim() || "";

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
    { ok: false, error: message, ...extra },
    { status }
  );
}

function jsonSuccess(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    { ok: true, ...data },
    { status }
  );
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePlayerId(value: unknown): string {
  return normalizeString(value).replace(/\s+/g, "");
}

function roundMoney(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function toNumber(value: unknown): number {
  const parsed =
    typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidPlayerId(value: string): boolean {
  return /^[A-Za-z0-9_-]{4,32}$/.test(value);
}

function isValidIdempotencyKey(value: string): boolean {
  return value.length >= 8 && value.length <= 200;
}

function extractSupplierOrder(
  data: SupplierResponse | null
): SupplierOrder | null {
  if (!data) return null;

  if (data.order) return data.order;
  if (data.data) return data.data;
  if (data.result) return data.result;

  if (data.id || data.order_id || data.status || data.state) {
    return {
      id: data.id,
      order_id: data.order_id,
      status: data.status,
      state: data.state,
    };
  }

  return null;
}

function extractSupplierOrderId(
  data: SupplierResponse | null
): string | null {
  const order = extractSupplierOrder(data);

  if (!order) return null;

  return (
    normalizeString(order.id) ||
    normalizeString(order.order_id) ||
    null
  );
}

function extractSupplierStatus(
  data: SupplierResponse | null
): string {
  const order = extractSupplierOrder(data);

  return (
    order?.status ||
    order?.state ||
    data?.status ||
    data?.state ||
    "pending"
  );
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT
) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeout
  );

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
  const authorization =
    request.headers.get("authorization") || "";

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match || !match[1].trim()) {
    return {
      user: null,
      error: "Token de autenticación inválido o ausente.",
    };
  }

  const { data, error } =
    await supabaseAdmin.auth.getUser(match[1].trim());

  if (error || !data.user) {
    return {
      user: null,
      error: "No se pudo verificar el usuario.",
    };
  }

  return {
    user: data.user,
    error: null,
  };
}

async function updateOrder(
  orderId: string,
  values: Record<string, unknown>
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("topup_orders")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error("BLOOD STRIKE ORDER UPDATE ERROR:", error);
    return false;
  }

  return true;
}

async function reserveOrder(
  orderId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "store_gaming_reserve_order_balance",
      {
        p_order_id: orderId,
      }
    );

    if (error) {
      console.error("BLOOD STRIKE RESERVE ERROR:", error);
      return false;
    }

    return data?.ok === true;
  } catch (error) {
    console.error("BLOOD STRIKE RESERVE EXCEPTION:", error);
    return false;
  }
}

async function refundOrder(
  orderId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "store_gaming_refund_order_balance",
      {
        p_order_id: orderId,
      }
    );

    if (error) {
      console.error("BLOOD STRIKE REFUND ERROR:", error);
      return false;
    }

    return data?.ok === true;
  } catch (error) {
    console.error("BLOOD STRIKE REFUND EXCEPTION:", error);
    return false;
  }
}

async function completeOrder(
  orderId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "store_gaming_complete_order_by_id",
      {
        p_order_id: orderId,
      }
    );

    if (error) {
      console.error("BLOOD STRIKE COMPLETE ERROR:", error);
      return false;
    }

    return data?.ok === true;
  } catch (error) {
    console.error("BLOOD STRIKE COMPLETE EXCEPTION:", error);
    return false;
  }
}

async function getExistingOrder(
  idempotencyKey: string
) {
  return await supabaseAdmin
    .from("topup_orders")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
}

export async function GET() {
  try {
    return jsonSuccess({
      category: {
        id: BLOOD_STRIKE.categoryId,
        name: BLOOD_STRIKE.name,
        note: BLOOD_STRIKE.note,
      },

      fields: [
        {
          key: BLOOD_STRIKE.playerField.name,
          label: BLOOD_STRIKE.playerField.label,
          type: BLOOD_STRIKE.playerField.type,
        },
      ],

      offers: BLOOD_STRIKE.offers.map((offer) => ({
        id: offer.id,
        offer_id: offer.supplierOfferId,
        name: offer.name,
        displayName: offer.displayName,
        price: offer.price,
        price_usd: offer.price.toFixed(2),
        supplier_price: offer.supplierPrice,
      })),
    });
  } catch (error) {
    console.error("BLOOD STRIKE GET ERROR:", error);

    return jsonError(
      "Error obteniendo el catálogo.",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  let insertedOrderId: string | null = null;
  let reservedBalance = false;
  let supplierRequestStarted = false;

  try {
    // 1. CONFIGURACIÓN

    if (!FAZERCARDS_API_KEY) {
      return jsonError(
        "FAZERCARDS_API_KEY no está configurada.",
        500
      );
    }

    // 2. VALIDAR ORIGEN DE FAZERCARDS

    let providerOrigin: string | undefined;

    if (FAZERCARDS_ORIGIN) {
      try {
        providerOrigin = new URL(FAZERCARDS_ORIGIN).origin;
      } catch {
        return jsonError(
          "FAZERCARDS_ORIGIN no es una URL válida.",
          500
        );
      }
    } else {
      return jsonError(
        "FAZERCARDS_ORIGIN no está configurada en Vercel.",
        500
      );
    }

    // 3. AUTENTICACIÓN

    const {
      user,
      error: authError,
    } = await getAuthenticatedUser(request);

    if (!user) {
      return jsonError(
        authError || "No autorizado.",
        401
      );
    }

    // 4. BODY

    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no es JSON válido."
      );
    }

    const offerId = normalizeString(body?.offerId);
    const playerId = normalizePlayerId(body?.playerId);
    const idempotencyKey = normalizeString(
      body?.idempotencyKey
    );

    // 5. VALIDAR OFERTA

    if (!offerId) {
      return jsonError("Falta offerId.");
    }

    const selectedOffer = BLOOD_STRIKE.offers.find(
      (offer) => offer.id === offerId
    );

    if (!selectedOffer) {
      return jsonError(
        "La oferta seleccionada no existe."
      );
    }

    // 6. VALIDAR PLAYER ID

    if (!playerId || !isValidPlayerId(playerId)) {
      return jsonError(
        "El Player ID debe tener entre 4 y 32 caracteres y solo puede contener letras, números, guion o guion bajo."
      );
    }

    // 7. VALIDAR IDEMPOTENCIA

    if (!isValidIdempotencyKey(idempotencyKey)) {
      return jsonError("idempotencyKey inválida.");
    }

    // 8. COMPROBAR CLAVE GLOBALMENTE

    const {
      data: existingOrder,
      error: existingOrderError,
    } = await getExistingOrder(idempotencyKey);

    if (existingOrderError) {
      console.error(
        "BLOOD STRIKE EXISTING ORDER ERROR:",
        existingOrderError
      );

      return jsonError(
        "No se pudo comprobar la orden.",
        500
      );
    }

    if (existingOrder) {
      if (existingOrder.user_id !== user.id) {
        return jsonError(
          "La clave de idempotencia ya pertenece a otra orden.",
          409
        );
      }

      if (
        existingOrder.offer_id !== selectedOffer.id ||
        String(existingOrder.player_id) !== playerId
      ) {
        return jsonError(
          "La clave ya fue utilizada con otros datos.",
          409
        );
      }

      return jsonSuccess(
        {
          message: "La orden ya había sido creada.",
          order: {
            ...existingOrder,
            order_number: existingOrder.id,
          },
          supplierOrderId:
            existingOrder.supplier_order_id || null,
          status: existingOrder.status,
          duplicate: true,
        },
        202
      );
    }

    // 9. COMPROBAR VIP

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("vip_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "BLOOD STRIKE VIP PROFILE ERROR:",
        profileError
      );

      return jsonError(
        "No se pudo verificar la membresía.",
        500
      );
    }

    const vipExpiration = profile?.vip_expires_at
      ? new Date(profile.vip_expires_at).getTime()
      : 0;

    const vipActive =
      Number.isFinite(vipExpiration) &&
      vipExpiration > Date.now();

    // 10. CALCULAR PRECIO

    const supplierPrice = roundMoney(
      toNumber(selectedOffer.supplierPrice)
    );

    const retailPrice = roundMoney(
      vipActive
        ? supplierPrice + VIP_MARKUP
        : toNumber(selectedOffer.price)
    );

    if (
      retailPrice <= 0 ||
      supplierPrice <= 0 ||
      !Number.isFinite(retailPrice) ||
      !Number.isFinite(supplierPrice)
    ) {
      return jsonError(
        "El precio de la oferta no es válido.",
        500
      );
    }

    // 11. CREAR ORDEN LOCAL

    const username =
      user.user_metadata?.username ||
      user.user_metadata?.name ||
      null;

    const email = user.email || null;

    const supplierFields = {
      player_id: playerId,
      vip_active: vipActive,
    };

    const {
      data: insertedOrder,
      error: insertOrderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .insert({
        user_id: user.id,
        username,
        email,
        game: BLOOD_STRIKE.name,
        category_id: CATEGORY_ID,
        offer_id: selectedOffer.id,
        offer_name: selectedOffer.name,
        player_id: playerId,
        retail_price: retailPrice,
        supplier_price: supplierPrice,
        currency: "USDT",
        status: "RESERVED",
        idempotency_key: idempotencyKey,
        supplier_fields: supplierFields,
        supplier_order_id: null,
        supplier_response: null,
      })
      .select("*")
      .single();

    if (insertOrderError || !insertedOrder) {
      console.error(
        "BLOOD STRIKE INSERT ORDER ERROR:",
        insertOrderError
      );

      return jsonError(
        "No se pudo crear la orden.",
        500
      );
    }

    insertedOrderId = insertedOrder.id;

    // 12. RESERVA UNIVERSAL

    reservedBalance = await reserveOrder(
      insertedOrderId
    );

    if (!reservedBalance) {
      await updateOrder(insertedOrderId, {
        status: "REJECTED",
        failed_at: new Date().toISOString(),
        supplier_response: {
          error: "No se pudo confirmar la reserva de saldo.",
        },
      });

      return jsonError(
        "No se pudo reservar el saldo. Comprueba tu balance.",
        400
      );
    }

    // 13. ENVIAR A FAZERCARDS

    const supplierUrl =
      `${FAZERCARDS_BASE_URL}/topups/order`;

    const supplierBody = {
      category_id: CATEGORY_ID,
      offer_id: selectedOffer.supplierOfferId,
      fields: {
        player_id: playerId,
      },
    };

    console.log("BLOOD STRIKE → FAZERCARDS:", {
      category_id: CATEGORY_ID,
      offer_id: selectedOffer.supplierOfferId,
      order_id: insertedOrderId,
      origin: providerOrigin,
    });

    supplierRequestStarted = true;

    let supplierResponse: Response;
    let supplierData: SupplierResponse | null = null;

    try {
      const supplierHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Key": FAZERCARDS_API_KEY,
        "Idempotency-Key": idempotencyKey,
      };

      if (providerOrigin) {
        supplierHeaders.Origin = providerOrigin;
      }

      supplierResponse = await fetchWithTimeout(
        supplierUrl,
        {
          method: "POST",
          headers: supplierHeaders,
          body: JSON.stringify(supplierBody),
        }
      );

      const supplierText = await supplierResponse.text();

      console.log("FAZERCARDS BLOOD STRIKE RESPONSE:", {
        httpStatus: supplierResponse.status,
        body: supplierText,
      });

      try {
        supplierData = supplierText
          ? JSON.parse(supplierText)
          : null;
      } catch {
        supplierData = {
          message: "Respuesta no JSON del proveedor.",
        };
      }
    } catch (error) {
      console.error(
        "FAZERCARDS BLOOD STRIKE REQUEST ERROR:",
        error
      );

      await updateOrder(insertedOrderId, {
        status: "SUPPLIER_PENDING",
        supplier_response: {
          error:
            "No se pudo confirmar la respuesta de FazerCards.",
        },
      });

      return jsonSuccess(
        {
          message:
            "La orden quedó pendiente de confirmación del proveedor.",
          orderId: insertedOrderId,
          status: "SUPPLIER_PENDING",
        },
        202
      );
    }

    // 14. EXTRAER RESPUESTA

    const supplierOrderId =
      extractSupplierOrderId(supplierData);

    const supplierStatus =
      extractSupplierStatus(supplierData);

    const normalizedStatus =
      supplierStatus.toLowerCase().trim();

    const completedStatuses = [
      "completed",
      "complete",
      "success",
      "successful",
      "delivered",
      "done",
    ];

    const failedStatuses = [
      "failed",
      "failure",
      "rejected",
      "cancelled",
      "canceled",
      "error",
    ];

    const isCompleted =
      completedStatuses.includes(normalizedStatus);

    const isFailed =
      failedStatuses.includes(normalizedStatus);

    // 15. DETECTAR RECHAZO DEFINITIVO

    const httpStatus = supplierResponse.status;

    const definitiveHttpRejection =
      httpStatus >= 400 &&
      httpStatus < 500 &&
      ![408, 409, 429].includes(httpStatus);

    const explicitSupplierRejection =
      supplierData?.ok === false &&
      (
        definitiveHttpRejection ||
        supplierData.code === "cors_origin_not_allowed"
      );

    // 16. GUARDAR RESPUESTA E ID ANTES DE CUALQUIER RPC

    const savedSupplierData = await updateOrder(
      insertedOrderId,
      {
        supplier_order_id: supplierOrderId,
        supplier_response: supplierData,
      }
    );

    if (!savedSupplierData) {
      return jsonSuccess(
        {
          message:
            "FazerCards respondió, pero no se pudo guardar la respuesta. La orden necesita reconciliación.",
          orderId: insertedOrderId,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
        },
        202
      );
    }

    // 17. RECHAZO CONFIRMADO

    if (explicitSupplierRejection) {
      const refunded = await refundOrder(
        insertedOrderId
      );

      if (refunded) {
        reservedBalance = false;

        await updateOrder(insertedOrderId, {
          status: "REJECTED",
          failed_at: new Date().toISOString(),
        });

        return jsonError(
          supplierData?.error ||
            supplierData?.message ||
            "FazerCards rechazó la orden. Se procesó el reembolso.",
          502,
          {
            orderId: insertedOrderId,
            supplierStatus: httpStatus,
          }
        );
      }

      await updateOrder(insertedOrderId, {
        status: "REFUND_PENDING",
      });

      return jsonSuccess(
        {
          message:
            "El proveedor rechazó la orden, pero el reembolso necesita revisión.",
          orderId: insertedOrderId,
          status: "REFUND_PENDING",
        },
        202
      );
    }

    // 18. RESPUESTA AMBIGUA O ERROR HTTP NO DEFINITIVO

    if (!supplierResponse.ok || supplierData?.ok === false) {
      await updateOrder(insertedOrderId, {
        status: "SUPPLIER_PENDING",
      });

      return jsonSuccess(
        {
          message:
            "No se pudo confirmar el resultado del proveedor. La orden quedó pendiente y no se reembolsó automáticamente.",
          orderId: insertedOrderId,
          supplierOrderId,
          supplierStatus: httpStatus,
          status: "SUPPLIER_PENDING",
        },
        202
      );
    }

    // 19. COMPLETADA

    if (isCompleted) {
      if (!supplierOrderId) {
        await updateOrder(insertedOrderId, {
          status: "SUPPLIER_PENDING",
        });

        return jsonSuccess(
          {
            message:
              "FazerCards informó una posible finalización, pero falta el identificador del proveedor.",
            orderId: insertedOrderId,
            status: "SUPPLIER_PENDING",
          },
          202
        );
      }

      const completed = await completeOrder(
        insertedOrderId
      );

      if (!completed) {
        await updateOrder(insertedOrderId, {
          status: "SUPPLIER_PENDING",
        });

        return jsonSuccess(
          {
            message:
              "FazerCards informó que el pedido terminó, pero falta confirmar la finalización interna.",
            orderId: insertedOrderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
          },
          202
        );
      }

      reservedBalance = false;

      const {
        data: completedOrder,
        error: completedOrderError,
      } = await supabaseAdmin
        .from("topup_orders")
        .select("*")
        .eq("id", insertedOrderId)
        .single();

      if (completedOrderError || !completedOrder) {
        return jsonSuccess(
          {
            message:
              "El pedido fue completado internamente, pero no se pudo recuperar el registro.",
            orderId: insertedOrderId,
            supplierOrderId,
            status: "COMPLETED",
          },
          202
        );
      }

      return jsonSuccess({
        message:
          "Orden de Blood Strike completada correctamente.",
        order: {
          ...completedOrder,
          order_number: completedOrder.id,
        },
        supplierOrderId,
        supplier: supplierData,
      });
    }

    // 20. FALLIDA SEGÚN ESTADO DEL PROVEEDOR

    if (isFailed) {
      const refunded = await refundOrder(
        insertedOrderId
      );

      if (!refunded) {
        await updateOrder(insertedOrderId, {
          status: "REFUND_PENDING",
        });

        return jsonSuccess(
          {
            message:
              "El proveedor informó que la orden falló, pero el reembolso necesita revisión.",
            orderId: insertedOrderId,
            supplierOrderId,
            status: "REFUND_PENDING",
          },
          202
        );
      }

      reservedBalance = false;

      await updateOrder(insertedOrderId, {
        status: "REFUNDED",
        failed_at: new Date().toISOString(),
      });

      return jsonSuccess({
        message:
          "El proveedor informó que la orden falló. El saldo fue devuelto.",
        orderId: insertedOrderId,
        supplierOrderId,
        status: "REFUNDED",
      });
    }

    // 21. PENDIENTE

    await updateOrder(insertedOrderId, {
      status: "SUPPLIER_PENDING",
    });

    return jsonSuccess(
      {
        message:
          "La orden fue enviada a FazerCards y quedó pendiente de procesamiento.",
        orderId: insertedOrderId,
        supplierOrderId,
        status: "SUPPLIER_PENDING",
        supplier: supplierData,
      },
      202
    );

  } catch (error) {
    console.error("BLOOD STRIKE TOPUP ERROR:", error);

    if (insertedOrderId && reservedBalance) {
      if (!supplierRequestStarted) {
        const refunded = await refundOrder(
          insertedOrderId
        );

        if (refunded) {
          reservedBalance = false;

          await updateOrder(insertedOrderId, {
            status: "REFUNDED",
            failed_at: new Date().toISOString(),
          });
        } else {
          await updateOrder(insertedOrderId, {
            status: "REFUND_PENDING",
          });
        }
      } else {
        await updateOrder(insertedOrderId, {
          status: "SUPPLIER_PENDING",
          supplier_response: {
            error:
              "Error interno después de iniciar la solicitud. Requiere reconciliación.",
          },
        });
      }
    }

    return jsonError(
      "Error interno al procesar la orden. Comprueba su estado antes de volver a intentarlo.",
      500
    );
  }
}
