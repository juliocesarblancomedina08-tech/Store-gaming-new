
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "manual-payment-receipts";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

async function authenticateUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);

  const { data, error } =
    await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Sesión no válida." },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const orderId = String(formData.get("order_id") || "");
    const file = formData.get("receipt");

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(orderId)) {
      return NextResponse.json(
        { success: false, error: "Solicitud no válida." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Debes seleccionar un comprobante." },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "La imagen debe pesar como máximo 5 MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Formato no permitido. Usa JPG, PNG o WEBP." },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } =
      await supabaseAdmin
        .from("manual_orders")
        .select("id, user_id, status, receipt_url")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: "No se encontró tu solicitud." },
        { status: 404 }
      );
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Esta solicitud ya fue procesada." },
        { status: 409 }
      );
    }

    if (order.receipt_url) {
      return NextResponse.json(
        { success: false, error: "Esta solicitud ya tiene un comprobante." },
        { status: 409 }
      );
    }

    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    const extension = extensionByType[file.type];
    const filePath = `${user.id}/${orderId}/${randomUUID()}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } =
      await supabaseAdmin.storage
        .from(BUCKET)
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

    if (uploadError) {
      console.error("Error subiendo comprobante:", uploadError);

      return NextResponse.json(
        { success: false, error: "No se pudo guardar el comprobante." },
        { status: 500 }
      );
    }

    const { data: updatedOrder, error: updateError } =
      await supabaseAdmin
        .from("manual_orders")
        .update({
          receipt_url: filePath,
        })
        .eq("id", orderId)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .is("receipt_url", null)
        .select("id, status, receipt_url")
        .maybeSingle();

    if (updateError || !updatedOrder) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove([filePath]);

      return NextResponse.json(
        {
          success: false,
          error: "No se pudo asociar el comprobante. Inténtalo nuevamente.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Comprobante enviado correctamente.",
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
      },
    });
  } catch (error) {
    console.error("Manual payment receipt:", error);

    return NextResponse.json(
      { success: false, error: "Error interno al subir el comprobante." },
      { status: 500 }
    );
  }
}
