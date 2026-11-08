
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function authenticateUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

// Crear solicitud de recarga manual.
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Sesión no válida. Inicia sesión nuevamente." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const amountCup = Number(body.amount_cup);
    const confirmationNumber =
      typeof body.confirmation_number === "string"
        ? body.confirmation_number.trim()
        : null;

    if (
      !Number.isFinite(amountCup) ||
      amountCup <= 0 ||
      amountCup > 100000000
    ) {
      return NextResponse.json(
        { success: false, error: "El importe en CUP no es válido." },
        { status: 400 }
      );
    }

    if (
      confirmationNumber &&
      confirmationNumber.length > 100
    ) {
      return NextResponse.json(
        { success: false, error: "El número de confirmación es demasiado largo." },
        { status: 400 }
      );
    }

    const { data: settings, error: settingsError } =
      await supabaseAdmin
        .from("manual_payment_settings")
        .select("exchange_rate, transfer_phone")
        .eq("id", 1)
        .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { success: false, error: "No se pudo consultar la tasa de cambio." },
        { status: 500 }
      );
    }

    const exchangeRate = Number(settings.exchange_rate);

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      return NextResponse.json(
        { success: false, error: "La tasa de cambio configurada no es válida." },
        { status: 500 }
      );
    }

    const balanceAmount = Number(
      (amountCup / exchangeRate).toFixed(4)
    );

    if (!Number.isFinite(balanceAmount) || balanceAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "No se pudo calcular el crédito." },
        { status: 400 }
      );
    }

    const { data: order, error: insertError } =
      await supabaseAdmin
        .from("manual_orders")
        .insert({
          user_id: user.id,
          method: "saldo_cup",
          amount_cup: amountCup,
          exchange_rate: exchangeRate,
          balance_amount: balanceAmount,
          confirmation_number: confirmationNumber,
          status: "pending",
        })
        .select(
          "id, amount_cup, exchange_rate, balance_amount, status, created_at"
        )
        .single();

    if (insertError || !order) {
      console.error("Error creando manual_order:", insertError);

      return NextResponse.json(
        { success: false, error: "No se pudo crear la solicitud." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Solicitud creada. Ahora debes adjuntar el comprobante.",
      order,
      transfer_phone: settings.transfer_phone,
    });
  } catch (error) {
    console.error("Manual payment POST:", error);

    return NextResponse.json(
      { success: false, error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
