
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

  return order.id || order.order_id || null;
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

  const timer = setTimeout(() => controller.abort(), timeout);

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

async function refundOrder(orderId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.rpc(
      "store_gaming_refund_balance",
      {
        p_order_id: orderId,
      }
    );

    if (error) {
      console.error("BLOOD STRIKE REFUND ERROR:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("BLOOD STRIKE REFUND EXCEPTION:", error);
    return false;
  }
}

async function updateOrderStatus(
  orderId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const { error } = await supabaseAdmin
    .from("topup_orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    })
    .eq("id", orderId);

  if (error) {
    console.error("BLOOD STRIKE ORDER UPDATE ERROR:", error);
    return false;
  }

  return true;
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
  } catch (error: any) {
    console.error("BLOOD STRIKE GET ERROR:", error);

    return jsonError(
      error?.message || "Error obteniendo el catálogo.",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  let reservedBalance = false;
  let insertedOrderId: string | null = null;
  let supplierRequestStarted = false;
  let supplierDefinitelyRejected = false;

  try {
    // 1. CONFIGURACIÓN

    if (!FAZERCARDS_API_KEY) {
      return jsonError(
        "FAZERCARDS_API_KEY no está configurada.",
        500
      );
    }

    // 2. AUTENTICACIÓN

    const {
      user,
      error: authError,
    } = await getAuthenticatedUser(request);

    if (!user) {
      return jsonError(authError || "No autorizado.", 401);
    }

    // 3. BODY

    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no es JSON válido.",
        400
      );
    }

    const offerId = normalizeString(body?.offerId);
    const playerId = normalizePlayerId(body?.playerId);
    const idempotencyKey = normalizeString(body?.idempotencyKey);

    // 4. VALIDAR OFERTA

    if (!offerId) {
      return jsonError("Falta offerId.");
    }

    const selectedOffer = BLOOD_STRIKE.offers.find(
      (offer) => offer.id === offerId
    );

    if (!selectedOffer) {
      return jsonError(
        "La oferta seleccionada no existe.",
        400
      );
    }

    // 5. VALIDAR PLAYER ID

    if (!playerId || !isValidPlayerId(playerId)) {
      return jsonError(
        "El Player ID debe tener entre 4 y 32 caracteres y solo puede contener letras, números, guion o guion bajo."
      );
    }

    // 6. VALIDAR IDEMPOTENCIA

    if (!isValidIdempotencyKey(idempotencyKey)) {
      return jsonError("idempotencyKey inválida.");
    }

    // 7. COMPROBAR VIP EN SUPABASE

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
        "No se pudo verificar la membresía del usuario.",
        500
      );
    }

    const vipExpiration = profile?.vip_expires_at
      ? new Date(profile.vip_expires_at).getTime()
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
      !Number.isFinite(retailPrice) ||
      retailPrice <= 0 ||
      !Number.isFinite(supplierPrice) ||
      supplierPrice <= 0
    ) {
      return jsonError(
        "El precio de la oferta no es válido.",
        500
      );
    }

    console.log("BLOOD STRIKE PRICE CHECK:", {
      offerId,
      supplierPrice,
      retailPrice,
      vipActive,
    });

    // 9. COMPROBAR ORDEN DUPLICADA

    const {
      data: existingOrder,
      error: existingOrderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingOrderError) {
      console.error(
        "CHECK EXISTING BLOOD STRIKE ORDER ERROR:",
        existingOrderError
      );

      return jsonError(
        "No se pudo comprobar la orden.",
        500
      );
    }

    if (existingOrder) {
      if (
        existingOrder.offer_id !== selectedOffer.id ||
        String(existingOrder.player_id) !== playerId
      ) {
        return jsonError(
          "La clave ya fue utilizada con otros datos.",
          409
        );
      }

      return jsonSuccess({
        message: "La orden ya había sido creada.",
        order: {
          ...existingOrder,
          order_number: existingOrder.id,
        },
        supplierOrderId:
          existingOrder.supplier_order_id || null,
        duplicate: true,
      });
    }

    // 10. CREAR ORDEN LOCAL

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
        "INSERT BLOOD STRIKE TOPUP ORDER ERROR:",
        insertOrderError
      );

      return jsonError("No se pudo crear la orden.", 500);
    }

    insertedOrderId = insertedOrder.id;

    // 11. RESERVAR SALDO

    const {
      data: reserveResult,
      error: reserveError,
    } = await supabaseAdmin.rpc(
      "store_gaming_reserve_balance",
      {
        p_user_id: user.id,
        p_amount: retailPrice,
      }
    );

    if (reserveError) {
      console.error(
        "BLOOD STRIKE RESERVE BALANCE ERROR:",
        reserveError
      );

      await updateOrderStatus(insertedOrderId, "REJECTED", {
        failed_at: new Date().toISOString(),
      });

      return jsonError(
        "No tienes saldo suficiente para realizar esta compra.",
        400
      );
    }

    let reserveOk = true;

    if (typeof reserveResult === "boolean") {
      reserveOk = reserveResult;
    }

    if (
      reserveResult &&
      typeof reserveResult === "object" &&
      "success" in
        (reserveResult as Record<string, unknown>)
    ) {
      reserveOk = Boolean(
        (reserveResult as Record<string, unknown>).success
      );
    }

    if (!reserveOk) {
      await updateOrderStatus(insertedOrderId, "REJECTED", {
        failed_at: new Date().toISOString(),
      });

      return jsonError(
        "No tienes saldo suficiente para realizar esta compra.",
        400
      );
    }

    reservedBalance = true;

    // 12. ENVIAR A FAZERCARDS

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
      player_id: playerId,
    });

    supplierRequestStarted = true;

    let supplierResponse: Response;
    let supplierData: SupplierResponse | null = null;

    try {
      supplierResponse = await fetchWithTimeout(
        supplierUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-API-Key": FAZERCARDS_API_KEY,
            "Idempotency-Key": idempotencyKey,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
            Referer: "https://reseller.fazercards.com/",
            Origin: "https://reseller.fazercards.com/",
          },
          body: JSON.stringify(supplierBody),
        }
      );

      const supplierText = await supplierResponse.text();

      console.log("FAZERCARDS BLOOD STRIKE RESPONSE:", {
        status: supplierResponse.status,
        body: supplierText,
      });

      try {
        supplierData = supplierText
          ? JSON.parse(supplierText)
          : null;
      } catch {
        supplierData = {
          ok: false,
          message:
            supplierText ||
            "Respuesta no JSON del proveedor.",
        };
      }
    } catch (error) {
      console.error(
        "FAZERCARDS BLOOD STRIKE REQUEST ERROR:",
        error
      );

      await updateOrderStatus(
        insertedOrderId,
        "SUPPLIER_PENDING",
        {
          supplier_response: {
            error:
              "No se pudo confirmar la respuesta de FazerCards.",
          },
        }
      );

      // No reembolsar: no sabemos si el proveedor recibió la solicitud.
      return jsonSuccess(
        {
          message:
            "La orden quedó pendiente de confirmación del proveedor.",
          order: {
            ...insertedOrder,
            order_number: insertedOrder.id,
            status: "SUPPLIER_PENDING",
          },
        },
        202
      );
    }

    // 13. GUARDAR RESPUESTA DEL PROVEEDOR

    await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_response: supplierData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", insertedOrderId);

    // 14. ERROR EXPLÍCITO DEL PROVEEDOR

    if (
      !supplierResponse.ok ||
      supplierData?.ok === false
    ) {
      supplierDefinitelyRejected = true;

      console.error("FAZERCARDS BLOOD STRIKE ERROR:", {
        status: supplierResponse.status,
        response: supplierData,
      });

      const refunded = await refundOrder(insertedOrderId);

      if (refunded) {
        reservedBalance = false;

        await updateOrderStatus(
          insertedOrderId,
          "REJECTED",
          {
            failed_at: new Date().toISOString(),
            supplier_response: supplierData,
          }
        );

        return jsonError(
          supplierData?.error ||
            supplierData?.message ||
            "FazerCards rechazó la orden. El balance fue devuelto.",
          502,
          {
            supplierStatus: supplierResponse.status,
          }
        );
      }

      await updateOrderStatus(
        insertedOrderId,
        "REFUND_PENDING",
        {
          supplier_response: supplierData,
        }
      );

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

    // 15. EXTRAER INFORMACIÓN DEL PROVEEDOR

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

    // 16. ORDEN COMPLETADA

    if (isCompleted) {
      // Sin ID del proveedor no podemos completar con seguridad.
      if (!supplierOrderId) {
        await updateOrderStatus(
          insertedOrderId,
          "SUPPLIER_PENDING",
          {
            supplier_response: supplierData,
          }
        );

        return jsonSuccess(
          {
            message:
              "El proveedor informó una posible finalización, pero falta el identificador de la orden. Necesita revisión.",
            orderId: insertedOrderId,
            status: "SUPPLIER_PENDING",
          },
          202
        );
      }

      const {
        error: completeError,
      } = await supabaseAdmin.rpc(
        "store_gaming_complete_order",
        {
          p_supplier_order_id: supplierOrderId,
        }
      );

      if (completeError) {
        console.error(
          "BLOOD STRIKE COMPLETE ORDER ERROR:",
          completeError
        );

        await updateOrderStatus(
          insertedOrderId,
          "SUPPLIER_PENDING",
          {
            supplier_order_id: supplierOrderId,
            supplier_response: supplierData,
          }
        );

        // No reembolsar ni liberar manualmente el balance.
        // La finalización necesita revisión.
        return jsonSuccess(
          {
            message:
              "FazerCards informó que la orden se completó, pero falta confirmar la actualización interna.",
            orderId: insertedOrderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
          },
          202
        );
      }

      reservedBalance = false;
    }

    // 17. ORDEN FALLIDA

    if (isFailed) {
      const refunded = await refundOrder(insertedOrderId);

      if (!refunded) {
        await updateOrderStatus(
          insertedOrderId,
          "REFUND_PENDING",
          {
            supplier_order_id: supplierOrderId,
            supplier_response: supplierData,
          }
        );

        return jsonSuccess(
          {
            message:
              "La orden fue rechazada por el proveedor, pero el reembolso necesita revisión.",
            orderId: insertedOrderId,
            supplierOrderId,
            status: "REFUND_PENDING",
          },
          202
        );
      }

      reservedBalance = false;
    }

    // 18. ORDEN PENDIENTE

    if (!isCompleted && !isFailed) {
      await updateOrderStatus(
        insertedOrderId,
        "SUPPLIER_PENDING",
        {
          supplier_order_id: supplierOrderId,
          supplier_response: supplierData,
        }
      );

      return jsonSuccess(
        {
          message:
            "La orden fue enviada a FazerCards y quedó pendiente de procesamiento.",
          order: {
            ...insertedOrder,
            order_number: insertedOrder.id,
            supplier_order_id: supplierOrderId,
            status: "SUPPLIER_PENDING",
          },
          supplier: supplierData,
          supplierOrderId,
        },
        202
      );
    }

    // 19. ACTUALIZAR ESTADO FINAL

    const localStatus =
      isCompleted ? "COMPLETED" : "REJECTED";

    const {
      data: updatedOrder,
      error: updateOrderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_order_id: supplierOrderId,
        supplier_response: supplierData,
        status: localStatus,
        completed_at: isCompleted
          ? new Date().toISOString()
          : null,
        failed_at: isFailed
          ? new Date().toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", insertedOrderId)
      .select("*")
      .single();

    if (updateOrderError || !updatedOrder) {
      console.error(
        "UPDATE BLOOD STRIKE ORDER ERROR:",
        updateOrderError
      );

      return jsonSuccess(
        {
          message:
            "La orden fue procesada por el proveedor, pero el registro local necesita revisión.",
          orderId: insertedOrderId,
          supplierOrderId,
          status: localStatus,
        },
        202
      );
    }

    // 20. RESPUESTA FINAL

    return jsonSuccess({
      message: isCompleted
        ? "Orden de Blood Strike completada correctamente."
        : "Orden de Blood Strike procesada.",
      order: {
        ...updatedOrder,
        order_number: updatedOrder.id,
      },
      supplier: supplierData,
      supplierOrderId,
    });
  } catch (error: any) {
    console.error("BLOOD STRIKE TOPUP ERROR:", error);

    if (reservedBalance && insertedOrderId) {
      if (supplierDefinitelyRejected) {
        // El proveedor rechazó explícitamente la orden.
        // Se puede intentar nuevamente el reembolso.
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
      } else if (supplierRequestStarted) {
        // La solicitud pudo llegar al proveedor.
        // No reembolsar automáticamente.
        await updateOrderStatus(
          insertedOrderId,
          "SUPPLIER_PENDING",
          {
            supplier_response: {
              error:
                "Error interno después de iniciar la solicitud al proveedor. Requiere verificación.",
            },
          }
        );
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
