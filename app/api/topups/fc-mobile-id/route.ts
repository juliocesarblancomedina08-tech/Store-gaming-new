import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID = "eafc_mobile_id";

const STORE_MARGIN = 0.20;

/*
 * ============================================================
 * CATÁLOGO EAFC MOBILE INDONESIA
 * ============================================================
 *
 * supplierPrice = precio real de FazerCards
 * price         = precio para el cliente
 */

const OFFERS = [
  {
    id: "40_fc_points",
    name: "40 FC Points",
    display: "40 FC POINTS",
    icon: "⚽",
    supplierPrice: 0.3426,
    price: 0.5426,
  },
  {
    id: "100_fc_points",
    name: "100 FC Points",
    display: "100 FC POINTS",
    icon: "⚽",
    supplierPrice: 0.8463,
    price: 1.0463,
  },
  {
    id: "520_fc_points",
    name: "520 FC Points",
    display: "520 FC POINTS",
    icon: "⚽",
    supplierPrice: 4.1912,
    price: 4.3912,
  },
  {
    id: "1070_fc_points",
    name: "1070 FC Puntos",
    display: "1070 FC POINTS",
    icon: "⚽",
    supplierPrice: 8.4227,
    price: 8.6227,
  },
  {
    id: "2200_fc_points",
    name: "2200 FC Points",
    display: "2200 FC POINTS",
    icon: "⚽",
    supplierPrice: 17.4298,
    price: 17.6298,
  },
  {
    id: "5750_fc_points",
    name: "5750 FC Points",
    display: "5750 FC POINTS",
    icon: "⚽",
    supplierPrice: 42.3352,
    price: 42.5352,
  },
  {
    id: "12000_fc_points",
    name: "12000 FC Points",
    display: "12000 FC POINTS",
    icon: "⚽",
    supplierPrice: 84.7308,
    price: 84.9308,
  },
  {
    id: "39_silver",
    name: "39 Silver",
    display: "39 SILVER",
    icon: "🪙",
    supplierPrice: 0.3426,
    price: 0.5426,
  },
  {
    id: "99_silver",
    name: "99 Silver",
    display: "99 SILVER",
    icon: "🪙",
    supplierPrice: 0.8463,
    price: 1.0463,
  },
  {
    id: "499_silver",
    name: "499 Silver",
    display: "499 SILVER",
    icon: "🪙",
    supplierPrice: 4.1912,
    price: 4.3912,
  },
  {
    id: "999_plata",
    name: "999 Plata",
    display: "999 SILVER",
    icon: "🪙",
    supplierPrice: 8.4227,
    price: 8.6227,
  },
  {
    id: "1999_plata",
    name: "1999 Plata",
    display: "1999 SILVER",
    icon: "🪙",
    supplierPrice: 17.4298,
    price: 17.6298,
  },
  {
    id: "4999_plata",
    name: "4999 Plata",
    display: "4999 SILVER",
    icon: "🪙",
    supplierPrice: 42.3352,
    price: 42.5352,
  },
  {
    id: "9999_plata",
    name: "9999 Plata",
    display: "9999 SILVER",
    icon: "🪙",
    supplierPrice: 84.7308,
    price: 84.9308,
  },
] as const;

/*
 * ============================================================
 * BEARER TOKEN
 * ============================================================
 */

function getBearerToken(request: NextRequest) {
  const authorization =
    request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim();
}

/*
 * ============================================================
 * OBTENER ID DE ORDEN DE FAZERCARDS
 * ============================================================
 */

function getSupplierOrderId(data: any): string | null {
  const candidates = [
    data?.order_id,
    data?.orderId,
    data?.supplier_order_id,
    data?.supplierOrderId,
    data?.id,

    data?.data?.order_id,
    data?.data?.orderId,
    data?.data?.supplier_order_id,
    data?.data?.supplierOrderId,
    data?.data?.id,

    data?.order?.order_id,
    data?.order?.orderId,
    data?.order?.supplier_order_id,
    data?.order?.supplierOrderId,
    data?.order?.id,
  ];

  for (const value of candidates) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value);
    }
  }

  return null;
}

/*
 * ============================================================
 * OBTENER ESTADO
 * ============================================================
 */

function getSupplierStatus(data: any): string | null {
  const candidates = [
    data?.status,
    data?.order_status,
    data?.orderStatus,

    data?.data?.status,
    data?.data?.order_status,
    data?.data?.orderStatus,

    data?.order?.status,
    data?.order?.order_status,
    data?.order?.orderStatus,
  ];

  for (const value of candidates) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim().toLowerCase();
    }
  }

  return null;
}

