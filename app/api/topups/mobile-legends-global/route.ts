
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { MOBILE_LEGENDS_GLOBAL } from "../../../../lib/mobile-legends-global";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZER_API_BASE = "https://api.fzr.cards/api/v2";
const CATEGORY_ID = "mobile_legends_global";
const GAME_NAME = "Mobile Legends (Global)";
const VIP_MARKUP = 0.08;

type Offer = {
  id: string;
  name: string;
  retailPrice: number;
  supplierPrice: number;
};

type ExistingOrder = {
  id: string;
  user_id: string;
  status: string | null;
  supplier_order_id: string | null;
  offer_id: string | null;
  offer_name: string | null;
  player_id: string | null;
  retail_price: number | null;
  supplier_price: number | null;
};

const OFFERS: Offer[] = MOBILE_LEGENDS_GLOBAL.offers.map((offer) => ({
  id: offer.id,
  name: offer.name,
  retailPrice: offer.price,
  supplierPrice: offer.supplierPrice,
}));

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: message },
    { status }
  );
}

function getOffer(offerId: string): Offer | null {
  return OFFERS.find((offer) => offer.id === offerId) ?? null;
}

function isSuccessfulSupplierStatus(status: string): boolean {
  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "done",
  ].includes(status.toLowerCase().trim());
}

function isRejectedSupplierStatus(status: string): boolean {
  return [
    "rejected",
    "failed",
    "failure",
    "cancelled",
    "canceled",
    "error",
  ].includes(status.toLowerCase().trim());
}

