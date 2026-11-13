
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const FAZERCARDS_BASE_URL = (
  process.env.FAZERCARDS_BASE_URL ||
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZERCARDS_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const FAZERCARDS_ORIGIN =
  process.env.FAZERCARDS_ORIGIN?.trim() || "";

const CATEGORY_ID = "free_fire_latam";

const REQUEST_TIMEOUT = 30000;
const VIP_MARKUP = 0.08;

type Obj = Record<string, any>;

type SupplierOrder = {
  id?: string | number;
  order_id?: string | number;
  orderId?: string | number;
  status?: string;
  state?: string;
};

type SupplierResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  message?: string;
  order?: SupplierOrder;
  data?: SupplierOrder & {
    order?: SupplierOrder;
  };
  result?: SupplierOrder;
  id?: string | number;
  order_id?: string | number;
  orderId?: string | number;
  status?: string;
  state?: string;
};

const FREE_FIRE_OFFERS = [
  {
    id: "ff-110",
    supplierOfferId: "110_diamonds",
    name: "110 Diamonds",
    price: 0.78,
    supplierPrice: 0.6871,
  },
  {
    id: "ff-341",
    supplierOfferId: "341_diamonds",
    name: "341 Diamonds",
    price: 2.2094,
    supplierPrice: 2.0594,
  },
  {
    id: "ff-572",
    supplierOfferId: "572_diamonds",
    name: "572 Diamonds",
    price: 3.6429,
    supplierPrice: 3.4929,
  },
  {
    id: "ff-1166",
    supplierOfferId: "1166_diamonds",
    name: "1166 Diamonds",
    price: 6.631,
    supplierPrice: 6.481,
  },
  {
    id: "ff-2398",
    supplierOfferId: "2398_diamonds",
    name: "2398 Diamonds",
    price: 13.011,
    supplierPrice: 12.861,
  },
  {
    id: "ff-6160",
    supplierOfferId: "6160_diamantes",
    name: "6160 Diamonds",
    price: 32.8881,
    supplierPrice: 32.7381,
  },
  {
    id: "ff-210",
    supplierOfferId: "210_diamantes",
    name: "210 Diamonds",
    price: 2.0945,
    supplierPrice: 1.9445,
  },
  {
    id: "ff-530",
    supplierOfferId: "530_diamantes",
    name: "530 Diamonds",
    price: 5.0162,
    supplierPrice: 4.8662,
  },
  {
    id: "ff-1080",
    supplierOfferId: "1080_diamantes",
    name: "1080 Diamonds",
    price: 9.8724,
    supplierPrice: 9.7224,
  },
  {
    id: "ff-2200",
    supplierOfferId: "2200_diamantes",
    name: "2200 Diamonds",
    price: 19.5948,
    supplierPrice: 19.4448,
  },
  {
    id: "ff-weekly-lite",
    supplierOfferId: "weekly_lite",
    name: "Semanal Lite",
    price: 0.6538,
    supplierPrice: 0.5038,
  },
  {
    id: "ff-weekly-membership",
    supplierOfferId: "membresía_semanal",
    name: "Membresía semanal",
    price: 2.3282,
    supplierPrice: 2.1782,
  },
  {
    id: "ff-elite-pass",
    supplierOfferId: "booyah_pass",
    name: "Booyah Pass",
    price: 4.0138,
    supplierPrice: 3.8638,
  },
  {
    id: "ff-monthly-membership",
    supplierOfferId: "membresía_mensual",
    name: "Membresía mensual",
    price: 10.632,
    supplierPrice: 10.482,
  },
  {
    id: "ff-100",
    supplierOfferId: "100_diamantes",
    name: "100 Diamonds",
    price: 1.1273,
    supplierPrice: 0.9773,
  },
] as const;

