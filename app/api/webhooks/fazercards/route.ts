
// app/api/webhooks/fazercards/route.ts

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;
type FinalStatus =
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED"
  | "CONFIRMED"
  | "PENDING"
  | "UNKNOWN";

const TERMINAL_STATUSES = new Set(["COMPLETED", "REFUNDED", "CANCELLED"]);

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStatus(value: unknown): FinalStatus {
  if (typeof value !== "string") return "UNKNOWN";
  const status = value.trim().toUpperCase();

  if (["COMPLETED", "COMPLETE", "SUCCESS", "SUCCEEDED", "DONE"].includes(status)) return "COMPLETED";
  if (["FAILED", "FAILURE", "ERROR"].includes(status)) return "FAILED";
  if (["REFUNDED", "REFUND"].includes(status)) return "REFUNDED";
  if (["CANCELLED", "CANCELED"].includes(status)) return "CANCELLED";
  if (["CONFIRMED", "PROCESSING", "IN_PROGRESS"].includes(status)) return "CONFIRMED";
  if (["CREATED", "PENDING", "QUEUED", "WAITING", "SUPPLIER_PENDING"].includes(status)) return "PENDING";
  return "UNKNOWN";
}

function findValue(payload: unknown, keys: string[], depth = 0): unknown {
  if (!isObject(payload) || depth > 5) return undefined;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(payload, key) && payload[key] !== null && payload[key] !== undefined && payload[key] !== "") {
      return payload[key];
    }
  }

  for (const key of ["data", "order", "result", "response", "payload"]) {
    const nested = payload[key];
    if (isObject(nested)) {
      const found = findValue(nested, keys, depth + 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function getString(payload: unknown, keys: string[]): string | null {
  const value = findValue(payload, keys);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function verifySignature(request: NextRequest, rawBody: string): boolean {
  const secret = process.env.FAZERCARDS_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[FazerCards webhook] Falta FAZERCARDS_WEBHOOK_SECRET.");
    return false;
  }

  const receivedSignature =
    request.headers.get("x-webhook-signature") ??
    request.headers.get("x-fazercards-signature") ??
    request.headers.get("x-signature");
  if (!receivedSignature) return false;

  // Confirma este algoritmo y las cabeceras con la documentación oficial de FazerCards.
  const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = receivedSignature.trim().replace(/^sha256=/i, "");

  if (!/^[a-f0-9]{64}$/i.test(received) || !/^[a-f0-9]{64}$/i.test(expectedSignature)) return false;
  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

async function createNotification(
  supabase: any,
  userId: string,
  orderId: string,
  title: string,
  message: string
) {
  // 'any' evita el error TypeScript 'never' si la función RPC no está en los tipos generados.
  // Verifica en Supabase que existan la función y estos seis parámetros.
  const { error } = await supabase.rpc("store_gaming_create_notification", {
    p_user_id: userId,
    p_title: title,
    p_message: message,
    p_type: "TOPUP",
    p_source_type: "TOPUP_ORDER",
    p_source_id: orderId,
  });

  if (error) {
    console.error("[FazerCards webhook] Error creando notificación:", error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!rawBody) return json({ error: "Cuerpo vacío." }, 400);

    if (!verifySignature(request, rawBody)) {
      console.error("[FazerCards webhook] Firma ausente o inválida.");
      return json({ error: "Firma inválida." }, 401);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ error: "JSON inválido." }, 400);
    }
    if (!isObject(payload)) return json({ error: "Formato de webhook inválido." }, 400);

    const supplierOrderId = getString(payload, [
      "supplier_order_id", "supplierOrderId", "external_order_id", "externalOrderId",
      "provider_order_id", "providerOrderId", "order_id", "orderId", "reference",
    ]);
    const rawStatus = getString(payload, ["status", "order_status", "orderStatus", "state"]);

    if (!supplierOrderId || !rawStatus) {
      return json({ error: "Falta el identificador o estado de la orden." }, 400);
    }

    const status = normalizeStatus(rawStatus);
    if (status === "UNKNOWN") {
      console.warn("[FazerCards webhook] Estado no reconocido:", rawStatus);
      return json({ received: true, processed: false, reason: "Estado no reconocido." });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[FazerCards webhook] Faltan variables de Supabase.");
      return json({ error: "Configuración del servidor incompleta." }, 500);
    }

    // Se usa 'any' para resolver los tipos de RPC 'never'; no valida los argumentos en ejecución.
    const supabase: any = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: order, error: orderError } = await supabase
      .from("topup_orders")
      .select("id, user_id, status, supplier_order_id, refunded_at, retail_price")
      .eq("supplier_order_id", supplierOrderId)
      .maybeSingle();

    if (orderError) {
      console.error("[FazerCards webhook] Error buscando orden:", orderError.message);
      return json({ error: "No se pudo consultar la orden." }, 500);
    }
    if (!order) {
      console.warn("[FazerCards webhook] Orden no encontrada:", supplierOrderId);
      return json({ received: true, processed: false, reason: "Orden no encontrada." });
    }

    const { error: metadataError } = await supabase
      .from("topup_orders")
      .update({
        supplier_response: {
          webhook: payload,
          webhook_status: rawStatus,
          webhook_received_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (metadataError) {
      console.error("[FazerCards webhook] Error guardando respuesta:", metadataError.message);
    }

    const currentStatus = String(order.status ?? "").toUpperCase();
    if (TERMINAL_STATUSES.has(currentStatus)) {
      return json({ received: true, processed: false, reason: "La orden ya tiene un estado terminal.", status: currentStatus });
    }
    if (order.refunded_at) {
      return json({ received: true, processed: false, reason: "La orden ya tiene fecha de reembolso." });
    }

    if (status === "PENDING") {
      return json({ received: true, processed: true, status: "PENDING" });
    }

    if (status === "CONFIRMED") {
      const { data, error } = await supabase.rpc("confirm_topup_order", {
        p_supplier_order_id: supplierOrderId,
      });
      if (error) {
        console.error("[FazerCards webhook] Error confirmando orden:", error.message);
        return json({ error: "No se pudo confirmar la orden." }, 500);
      }
      return json({ received: true, processed: true, confirmed: Boolean(data) });
    }

    if (status === "COMPLETED") {
      const { error } = await supabase.rpc("complete_topup_order", {
        p_supplier_order_id: supplierOrderId,
      });
      if (error) {
        console.error("[FazerCards webhook] Error completando orden:", error.message);
        return json({ error: "No se pudo completar la orden." }, 500);
      }

      const { data: updatedOrder, error: verifyError } = await supabase
        .from("topup_orders")
        .select("status, refunded_at")
        .eq("id", order.id)
        .maybeSingle();
      if (verifyError) return json({ error: "No se pudo verificar el estado final." }, 500);

      if (!updatedOrder || String(updatedOrder.status).toUpperCase() !== "COMPLETED" || updatedOrder.refunded_at) {
        return json({ received: true, processed: false, reason: "No se pudo confirmar la finalización." });
      }

      await createNotification(
        supabase,
        order.user_id,
        order.id,
        "Recarga completada",
        `Tu recarga ${supplierOrderId} se ha completado correctamente.`
      );
      return json({ received: true, processed: true, status: "COMPLETED" });
    }

    if (status === "FAILED" || status === "REFUNDED") {
      const { error } = await supabase.rpc("refund_topup_balance", {
        p_order_id: order.id,
      });
      if (error) {
        console.error("[FazerCards webhook] Error reembolsando saldo:", error.message);
        return json({ error: "No se pudo procesar el reembolso." }, 500);
      }

      const { data: updatedOrder, error: verifyError } = await supabase
        .from("topup_orders")
        .select("status, refunded_at")
        .eq("id", order.id)
        .maybeSingle();
      if (verifyError) return json({ error: "No se pudo verificar el reembolso." }, 500);

      if (!updatedOrder || String(updatedOrder.status).toUpperCase() !== "REFUNDED" || !updatedOrder.refunded_at) {
        return json({ received: true, processed: false, reason: "No se pudo confirmar el reembolso." });
      }

      await createNotification(
        supabase,
        order.user_id,
        order.id,
        "Saldo reembolsado",
        `La recarga ${supplierOrderId} falló y el saldo fue devuelto a tu cuenta.`
      );
      return json({ received: true, processed: true, status: "REFUNDED" });
    }

    if (status === "CANCELLED") {
      // No se modifica el saldo aquí: la cancelación debe gestionarse mediante
      // una función SQL que controle estado y reembolso de forma atómica.
      return json({ received: true, processed: false, reason: "Cancelación recibida; requiere conciliación segura." });
    }

    return json({ received: true, processed: false, reason: "Estado recibido sin acción." });
  } catch (error) {
    console.error("[FazerCards webhook] Error inesperado:", error);
    return json({ error: "Error interno del webhook." }, 500);
  }
}
