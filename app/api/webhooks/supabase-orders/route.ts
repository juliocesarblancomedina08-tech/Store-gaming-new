
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: unknown) {
  return String(value ?? "No disponible").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]!
  );
}

function getValue(record: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (
      record[key] !== undefined &&
      record[key] !== null &&
      record[key] !== ""
    ) {
      return record[key];
    }
  }
  return "No disponible";
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.SUPABASE_ORDERS_WEBHOOK_SECRET;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!secret || !token || !chatId) {
      return NextResponse.json(
        { success: false, error: "Configuración incompleta" },
        { status: 500 }
      );
    }

    const receivedSecret = request.headers.get(
      "x-store-gaming-webhook-secret"
    );

    if (receivedSecret !== secret) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const payload = await request.json();

    if (
      payload?.type !== "INSERT" ||
      payload?.schema !== "public" ||
      !["topup_orders", "gift_card_orders"].includes(payload?.table)
    ) {
      return NextResponse.json({
        success: true,
        ignored: true,
      });
    }

    const record = payload.record;

    if (!record || typeof record !== "object") {
      return NextResponse.json(
        { success: false, error: "Registro inválido" },
        { status: 400 }
      );
    }

    const isGiftCard = payload.table === "gift_card_orders";

    const orderId = getValue(record, ["id", "order_id"]);
    const customer = getValue(record, [
      "username",
      "user_name",
      "name",
      "email",
      "user_id",
    ]);
    const product = getValue(record, [
      "offer_name",
      "product_name",
      "game",
      "product",
      "title",
    ]);
    const amount = getValue(record, [
      "retail_price",
      "total_amount",
      "total",
      "price",
      "amount",
    ]);
    const currency = getValue(record, ["currency", "currency_code"]);
    const status = getValue(record, ["status"]);

    const message = [
      "🛒 <b>STORE GAMING</b>",
      "",
      isGiftCard
        ? "🎁 <b>NUEVO PEDIDO DE TARJETA REGALO</b>"
        : "🎮 <b>NUEVO PEDIDO DE RECARGA</b>",
      "",
      `🆔 <b>Pedido:</b> ${escapeHtml(orderId)}`,
      `👤 <b>Cliente:</b> ${escapeHtml(customer)}`,
      `📦 <b>Producto:</b> ${escapeHtml(product)}`,
      `💰 <b>Importe:</b> ${escapeHtml(amount)} ${escapeHtml(currency === "No disponible" ? "" : currency)}`,
      `📌 <b>Estado:</b> ${escapeHtml(status)}`,
    ].join("\n");

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    const telegramResult = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error("Error enviando notificación Telegram");
      return NextResponse.json(
        { success: false, error: "No se pudo enviar la notificación" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, notified: true });
  } catch (error) {
    console.error("Error en webhook de pedidos:", error);

    return NextResponse.json(
      { success: false, error: "Error interno del webhook" },
      { status: 500 }
    );
  }
}
