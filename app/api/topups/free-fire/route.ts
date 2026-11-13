
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// ============================================================
// CONFIGURACIÓN
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  process.env.FAZERCARDS_BASE_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const CATEGORY_ID = "free_fire_latam";
const GAME_NAME = "Free Fire LATAM";
const VIP_MARKUP = 0.08;

const FAZER_ORIGIN = "https://reseller.fazercards.com";
const FAZER_REFERER = "https://reseller.fazercards.com/";

// ============================================================
// SUPABASE ADMIN
// ============================================================

const supabaseAdmin = createClient(
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
// OFERTAS FREE FIRE LATAM
// PRECIOS ORIGINALES CONSERVADOS
// ============================================================

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

type Obj = Record<string, any>;

// ============================================================
// UTILIDADES
// ============================================================

function isObject(value: unknown): value is Obj {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function getOffer(offerId: string) {
  return (
    FREE_FIRE_OFFERS.find(
      (offer) =>
        offer.id === offerId ||
        offer.supplierOfferId === offerId
    ) ?? null
  );
}

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: message },
    { status }
  );
}

function getSupplierOrderId(data: any): string | null {
  const value =
    data?.order_id ??
    data?.id ??
    data?.order?.id ??
    data?.data?.order_id ??
    data?.data?.id ??
    data?.data?.order?.id ??
    null;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return String(value).trim();
}

function getSupplierStatus(data: any): string {
  return String(
    data?.status ??
      data?.order?.status ??
      data?.data?.status ??
      data?.data?.order?.status ??
      ""
  )
    .trim()
    .toLowerCase();
}

function isSuccessfulSupplierStatus(status: string) {
  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "done",
    "succeeded",
  ].includes(status.toLowerCase().trim());
}

function isRejectedSupplierStatus(status: string) {
  return [
    "rejected",
    "failed",
    "failure",
    "cancelled",
    "canceled",
    "error",
    "declined",
    "denied",
    "refund",
    "refunded",
  ].includes(status.toLowerCase().trim());
}

function isValidUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

// ============================================================
// AUTENTICACIÓN
// ============================================================

async function getAuthenticatedUser(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();

  if (!token) return null;

  const { data, error } =
    await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

// ============================================================
// ACTUALIZAR ORDEN UNIVERSAL
// ============================================================

async function updateOrder(
  orderId: string,
  values: Obj
) {
  const { data, error } = await supabaseAdmin
    .from("topup_orders")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      error?.message || "No se pudo actualizar la orden."
    );
  }
}

// ============================================================
// RPC UNIVERSAL: RESERVAR SALDO
// ============================================================

async function reserveBalance(orderId: string) {
  const { data, error } = await supabaseAdmin.rpc(
    "store_gaming_reserve_order_balance",
    {
      p_order_id: orderId,
    }
  );

  if (error) {
    throw new Error(
      `Error reservando saldo: ${error.message}`
    );
  }

  if (!data || data.ok !== true) {
    throw new Error(
      data?.error ||
        data?.message ||
        "No se pudo reservar el saldo."
    );
  }

  return data;
}

// ============================================================
// RPC UNIVERSAL: REEMBOLSAR SALDO
// ============================================================

async function refundBalance(orderId: string) {
  const { data, error } = await supabaseAdmin.rpc(
    "store_gaming_refund_order_balance",
    {
      p_order_id: orderId,
    }
  );

  if (error) {
    throw new Error(
      `Error devolviendo saldo: ${error.message}`
    );
  }

  if (!data || data.ok !== true) {
    throw new Error(
      data?.error ||
        data?.message ||
        "No se pudo devolver el saldo."
    );
  }

  return data;
}

// ============================================================
// RPC UNIVERSAL: COMPLETAR ORDEN
// ============================================================

async function completeOrder(orderId: string) {
  const { data, error } = await supabaseAdmin.rpc(
    "store_gaming_complete_order_by_id",
    {
      p_order_id: orderId,
    }
  );

  if (error) {
    throw new Error(
      `Error completando orden: ${error.message}`
    );
  }

  if (!data || data.ok !== true) {
    throw new Error(
      data?.error ||
        data?.message ||
        "No se pudo completar la orden."
    );
  }

  return data;
}

