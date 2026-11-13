
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

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY;
const FAZERCARDS_ORIGIN =
  process.env.FAZERCARDS_ORIGIN?.trim();

const CATEGORY_ID = "free_fire_latam";
const GAME = "Free Fire LATAM";
const CURRENCY = "USD";

const VIP_MARKUP = 0.08;

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

function findOffer(id: string) {
  return FREE_FIRE_OFFERS.find(
    (offer) =>
      offer.id === id ||
      offer.supplierOfferId === id
  );
}

function isValidUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getSupplierOrderId(value: unknown): string {
  if (!isObject(value)) return "";

  const data = isObject(value.data) ? value.data : {};
  const order = isObject(value.order) ? value.order : {};
  const dataOrder = isObject(data.order)
    ? data.order
    : {};

  const candidates = [
    order.id,
    dataOrder.id,
    value.order_id,
    value.orderId,
    data.order_id,
    data.orderId,
    data.id,
    value.id,
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

  return "";
}

function getSupplierStatus(value: unknown): string {
  if (!isObject(value)) return "PENDING";

  const data = isObject(value.data) ? value.data : {};
  const order = isObject(value.order) ? value.order : {};
  const dataOrder = isObject(data.order)
    ? data.order
    : {};

  return String(
    order.status ??
      dataOrder.status ??
      value.status ??
      data.status ??
      "PENDING"
  )
    .trim()
    .toUpperCase();
}

function getBearerToken(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

// ============================================================
// AUTENTICACIÓN
// ============================================================

async function getUser(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) return null;

  const { data, error } =
    await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) return null;

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
      `No se pudo actualizar la orden: ${
        error?.message || "orden no encontrada"
      }`
    );
  }
}

// ============================================================
// MARCAR ORDEN PENDIENTE
// ============================================================

async function setPending(
  orderId: string,
  reason: string,
  response?: unknown
) {
  const supplierResponse: Obj = {
    requires_reconciliation: true,
    reason,
    saved_at: new Date().toISOString(),
  };

  if (response !== undefined) {
    supplierResponse.response = response;
  }

  await updateOrder(orderId, {
    status: "SUPPLIER_PENDING",
    supplier_response: supplierResponse,
  });
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
      `Error de reembolso: ${error.message}`
    );
  }

  if (!data || data.ok !== true) {
    throw new Error(
      data?.error ||
        data?.message ||
        "No se pudo reembolsar el saldo."
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
      `Error completando la orden: ${error.message}`
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
// RESPUESTA PARA ÓRDENES EXISTENTES
// ============================================================

async function responseForExistingOrder(
  order: Obj,
  userId: string,
  offerId: string,
  playerId: string
) {
  if (order.user_id !== userId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Esta clave de idempotencia ya pertenece a otra solicitud.",
        code: "IDEMPOTENCY_CONFLICT",
      },
      { status: 409 }
    );
  }

  if (
    order.offer_id !== offerId &&
    order.supplier_fields?.supplier_offer_id !== offerId
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "La clave de idempotencia ya se utilizó con otra oferta.",
        code: "IDEMPOTENCY_CONFLICT",
      },
      { status: 409 }
    );
  }

  if (String(order.player_id) !== playerId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "La clave de idempotencia ya se utilizó con otro jugador.",
        code: "IDEMPOTENCY_CONFLICT",
      },
      { status: 409 }
    );
  }

  const status = String(order.status || "UNKNOWN").toUpperCase();

  if (status === "COMPLETED") {
    return NextResponse.json({
      ok: true,
      orderId: order.id,
      supplierOrderId: order.supplier_order_id,
      status,
      message: "Esta solicitud ya figura como completada.",
    });
  }

  if (
    status === "REFUNDED" ||
    status === "CANCELLED"
  ) {
    return NextResponse.json(
      {
        ok: false,
        orderId: order.id,
        status,
        message:
          "Esta solicitud ya tiene un estado final. No se envió otra compra.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      orderId: order.id,
      supplierOrderId: order.supplier_order_id,
      status,
      message:
        "Esta solicitud ya está registrada. No se volvió a enviar a FazerCards.",
    },
    { status: 202 }
  );
}

