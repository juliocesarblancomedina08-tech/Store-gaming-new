
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// ======================================================
// CONFIGURACIÓN
// ======================================================

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  process.env.FAZERCARDS_BASE_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const FAZERCARDS_ORIGIN =
  process.env.FAZERCARDS_ORIGIN?.trim() || "";

const CATEGORY_ID = "free_fire_latam";
const GAME = "free_fire_latam";
const CURRENCY = "USD";
const VIP_MARKUP = 0.08;

// ======================================================
// OFERTAS
// Se conservan los precios y los IDs existentes.
// ======================================================

const OFFERS = [
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
];

// ======================================================
// SUPABASE ADMIN
// ======================================================

const supabaseAdmin =
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

// ======================================================
// UTILIDADES
// ======================================================

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, { status });
}

function getBearerToken(request: NextRequest) {
  const authorization =
    request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

function isValidUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getSupplierOrderId(data: any): string | null {
  const candidates = [
    data?.order_id,
    data?.supplier_order_id,
    data?.id,
    data?.data?.order_id,
    data?.data?.supplier_order_id,
    data?.data?.id,
    data?.data?.order?.id,
    data?.order?.id,
    data?.result?.order_id,
    data?.result?.id,
    data?.result?.order?.id,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      /^ord-[A-Za-z0-9_-]+$/.test(candidate)
    ) {
      return candidate;
    }
  }

  return null;
}

function getSupplierStatus(data: any): string {
  const candidates = [
    data?.status,
    data?.data?.status,
    data?.data?.order?.status,
    data?.order?.status,
    data?.result?.status,
    data?.result?.order?.status,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return "unknown";
}

function getOrderNumber(order: any): string {
  return order?.id || "";
}

function isCompletedStatus(status: string) {
  return [
    "completed",
    "complete",
    "success",
    "successful",
    "succeeded",
    "delivered",
    "done",
  ].includes(status);
}

// ======================================================
// ACTUALIZAR ORDEN UNIVERSAL
// ======================================================

async function updateOrder(
  orderId: string,
  values: Record<string, unknown>
) {
  if (!supabaseAdmin) {
    throw new Error("Supabase no está configurado.");
  }

  const { error } = await supabaseAdmin
    .from("topup_orders")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(
      `No se pudo actualizar la orden: ${error.message}`
    );
  }
}

// ======================================================
// RESPUESTA COMPATIBLE CON EL FRONTEND
// ======================================================

function orderResponse(
  order: any,
  extra: Record<string, unknown> = {}
) {
  const orderNumber = getOrderNumber(order);
  const supplierOrderId =
    order?.supplier_order_id || null;
  const status = order?.status || "SUPPLIER_PENDING";

  return {
    ok: true,
    order: {
      id: orderNumber,
      order_number: orderNumber,
      supplier_order_id: supplierOrderId,
      supplier_status: status,
      status,
    },
    orderNumber,
    supplierOrderId,
    status,
    ...extra,
  };
}

// ======================================================
// RPC: RESERVAR SALDO
// ======================================================

