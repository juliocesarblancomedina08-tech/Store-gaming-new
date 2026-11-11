
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LEAGUE_OF_LEGENDS_ID } from "../../../../lib/games/league-of-legends-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZERCARDS_API =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZERCARDS_API_KEY = process.env.FAZERCARDS_API_KEY;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Error desconocido";
  }
}

function getSupplierOrderId(data: any): string | null {
  return (
    data?.order_id ??
    data?.orderId ??
    data?.id ??
    data?.order?.order_id ??
    data?.order?.orderId ??
    data?.order?.id ??
    data?.data?.order_id ??
    data?.data?.orderId ??
    data?.data?.id ??
    null
  );
}

function getSupplierStatus(data: any): string {
  return String(
    data?.status ??
      data?.order?.status ??
      data?.data?.status ??
      ""
  ).trim().toLowerCase();
}

function isCompleted(status: string): boolean {
  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "finished",
  ].includes(status);
}

function isFailed(status: string): boolean {
  return [
    "failed",
    "failure",
    "error",
    "cancelled",
    "canceled",
    "rejected",
  ].includes(status);
}

async function refundOrder(orderId: string) {
  const { data: order, error: orderError } =
    await supabaseAdmin
      .from("store_gaming_orders")
      .select("id,user_id,total,status")
      .eq("id", orderId)
      .single();

  if (orderError || !order) {
    throw new Error(
      "No se pudo recuperar el pedido para el reembolso."
    );
  }

  if (
    order.status === "REFUNDED" ||
    order.status === "COMPLETED"
  ) {
    return;
  }

  const { error: refundError } = await supabaseAdmin.rpc(
    "refund_store_gaming_order",
    {
      p_order_id: orderId,
    }
  );

  if (refundError) throw refundError;
}

export async function POST(request: Request) {
  let orderId: string | null = null;

  try {
    if (!FAZERCARDS_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta configurar FAZERCARDS_API_KEY.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "No autorizado." },
        { status: 401 }
      );
    }

    const token = authorization.substring(7);

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json(
        { ok: false, error: "Sesión inválida." },
        { status: 401 }
      );
    }

    const userId = authData.user.id;
    const body = await request.json();

    const gameId = String(
      body.gameId ?? body.playerId ?? ""
    ).trim();

    const zoneId = String(
      body.zoneId ?? body.serverId ?? ""
    ).trim();

    const productId = String(
      body.productId ?? body.product_id ?? ""
    ).trim();

    if (!gameId || !zoneId || !productId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Faltan datos del jugador o del producto.",
        },
        { status: 400 }
      );
    }

    // IMPORTANTE: el catálogo utiliza offers, no products.
    const product = LEAGUE_OF_LEGENDS_ID.offers.find(
      (item) => String(item.id) === productId
    );

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Producto no válido." },
        { status: 400 }
      );
    }

    const price = Number(product.price);

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { ok: false, error: "Precio del producto inválido." },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { ok: false, error: "No se pudo consultar el saldo." },
        { status: 400 }
      );
    }

    const balance = Number(profile.balance ?? 0);

    if (balance < price) {
      return NextResponse.json(
        {
          ok: false,
          error: "Saldo insuficiente.",
          balance,
          required: price,
        },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } =
      await supabaseAdmin
        .from("store_gaming_orders")
        .insert({
          user_id: userId,
          game: "league-of-legends-id",
          product_id: productId,
          product_name: product.name,
          player_id: gameId,
          server_id: zoneId,
          quantity: 1,
          unit_price: price,
          total: price,
          status: "PENDING",
          payment_status: "PENDING",
          delivery_status: "PENDING",
          provider: "FAZERCARDS",
        })
        .select("id")
        .single();

    if (orderError || !order) {
      throw orderError ||
        new Error("No se pudo crear el pedido.");
    }

    orderId = String(order.id);

    const { error: debitError } = await supabaseAdmin.rpc(
      "debit_store_gaming_balance",
      {
        p_user_id: userId,
        p_amount: price,
        p_order_id: orderId,
      }
    );

    if (debitError) {
      await supabaseAdmin
        .from("store_gaming_orders")
        .update({
          status: "FAILED",
          payment_status: "FAILED",
          error_message: debitError.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      throw debitError;
    }

    const supplierResponse = await fetch(
      `${FAZERCARDS_API}/orders`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FAZERCARDS_API_KEY}`,
        },
        body: JSON.stringify({
          product_id: productId,
          player_id: gameId,
          server_id: zoneId,
          quantity: 1,
          reference: orderId,
        }),
        cache: "no-store",
      }
    );

    const supplierData = await supplierResponse.json();

    if (!supplierResponse.ok) {
      throw new Error(
        supplierData?.message ||
          supplierData?.error ||
          "Error al enviar el pedido al proveedor."
      );
    }

    const supplierOrderId =
      getSupplierOrderId(supplierData);

    const supplierStatus =
      getSupplierStatus(supplierData);

    if (isFailed(supplierStatus)) {
      throw new Error(
        supplierData?.message ||
          supplierData?.error ||
          "El proveedor rechazó el pedido."
      );
    }

    const completed = isCompleted(supplierStatus);

    const { error: updateError } = await supabaseAdmin
      .from("store_gaming_orders")
      .update({
        status: completed ? "COMPLETED" : "PROCESSING",
        payment_status: "PAID",
        delivery_status: completed ? "DELIVERED" : "PROCESSING",
        provider_order_id: supplierOrderId,
        provider_response: supplierData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      message: completed
        ? "Pedido completado correctamente."
        : "Pedido enviado al proveedor y en proceso.",
      orderId,
      supplierOrderId,
      status: completed ? "COMPLETED" : "PROCESSING",
    });
  } catch (error) {
    console.error(
      "[League of Legends ID] Error procesando pedido:",
      error
    );

    if (orderId) {
      try {
        await supabaseAdmin
          .from("store_gaming_orders")
          .update({
            status: "FAILED",
            payment_status: "REFUND_PENDING",
            delivery_status: "FAILED",
            error_message: getErrorMessage(error),
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        await refundOrder(orderId);
      } catch (refundError) {
        console.error(
          "[League of Legends] Error procesando rollback:",
          refundError
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
