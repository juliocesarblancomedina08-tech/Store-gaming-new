
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY;

const FAZERCARDS_ORIGIN =
  process.env.FAZERCARDS_ORIGIN?.trim();

const CATEGORY_ID = "lords_mobile";

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

// -----------------------------------------------------------------------------
// OFERTAS DE LORDS MOBILE
// Los precios de venta incluyen 0.20 USD sobre el precio del proveedor.
// -----------------------------------------------------------------------------

const LORDS_MOBILE_OFFERS = [
  {
    id: "lm-weekly-diamond-pass",
    supplierOfferId: "weekly_diamond_pass",
    name: "Weekly Diamond Pass",
    price: 2.1848,
    supplierPrice: 1.9848,
  },
  {
    id: "lm-395",
    supplierOfferId: "395_diamonds",
    name: "395 Diamonds",
    price: 4.1696,
    supplierPrice: 3.9696,
  },
  {
    id: "lm-785",
    supplierOfferId: "785_diamonds",
    name: "785 Diamonds",
    price: 8.1492,
    supplierPrice: 7.9492,
  },
  {
    id: "lm-1179",
    supplierOfferId: "1179_diamonds",
    name: "1179 Diamonds",
    price: 12.1187,
    supplierPrice: 11.9187,
  },
  {
    id: "lm-monthly-diamond-pass",
    supplierOfferId: "monthly_diamond_pass",
    name: "Monthly Diamond Pass",
    price: 20.0276,
    supplierPrice: 19.8276,
  },
  {
    id: "lm-1964",
    supplierOfferId: "1964_diamonds",
    name: "1964 Diamonds",
    price: 20.0276,
    supplierPrice: 19.8276,
  },
  {
    id: "lm-3928",
    supplierOfferId: "3928_diamonds",
    name: "3928 Diamonds",
    price: 39.9257,
    supplierPrice: 39.7257,
  },
  {
    id: "lm-7857",
    supplierOfferId: "7857_diamonds",
    name: "7857 Diamonds",
    price: 79.6515,
    supplierPrice: 79.4515,
  },
  {
    id: "lm-11785",
    supplierOfferId: "11785_diamonds",
    name: "11785 Diamonds",
    price: 119.3772,
    supplierPrice: 119.1772,
  },
  {
    id: "lm-19642",
    supplierOfferId: "19642_diamonds",
    name: "19642 Diamonds",
    price: 198.8286,
    supplierPrice: 198.6286,
  },
] as const;

// -----------------------------------------------------------------------------
// OBTENER USUARIO AUTENTICADO
// -----------------------------------------------------------------------------

async function getUserFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken = authorization.substring(7);

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  return user;
}

// -----------------------------------------------------------------------------
// BUSCAR OFERTA LOCAL
// -----------------------------------------------------------------------------

function findLocalOffer(offerId: string) {
  return LORDS_MOBILE_OFFERS.find(
    (offer) =>
      offer.id === offerId ||
      offer.supplierOfferId === offerId,
  );
}