/*
 * ============================================================
 * ESTADOS RECHAZADOS
 * ============================================================
 */

function isSupplierRejected(status: string | null) {
  if (!status) {
    return false;
  }

  return [
    "rejected",
    "reject",
    "failed",
    "failure",
    "cancelled",
    "canceled",
    "declined",
    "error",
  ].includes(status);
}

/*
 * ============================================================
 * ESTADOS COMPLETADOS
 * ============================================================
 */

function isSupplierCompleted(status: string | null) {
  if (!status) {
    return false;
  }

  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "done",
  ].includes(status);
}

/*
 * ============================================================
 * PRECIO
 * ============================================================
 */

function getRetailPrice(
  offer: (typeof OFFERS)[number]
) {
  return Number(
    Number(
      offer.supplierPrice + STORE_MARGIN
    ).toFixed(4)
  );
}

/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(request: NextRequest) {
  let insertedOrderId: string | null = null;

  try {
    /*
     * ========================================================
     * AUTH
     * ========================================================
     */

    const accessToken =
      getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "No autorizado. Inicie sesión.",
        },
        { status: 401 }
      );
    }

    const {
      data: userData,
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !userData?.user
    ) {
      return NextResponse.json(
        {
          error:
            "Sesión inválida o expirada.",
        },
        { status: 401 }
      );
    }

    const user = userData.user;

    /*
     * ========================================================
     * BODY
     * ========================================================
     */

    const body = await request.json();

    const offerId =
      String(body?.offerId || "").trim();

    const playerId =
      String(body?.playerId || "").trim();

    const idempotencyKey =
      String(
        body?.idempotencyKey || ""
      ).trim();

    const requestedRetailPrice =
      Number(body?.retailPrice);

    /*
     * ========================================================
     * VALIDACIONES
     * ========================================================
     */

    if (!offerId) {
      return NextResponse.json(
        {
          error:
            "Debe seleccionar una oferta.",
        },
        { status: 400 }
      );
    }

    if (!playerId) {
      return NextResponse.json(
        {
          error:
            "Debe introducir el ID del jugador.",
        },
        { status: 400 }
      );
    }

    if (!/^[0-9]+$/.test(playerId)) {
      return NextResponse.json(
        {
          error:
            "El ID del jugador solo puede contener números.",
        },
        { status: 400 }
      );
    }

    if (
      playerId.length < 4 ||
      playerId.length > 20
    ) {
      return NextResponse.json(
        {
          error:
            "El ID del jugador parece no tener un formato válido.",
        },
        { status: 400 }
      );
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        {
          error:
            "Falta la clave de idempotencia.",
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * OFERTA
     * ========================================================
     */

    const offer =
      OFFERS.find(
        (item) => item.id === offerId
      );

    if (!offer) {
      return NextResponse.json(
        {
          error:
            "La oferta seleccionada no existe.",
        },
        { status: 400 }
      );
    }

    const retailPrice =
      getRetailPrice(offer);

    /*
     * ========================================================
     * VALIDAR PRECIO
     * ========================================================
     */

    if (
      !Number.isFinite(
        requestedRetailPrice
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El precio de la oferta no es válido.",
        },
        { status: 400 }
      );
    }

    if (
      Math.abs(
        requestedRetailPrice -
          retailPrice
      ) > 0.0001
    ) {
      return NextResponse.json(
        {
          error:
            "El precio de la oferta no coincide.",
          expected:
            retailPrice,
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * IDEMPOTENCIA
     * ========================================================
     */

    const {
      data: existingOrder,
      error:
        existingOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .select(
          "id,status,supplier_order_id,retail_price"
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "idempotency_key",
          idempotencyKey
        )
        .maybeSingle();

    if (existingOrderError) {
      console.error(
        "Error comprobando idempotencia:",
        existingOrderError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo comprobar la orden.",
          details:
            existingOrderError.message,
        },
        { status: 500 }
      );
    }

    if (existingOrder) {
      return NextResponse.json(
        {
          ok: true,
          duplicate: true,
          order: existingOrder,
          orderNumber:
            existingOrder.id,
        },
        { status: 200 }
      );
    }

    /*
     * ========================================================
     * PERFIL / BALANCE
     * ========================================================
     */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id,email,balance"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (profileError) {
      console.error(
        "Error obteniendo perfil:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo obtener el perfil.",
          details:
            profileError.message,
        },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Perfil de usuario no encontrado.",
        },
        { status: 404 }
      );
    }

    const balance =
      Number(
        profile.balance || 0
      );

    if (
      !Number.isFinite(balance) ||
      balance < retailPrice
    ) {
      return NextResponse.json(
        {
          error:
            "Saldo insuficiente.",
          balance,
          required:
            retailPrice,
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * CREAR ORDEN
     * ========================================================
     */

    const {
      data: insertedOrder,
      error: insertError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id:
            user.id,

          game:
            "EAFC Mobile (ID)",

          category_id:
            CATEGORY_ID,

          offer_id:
            offer.id,

          offer_name:
            offer.name,

          player_id:
            playerId,

          currency:
            "USD",

          retail_price:
            retailPrice,

          supplier_price:
            Number(
              offer.supplierPrice
            ),

          status:
            "RESERVED",

          idempotency_key:
            idempotencyKey,

          supplier_fields: {
            player_id:
              playerId,
          },
        })
        .select("*")
        .single();

    if (
      insertError ||
      !insertedOrder
    ) {
      console.error(
        "Error creando topup_order:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo crear la orden.",
          details:
            insertError?.message,
        },
        { status: 500 }
      );
    }

    insertedOrderId =
      insertedOrder.id;

    /*
     * ========================================================
     * RESERVAR SALDO
     * ========================================================
     */

    const {
      data: reserveResult,
      error: reserveError,
    } =
      await supabaseAdmin.rpc(
        "reserve_topup_balance",
        {
          p_user_id:
            user.id,

          p_amount:
            retailPrice,
        }
      );

    if (reserveError) {
      console.error(
        "Error reservando saldo:",
        reserveError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "FAILED",

          supplier_response: {
            reserve_error:
              reserveError.message,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return NextResponse.json(
        {
          error:
            reserveError.message ||
            "No se pudo reservar el saldo.",
        },
        { status: 400 }
      );
    }

    if (reserveResult === false) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "FAILED",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return NextResponse.json(
        {
          error:
            "Saldo insuficiente.",
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * API KEY FAZERCARDS
     * ========================================================
     */

    if (!FAZER_API_KEY) {
      console.error(
        "Falta FAZERCARDS_API_KEY."
      );

      await supabaseAdmin.rpc(
        "refund_topup_balance",
        {
          p_order_id:
            insertedOrderId,
        }
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REFUNDED",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return NextResponse.json(
        {
          error:
            "La configuración del proveedor está incompleta.",
        },
        { status: 500 }
      );
    }

    /*
     * ========================================================
     * PAYLOAD FAZERCARDS
     * ========================================================
     *
     * IMPORTANTE:
     *
     * El precio de STORE GAMING NO se envía
     * al proveedor.
     *
     * FazerCards recibe solamente:
     *
     * category_id
     * offer_id
     * fields.player_id
     */

    const supplierPayload = {
      category_id:
        CATEGORY_ID,

      offer_id:
        offer.id,

      fields: {
        player_id:
          playerId,
      },
    };

    console.log(
      "EAFC MOBILE -> FAZERCARDS:",
      supplierPayload
    );

    /*
     * ========================================================
     * ENVIAR PEDIDO
     * ========================================================
     */

    let supplierResponse: Response;

    try {
      supplierResponse =
        await fetch(
          `${FAZER_API_BASE}/topups/order`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              "X-API-Key":
                FAZER_API_KEY,

              "Idempotency-Key":
                idempotencyKey,

              "User-Agent":
                "STORE-GAMING/1.0",
            },

            body:
              JSON.stringify(
                supplierPayload
              ),

            cache:
              "no-store",
          }
        );
    } catch (supplierNetworkError) {
      console.error(
        "Error de red con FazerCards:",
        supplierNetworkError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response: {
            network_error:
              supplierNetworkError instanceof
              Error
                ? supplierNetworkError.message
                : String(
                    supplierNetworkError
                  ),

            request:
              supplierPayload,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return NextResponse.json(
        {
          ok: true,

          pending: true,

          orderNumber:
            insertedOrder.id,

          message:
            "El pedido quedó pendiente de confirmación del proveedor.",
        },
        { status: 202 }
      );
    }

    /*
     * ========================================================
     * LEER RESPUESTA
     * ========================================================
     */

    const responseText =
      await supplierResponse.text();

    let supplierData: any = null;

    try {
      supplierData =
        responseText
          ? JSON.parse(
              responseText
            )
          : null;
    } catch {
      supplierData = {
        raw:
          responseText,
      };
    }

    console.log(
      "RESPUESTA EAFC MOBILE:",
      {
        httpStatus:
          supplierResponse.status,

        supplierData,
      }
    );

    const supplierOrderId =
      getSupplierOrderId(
        supplierData
      );

    const supplierStatus =
      getSupplierStatus(
        supplierData
      );

    /*
     * ========================================================
     * GUARDAR RESPUESTA
     * ========================================================
     */

    await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_order_id:
          supplierOrderId,

        supplier_response:
          supplierData,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        insertedOrderId
      );

    /*
     * ========================================================
     * RECHAZADO
     * ========================================================
     */

    if (
      !supplierResponse.ok ||
      isSupplierRejected(
        supplierStatus
      )
    ) {
      console.error(
        "FAZERCARDS RECHAZÓ EAFC MOBILE:",
        {
          httpStatus:
            supplierResponse.status,

          supplierStatus,

          supplierData,
        }
      );

      const {
        error:
          refundError,
      } =
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id:
              insertedOrderId,
          }
        );

      if (refundError) {
        console.error(
          "Error haciendo refund:",
          refundError
        );

        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "REFUND_PENDING",

            supplier_order_id:
              supplierOrderId,

            supplier_response:
              supplierData,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            insertedOrderId
          );

        return NextResponse.json(
          {
            error:
              "El proveedor rechazó la orden y el reembolso quedó pendiente.",

            supplier:
              supplierData,
          },
          { status: 502 }
        );
      }

      const supplierMessage =
        supplierData?.error ||
        supplierData?.message ||
        supplierData?.detail ||
        "El proveedor rechazó la orden.";

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REFUNDED",

          supplier_order_id:
            supplierOrderId,

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return NextResponse.json(
        {
          error:
            `El proveedor rechazó la orden: ${supplierMessage}. El saldo fue reembolsado.`,

          supplier:
            supplierData,

          orderNumber:
            insertedOrder.id,
        },
        { status: 502 }
      );
    }

    /*
     * ========================================================
     * SIN ORDER ID
     * ========================================================
     */

    if (!supplierOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return NextResponse.json(
        {
          ok: true,

          pending: true,

          orderNumber:
            insertedOrder.id,

          message:
            "El pedido fue enviado y quedó pendiente de confirmación.",
        },
        { status: 202 }
      );
    }

    /*
     * ========================================================
     * COMPLETADO
     * ========================================================
     */

    if (
      isSupplierCompleted(
        supplierStatus
      )
    ) {
      const {
        error:
          completeError,
      } =
        await supabaseAdmin.rpc(
          "complete_topup_order",
          {
            p_supplier_order_id:
              supplierOrderId,
          }
        );

      if (completeError) {
        console.error(
          "Error completando orden:",
          completeError
        );

        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "SUPPLIER_PENDING",

            supplier_order_id:
              supplierOrderId,

            supplier_response:
              supplierData,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            insertedOrderId
          );

        return NextResponse.json(
          {
            ok: true,

            pending: true,

            orderNumber:
              supplierOrderId,

            supplierOrderId,

            message:
              "La orden fue aceptada por el proveedor y está pendiente de confirmación.",
          },
          { status: 202 }
        );
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "COMPLETED",

          supplier_order_id:
            supplierOrderId,

          supplier_response:
            supplierData,

          completed_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return NextResponse.json(
        {
          ok: true,

          status:
            "COMPLETED",

          orderNumber:
            supplierOrderId,

          supplierOrderId,

          order: {
            ...insertedOrder,

            status:
              "COMPLETED",

            supplier_order_id:
              supplierOrderId,
          },
        },
        { status: 200 }
      );
    }

    /*
     * ========================================================
     * PENDIENTE / PROCESSING
     * ========================================================
     */

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status:
          "SUPPLIER_PENDING",

        supplier_order_id:
          supplierOrderId,

        supplier_response:
          supplierData,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        insertedOrderId
      );

    return NextResponse.json(
      {
        ok: true,

        pending: true,

        status:
          "SUPPLIER_PENDING",

        orderNumber:
          supplierOrderId,

        supplierOrderId,

        order: {
          ...insertedOrder,

          status:
            "SUPPLIER_PENDING",

          supplier_order_id:
            supplierOrderId,
        },

        message:
          "Pedido enviado correctamente al proveedor y pendiente de confirmación.",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error(
      "ERROR GENERAL EAFC MOBILE:",
      error
    );

    if (insertedOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response: {
            internal_error:
              error instanceof Error
                ? error.message
                : String(error),
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar la orden.",
      },
      { status: 500 }
    );
  }
}