// ============================================================
// RESPUESTA PARA ORDEN EXISTENTE
// ============================================================

async function existingOrderResponse(
  order: Obj,
  userId: string,
  offerId: string,
  playerId: string
) {
  if (order.user_id !== userId) {
    return jsonError(
      "La clave de idempotencia ya está siendo utilizada.",
      409
    );
  }

  if (
    order.offer_id !== offerId &&
    order.supplier_fields?.supplier_offer_id !== offerId
  ) {
    return jsonError(
      "La clave ya se utilizó con otra oferta.",
      409
    );
  }

  if (String(order.player_id) !== playerId) {
    return jsonError(
      "La clave ya se utilizó con otro jugador.",
      409
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyCreated: true,
    orderNumber: order.id,
    supplierOrderId: order.supplier_order_id,
    status: order.status,
    offerId: order.offer_id,
    offerName: order.offer_name,
    playerId: order.player_id,
    retailPrice: order.retail_price,
    supplierPrice: order.supplier_price,
  });
}

// ============================================================
// POST
// ============================================================

export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;
  let balanceReserved = false;
  let supplierRequestStarted = false;
  let supplierResponseReceived = false;
  let supplierData: any = null;

  try {
    // --------------------------------------------------------
    // 1. CONFIGURACIÓN
    // --------------------------------------------------------

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return jsonError(
        "Supabase no está configurado.",
        500
      );
    }

    const fazerApiKey =
      process.env.FAZERCARDS_API_KEY;

    if (!fazerApiKey) {
      return jsonError(
        "El servicio de recargas no está configurado.",
        500
      );
    }

    // --------------------------------------------------------
    // 2. AUTENTICACIÓN
    // --------------------------------------------------------

    const user = await getAuthenticatedUser(request);

    if (!user) {
      return jsonError("Sesión inválida o expirada.", 401);
    }

    // --------------------------------------------------------
    // 3. LEER SOLICITUD
    // --------------------------------------------------------

    let body: Obj;

    try {
      body = await request.json();
    } catch {
      return jsonError("El cuerpo JSON no es válido.");
    }

    const offerId =
      typeof body?.offerId === "string"
        ? body.offerId.trim()
        : "";

    const playerId =
      typeof body?.playerId === "string"
        ? body.playerId.trim()
        : "";

    const suppliedKey =
      typeof body?.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : request.headers.get("idempotency-key")?.trim() || "";

    if (suppliedKey.length > 200) {
      return jsonError(
        "Clave de idempotencia demasiado larga."
      );
    }

    const idempotencyKey =
      suppliedKey || crypto.randomUUID();

    if (!isValidUUID(idempotencyKey)) {
      return jsonError(
        "La clave de idempotencia debe ser un UUID válido."
      );
    }

    if (!offerId) {
      return jsonError("Falta seleccionar una oferta.");
    }

    if (
      !playerId ||
      !/^[0-9]+$/.test(playerId) ||
      playerId.length < 3 ||
      playerId.length > 20
    ) {
      return jsonError("El ID del jugador no es válido.");
    }

    // --------------------------------------------------------
    // 4. VALIDAR OFERTA
    // --------------------------------------------------------

    const offer = getOffer(offerId);

    if (!offer) {
      return jsonError(
        "La oferta de Free Fire LATAM no existe."
      );
    }

    // --------------------------------------------------------
    // 5. COMPROBAR IDEMPOTENCIA
    // --------------------------------------------------------

    const { data: existingOrder, error: existingError } =
      await supabaseAdmin
        .from("topup_orders")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (existingError) {
      console.error(
        "ERROR IDEMPOTENCIA:",
        existingError
      );

      return jsonError(
        "No se pudo comprobar la orden anterior.",
        500
      );
    }

    if (existingOrder) {
      return existingOrderResponse(
        existingOrder,
        user.id,
        offer.id,
        playerId
      );
    }

    // --------------------------------------------------------
    // 6. COMPROBAR VIP
    // --------------------------------------------------------

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("vip_expires_at")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "ERROR CONSULTANDO VIP:",
        profileError
      );

      return jsonError(
        "No se pudo comprobar la membresía.",
        500
      );
    }

    const expiration = profile?.vip_expires_at
      ? new Date(profile.vip_expires_at).getTime()
      : 0;

    const vipActive =
      Number.isFinite(expiration) &&
      expiration > Date.now();

    // --------------------------------------------------------
    // 7. CALCULAR PRECIOS
    // --------------------------------------------------------

    const supplierPrice = Number(
      offer.supplierPrice
    );

    const retailPrice = vipActive
      ? Number(
          (supplierPrice + VIP_MARKUP).toFixed(4)
        )
      : Number(offer.price);

    if (
      !Number.isFinite(supplierPrice) ||
      supplierPrice <= 0 ||
      !Number.isFinite(retailPrice) ||
      retailPrice <= 0
    ) {
      return jsonError(
        "El precio de la oferta no es válido.",
        500
      );
    }

    // --------------------------------------------------------
    // 8. CREAR ORDEN UNIVERSAL
    // IMPORTANTE: RESERVED PARA LA RPC UNIVERSAL
    // --------------------------------------------------------

    const username =
      user.user_metadata?.username ??
      user.user_metadata?.user_name ??
      user.user_metadata?.name ??
      user.email ??
      "Cliente";

    const { data: insertedOrder, error: insertError } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,
          username,
          email: user.email ?? null,

          game: GAME_NAME,
          category_id: CATEGORY_ID,

          offer_id: offer.id,
          offer_name: offer.name,

          player_id: playerId,

          retail_price: retailPrice,
          supplier_price: supplierPrice,
          currency: "USD",

          status: "RESERVED",

          supplier_order_id: null,
          idempotency_key: idempotencyKey,

          supplier_fields: {
            player_id: playerId,
            supplier_offer_id: offer.supplierOfferId,
            vip_active: vipActive,
          },

          supplier_response: null,

          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

    if (insertError || !insertedOrder) {
      console.error(
        "ERROR CREANDO ORDEN:",
        insertError
      );

      if (insertError?.code === "23505") {
        const { data: duplicate } =
          await supabaseAdmin
            .from("topup_orders")
            .select("*")
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();

        if (duplicate) {
          return existingOrderResponse(
            duplicate,
            user.id,
            offer.id,
            playerId
          );
        }
      }

      return jsonError(
        "No se pudo crear la orden.",
        500
      );
    }

    internalOrderId = insertedOrder.id;

    // --------------------------------------------------------
    // 9. RESERVAR SALDO CON RPC UNIVERSAL
    // --------------------------------------------------------

    try {
      await reserveBalance(internalOrderId);
      balanceReserved = true;
    } catch (error) {
      console.error(
        "ERROR RESERVANDO SALDO:",
        error
      );

      await updateOrder(internalOrderId, {
        status: "RESERVATION_FAILED",
        supplier_response: {
          stage: "balance_reservation",
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      }).catch(console.error);

      return jsonError(
        error instanceof Error
          ? error.message
          : "No se pudo reservar el saldo.",
        400
      );
    }

    // --------------------------------------------------------
    // 10. PREPARAR PEDIDO FAZERCARDS
    // MISMA LÓGICA DE HEADERS DE MOBILE LEGENDS
    // --------------------------------------------------------

    const payload = {
      category_id: CATEGORY_ID,
      offer_id: offer.supplierOfferId,
      fields: {
        player_id: playerId,
      },
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": fazerApiKey,
      "Idempotency-Key": idempotencyKey,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
      Referer: FAZER_REFERER,
      Origin: FAZER_ORIGIN,
    };

    console.info(
      "ENVIANDO FREE FIRE LATAM A FAZERCARDS:",
      {
        internalOrderId,
        categoryId: CATEGORY_ID,
        offerId: offer.id,
        supplierOfferId: offer.supplierOfferId,
        hasIdempotencyKey: true,
      }
    );

    // --------------------------------------------------------
    // 11. ENVIAR PEDIDO
    // --------------------------------------------------------

    let supplierResponse: Response;

    try {
      supplierRequestStarted = true;

      supplierResponse = await fetch(
        `${FAZER_API_BASE}/topups/order`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          cache: "no-store",
          signal: AbortSignal.timeout(25000),
        }
      );
    } catch (connectionError) {
      console.error(
        "ERROR DE CONEXIÓN FAZERCARDS:",
        connectionError
      );

      await updateOrder(internalOrderId, {
        status: "SUPPLIER_PENDING",
        supplier_response: {
          connection_error: true,
          requires_reconciliation: true,
          message:
            "No se pudo confirmar la respuesta del proveedor.",
        },
      });

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          status: "SUPPLIER_PENDING",
          message:
            "No se pudo confirmar la respuesta de FazerCards. El saldo permanece reservado.",
        },
        { status: 202 }
      );
    }

    // --------------------------------------------------------
    // 12. LEER RESPUESTA FAZERCARDS
    // --------------------------------------------------------

    const supplierText =
      await supplierResponse.text();

    try {
      supplierData = supplierText
        ? JSON.parse(supplierText)
        : null;
    } catch {
      supplierData = {
        raw_response: supplierText,
      };
    }

    supplierResponseReceived = true;

    console.info(
      "RESPUESTA FAZERCARDS FREE FIRE:",
      {
        httpStatus: supplierResponse.status,
        response: supplierData,
      }
    );

    const supplierOrderId =
      getSupplierOrderId(supplierData);

    const supplierStatus =
      getSupplierStatus(supplierData);

    // --------------------------------------------------------
    // 13. DETERMINAR SI EL PROVEEDOR RECHAZÓ
    // --------------------------------------------------------

    const explicitRejection =
      isRejectedSupplierStatus(supplierStatus) ||
      supplierData?.ok === false ||
      (
        supplierResponse.status >= 400 &&
        supplierResponse.status < 500 &&
        !supplierOrderId
      );

    // --------------------------------------------------------
    // 14. RECHAZO EXPLÍCITO: REEMBOLSO UNIVERSAL
    // --------------------------------------------------------

    if (explicitRejection) {
      await updateOrder(internalOrderId, {
        supplier_order_id: supplierOrderId,
        supplier_response: {
          http_status: supplierResponse.status,
          response: supplierData,
          supplier_status: supplierStatus,
          reason: "SUPPLIER_EXPLICIT_REJECTION",
        },
        status: "SUPPLIER_PENDING",
      });

      try {
        await refundBalance(internalOrderId);
      } catch (refundError) {
        console.error(
          "ERROR REEMBOLSANDO ORDEN:",
          refundError
        );

        return NextResponse.json(
          {
            ok: false,
            orderNumber: internalOrderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
            error:
              "El proveedor rechazó el pedido, pero el reembolso necesita revisión.",
          },
          { status: 202 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "REFUNDED",
          supplierStatus,
          supplierResponse: supplierData,
          message:
            "FazerCards rechazó el pedido. El saldo fue devuelto.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // 15. RESPUESTA INCIERTA O SIN ID
    // --------------------------------------------------------

    if (
      !supplierResponse.ok ||
      !supplierOrderId
    ) {
      await updateOrder(internalOrderId, {
        status: "SUPPLIER_PENDING",
        supplier_order_id: supplierOrderId,
        supplier_response: {
          http_status: supplierResponse.status,
          response: supplierData,
          supplier_status: supplierStatus,
          requires_reconciliation: true,
        },
      });

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
          supplierStatus: supplierStatus || "pending",
          message:
            "La respuesta de FazerCards necesita verificación. El saldo permanece reservado.",
        },
        { status: 202 }
      );
    }

    // --------------------------------------------------------
    // 16. GUARDAR ID DEL PROVEEDOR
    // --------------------------------------------------------

    await updateOrder(internalOrderId, {
      supplier_order_id: supplierOrderId,
      supplier_response: {
        http_status: supplierResponse.status,
        response: supplierData,
        supplier_status: supplierStatus,
      },
      status: "SUPPLIER_PENDING",
    });

    // Verificar que el ID quedó guardado.

    const { data: savedOrder, error: verifyError } =
      await supabaseAdmin
        .from("topup_orders")
        .select("supplier_order_id")
        .eq("id", internalOrderId)
        .maybeSingle();

    if (
      verifyError ||
      !savedOrder ||
      savedOrder.supplier_order_id !== supplierOrderId
    ) {
      throw new Error(
        "No se pudo verificar el ID del proveedor."
      );
    }

    // --------------------------------------------------------
    // 17. COMPLETAR SI FAZERCARDS CONFIRMÓ
    // RPC UNIVERSAL
    // --------------------------------------------------------

    if (isSuccessfulSupplierStatus(supplierStatus)) {
      await completeOrder(internalOrderId);

      const { data: completedOrder, error: completeVerifyError } =
        await supabaseAdmin
          .from("topup_orders")
          .select(
            "status, supplier_order_id, refunded_at"
          )
          .eq("id", internalOrderId)
          .maybeSingle();

      if (
        completeVerifyError ||
        !completedOrder ||
        completedOrder.status !== "COMPLETED" ||
        completedOrder.refunded_at ||
        completedOrder.supplier_order_id !== supplierOrderId
      ) {
        throw new Error(
          "No se pudo verificar la finalización de la orden."
        );
      }

      return NextResponse.json({
        ok: true,
        orderNumber: internalOrderId,
        supplierOrderId,
        status: "COMPLETED",
        offerId: offer.id,
        offerName: offer.name,
        playerId,
        retailPrice,
        supplierPrice,
        vipActive,
        supplierStatus,
      });
    }

    // --------------------------------------------------------
    // 18. PEDIDO ACEPTADO O EN PROCESO
    // --------------------------------------------------------

    return NextResponse.json(
      {
        ok: true,
        orderNumber: internalOrderId,
        supplierOrderId,
        status: "SUPPLIER_PENDING",
        offerId: offer.id,
        offerName: offer.name,
        playerId,
        retailPrice,
        supplierPrice,
        vipActive,
        supplierStatus: supplierStatus || "pending",
        message:
          "FazerCards recibió el pedido. Se verificará mediante el cron universal.",
      },
      { status: 202 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "ERROR GENERAL FREE FIRE LATAM:",
      {
        internalOrderId,
        balanceReserved,
        supplierRequestStarted,
        supplierResponseReceived,
        message,
      }
    );

    // --------------------------------------------------------
    // 19. RECUPERACIÓN SEGURA
    // --------------------------------------------------------

    if (internalOrderId) {
      try {
        if (
          supplierRequestStarted &&
          !supplierResponseReceived
        ) {
          // Resultado incierto: no reembolsar ni reenviar.
          await updateOrder(internalOrderId, {
            status: "SUPPLIER_PENDING",
            supplier_response: {
              reason: "PROVIDER_REQUEST_RESULT_UNKNOWN",
              requires_reconciliation: true,
              error: message,
            },
          });
        } else if (supplierResponseReceived) {
          // El proveedor respondió: conservar evidencia.
          await updateOrder(internalOrderId, {
            status: "SUPPLIER_PENDING",
            supplier_response: {
              reason: "ERROR_AFTER_PROVIDER_RESPONSE",
              requires_reconciliation: true,
              response: supplierData,
              error: message,
            },
          });
        } else if (balanceReserved) {
          // Todavía no se inició la solicitud al proveedor.
          await refundBalance(internalOrderId);
        } else {
          await updateOrder(internalOrderId, {
            status: "RESERVATION_FAILED",
            supplier_response: {
              error: message,
            },
          });
        }
      } catch (recoveryError) {
        console.error(
          "ERROR RECUPERANDO ORDEN:",
          recoveryError
        );
      }

      return NextResponse.json(
        {
          ok: false,
          orderNumber: internalOrderId,
          status: "SUPPLIER_PENDING",
          message:
            "No se pudo confirmar el resultado. No repitas la solicitud.",
        },
        { status: 202 }
      );
    }

    return jsonError(
      "No se pudo procesar la orden.",
      500
    );
  }
}