// -----------------------------------------------------------------------------
// POST: CREAR ORDEN DE RECARGA
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let orderId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // 1. AUTENTICAR USUARIO
    // -------------------------------------------------------------------------

    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        { status: 401 },
      );
    }

    // -------------------------------------------------------------------------
    // 2. VALIDAR BODY
    // -------------------------------------------------------------------------

    let body: {
      offerId?: unknown;
      playerId?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "El cuerpo de la solicitud no es JSON válido.",
        },
        { status: 400 },
      );
    }

    const { offerId, playerId } = body;

    if (
      typeof offerId !== "string" ||
      !offerId.trim()
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta seleccionar una oferta.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------------------
    // 3. VALIDAR PLAYER ID
    // -------------------------------------------------------------------------

    if (
      typeof playerId !== "string" &&
      typeof playerId !== "number"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debe introducir el ID del jugador.",
        },
        { status: 400 },
      );
    }

    const cleanPlayerId = String(playerId).trim();

    if (
      !cleanPlayerId ||
      cleanPlayerId.length > 100
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "El ID del jugador está vacío o no es válido.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------------------
    // 4. BUSCAR OFERTA AUTORIZADA EN EL SERVIDOR
    // -------------------------------------------------------------------------

    const localOffer = findLocalOffer(offerId.trim());

    if (!localOffer) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La oferta de Lords Mobile no existe en STORE GAMING.",
          receivedOfferId: offerId,
        },
        { status: 400 },
      );
    }

    const supplierOfferId = localOffer.supplierOfferId;

    // -------------------------------------------------------------------------
    // 5. VALIDAR CONFIGURACIÓN
    // -------------------------------------------------------------------------

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("Falta configurar Supabase en el servidor.");

      return NextResponse.json(
        {
          ok: false,
          error: "La configuración de Supabase está incompleta.",
        },
        { status: 500 },
      );
    }

    if (!FAZER_API_KEY) {
      console.error("Falta FAZERCARDS_API_KEY.");

      return NextResponse.json(
        {
          ok: false,
          error: "Falta configurar la clave API de FazerCards.",
        },
        { status: 500 },
      );
    }

    const retailPrice = Number(localOffer.price);
    const supplierPrice = Number(localOffer.supplierPrice);

    if (
      !Number.isFinite(retailPrice) ||
      retailPrice <= 0 ||
      !Number.isFinite(supplierPrice) ||
      supplierPrice <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "El precio de la oferta no es válido.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------------------
    // 6. RESERVAR SALDO DEL USUARIO
    // -------------------------------------------------------------------------

    const {
      error: reserveError,
    } = await supabaseAdmin.rpc(
      "store_gaming_reserve_balance",
      {
        p_user_id: user.id,
        p_amount: retailPrice,
      },
    );

    if (reserveError) {
      console.error(
        "Error reservando saldo:",
        reserveError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            reserveError.message ||
            "No se pudo reservar el saldo.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------------------
    // 7. CREAR ORDEN EN SUPABASE
    // -------------------------------------------------------------------------

    const idempotencyKey = randomUUID();

    const {
      data: createdOrder,
      error: orderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .insert({
        user_id: user.id,

        username:
          user.user_metadata?.username ||
          user.user_metadata?.name ||
          user.email ||
          "Cliente",

        email: user.email,

        game: "Lords Mobile",

        category_id: CATEGORY_ID,

        offer_id: localOffer.id,

        offer_name: localOffer.name,

        player_id: cleanPlayerId,

        retail_price: retailPrice,

        supplier_price: supplierPrice,

        currency: "USD",

        status: "RESERVED",

        idempotency_key: idempotencyKey,

        supplier_fields: {
          player_id: cleanPlayerId,
          supplier_offer_id: supplierOfferId,
        },
      })
      .select("id")
      .single();

    if (orderError || !createdOrder) {
      console.error(
        "Error creando orden de Lords Mobile:",
        orderError,
      );

      const { error: refundError } =
        await supabaseAdmin.rpc(
          "store_gaming_admin_adjust_balance",
          {
            p_user_id: user.id,
            p_amount: retailPrice,
            p_action: "REFUND",
          },
        );

      if (refundError) {
        console.error(
          "Error devolviendo saldo después del fallo de creación:",
          refundError,
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            orderError?.message ||
            "No se pudo crear la orden en Supabase.",
          details: orderError
            ? {
                code: orderError.code || null,
                details: orderError.details || null,
                hint: orderError.hint || null,
              }
            : null,
          refundError: refundError?.message || null,
        },
        { status: 500 },
      );
    }

    orderId = createdOrder.id;

    // -------------------------------------------------------------------------
    // 8. CAMBIAR ORDEN A PROCESSING
    // -------------------------------------------------------------------------

    const { error: processingError } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "PROCESSING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

    if (processingError) {
      console.error(
        "No se pudo actualizar la orden a PROCESSING:",
        processingError,
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.json(
        {
          ok: true,
          orderId,
          status: "SUPPLIER_PENDING",
          message:
            "La orden quedó pendiente de verificación. No repitas la compra.",
        },
        { status: 202 },
      );
    }

    // -------------------------------------------------------------------------
    // 9. PREPARAR PETICIÓN PARA FAZERCARDS
    // -------------------------------------------------------------------------

    const fazerOrderUrl =
      `${FAZER_API_BASE}/topups/order`;

    const fazerPayload = {
      category_id: CATEGORY_ID,
      offer_id: supplierOfferId,
      fields: {
        player_id: cleanPlayerId,
      },
    };

    console.log(
      "Enviando orden de Lords Mobile a FazerCards:",
      JSON.stringify({
        category_id: CATEGORY_ID,
        offer_id: supplierOfferId,
        orderId,
      }),
    );

    // -------------------------------------------------------------------------
    // 10. ENVIAR ORDEN AL PROVEEDOR
    // -------------------------------------------------------------------------

    let fazerResponse: Response;

    try {
      fazerResponse = await fetch(fazerOrderUrl, {
        method: "POST",
        headers: {
          "X-API-Key": FAZER_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(FAZERCARDS_ORIGIN
            ? {
                Origin: new URL(FAZERCARDS_ORIGIN).origin,
              }
            : {}),
        },
        body: JSON.stringify(fazerPayload),
        cache: "no-store",
      });
    } catch (fetchError) {
      console.error(
        "No se pudo confirmar la respuesta de FazerCards:",
        fetchError,
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          supplier_response: {
            error: "NETWORK_ERROR",
            message:
              "No se pudo confirmar si FazerCards recibió la orden.",
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.json(
        {
          ok: true,
          orderId,
          status: "SUPPLIER_PENDING",
          message:
            "No se pudo confirmar el resultado con el proveedor. El saldo queda reservado mientras se verifica la orden. No repitas la compra.",
        },
        { status: 202 },
      );
    }

    // -------------------------------------------------------------------------
    // 11. LEER RESPUESTA DEL PROVEEDOR
    // -------------------------------------------------------------------------

    const fazerText = await fazerResponse.text();

    let fazerResult: any;

    try {
      fazerResult = JSON.parse(fazerText);
    } catch {
      fazerResult = {
        raw: fazerText.slice(0, 5000),
      };
    }

    const now = () => new Date().toISOString();

    // -------------------------------------------------------------------------
    // 12. MANEJAR RESPUESTA HTTP NO EXITOSA
    // -------------------------------------------------------------------------

    if (!fazerResponse.ok) {
      console.error(
        "FazerCards rechazó o no confirmó la orden:",
        fazerResponse.status,
        fazerResult,
      );

      const rejectedSupplierOrderId =
        fazerResult?.order?.id ??
        fazerResult?.data?.order?.id ??
        fazerResult?.order_id ??
        fazerResult?.orderId ??
        fazerResult?.data?.order_id ??
        fazerResult?.data?.orderId ??
        fazerResult?.data?.id ??
        fazerResult?.id ??
        null;

      const ambiguous =
        fazerResponse.status >= 500 ||
        fazerResponse.status === 429;

      const { error: saveError } =
        await supabaseAdmin
          .from("topup_orders")
          .update({
            ...(rejectedSupplierOrderId
              ? {
                  supplier_order_id: String(
                    rejectedSupplierOrderId,
                  ),
                }
              : {}),
            supplier_response: fazerResult,
            status: ambiguous
              ? "SUPPLIER_PENDING"
              : "FAILED",
            ...(!ambiguous ? { failed_at: now() } : {}),
            updated_at: now(),
          })
          .eq("id", orderId);

      if (saveError) {
        console.error(
          "Error guardando respuesta de FazerCards:",
          saveError,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "No se pudo guardar la respuesta del proveedor. Revisa la orden antes de repetirla.",
            orderId,
          },
          { status: 500 },
        );
      }

      if (ambiguous) {
        return NextResponse.json(
          {
            ok: true,
            orderId,
            supplierOrderId: rejectedSupplierOrderId
              ? String(rejectedSupplierOrderId)
              : null,
            status: "SUPPLIER_PENDING",
            message:
              "Respuesta temporal del proveedor. El saldo queda reservado hasta verificar el estado real de la orden.",
          },
          { status: 202 },
        );
      }

      const { error: refundError } =
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id: orderId,
          },
        );

      if (refundError) {
        console.error(
          "Error devolviendo saldo tras rechazo definitivo:",
          refundError,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "FazerCards rechazó la orden, pero el reembolso necesita revisión.",
            orderId,
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            fazerResult?.message ||
            fazerResult?.error ||
            "FazerCards rechazó la orden.",
          orderId,
          supplierOrderId: rejectedSupplierOrderId
            ? String(rejectedSupplierOrderId)
            : null,
          status: "REFUNDED",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------------------
    // 13. OBTENER ID Y ESTADO DEL PROVEEDOR
    // -------------------------------------------------------------------------

    const supplierOrderId =
      fazerResult?.order?.id ??
      fazerResult?.data?.order?.id ??
      fazerResult?.order_id ??
      fazerResult?.orderId ??
      fazerResult?.data?.order_id ??
      fazerResult?.data?.orderId ??
      fazerResult?.data?.id ??
      fazerResult?.id ??
      null;

    const supplierStatus = String(
      fazerResult?.order?.status ??
        fazerResult?.data?.order?.status ??
        fazerResult?.status ??
        fazerResult?.data?.status ??
        "PENDING",
    )
      .trim()
      .toUpperCase();

    // -------------------------------------------------------------------------
    // 14. RESPUESTA EXITOSA SIN ID DE ORDEN DEL PROVEEDOR
    // -------------------------------------------------------------------------

    if (!supplierOrderId) {
      const { error: pendingError } =
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "SUPPLIER_PENDING",
            supplier_response: fazerResult,
            updated_at: now(),
          })
          .eq("id", orderId);

      if (pendingError) {
        console.error(
          "Error guardando orden pendiente:",
          pendingError,
        );
      }

      return NextResponse.json(
        {
          ok: true,
          orderId,
          status: "SUPPLIER_PENDING",
          message:
            "FazerCards respondió, pero no devolvió un ID de orden. Se requiere verificar el estado antes de repetir la compra.",
        },
        { status: 202 },
      );
    }

    // -------------------------------------------------------------------------
    // 15. GUARDAR ID Y RESPUESTA DE FAZERCARDS
    // -------------------------------------------------------------------------

    const { error: supplierSaveError } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id: String(supplierOrderId),
          supplier_response: fazerResult,
          updated_at: now(),
        })
        .eq("id", orderId);

    if (supplierSaveError) {
      console.error(
        "Error guardando ID del proveedor:",
        supplierSaveError,
      );

      return NextResponse.json(
        {
          ok: true,
          orderId,
          supplierOrderId: String(supplierOrderId),
          status: "SUPPLIER_PENDING",
          message:
            "El proveedor recibió la orden, pero falta verificar el registro. No repitas la compra.",
        },
        { status: 202 },
      );
    }

    // -------------------------------------------------------------------------
    // 16. RECARGA COMPLETADA
    // -------------------------------------------------------------------------

    if (
      [
        "COMPLETED",
        "COMPLETE",
        "SUCCESS",
        "SUCCESSFUL",
        "SUCCEEDED",
        "DELIVERED",
        "DONE",
      ].includes(supplierStatus)
    ) {
      const { error: completeError } =
        await supabaseAdmin.rpc(
          "complete_topup_order",
          {
            p_supplier_order_id: String(supplierOrderId),
          },
        );

      if (completeError) {
        console.error(
          "Error completando orden confirmada:",
          completeError,
        );

        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "SUPPLIER_PENDING",
            updated_at: now(),
          })
          .eq("id", orderId);

        return NextResponse.json(
          {
            ok: true,
            orderId,
            supplierOrderId: String(supplierOrderId),
            status: "SUPPLIER_PENDING",
            message:
              "FazerCards confirmó la recarga. STORE GAMING verificará el estado final.",
          },
          { status: 202 },
        );
      }

      const {
        data: finalOrder,
        error: finalOrderError,
      } = await supabaseAdmin
        .from("topup_orders")
        .select("status, refunded_at")
        .eq("id", orderId)
        .maybeSingle();

      if (
        finalOrderError ||
        !finalOrder ||
        String(finalOrder.status ?? "").toUpperCase() !==
          "COMPLETED" ||
        finalOrder.refunded_at
      ) {
        console.error(
          "No se pudo verificar la finalización:",
          finalOrderError,
        );

        return NextResponse.json(
          {
            ok: true,
            orderId,
            supplierOrderId: String(supplierOrderId),
            status: "SUPPLIER_PENDING",
            message:
              "La recarga está pendiente de reconciliación.",
          },
          { status: 202 },
        );
      }

      return NextResponse.json({
        ok: true,
        orderId,
        supplierOrderId: String(supplierOrderId),
        status: "COMPLETED",
        message: "Recarga de Lords Mobile completada correctamente.",
      });
    }

    // -------------------------------------------------------------------------
    // 17. REEMBOLSO NO CONFIRMADO
    // -------------------------------------------------------------------------

    if (supplierStatus === "REFUND_FAILED") {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          supplier_response: {
            ...(
              fazerResult &&
              typeof fazerResult === "object" &&
              !Array.isArray(fazerResult)
                ? fazerResult
                : { response: fazerResult }
            ),
            normalized_status: supplierStatus,
            requires_reconciliation: true,
          },
          updated_at: now(),
        })
        .eq("id", orderId);

      return NextResponse.json(
        {
          ok: true,
          orderId,
          supplierOrderId: String(supplierOrderId),
          status: "SUPPLIER_PENDING",
          message:
            "El proveedor informó REFUND_FAILED. La orden requiere verificación; no se realizó un reembolso automático.",
        },
        { status: 202 },
      );
    }

    // -------------------------------------------------------------------------
    // 18. FALLO DEFINITIVO O REEMBOLSO CONFIRMADO
    // -------------------------------------------------------------------------

    if (
      [
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
      ].includes(supplierStatus)
    ) {
      const { error: refundError } =
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id: orderId,
          },
        );

      if (refundError) {
        console.error(
          "Error devolviendo saldo tras fallo confirmado:",
          refundError,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "El proveedor confirmó el fallo, pero el reembolso necesita revisión.",
            orderId,
          },
          { status: 500 },
        );
      }

      const {
        data: refundedOrder,
        error: verifyRefundError,
      } = await supabaseAdmin
        .from("topup_orders")
        .select("status, refunded_at")
        .eq("id", orderId)
        .maybeSingle();

      if (
        verifyRefundError ||
        !refundedOrder ||
        String(refundedOrder.status ?? "").toUpperCase() !==
          "REFUNDED" ||
        !refundedOrder.refunded_at
      ) {
        console.error(
          "No se pudo verificar el reembolso:",
          verifyRefundError,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "Se solicitó el reembolso, pero no se pudo confirmar en la base de datos.",
            orderId,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: false,
        orderId,
        supplierOrderId: String(supplierOrderId),
        status: "REFUNDED",
        message: [
          "REFUND",
          "REFUNDED",
          "REFUND_SUCCESS",
        ].includes(supplierStatus)
          ? "STORE GAMING confirmó la devolución del saldo."
          : "La recarga falló y STORE GAMING confirmó la devolución del saldo.",
      });
    }

    // -------------------------------------------------------------------------
    // 19. ORDEN CONFIRMADA POR EL PROVEEDOR
    // -------------------------------------------------------------------------

    if (
      ["CONFIRMED", "ACCEPTED"].includes(supplierStatus)
    ) {
      const { error: confirmedError } =
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "CONFIRMED",
            updated_at: now(),
          })
          .eq("id", orderId);

      if (confirmedError) {
        console.error(
          "Error guardando estado CONFIRMED:",
          confirmedError,
        );

        return NextResponse.json(
          {
            ok: true,
            orderId,
            supplierOrderId: String(supplierOrderId),
            status: "SUPPLIER_PENDING",
            message:
              "La orden fue aceptada por el proveedor y requiere verificación.",
          },
          { status: 202 },
        );
      }

      return NextResponse.json({
        ok: true,
        orderId,
        supplierOrderId: String(supplierOrderId),
        status: "CONFIRMED",
        message: "La orden fue confirmada por FazerCards.",
      });
    }

    // -------------------------------------------------------------------------
    // 20. PENDING / PROCESSING / OTROS ESTADOS
    // -------------------------------------------------------------------------

    const { error: pendingUpdateError } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          updated_at: now(),
        })
        .eq("id", orderId);

    if (pendingUpdateError) {
      console.error(
        "Error guardando estado pendiente:",
        pendingUpdateError,
      );
    }

    return NextResponse.json(
      {
        ok: true,
        orderId,
        supplierOrderId: String(supplierOrderId),
        status: "SUPPLIER_PENDING",
        message:
          "La orden fue enviada y está pendiente de procesamiento.",
      },
      { status: 202 },
    );
  } catch (error) {
    console.error(
      "Lords Mobile API error; el resultado del proveedor puede ser desconocido:",
      error,
    );

    if (orderId) {
      const { error: saveError } =
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "SUPPLIER_PENDING",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

      if (saveError) {
        console.error(
          "Error guardando orden pendiente:",
          saveError,
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        orderId,
        status: orderId ? "SUPPLIER_PENDING" : "ERROR",
        message: orderId
          ? "No se pudo confirmar el resultado. El saldo queda reservado hasta verificar la orden. No repitas la compra."
          : "No se pudo iniciar la orden.",
      },
      { status: orderId ? 202 : 500 },
    );
  }
}