function getSupplierOrderId(data: any): string | null {
  const value =
    data?.order_id ??
    data?.id ??
    data?.order?.id ??
    data?.data?.order_id ??
    data?.data?.id ??
    null;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function getSupplierStatus(data: any): string {
  return String(
    data?.status ??
    data?.order?.status ??
    data?.data?.status ??
    ""
  ).trim();
}

function orderResponse(order: ExistingOrder) {
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

export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;
  let supplierRequestStarted = false;

  try {
    // 1. AUTENTICACIÓN

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonError("No autorizado.", 401);
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken) {
      return jsonError("Token de acceso inválido.", 401);
    }

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData.user) {
      console.error("ERROR DE AUTENTICACIÓN:", userError);
      return jsonError("Sesión inválida o expirada.", 401);
    }

    const user = userData.user;

    // 2. COMPROBAR CONFIGURACIÓN DEL PROVEEDOR

    const fazerApiKey = process.env.FAZERCARDS_API_KEY;

    if (!fazerApiKey) {
      console.error("Falta FAZERCARDS_API_KEY.");

      return jsonError(
        "El servicio de recargas no está configurado.",
        500
      );
    }

    // 3. LEER DATOS

    const body = await request.json();

    const offerId =
      typeof body?.offerId === "string"
        ? body.offerId.trim()
        : "";

    const playerId =
      typeof body?.playerId === "string"
        ? body.playerId.trim()
        : "";

    const serverId =
      typeof body?.serverId === "string"
        ? body.serverId.trim()
        : "";

    const suppliedKey =
      typeof body?.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";

    if (suppliedKey.length > 200) {
      return jsonError("Clave de idempotencia demasiado larga.");
    }

    const idempotencyKey =
      suppliedKey || crypto.randomUUID();

    // 4. VALIDAR OFERTA

    const offer = getOffer(offerId);

    if (!offer) {
      return jsonError("La oferta seleccionada no existe.");
    }

    // 5. VALIDAR JUGADOR

    if (
      !playerId ||
      !/^[0-9]+$/.test(playerId) ||
      playerId.length < 3 ||
      playerId.length > 20
    ) {
      return jsonError("El ID del jugador no es válido.");
    }

    // 6. VALIDAR SERVIDOR

    if (
      !serverId ||
      !/^[0-9]+$/.test(serverId) ||
      serverId.length > 20
    ) {
      return jsonError("El ID del servidor no es válido.");
    }

    // 7. COMPROBAR IDEMPOTENCIA

    const { data: existingData, error: existingError } =
      await supabaseAdmin
        .from("topup_orders")
        .select(
          [
            "id",
            "user_id",
            "status",
            "supplier_order_id",
            "offer_id",
            "offer_name",
            "player_id",
            "retail_price",
            "supplier_price",
          ].join(",")
        )
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (existingError) {
      console.error("ERROR DE IDEMPOTENCIA:", existingError);

      return jsonError(
        "No se pudo comprobar la orden anterior.",
        500
      );
    }

    // Corrección del error TypeScript:
    const existingOrder =
      existingData as unknown as ExistingOrder | null;

    if (existingOrder) {
      if (existingOrder.user_id !== user.id) {
        return jsonError(
          "La clave de idempotencia ya está siendo utilizada.",
          409
        );
      }

      return orderResponse(existingOrder);
    }

    // 8. COMPROBAR VIP

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("vip_expires_at")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error("ERROR CONSULTANDO VIP:", profileError);

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

    // 9. CALCULAR PRECIOS

    const supplierPrice = Number(offer.supplierPrice);

    const retailPrice = vipActive
      ? Number((supplierPrice + VIP_MARKUP).toFixed(4))
      : Number(offer.retailPrice);

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

    // 10. CREAR ORDEN PENDIENTE

    const username =
      user.user_metadata?.username ??
      user.user_metadata?.user_name ??
      null;

    const email = user.email ?? null;

    const { data: insertedOrder, error: insertError } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,
          username,
          email,
          game: GAME_NAME,
          category_id: CATEGORY_ID,
          offer_id: offer.id,
          offer_name: offer.name,
          player_id: playerId,
          retail_price: retailPrice,
          supplier_price: supplierPrice,
          currency: "USD",
          status: "PENDING",
          idempotency_key: idempotencyKey,
          supplier_fields: {
            player_id: playerId,
            server_id: serverId,
            vip_active: vipActive,
          },
        })
        .select("id")
        .single();

    if (insertError || !insertedOrder) {
      console.error("ERROR CREANDO ORDEN:", insertError);

      const { data: raceOrder } = await supabaseAdmin
        .from("topup_orders")
        .select(
          [
            "id",
            "user_id",
            "status",
            "supplier_order_id",
            "offer_id",
            "offer_name",
            "player_id",
            "retail_price",
            "supplier_price",
          ].join(",")
        )
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (raceOrder) {
        const typedRaceOrder =
          raceOrder as unknown as ExistingOrder;

        if (typedRaceOrder.user_id !== user.id) {
          return jsonError(
            "Clave de idempotencia duplicada.",
            409
          );
        }

        return orderResponse(typedRaceOrder);
      }

      return jsonError("No se pudo crear la orden.", 500);
    }

    internalOrderId = insertedOrder.id;

    // 11. RESERVAR SALDO VINCULADO A LA ORDEN

    const { data: reserveResult, error: reserveError } =
      await supabaseAdmin.rpc(
        "reserve_mobile_legends_global_balance",
        {
          p_order_id: internalOrderId,
        }
      );

    if (reserveError || reserveResult !== true) {
      console.error("ERROR RESERVANDO SALDO:", reserveError);

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "FAILED",
          failed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrderId);

      return jsonError(
        reserveError?.message || "No se pudo reservar el saldo.",
        400
      );
    }

    // 12. ENVIAR PEDIDO A FAZERCARDS

    let supplierResponse: Response;

    try {
      supplierRequestStarted = true;

      supplierResponse = await fetch(
        `${FAZER_API_BASE}/topups/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-API-Key": fazerApiKey,
            "Idempotency-Key": idempotencyKey,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
            Referer: "https://reseller.fazercards.com/",
            Origin: "https://reseller.fazercards.com",
          },
          body: JSON.stringify({
            category_id: CATEGORY_ID,
            offer_id: offer.id,
            fields: {
              player_id: playerId,
              server_id: serverId,
            },
          }),
        }
      );
    } catch (connectionError) {
      console.error(
        "RESULTADO INCIERTO DE FAZERCARDS:",
        connectionError
      );

      // No devolver dinero: el proveedor pudo recibir el pedido.
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          supplier_response: {
            connection_error: true,
            message:
              "No se pudo confirmar la respuesta del proveedor.",
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrderId);

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          status: "SUPPLIER_PENDING",
          message:
            "El pedido fue enviado, pero no se pudo confirmar la respuesta del proveedor. Está pendiente de revisión.",
        },
        { status: 202 }
      );
    }

    // 13. LEER RESPUESTA

    const supplierText = await supplierResponse.text();

    let supplierData: any = null;

    try {
      supplierData = supplierText
        ? JSON.parse(supplierText)
        : null;
    } catch {
      supplierData = {
        raw_response: supplierText,
      };
    }

    console.log(
      "FAZERCARDS MOBILE LEGENDS GLOBAL:",
      supplierResponse.status,
      supplierData
    );

    const supplierOrderId =
      getSupplierOrderId(supplierData);

    const supplierStatus =
      getSupplierStatus(supplierData);

    const rejected =
      isRejectedSupplierStatus(supplierStatus) ||
      supplierData?.ok === false ||
      (
        supplierResponse.status >= 400 &&
        supplierResponse.status < 500 &&
        !supplierOrderId
      );

    // 14. RECHAZO EXPLÍCITO DEL PROVEEDOR

    if (rejected) {
      const { error: saveError } = await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id: supplierOrderId,
          supplier_response: supplierData,
          status: "SUPPLIER_PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrderId);

      if (saveError) {
        console.error("ERROR GUARDANDO RECHAZO:", saveError);

        return jsonError(
          "No se pudo guardar la respuesta del proveedor. La orden permanece pendiente.",
          500
        );
      }

      const { error: refundError } =
        await supabaseAdmin.rpc(
          "refund_mobile_legends_global_balance",
          {
            p_order_id: internalOrderId,
          }
        );

      if (refundError) {
        console.error(
          "ERROR DEVOLVIENDO SALDO:",
          refundError
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "El proveedor rechazó el pedido, pero la devolución necesita revisión.",
            orderNumber: internalOrderId,
            status: "SUPPLIER_PENDING",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: "FazerCards rechazó el pedido.",
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "REFUNDED",
          supplierStatus,
          supplierResponse: supplierData,
        },
        { status: 400 }
      );
    }

    // 15. RESPUESTA HTTP NO EXITOSA O SIN ID

    if (!supplierResponse.ok || !supplierOrderId) {
      const { error: pendingError } = await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id: supplierOrderId,
          supplier_response: supplierData,
          status: "SUPPLIER_PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrderId);

      if (pendingError) {
        console.error(
          "ERROR GUARDANDO PENDIENTE:",
          pendingError
        );
      }

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
          supplierStatus: supplierStatus || "pending",
          message:
            "La respuesta del proveedor necesita verificación. El saldo permanece reservado.",
        },
        { status: 202 }
      );
    }

    // 16. GUARDAR RESPUESTA E ID DEL PROVEEDOR

    const internalStatus = "SUPPLIER_PENDING";

    const { error: saveOrderError } = await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_order_id: supplierOrderId,
        supplier_response: supplierData,
        status: internalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", internalOrderId);

    if (saveOrderError) {
      console.error(
        "ERROR GUARDANDO ORDEN:",
        saveOrderError
      );

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
          message:
            "FazerCards recibió el pedido, pero el registro interno necesita revisión.",
        },
        { status: 202 }
      );
    }

    // 17. COMPLETAR SI FAZERCARDS CONFIRMÓ LA ENTREGA

    if (isSuccessfulSupplierStatus(supplierStatus)) {
      const { error: completeError } =
        await supabaseAdmin.rpc(
          "complete_mobile_legends_global_order",
          {
            p_supplier_order_id: supplierOrderId,
          }
        );

      if (completeError) {
        console.error(
          "ERROR COMPLETANDO ORDEN:",
          completeError
        );

        return NextResponse.json(
          {
            ok: true,
            orderNumber: internalOrderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
            message:
              "El proveedor confirmó el pedido, pero falta completar el registro interno.",
          },
          { status: 202 }
        );
      }
    }

    // 18. RESPUESTA FINAL

    return NextResponse.json({
      ok: true,
      orderNumber: internalOrderId,
      supplierOrderId,
      status: isSuccessfulSupplierStatus(supplierStatus)
        ? "COMPLETED"
        : "SUPPLIER_PENDING",
      offerId: offer.id,
      offerName: offer.name,
      playerId,
      serverId,
      retailPrice,
      supplierPrice,
      vipActive,
      supplierStatus: supplierStatus || "pending",
    });
  } catch (error) {
    console.error(
      "ERROR GENERAL MOBILE LEGENDS GLOBAL:",
      error
    );

    // Si ya comenzó la comunicación con FazerCards,
    // nunca realizar un reembolso automático desde el catch.
    if (internalOrderId && supplierRequestStarted) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrderId)
        .neq("status", "COMPLETED")
        .neq("status", "REFUNDED");
    }

    return jsonError(
      "No se pudo procesar la orden. Comprueba el estado antes de volver a intentarlo.",
      500
    );
  }
}