async function reserveBalance(orderId: string) {
  if (!supabaseAdmin) {
    throw new Error("Supabase no está configurado.");
  }

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

// ======================================================
// RPC: COMPLETAR ORDEN
// ======================================================

async function completeOrder(orderId: string) {
  if (!supabaseAdmin) {
    throw new Error("Supabase no está configurado.");
  }

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

// ======================================================
// POST
// ======================================================

export async function POST(request: NextRequest) {
  try {
    // --------------------------------------------------
    // 1. COMPROBAR CONFIGURACIÓN
    // --------------------------------------------------

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !supabaseAdmin
    ) {
      return json(
        {
          ok: false,
          error: "La configuración de Supabase está incompleta.",
        },
        500
      );
    }

    if (!FAZER_API_KEY) {
      return json(
        {
          ok: false,
          error: "Falta configurar la API de FazerCards.",
        },
        500
      );
    }

    // --------------------------------------------------
    // 2. AUTENTICAR USUARIO
    // --------------------------------------------------

    const token = getBearerToken(request);

    if (!token) {
      return json(
        {
          ok: false,
          error: "Sesión no válida. Inicia sesión nuevamente.",
        },
        401
      );
    }

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData?.user) {
      return json(
        {
          ok: false,
          error: "No se pudo verificar tu sesión.",
        },
        401
      );
    }

    const user = authData.user;

    // --------------------------------------------------
    // 3. LEER DATOS
    // --------------------------------------------------

    let body: any;

    try {
      body = await request.json();
    } catch {
      return json(
        {
          ok: false,
          error: "El cuerpo de la solicitud no es válido.",
        },
        400
      );
    }

    const offerId =
      typeof body?.offerId === "string"
        ? body.offerId.trim()
        : "";

    const playerId =
      typeof body?.playerId === "string"
        ? body.playerId.trim()
        : "";

    const idempotencyKey =
      typeof body?.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";

    if (!offerId || !playerId || !idempotencyKey) {
      return json(
        {
          ok: false,
          error: "Faltan datos para procesar la orden.",
        },
        400
      );
    }

    if (!/^\d{4,20}$/.test(playerId)) {
      return json(
        {
          ok: false,
          error: "El ID de jugador no es válido.",
        },
        400
      );
    }

    if (!isValidUUID(idempotencyKey)) {
      return json(
        {
          ok: false,
          error: "La clave de idempotencia no es válida.",
        },
        400
      );
    }

    // --------------------------------------------------
    // 4. BUSCAR OFERTA
    // --------------------------------------------------

    const offer = OFFERS.find(
      (item) => item.id === offerId
    );

    if (!offer) {
      return json(
        {
          ok: false,
          error: "La oferta seleccionada no existe.",
        },
        400
      );
    }

    // --------------------------------------------------
    // 5. COMPROBAR VIP
    // --------------------------------------------------

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("vip_expires_at")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      return json(
        {
          ok: false,
          error: "No se pudo verificar tu membresía.",
        },
        500
      );
    }

    const vipExpiresAt = profile?.vip_expires_at
      ? new Date(profile.vip_expires_at).getTime()
      : 0;

    const isVIP =
      Number.isFinite(vipExpiresAt) &&
      vipExpiresAt > Date.now();

    const retailPrice = Number(
      (
        isVIP
          ? offer.supplierPrice + VIP_MARKUP
          : offer.price
      ).toFixed(4)
    );

    const supplierPrice = offer.supplierPrice;

    // --------------------------------------------------
    // 6. COMPROBAR IDEMPOTENCIA
    // No enviar dos veces la misma orden.
    // --------------------------------------------------

    const { data: existingOrder, error: existingError } =
      await supabaseAdmin
        .from("topup_orders")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (existingError) {
      return json(
        {
          ok: false,
          error: "No se pudo comprobar la orden anterior.",
        },
        500
      );
    }

    if (existingOrder) {
      // La misma clave nunca vuelve a enviar un pedido
      // al proveedor. Se devuelve la orden existente.
      return json(
        orderResponse(existingOrder, {
          alreadyProcessed: true,
          message:
            "Esta solicitud ya existe. No se ha enviado otra orden.",
        })
      );
    }

    // --------------------------------------------------
    // 7. CREAR ORDEN EN TABLA UNIVERSAL
    // --------------------------------------------------

    const username =
      user.user_metadata?.username ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      null;

    const { data: newOrder, error: insertError } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,
          username,
          email: user.email || null,

          game: GAME,
          category_id: CATEGORY_ID,

          offer_id: offer.supplierOfferId,
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
          },

          supplier_response: null,

          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

    if (insertError || !newOrder) {
      // Puede tratarse de una solicitud simultánea
      // que ya insertó la misma clave.
      if (insertError?.code === "23505") {
        const { data: duplicate } = await supabaseAdmin
          .from("topup_orders")
          .select("*")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (duplicate) {
          return json(
            orderResponse(duplicate, {
              alreadyProcessed: true,
              message:
                "Esta solicitud ya existe. No se ha enviado otra orden.",
            })
          );
        }
      }

      return json(
        {
          ok: false,
          error:
            insertError?.message ||
            "No se pudo crear la orden.",
        },
        500
      );
    }

    const orderId = newOrder.id;

    // --------------------------------------------------
    // 8. RESERVAR SALDO MEDIANTE RPC UNIVERSAL
    // Si falla, NO se contacta con FazerCards.
    // --------------------------------------------------

    try {
      await reserveBalance(orderId);
    } catch (error: any) {
      await updateOrder(orderId, {
        status: "RESERVATION_FAILED",
        supplier_response: {
          stage: "balance_reservation",
          error: error?.message || "Reservation failed",
        },
      }).catch(() => null);

      return json(
        {
          ok: false,
          error:
            error?.message ||
            "No se pudo reservar el saldo.",
          orderNumber: orderId,
        },
        400
      );
    }

    // --------------------------------------------------
    // 9. MARCAR PROCESAMIENTO
    // --------------------------------------------------

    try {
      await updateOrder(orderId, {
        status: "PROCESSING",
      });
    } catch (error: any) {
      return json(
        {
          ok: false,
          error:
            "El saldo fue reservado, pero no se pudo actualizar la orden. No repitas la solicitud.",
          orderNumber: orderId,
        },
        500
      );
    }

    // --------------------------------------------------
    // 10. ENVIAR A FAZERCARDS
    // --------------------------------------------------

    const headers: Record<string, string> = {
      "X-API-Key": FAZER_API_KEY,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (FAZERCARDS_ORIGIN) {
      try {
        const originUrl = new URL(FAZERCARDS_ORIGIN);

        if (
          originUrl.protocol !== "https:" &&
          originUrl.hostname !== "localhost"
        ) {
          throw new Error("Origin inválido.");
        }

        headers.Origin = FAZERCARDS_ORIGIN;
      } catch {
        await updateOrder(orderId, {
          status: "SUPPLIER_PENDING",
          supplier_response: {
            stage: "origin_validation",
            message: "No se pudo validar FAZERCARDS_ORIGIN.",
          },
        }).catch(() => null);

        return json(
          {
            ok: true,
            orderNumber: orderId,
            supplierOrderId: null,
            status: "SUPPLIER_PENDING",
            message:
              "La orden quedó pendiente de revisión. No repitas la solicitud.",
          }
        );
      }
    }

    let supplierResponse: any;
    let supplierHttpStatus = 0;

    try {
      const response = await fetch(
        `${FAZER_API_BASE}/topups/order`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            category_id: CATEGORY_ID,
            offer_id: offer.supplierOfferId,
            fields: {
              player_id: playerId,
            },
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(45000),
        }
      );

      supplierHttpStatus = response.status;

      const responseText = await response.text();

      try {
        supplierResponse = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        supplierResponse = {
          raw_response: responseText,
        };
      }
    } catch (error: any) {
      // Un timeout o error de conexión NO demuestra
      // que FazerCards no haya recibido la orden.
      // No se reenvía ni se reembolsa automáticamente.
      await updateOrder(orderId, {
        status: "SUPPLIER_PENDING",
        supplier_response: {
          stage: "supplier_connection",
          error: error?.message || "Connection error",
          reconciliation_required: true,
        },
      }).catch(() => null);

      return json({
        ok: true,
        orderNumber: orderId,
        supplierOrderId: null,
        status: "SUPPLIER_PENDING",
        message:
          "La solicitud quedó pendiente de verificación. No repitas la orden.",
      });
    }

    // --------------------------------------------------
    // 11. EXTRAER ID DE FAZERCARDS
    // --------------------------------------------------

    const supplierOrderId =
      getSupplierOrderId(supplierResponse);

    const supplierStatus =
      getSupplierStatus(supplierResponse);

    // Sin ID de proveedor no es posible consultar
    // esta orden mediante el reconciliador.
    if (!supplierOrderId) {
      await updateOrder(orderId, {
        status: "SUPPLIER_PENDING",
        supplier_response: {
          http_status: supplierHttpStatus,
          response: supplierResponse,
          supplier_status: supplierStatus,
          reconciliation_required: true,
        },
      }).catch(() => null);

      return json({
        ok: true,
        orderNumber: orderId,
        supplierOrderId: null,
        status: "SUPPLIER_PENDING",
        message:
          "El proveedor no devolvió un ID de orden verificable. La solicitud necesita revisión. No repitas la orden.",
      });
    }

    // --------------------------------------------------
    // 12. GUARDAR ID DEL PROVEEDOR ANTES DE COMPLETAR
    // El cron universal podrá reconciliar esta orden.
    // --------------------------------------------------

    try {
      await updateOrder(orderId, {
        supplier_order_id: supplierOrderId,
        supplier_response: {
          http_status: supplierHttpStatus,
          response: supplierResponse,
          supplier_status: supplierStatus,
        },
        status: "PROCESSING",
      });
    } catch (error: any) {
      // El proveedor ya tiene una referencia.
      // No se vuelve a enviar el pedido.
      return json(
        {
          ok: false,
          error:
            "FazerCards recibió la orden, pero no se pudo guardar su referencia. No repitas la solicitud.",
          orderNumber: orderId,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
        },
        500
      );
    }

    // --------------------------------------------------
    // 13. SI FAZERCARDS CONFIRMA COMPLETADO
    // Usar RPC universal por ID de nuestra orden.
    // --------------------------------------------------

    if (isCompletedStatus(supplierStatus)) {
      try {
        await completeOrder(orderId);

        const { data: completedOrder, error: readError } =
          await supabaseAdmin
            .from("topup_orders")
            .select("*")
            .eq("id", orderId)
            .single();

        if (readError || !completedOrder) {
          throw new Error(
            "No se pudo verificar el estado final de la orden."
          );
        }

        return json(
          orderResponse(completedOrder, {
            message: "Orden completada correctamente.",
          })
        );
      } catch (error: any) {
        // La referencia del proveedor ya está guardada.
        // El cron podrá intentar completar nuevamente.
        return json(
          {
            ok: true,
            orderNumber: orderId,
            supplierOrderId,
            status: "PROCESSING",
            message:
              "El proveedor confirmó la orden. Está pendiente de finalizar su actualización interna.",
          }
        );
      }
    }

    // --------------------------------------------------
    // 14. RESTO DE ESTADOS
    // created / processing / failed / refund / unknown
    //
    // Se dejan para que el cron consulte el estado
    // directamente a FazerCards.
    // --------------------------------------------------

    const finalStatus = [
      "created",
      "processing",
    ].includes(supplierStatus)
      ? "PROCESSING"
      : "SUPPLIER_PENDING";

    await updateOrder(orderId, {
      status: finalStatus,
      supplier_order_id: supplierOrderId,
      supplier_response: {
        http_status: supplierHttpStatus,
        response: supplierResponse,
        supplier_status: supplierStatus,
      },
    });

    return json({
      ok: true,
      orderNumber: orderId,
      supplierOrderId,
      status: finalStatus,
      message:
        "Orden recibida y pendiente de confirmación del proveedor.",
    });
  } catch (error: any) {
    console.error(
      "[FREE FIRE LATAM TOPUP ERROR]",
      error?.message || error
    );

    return json(
      {
        ok: false,
        error:
          error?.message ||
          "Ocurrió un error interno al procesar la orden.",
      },
      500
    );
  }
}