// ============================================================
// POST
// ============================================================

export async function POST(request: NextRequest) {
  let orderId: string | null = null;
  let balanceReserved = false;
  let providerRequestStarted = false;
  let providerResponseReceived = false;
  let providerResponseBody: unknown;

  try {
    // --------------------------------------------------------
    // 1. CONFIGURACIÓN
    // --------------------------------------------------------

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Supabase no está configurado en el servidor.",
        },
        { status: 500 }
      );
    }

    if (!FAZER_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Falta configurar FazerCards en el servidor.",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------------
    // 2. VALIDAR ORIGIN
    // --------------------------------------------------------

    let providerOrigin: string | undefined;

    if (FAZERCARDS_ORIGIN) {
      try {
        const parsedOrigin = new URL(FAZERCARDS_ORIGIN);

        if (
          parsedOrigin.protocol !== "https:" &&
          parsedOrigin.hostname !== "localhost"
        ) {
          throw new Error("Origin debe utilizar HTTPS.");
        }

        providerOrigin = parsedOrigin.origin;
      } catch {
        return NextResponse.json(
          {
            ok: false,
            error:
              "FAZERCARDS_ORIGIN no es una URL válida.",
          },
          { status: 500 }
        );
      }
    }

    // --------------------------------------------------------
    // 3. AUTENTICAR USUARIO
    // --------------------------------------------------------

    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------------
    // 4. LEER SOLICITUD
    // --------------------------------------------------------

    let body: Obj;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El cuerpo de la solicitud no es JSON válido.",
        },
        { status: 400 }
      );
    }

    const offerId = String(
      body.offerId ?? ""
    ).trim();

    const playerId = String(
      body.playerId ?? ""
    ).trim();

    const idempotencyKey = String(
      request.headers.get("idempotency-key") ??
        body.idempotencyKey ??
        ""
    ).trim();

    if (!isValidUUID(idempotencyKey)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Falta una clave de idempotencia UUID válida.",
          code: "IDEMPOTENCY_KEY_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (!offerId || !playerId) {
      return NextResponse.json(
        {
          ok: false,
          error: !offerId
            ? "Falta seleccionar una oferta."
            : "Debe introducir el ID del jugador.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // 5. BUSCAR OFERTA
    // --------------------------------------------------------

    const offer = findOffer(offerId);

    if (!offer) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La oferta de Free Fire LATAM no existe en STORE GAMING.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // 6. COMPROBAR IDEMPOTENCIA ANTES DE CREAR
    // --------------------------------------------------------

    const { data: existingOrder, error: existingError } =
      await supabaseAdmin
        .from("topup_orders")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (existingError) {
      throw new Error(
        `Error consultando idempotencia: ${existingError.message}`
      );
    }

    if (existingOrder) {
      return responseForExistingOrder(
        existingOrder,
        user.id,
        offer.id,
        playerId
      );
    }

    // --------------------------------------------------------
    // 7. VERIFICAR MEMBRESÍA VIP
    // --------------------------------------------------------

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("vip_expires_at")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Error verificando VIP:",
        profileError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo verificar tu membresía VIP.",
        },
        { status: 500 }
      );
    }

    const vipExpiresAt = profile?.vip_expires_at
      ? new Date(profile.vip_expires_at).getTime()
      : 0;

    const vipActive =
      Number.isFinite(vipExpiresAt) &&
      vipExpiresAt > Date.now();

    // --------------------------------------------------------
    // 8. CALCULAR PRECIO
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
      !Number.isFinite(retailPrice) ||
      supplierPrice <= 0 ||
      retailPrice <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo calcular correctamente el precio.",
        },
        { status: 500 }
      );
    }

    console.info(
      "Precio calculado para Free Fire LATAM",
      {
        userId: user.id,
        offerId: offer.id,
        vipActive,
        supplierPrice,
        retailPrice,
      }
    );

    // --------------------------------------------------------
    // 9. INSERTAR ORDEN EN TABLA UNIVERSAL
    // --------------------------------------------------------

    const username =
      user.user_metadata?.username ||
      user.user_metadata?.name ||
      user.email ||
      "Cliente";

    const { data: newOrder, error: insertError } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,
          username,
          email: user.email ?? null,

          game: GAME,
          category_id: CATEGORY_ID,

          offer_id: offer.id,
          offer_name: offer.name,

          player_id: playerId,

          retail_price: retailPrice,
          supplier_price: supplierPrice,
          currency: CURRENCY,

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
        .select("*")
        .single();

    if (insertError || !newOrder) {
      if (insertError?.code === "23505") {
        const { data: duplicate, error: duplicateError } =
          await supabaseAdmin
            .from("topup_orders")
            .select("*")
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();

        if (duplicateError) {
          throw new Error(duplicateError.message);
        }

        if (duplicate) {
          return responseForExistingOrder(
            duplicate,
            user.id,
            offer.id,
            playerId
          );
        }
      }

      throw new Error(
        `No se pudo insertar la orden: ${
          insertError?.message || "error desconocido"
        }`
      );
    }

    orderId = newOrder.id;

    // --------------------------------------------------------
    // 10. RESERVAR SALDO CON RPC UNIVERSAL
    // --------------------------------------------------------

    try {
      await reserveBalance(orderId);
      balanceReserved = true;
    } catch (error: any) {
      console.error(
        "Error reservando saldo:",
        error?.message || error
      );

      await updateOrder(orderId, {
        status: "RESERVATION_FAILED",
        supplier_response: {
          stage: "balance_reservation",
          error: error?.message || "Reservation failed",
        },
      }).catch((saveError) => {
        console.error(
          "No se pudo actualizar reserva fallida:",
          saveError
        );
      });

      return NextResponse.json(
        {
          ok: false,
          orderId,
          error:
            error?.message ||
            "No se pudo reservar el saldo.",
          code: "ORDER_RESERVATION_FAILED",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // 11. MARCAR PROCESAMIENTO
    // --------------------------------------------------------

    await updateOrder(orderId, {
      status: "PROCESSING",
    });

    // --------------------------------------------------------
    // 12. PREPARAR PEDIDO FAZERCARDS
    // ADAPTADO A LOS ENCABEZADOS DE MOBILE LEGENDS
    // --------------------------------------------------------

    const payload = {
      category_id: CATEGORY_ID,
      offer_id: offer.supplierOfferId,
      fields: {
        player_id: playerId,
      },
    };

    const headers: Record<string, string> = {
      "X-API-Key": FAZER_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Idempotency-Key": idempotencyKey,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    };

    // Se conserva el dominio propio configurado.
    // No se suplanta el dominio de otro servicio.
    if (providerOrigin) {
      headers.Origin = providerOrigin;
      headers.Referer = `${providerOrigin}/`;
    }

    console.info(
      "Enviando orden de Free Fire LATAM a FazerCards",
      {
        orderId,
        offerId: offer.id,
        supplierOfferId: offer.supplierOfferId,
        categoryId: CATEGORY_ID,
        hasOrigin: Boolean(providerOrigin),
        hasIdempotencyKey: Boolean(idempotencyKey),
      }
    );

    // --------------------------------------------------------
    // 13. ENVIAR SOLICITUD AL PROVEEDOR
    // --------------------------------------------------------

    providerRequestStarted = true;

    const response = await fetch(
      `${FAZER_API_BASE}/topups/order`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      }
    );

    const responseText = await response.text();

    let result: unknown;

    try {
      result = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      result = {
        raw: responseText,
      };
    }

    providerResponseReceived = true;
    providerResponseBody = result;

    const supplierId = getSupplierOrderId(result);
    const supplierStatus = getSupplierStatus(result);

    const now = new Date().toISOString();

    console.info("Respuesta de FazerCards", {
      orderId,
      httpStatus: response.status,
      hasSupplierId: Boolean(supplierId),
      supplierStatus,
    });

    // --------------------------------------------------------
    // 14. RESPUESTA HTTP NO EXITOSA
    // --------------------------------------------------------

    if (!response.ok) {
      const ambiguous =
        response.status === 408 ||
        response.status === 425 ||
        response.status === 429 ||
        response.status >= 500;

      const pendingValues: Obj = {
        status: "SUPPLIER_PENDING",
        supplier_response: {
          http_status: response.status,
          response: result,
          requires_reconciliation: true,
          reason: ambiguous
            ? "AMBIGUOUS_HTTP_RESPONSE"
            : "HTTP_ERROR_REQUIRES_VERIFICATION",
          saved_at: now,
        },
      };

      if (supplierId) {
        pendingValues.supplier_order_id = supplierId;
      }

      await updateOrder(orderId, pendingValues);

      return NextResponse.json(
        {
          ok: true,
          orderId,
          supplierOrderId: supplierId || null,
          status: "SUPPLIER_PENDING",
          message:
            "No se pudo confirmar el resultado. La orden quedó pendiente de verificación. No repitas la solicitud.",
        },
        { status: 202 }
      );
    }

    // --------------------------------------------------------
    // 15. COMPROBAR ID DE FAZERCARDS
    // --------------------------------------------------------

    if (!supplierId) {
      await setPending(
        orderId,
        "MISSING_OR_INVALID_SUPPLIER_ORDER_ID",
        result
      );

      return NextResponse.json(
        {
          ok: true,
          orderId,
          supplierOrderId: null,
          status: "SUPPLIER_PENDING",
          message:
            "FazerCards respondió, pero falta un ID válido. La orden necesita revisión. No repitas la solicitud.",
        },
        { status: 202 }
      );
    }

    // --------------------------------------------------------
    // 16. GUARDAR ID DEL PROVEEDOR
    // ANTES DE COMPLETAR LA ORDEN
    // --------------------------------------------------------

    await updateOrder(orderId, {
      supplier_order_id: supplierId,
      supplier_response: {
        http_status: response.status,
        response: result,
        supplier_status: supplierStatus,
      },
      status: "PROCESSING",
    });

    const {
      data: savedOrder,
      error: verifyIdError,
    } = await supabaseAdmin
      .from("topup_orders")
      .select("supplier_order_id")
      .eq("id", orderId)
      .maybeSingle();

    if (
      verifyIdError ||
      !savedOrder ||
      savedOrder.supplier_order_id !== supplierId
    ) {
      await setPending(
        orderId,
        "SUPPLIER_ID_SAVE_NOT_VERIFIED",
        result
      );

      return NextResponse.json(
        {
          ok: true,
          orderId,
          supplierOrderId: supplierId,
          status: "SUPPLIER_PENDING",
          message:
            "No se pudo verificar el ID guardado. No repitas la solicitud.",
        },
        { status: 202 }
      );
    }

    // --------------------------------------------------------
    // 17. COMPLETAR SI EL PROVEEDOR CONFIRMA
    // RPC UNIVERSAL POR ID DE NUESTRA ORDEN
    // --------------------------------------------------------

    const completedStatuses = [
      "COMPLETED",
      "COMPLETE",
      "SUCCESS",
      "SUCCESSFUL",
      "SUCCEEDED",
      "DELIVERED",
      "DONE",
    ];

    if (completedStatuses.includes(supplierStatus)) {
      try {
        await completeOrder(orderId);

        const {
          data: finalOrder,
          error: finalError,
        } = await supabaseAdmin
          .from("topup_orders")
          .select("status, refunded_at, supplier_order_id")
          .eq("id", orderId)
          .maybeSingle();

        if (
          finalError ||
          !finalOrder ||
          String(finalOrder.status).toUpperCase() !==
            "COMPLETED" ||
          finalOrder.refunded_at ||
          finalOrder.supplier_order_id !== supplierId
        ) {
          throw new Error(
            "No se pudo verificar el estado final."
          );
        }

        return NextResponse.json({
          ok: true,
          orderId,
          supplierOrderId: supplierId,
          status: "COMPLETED",
          message:
            "Recarga completada correctamente.",
        });
      } catch (error: any) {
        console.error(
          "Error completando orden:",
          error?.message || error
        );

        await setPending(
          orderId,
          "COMPLETION_RPC_FAILED",
          result
        ).catch((saveError) => {
          console.error(
            "No se pudo guardar estado pendiente:",
            saveError
          );
        });

        return NextResponse.json(
          {
            ok: true,
            orderId,
            supplierOrderId: supplierId,
            status: "SUPPLIER_PENDING",
            message:
              "El proveedor informa que terminó, pero la orden requiere reconciliación.",
          },
          { status: 202 }
        );
      }
    }

    // --------------------------------------------------------
    // 18. ESTADOS DE FALLO
    // EL CRON UNIVERSAL VERIFICARÁ Y REEMBOLSARÁ
    // --------------------------------------------------------

    const failedStatuses = [
      "FAILED",
      "FAILURE",
      "ERROR",
      "REJECTED",
      "DECLINED",
      "DENIED",
      "CANCELLED",
      "CANCELED",
      "REFUND",
      "REFUNDED",
      "REFUND_SUCCESS",
      "REFUND_FAILED",
    ];

    if (failedStatuses.includes(supplierStatus)) {
      await setPending(
        orderId,
        `SUPPLIER_REPORTED_${supplierStatus}`,
        result
      );

      return NextResponse.json(
        {
          ok: true,
          orderId,
          supplierOrderId: supplierId,
          status: "SUPPLIER_PENDING",
          message:
            "El proveedor informó un estado de fallo. Se verificará antes de devolver el saldo.",
        },
        { status: 202 }
      );
    }

    // --------------------------------------------------------
    // 19. ESTADOS EN PROCESO
    // --------------------------------------------------------

    const nextStatus = [
      "CONFIRMED",
      "ACCEPTED",
    ].includes(supplierStatus)
      ? "CONFIRMED"
      : supplierStatus === "PROCESSING"
        ? "PROCESSING"
        : "SUPPLIER_PENDING";

    await updateOrder(orderId, {
      status: nextStatus,
      supplier_order_id: supplierId,
      supplier_response: {
        http_status: response.status,
        response: result,
        supplier_status: supplierStatus,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        orderId,
        supplierOrderId: supplierId,
        status: nextStatus,
        message:
          "La orden quedó registrada y se verificará con FazerCards.",
      },
      { status: 202 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error("Free Fire LATAM API error:", {
      orderId,
      balanceReserved,
      providerRequestStarted,
      providerResponseReceived,
      message,
    });

    // --------------------------------------------------------
    // 20. RECUPERACIÓN SEGÚN LA ETAPA DEL ERROR
    // --------------------------------------------------------

    if (orderId) {
      try {
        if (providerResponseReceived) {
          await setPending(
            orderId,
            "ERROR_AFTER_PROVIDER_RESPONSE",
            providerResponseBody
          );
        } else if (providerRequestStarted) {
          await setPending(
            orderId,
            "PROVIDER_REQUEST_RESULT_UNKNOWN"
          );
        } else if (balanceReserved) {
          await refundBalance(orderId);
        } else {
          await updateOrder(orderId, {
            status: "RESERVATION_FAILED",
            supplier_response: {
              stage: "before_provider_request",
              error: message,
            },
          });
        }
      } catch (recoveryError) {
        console.error(
          "Error recuperando orden:",
          orderId,
          recoveryError
        );
      }

      return NextResponse.json(
        {
          ok: false,
          orderId,
          status: "SUPPLIER_PENDING",
          message:
            "No se pudo confirmar el resultado. No repitas la solicitud; verifica el estado de la orden.",
        },
        { status: 202 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        status: "ERROR",
        message:
          "No se pudo iniciar la orden.",
      },
      { status: 500 }
    );
  }
}
