
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { MOBILE_LEGENDS_GLOBAL } from "../../../../lib/mobile-legends-global";

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

const OFFERS: Offer[] =
  MOBILE_LEGENDS_GLOBAL.offers.map((offer) => ({
    id: offer.id,
    name: offer.name,
    retailPrice: offer.price,
    supplierPrice: offer.supplierPrice,
  }));

type ExistingOrder = {
  id: string;
  status: string | null;
  supplier_order_id: string | null;
  offer_id: string | null;
  offer_name: string | null;
  player_id: string | null;
  retail_price: number | null;
  supplier_price: number | null;
};

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

export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;
  let reserved = false;

  try {
    // 1. AUTENTICACIÓN

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonError("No autorizado.", 401);
    }

    const accessToken = authorization
      .replace("Bearer ", "")
      .trim();

    if (!accessToken) {
      return jsonError("Token de acceso inválido.", 401);
    }

    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData.user) {
      console.error("ERROR OBTENIENDO USUARIO:", userError);
      return jsonError("Sesión inválida o expirada.", 401);
    }

    const user = userData.user;

    // 2. LEER DATOS

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

    const idempotencyKey =
      typeof body?.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";

    // 3. VALIDAR OFERTA

    const offer = getOffer(offerId);

    if (!offer) {
      return jsonError("La oferta seleccionada no existe.");
    }

    // 4. VALIDAR PLAYER ID

    if (!playerId || !/^[0-9]+$/.test(playerId)) {
      return jsonError(
        "El ID del jugador debe contener solamente números."
      );
    }

    if (playerId.length < 3 || playerId.length > 20) {
      return jsonError("El ID del jugador no es válido.");
    }

    // 5. VALIDAR SERVER ID

    if (!serverId || !/^[0-9]+$/.test(serverId)) {
      return jsonError(
        "El ID del servidor debe contener solamente números."
      );
    }

    if (serverId.length > 20) {
      return jsonError("El ID del servidor no es válido.");
    }

    // 6. COMPROBAR ESTADO VIP EN EL SERVIDOR

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("vip_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("ERROR CONSULTANDO VIP:", profileError);

      return jsonError(
        "No se pudo comprobar el estado de la membresía.",
        500
      );
    }

    const vipExpiration = profile?.vip_expires_at
      ? new Date(profile.vip_expires_at).getTime()
      : 0;

    const vipActive =
      Number.isFinite(vipExpiration) &&
      vipExpiration > Date.now();

    // El usuario normal conserva exactamente su precio actual.
    // El VIP paga proveedor + 0.08 créditos.

    const supplierPrice = Number(offer.supplierPrice);

    const retailPrice = vipActive
      ? Number((supplierPrice + VIP_MARKUP).toFixed(4))
      : Number(offer.retailPrice);

    if (
      !Number.isFinite(retailPrice) ||
      retailPrice <= 0 ||
      !Number.isFinite(supplierPrice) ||
      supplierPrice <= 0
    ) {
      return jsonError("El precio de la oferta no es válido.", 500);
    }

    // 7. IDEMPOTENCIA

    const finalIdempotencyKey =
      idempotencyKey || crypto.randomUUID();

    // 8. BUSCAR ORDEN EXISTENTE

    const {
      data: existingOrderData,
      error: existingOrderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .select(
        [
          "id",
          "status",
          "supplier_order_id",
          "offer_id",
          "offer_name",
          "player_id",
          "retail_price",
          "supplier_price",
        ].join(",")
      )
      .eq("idempotency_key", finalIdempotencyKey)
      .maybeSingle();

    const existingOrder =
      existingOrderData as unknown as ExistingOrder | null;

    if (existingOrderError) {
      console.error(
        "ERROR COMPROBANDO IDEMPOTENCIA:",
        existingOrderError
      );

      return jsonError(
        "No se pudo comprobar la orden anterior.",
        500
      );
    }

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        alreadyCreated: true,
        orderNumber: existingOrder.id,
        supplierOrderId: existingOrder.supplier_order_id,
        status: existingOrder.status,
        offerId: existingOrder.offer_id,
        offerName: existingOrder.offer_name,
        playerId: existingOrder.player_id,
        retailPrice: existingOrder.retail_price,
        supplierPrice: existingOrder.supplier_price,
      });
    }

    // 9. CREAR ORDEN INTERNA

    const username =
      user.user_metadata?.username ??
      user.user_metadata?.user_name ??
      null;

    const email = user.email ?? null;

    const {
      data: insertedOrder,
      error: insertOrderError,
    } = await supabaseAdmin
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

        // Precio VIP o precio normal.
        retail_price: retailPrice,

        supplier_price: supplierPrice,
        currency: "USD",
        status: "RESERVED",
        idempotency_key: finalIdempotencyKey,

        supplier_fields: {
          player_id: playerId,
          server_id: serverId,
          vip_active: vipActive,
        },
      })
      .select("id")
      .single();

    if (insertOrderError || !insertedOrder) {
      console.error(
        "ERROR CREANDO ORDEN INTERNA:",
        insertOrderError
      );

      const { data: raceOrderData } =
        await supabaseAdmin
          .from("topup_orders")
          .select(
            [
              "id",
              "status",
              "supplier_order_id",
              "offer_id",
              "offer_name",
              "player_id",
              "retail_price",
              "supplier_price",
            ].join(",")
          )
          .eq("idempotency_key", finalIdempotencyKey)
          .maybeSingle();

      const raceOrder =
        raceOrderData as unknown as ExistingOrder | null;

      if (raceOrder) {
        return NextResponse.json({
          ok: true,
          alreadyCreated: true,
          orderNumber: raceOrder.id,
          supplierOrderId: raceOrder.supplier_order_id,
          status: raceOrder.status,
          offerId: raceOrder.offer_id,
          offerName: raceOrder.offer_name,
          playerId: raceOrder.player_id,
          retailPrice: raceOrder.retail_price,
          supplierPrice: raceOrder.supplier_price,
        });
      }

      return jsonError("No se pudo crear la orden.", 500);
    }

    internalOrderId = insertedOrder.id;

    // 10. RESERVAR SALDO CON EL PRECIO CORRECTO

    const { error: reserveError } =
      await supabaseAdmin.rpc("reserve_topup_balance", {
        p_user_id: user.id,
        p_amount: retailPrice,
      });

    if (reserveError) {
      console.error("ERROR RESERVANDO SALDO:", reserveError);

      await supabaseAdmin
        .from("topup_orders")
        .update({ status: "FAILED" })
        .eq("id", internalOrderId);

      return jsonError(
        reserveError.message ||
          "No se pudo reservar el saldo.",
        400
      );
    }

    reserved = true;

    // 11. API KEY DE FAZERCARDS

    const fazerApiKey = process.env.FAZERCARDS_API_KEY;

    if (!fazerApiKey) {
      console.error("Falta FAZERCARDS_API_KEY.");

      try {
        await supabaseAdmin.rpc("refund_topup_balance", {
          p_order_id: internalOrderId,
        });

        reserved = false;
      } catch (refundError) {
        console.error(
          "ERROR DEVOLVIENDO SALDO:",
          refundError
        );
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({ status: "FAILED" })
        .eq("id", internalOrderId);

      return jsonError(
        "El servicio de recargas no está configurado.",
        500
      );
    }

    // 12. CREAR PEDIDO EN FAZERCARDS

    let supplierResponse: Response;

    try {
      supplierResponse = await fetch(
        `${FAZER_API_BASE}/topups/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-API-Key": fazerApiKey,
            "Idempotency-Key": finalIdempotencyKey,
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
    } catch (supplierConnectionError) {
      console.error(
        "ERROR CONECTANDO CON FAZERCARDS:",
        supplierConnectionError
      );

      if (reserved && internalOrderId) {
        try {
          await supabaseAdmin.rpc("refund_topup_balance", {
            p_order_id: internalOrderId,
          });

          reserved = false;
        } catch (refundError) {
          console.error(
            "ERROR DEVOLVIENDO SALDO:",
            refundError
          );
        }
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({ status: "FAILED" })
        .eq("id", internalOrderId);

      return jsonError(
        "No se pudo conectar con FazerCards.",
        502
      );
    }

    // 13. LEER RESPUESTA DEL PROVEEDOR

    const supplierText = await supplierResponse.text();

    let supplierData: any = null;

    try {
      supplierData = supplierText
        ? JSON.parse(supplierText)
        : null;
    } catch {
      supplierData = supplierText;
    }

    console.log(
      "FAZERCARDS MOBILE LEGENDS GLOBAL:",
      supplierResponse.status,
      supplierData
    );

    // 14. OBTENER ID Y ESTADO

    const supplierOrderId =
      supplierData?.order_id ??
      supplierData?.id ??
      supplierData?.order?.id ??
      supplierData?.data?.order_id ??
      supplierData?.data?.id ??
      null;

    const supplierStatus = String(
      supplierData?.status ??
        supplierData?.order?.status ??
        supplierData?.data?.status ??
        ""
    ).trim();

    // 15. FAZERCARDS RECHAZÓ

    if (!supplierResponse.ok) {
      console.error(
        "FAZERCARDS RECHAZÓ MOBILE LEGENDS GLOBAL:",
        {
          status: supplierResponse.status,
          response: supplierData,
        }
      );

      if (reserved && internalOrderId) {
        const { error: refundError } =
          await supabaseAdmin.rpc("refund_topup_balance", {
            p_order_id: internalOrderId,
          });

        if (refundError) {
          console.error(
            "ERROR DEVOLVIENDO SALDO:",
            refundError
          );
        } else {
          reserved = false;
        }
      }

      const { error: failedUpdateError } =
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "FAILED",
            supplier_order_id: supplierOrderId,
          })
          .eq("id", internalOrderId);

      if (failedUpdateError) {
        console.error(
          "ERROR ACTUALIZANDO ORDEN FALLIDA:",
          failedUpdateError
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: "FazerCards rechazó el pedido.",
          supplierStatus: supplierResponse.status,
          supplierResponse: supplierData,
        },
        { status: 400 }
      );
    }

    // 16. FAZERCARDS NO DEVOLVIÓ ID

    if (!supplierOrderId) {
      const { error: pendingUpdateError } =
        await supabaseAdmin
          .from("topup_orders")
          .update({ status: "SUPPLIER_PENDING" })
          .eq("id", internalOrderId);

      if (pendingUpdateError) {
        console.error(
          "ERROR ACTUALIZANDO ORDEN PENDIENTE:",
          pendingUpdateError
        );
      }

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          supplierOrderId: null,
          status: "SUPPLIER_PENDING",
          offerId: offer.id,
          offerName: offer.name,
          playerId,
          serverId,
          retailPrice,
          supplierPrice,
          vipActive,
          supplierStatus: supplierStatus || "pending",
        },
        { status: 202 }
      );
    }

    // 17. DETERMINAR ESTADO

    let internalStatus = "SUPPLIER_PENDING";

    if (isSuccessfulSupplierStatus(supplierStatus)) {
      internalStatus = "COMPLETED";
    }

    if (isRejectedSupplierStatus(supplierStatus)) {
      internalStatus = "FAILED";
    }

    // 18. GUARDAR PEDIDO DEL PROVEEDOR

    const { error: updateOrderError } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id: supplierOrderId,
          status: internalStatus,
        })
        .eq("id", internalOrderId);

    if (updateOrderError) {
      console.error(
        "ERROR ACTUALIZANDO ORDEN:",
        updateOrderError
      );

      return jsonError(
        "La orden fue enviada a FazerCards, pero no se pudo actualizar el registro interno.",
        500
      );
    }

    // 19. PROVEEDOR RECHAZÓ DESPUÉS DE CREAR

    if (internalStatus === "FAILED") {
      if (reserved && internalOrderId) {
        const { error: refundError } =
          await supabaseAdmin.rpc("refund_topup_balance", {
            p_order_id: internalOrderId,
          });

        if (refundError) {
          console.error(
            "ERROR DEVOLVIENDO SALDO:",
            refundError
          );
        } else {
          reserved = false;
        }
      }

      return NextResponse.json(
        {
          ok: false,
          error: "FazerCards rechazó el pedido.",
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "FAILED",
          offerId: offer.id,
          offerName: offer.name,
          playerId,
          serverId,
          retailPrice,
          supplierPrice,
          vipActive,
          supplierStatus,
        },
        { status: 400 }
      );
    }

    // 20. PROVEEDOR COMPLETÓ INMEDIATAMENTE

    if (internalStatus === "COMPLETED") {
      const { error: completeError } =
        await supabaseAdmin.rpc("complete_topup_order", {
          p_supplier_order_id: supplierOrderId,
        });

      if (completeError) {
        console.error(
          "ERROR COMPLETANDO ORDEN:",
          completeError
        );
      } else {
        reserved = false;
      }
    }

    // 21. RESPUESTA FINAL

    return NextResponse.json({
      ok: true,
      orderNumber: internalOrderId,
      supplierOrderId,
      status: internalStatus,
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

    if (internalOrderId && reserved) {
      try {
        const { data: currentOrder } =
          await supabaseAdmin
            .from("topup_orders")
            .select("status")
            .eq("id", internalOrderId)
            .maybeSingle();

        if (currentOrder?.status === "RESERVED") {
          const { error: refundError } =
            await supabaseAdmin.rpc("refund_topup_balance", {
              p_order_id: internalOrderId,
            });

          if (refundError) {
            console.error(
              "ERROR EN REEMBOLSO DEL CATCH:",
              refundError
            );
          }
        }
      } catch (refundCatchError) {
        console.error(
          "ERROR INTENTANDO REEMBOLSO:",
          refundCatchError
        );
      }
    }

    return jsonError(
      "No se pudo procesar la orden.",
      500
    );
  }
}
