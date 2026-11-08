
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  DELTA_FORCE_CATEGORY_ID,
  DELTA_FORCE_OFFERS,
} from "../../../../lib/games/delta-force";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY;

const VIP_MARKUP = 0.08;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

async function getUserFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ") || !supabaseAdmin) {
    return null;
  }

  const token = authorization.slice(7);

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;

  return user;
}

function getSupplierOrderId(result: any): string | null {
  const id =
    result?.order?.id ??
    result?.data?.order?.id ??
    result?.order_id ??
    result?.orderId ??
    result?.data?.order_id ??
    result?.data?.orderId ??
    result?.data?.id ??
    result?.id;

  return id == null ? null : String(id);
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin || !FAZER_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta configurar Supabase o FazerCards en el servidor.",
        },
        { status: 500 },
      );
    }

    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sesión no válida. Inicia sesión nuevamente.",
        },
        { status: 401 },
      );
    }

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "La solicitud no contiene JSON válido." },
        { status: 400 },
      );
    }

    const { offerId, playerId, idempotencyKey } = body ?? {};

    if (
      typeof offerId !== "string" ||
      typeof playerId !== "string"
    ) {
      return NextResponse.json(
        { ok: false, error: "Falta la oferta o el ID del jugador." },
        { status: 400 },
      );
    }

    const cleanPlayerId = playerId.trim().replace(/\s+/g, "");

    if (!/^[0-9]{4,20}$/.test(cleanPlayerId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "El ID debe contener entre 4 y 20 números.",
        },
        { status: 400 },
      );
    }

    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.length < 10 ||
      idempotencyKey.length > 100
    ) {
      return NextResponse.json(
        { ok: false, error: "La clave de la orden no es válida." },
        { status: 400 },
      );
    }

    const offer = DELTA_FORCE_OFFERS.find(
      (item) => item.id === offerId,
    );

    if (!offer) {
      return NextResponse.json(
        { ok: false, error: "La oferta seleccionada no existe." },
        { status: 400 },
      );
    }

    // Comprobar el estado VIP directamente en Supabase.
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("vip_expires_at")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Error consultando membresía VIP:",
        profileError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo comprobar tu membresía. Inténtalo nuevamente.",
        },
        { status: 500 },
      );
    }

    const vipExpiresAt = profile?.vip_expires_at
      ? new Date(profile.vip_expires_at).getTime()
      : 0;

    const vipActive =
      Number.isFinite(vipExpiresAt) &&
      vipExpiresAt > Date.now();

    // El precio se calcula exclusivamente en el servidor.
    const supplierPrice = Number(offer.supplierPrice);

    const retailPrice = vipActive
      ? Number((supplierPrice + VIP_MARKUP).toFixed(4))
      : Number(offer.price);

    console.log("DELTA FORCE PRICE CHECK", {
      offerId: offer.id,
      name: offer.name,
      supplierPrice,
      retailPrice,
      vipActive,
    });

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
          details: {
            offerId: offer.id,
            price: offer.price,
            supplierPrice: offer.supplierPrice,
          },
        },
        { status: 400 },
      );
    }

    // Comprobar si ya existe una orden con esta clave.
    const { data: previousOrder, error: previousError } =
      await supabaseAdmin
        .from("topup_orders")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (previousError) {
      console.error(
        "Error consultando la orden previa:",
        previousError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo comprobar la orden anterior.",
        },
        { status: 500 },
      );
    }

    if (previousOrder) {
      if (
        previousOrder.user_id !== user.id ||
        previousOrder.offer_id !== offer.id ||
        String(previousOrder.player_id) !== cleanPlayerId
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "La clave ya fue usada con otros datos.",
          },
          { status: 409 },
        );
      }

      if (previousOrder.status === "REJECTED") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Esta orden fue rechazada. Genera una nueva solicitud para volver a intentarlo.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        ok: true,
        order: previousOrder,
        orderNumber:
          previousOrder.order_number || previousOrder.id,
        supplierOrderId:
          previousOrder.supplier_order_id || "",
        status: previousOrder.status || "SUPPLIER_PENDING",
      });
    }

    // Crear primero la orden. Todavía no se ha descontado saldo.
    const { data: order, error: insertError } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,
          username:
            user.user_metadata?.username ||
            user.user_metadata?.name ||
            user.email ||
            "Cliente",
          email: user.email,
          game: "Delta Force",
          category_id: DELTA_FORCE_CATEGORY_ID,
          offer_id: offer.id,
          offer_name: offer.name,
          player_id: cleanPlayerId,
          retail_price: retailPrice,
          supplier_price: supplierPrice,
          currency: "USD",
          status: "PROCESSING",
          idempotency_key: idempotencyKey,
          supplier_fields: {
            player_id: cleanPlayerId,
            vip_active: vipActive,
          },
        })
        .select("*")
        .single();

    if (insertError || !order) {
      console.error("Error creando la orden:", insertError);

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo registrar la orden. No se ha reservado tu saldo.",
        },
        { status: 500 },
      );
    }

    // Reservar el saldo usando el precio calculado en el servidor.
    const { error: reserveError } = await supabaseAdmin.rpc(
      "store_gaming_reserve_balance",
      {
        p_user_id: user.id,
        p_amount: retailPrice,
      },
    );

    if (reserveError) {
      console.error("Error reservando saldo:", reserveError);

      // Si no se pudo reservar, intentar eliminar la orden.
      const { error: deleteError } = await supabaseAdmin
        .from("topup_orders")
        .delete()
        .eq("id", order.id)
        .eq("user_id", user.id);

      if (deleteError) {
        console.error(
          "No se pudo eliminar la orden sin saldo reservado:",
          deleteError,
        );

        // Evitar que quede como una orden en proceso.
        const { error: statusError } = await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "REJECTED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        if (statusError) {
          console.error(
            "No se pudo marcar la orden como REJECTED:",
            statusError,
          );
        }
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo reservar el saldo. Comprueba tu balance antes de volver a intentarlo.",
        },
        { status: 400 },
      );
    }

    // Enviar la compra al proveedor.
    const response = await fetch(
      `${FAZER_API_BASE}/topups/order`,
      {
        method: "POST",
        headers: {
          "X-API-Key": FAZER_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          category_id: DELTA_FORCE_CATEGORY_ID,
          offer_id: offer.supplierOfferId,
          fields: {
            player_id: cleanPlayerId,
          },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      },
    );

    let supplierResult: any = {};

    try {
      supplierResult = await response.json();
    } catch {
      supplierResult = {};
    }

    const supplierOrderId = getSupplierOrderId(supplierResult);

    if (!response.ok) {
      console.error("Respuesta de FazerCards:", {
        status: response.status,
        body: supplierResult,
        orderId: order.id,
      });

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          supplier_response: supplierResult,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      return NextResponse.json(
        {
          ok: true,
          orderId: order.id,
          orderNumber: order.order_number || order.id,
          status: "SUPPLIER_PENDING",
          message:
            "La respuesta del proveedor necesita verificación. Revisa la orden antes de repetir la compra.",
        },
        { status: 202 },
      );
    }

    const {
      data: updatedOrder,
      error: updateError,
    } = await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_order_id: supplierOrderId,
        supplier_response: supplierResult,
        status: "SUPPLIER_PENDING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .select("*")
      .single();

    if (updateError || !updatedOrder) {
      console.error(
        "Error guardando la respuesta:",
        updateError,
      );

      return NextResponse.json(
        {
          ok: true,
          orderId: order.id,
          orderNumber: order.order_number || order.id,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
          message:
            "La orden se envió al proveedor, pero su estado necesita revisión.",
        },
        { status: 202 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        order: updatedOrder,
        orderId: updatedOrder.id,
        orderNumber:
          updatedOrder.order_number || updatedOrder.id,
        supplierOrderId,
        status: updatedOrder.status,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("ERROR API DELTA FORCE:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo confirmar el resultado de la solicitud. Revisa el estado de la orden antes de volver a comprar.",
      },
      { status: 500 },
    );
  }
}