function jsonError(
  message: string,
  status = 400,
  extra: Obj = {}
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
  data: Obj,
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

function normalizeString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizePlayerId(value: unknown): string {
  return normalizeString(value).replace(/\s+/g, "");
}

function roundMoney(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function toNumber(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidIdempotencyKey(
  value: string
): boolean {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidPattern.test(value);
}

function findOffer(id: string) {
  return FREE_FIRE_OFFERS.find(
    (offer) =>
      offer.id === id ||
      offer.supplierOfferId === id
  );
}

function extractSupplierOrder(
  value: SupplierResponse | null
): SupplierOrder | null {
  if (!value) return null;

  const data = value.data;
  const result = value.result;

  if (value.order) return value.order;

  if (data?.order) return data.order;

  if (data && (
    data.id ||
    data.order_id ||
    data.orderId ||
    data.status ||
    data.state
  )) {
    return data;
  }

  if (result) return result;

  if (
    value.id ||
    value.order_id ||
    value.orderId ||
    value.status ||
    value.state
  ) {
    return value;
  }

  return null;
}

function extractSupplierOrderId(
  value: SupplierResponse | null
): string | null {
  const order = extractSupplierOrder(value);

  if (!order) return null;

  const candidates = [
    order.id,
    order.order_id,
    order.orderId,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate !== "string" &&
      typeof candidate !== "number"
    ) {
      continue;
    }

    const id = String(candidate).trim();

    if (/^ord-[A-Za-z0-9_-]+$/.test(id)) {
      return id;
    }
  }

  return null;
}

function extractSupplierStatus(
  value: SupplierResponse | null
): string {
  const order = extractSupplierOrder(value);

  return normalizeString(
    order?.status ||
    order?.state ||
    value?.status ||
    value?.state ||
    "pending"
  ).toLowerCase();
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

async function getAuthenticatedUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization") || "";

  const match = authorization.match(
    /^Bearer\s+(.+)$/i
  );

  if (!match || !match[1].trim()) {
    return {
      user: null,
      error: "Token de autenticación inválido o ausente.",
    };
  }

  const { data, error } =
    await supabaseAdmin.auth.getUser(
      match[1].trim()
    );

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
  values: Obj
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("topup_orders")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error(
      "FREE FIRE ORDER UPDATE ERROR:",
      error
    );

    return false;
  }

  return true;
}

async function reserveOrder(
  orderId: string
): Promise<boolean> {
  try {
    const { data, error } =
      await supabaseAdmin.rpc(
        "store_gaming_reserve_order_balance",
        {
          p_order_id: orderId,
        }
      );

    if (error) {
      console.error(
        "FREE FIRE RESERVE ERROR:",
        error
      );

      return false;
    }

    return data?.ok === true;
  } catch (error) {
    console.error(
      "FREE FIRE RESERVE EXCEPTION:",
      error
    );

    return false;
  }
}

async function refundOrder(
  orderId: string
): Promise<boolean> {
  try {
    const { data, error } =
      await supabaseAdmin.rpc(
        "store_gaming_refund_order_balance",
        {
          p_order_id: orderId,
        }
      );

    if (error) {
      console.error(
        "FREE FIRE REFUND ERROR:",
        error
      );

      return false;
    }

    return data?.ok === true;
  } catch (error) {
    console.error(
      "FREE FIRE REFUND EXCEPTION:",
      error
    );

    return false;
  }
}

async function completeOrder(
  orderId: string
): Promise<boolean> {
  try {
    const { data, error } =
      await supabaseAdmin.rpc(
        "store_gaming_complete_order_by_id",
        {
          p_order_id: orderId,
        }
      );

    if (error) {
      console.error(
        "FREE FIRE COMPLETE ERROR:",
        error
      );

      return false;
    }

    return data?.ok === true;
  } catch (error) {
    console.error(
      "FREE FIRE COMPLETE EXCEPTION:",
      error
    );

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
  return jsonSuccess({
    category: {
      id: CATEGORY_ID,
      name: "Free Fire LATAM",
    },

    fields: [
      {
        key: "player_id",
        label: "ID del jugador",
        type: "text",
      },
    ],

    offers: FREE_FIRE_OFFERS.map((offer) => ({
      id: offer.id,
      offer_id: offer.supplierOfferId,
      name: offer.name,
      price: offer.price,
      price_usd: offer.price.toFixed(4),
      supplier_price: offer.supplierPrice,
    })),
  });
}

export async function POST(
  request: NextRequest
) {
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

    // 2. ORIGEN DE FAZERCARDS

    let providerOrigin: string | undefined;

    if (FAZERCARDS_ORIGIN) {
      try {
        providerOrigin =
          new URL(FAZERCARDS_ORIGIN).origin;
      } catch {
        return jsonError(
          "FAZERCARDS_ORIGIN no es una URL válida.",
          500
        );
      }
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

    let body: Obj;

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no es JSON válido."
      );
    }

    const offerId = normalizeString(
      body?.offerId
    );

    const playerId = normalizePlayerId(
      body?.playerId
    );

    const idempotencyKey = normalizeString(
      request.headers.get("idempotency-key") ||
      body?.idempotencyKey
    );

    // 5. VALIDACIONES

    if (!offerId) {
      return jsonError(
        "Falta seleccionar una oferta."
      );
    }

    if (!playerId) {
      return jsonError(
        "Debe introducir el ID del jugador."
      );
    }

    if (!isValidIdempotencyKey(idempotencyKey)) {
      return jsonError(
        "Falta una clave de idempotencia UUID válida.",
        400,
        {
          code: "IDEMPOTENCY_KEY_REQUIRED",
        }
      );
    }

    const selectedOffer = findOffer(offerId);

    if (!selectedOffer) {
      return jsonError(
        "La oferta de Free Fire no existe en STORE GAMING."
      );
    }

    // 6. COMPROBAR ORDEN EXISTENTE

    const {
      data: existingOrder,
      error: existingOrderError,
    } = await getExistingOrder(idempotencyKey);

    if (existingOrderError) {
      console.error(
        "FREE FIRE EXISTING ORDER ERROR:",
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
          orderId: existingOrder.id,
          supplierOrderId:
            existingOrder.supplier_order_id || null,
          status: existingOrder.status,
          duplicate: true,
        },
        202
      );
    }

    // 7. COMPROBAR VIP

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
        "FREE FIRE VIP PROFILE ERROR:",
        profileError
      );

      return jsonError(
        "No se pudo verificar la membresía.",
        500
      );
    }

    const vipExpiration = profile?.vip_expires_at
      ? new Date(
          profile.vip_expires_at
        ).getTime()
      : 0;

    const vipActive =
      Number.isFinite(vipExpiration) &&
      vipExpiration > Date.now();

    // 8. CALCULAR PRECIO

    const supplierPrice = roundMoney(
      toNumber(selectedOffer.supplierPrice)
    );

    const retailPrice = roundMoney(
      vipActive
        ? supplierPrice + VIP_MARKUP
        : toNumber(selectedOffer.price)
    );

    if (
      supplierPrice <= 0 ||
      retailPrice <= 0 ||
      !Number.isFinite(supplierPrice) ||
      !Number.isFinite(retailPrice)
    ) {
      return jsonError(
        "El precio de la oferta no es válido.",
        500
      );
    }

    // 9. CREAR ORDEN EN TABLA UNIVERSAL

    const username =
      user.user_metadata?.username ||
      user.user_metadata?.name ||
      null;

    const email = user.email || null;

    const supplierFields = {
      player_id: playerId,
      supplier_offer_id:
        selectedOffer.supplierOfferId,
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
        game: "Free Fire LATAM",
        category_id: CATEGORY_ID,
        offer_id: selectedOffer.id,
        offer_name: selectedOffer.name,
        player_id: playerId,
        retail_price: retailPrice,
        supplier_price: supplierPrice,
        currency: "USD",
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
        "FREE FIRE INSERT ORDER ERROR:",
        insertOrderError
      );

      return jsonError(
        "No se pudo crear la orden.",
        500
      );
    }

    insertedOrderId = insertedOrder.id;

    // 10. RESERVA UNIVERSAL DE SALDO

    reservedBalance = await reserveOrder(
      insertedOrderId
    );

    if (!reservedBalance) {
      await updateOrder(insertedOrderId, {
        status: "REJECTED",
        failed_at: new Date().toISOString(),
        supplier_response: {
          error:
            "No se pudo confirmar la reserva de saldo.",
        },
      });

      return jsonError(
        "No se pudo reservar el saldo. Comprueba tu balance.",
        400
      );
    }

    // 11. PREPARAR PEDIDO FAZERCARDS

    const supplierUrl =
      `${FAZERCARDS_BASE_URL}/topups/order`;

    const supplierBody = {
      category_id: CATEGORY_ID,
      offer_id: selectedOffer.supplierOfferId,
      fields: {
        player_id: playerId,
      },
    };

    const supplierHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": FAZERCARDS_API_KEY,
      "Idempotency-Key": idempotencyKey,
    };

    if (providerOrigin) {
      supplierHeaders.Origin = providerOrigin;
    }

    console.log(
      "FREE FIRE → FAZERCARDS:",
      {
        category_id: CATEGORY_ID,
        offer_id: selectedOffer.supplierOfferId,
        order_id: insertedOrderId,
        origin: providerOrigin || "no configurado",
      }
    );

    // 12. ENVIAR PEDIDO

    supplierRequestStarted = true;

    let supplierResponse: Response;
    let supplierData: SupplierResponse | null = null;

    try {
      supplierResponse = await fetchWithTimeout(
        supplierUrl,
        {
          method: "POST",
          headers: supplierHeaders,
          body: JSON.stringify(supplierBody),
        }
      );

      const supplierText =
        await supplierResponse.text();

      console.log(
        "FAZERCARDS FREE FIRE RESPONSE:",
        {
          httpStatus: supplierResponse.status,
          body: supplierText,
        }
      );

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
        "FAZERCARDS FREE FIRE REQUEST ERROR:",
        error
      );

      await updateOrder(insertedOrderId, {
        status: "SUPPLIER_PENDING",
        supplier_response: {
          error:
            "No se pudo confirmar la respuesta de FazerCards.",
          requires_reconciliation: true,
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

    // 13. INTERPRETAR RESPUESTA

    const supplierOrderId =
      extractSupplierOrderId(supplierData);

    const supplierStatus =
      extractSupplierStatus(supplierData);

    const completedStatuses = [
      "completed",
      "complete",
      "success",
      "successful",
      "succeeded",
      "delivered",
      "done",
    ];

    const failedStatuses = [
      "failed",
      "failure",
      "rejected",
      "declined",
      "denied",
      "cancelled",
      "canceled",
      "error",
      "refund",
      "refunded",
    ];

    const isCompleted =
      completedStatuses.includes(supplierStatus);

    const isFailed =
      failedStatuses.includes(supplierStatus);

    const httpStatus = supplierResponse.status;

    // 14. GUARDAR ID Y RESPUESTA DEL PROVEEDOR

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
            "FazerCards respondió, pero no se pudo guardar la respuesta. La orden requiere reconciliación.",
          orderId: insertedOrderId,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
        },
        202
      );
    }

    // 15. RECHAZO DEFINITIVO CONFIRMADO

    const definitiveHttpRejection =
      httpStatus >= 400 &&
      httpStatus < 500 &&
      ![408, 409, 425, 429].includes(httpStatus);

    const explicitSupplierRejection =
      supplierData?.ok === false &&
      definitiveHttpRejection;

    if (explicitSupplierRejection) {
      const refunded = await refundOrder(
        insertedOrderId
      );

      if (refunded) {
        reservedBalance = false;

        await updateOrder(insertedOrderId, {
          status: "REFUNDED",
          failed_at: new Date().toISOString(),
        });

        return jsonError(
          supplierData?.error ||
            supplierData?.message ||
            "FazerCards rechazó la orden. Se procesó el reembolso.",
          502,
          {
            orderId: insertedOrderId,
            status: "REFUNDED",
          }
        );
      }

      await updateOrder(insertedOrderId, {
        status: "REFUND_PENDING",
      });

      return jsonSuccess(
        {
          message:
            "FazerCards rechazó la orden, pero el reembolso necesita revisión.",
          orderId: insertedOrderId,
          status: "REFUND_PENDING",
        },
        202
      );
    }

    // 16. RESPUESTA HTTP AMBIGUA

    if (
      !supplierResponse.ok ||
      supplierData?.ok === false
    ) {
      await updateOrder(insertedOrderId, {
        status: "SUPPLIER_PENDING",
      });

      return jsonSuccess(
        {
          message:
            "No se pudo confirmar el resultado del proveedor. La orden quedó pendiente de reconciliación.",
          orderId: insertedOrderId,
          supplierOrderId,
          supplierHttpStatus: httpStatus,
          status: "SUPPLIER_PENDING",
        },
        202
      );
    }

    // 17. PEDIDO COMPLETADO

    if (isCompleted) {
      if (!supplierOrderId) {
        await updateOrder(insertedOrderId, {
          status: "SUPPLIER_PENDING",
        });

        return jsonSuccess(
          {
            message:
              "FazerCards informó una finalización, pero falta un identificador válido.",
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
              "FazerCards informó que terminó el pedido, pero falta confirmar la finalización interna.",
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

      if (
        completedOrderError ||
        !completedOrder
      ) {
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
          "Orden de Free Fire completada correctamente.",
        order: {
          ...completedOrder,
          order_number: completedOrder.id,
        },
        supplierOrderId,
        supplier: supplierData,
      });
    }

    // 18. PEDIDO FALLIDO

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

    // 19. PEDIDO PENDIENTE O EN PROCESO

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
    console.error(
      "FREE FIRE TOPUP ERROR:",
      error
    );

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
