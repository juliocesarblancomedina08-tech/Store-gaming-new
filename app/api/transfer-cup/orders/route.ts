
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AMOUNT_CUP = 100000000;

async function authenticateUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) return null;

  return data.user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Sesión no válida. Inicia sesión nuevamente.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const amountCup = Number(body.amount_cup);

    if (
      !Number.isFinite(amountCup) ||
      amountCup <= 0 ||
      amountCup > MAX_AMOUNT_CUP
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "El importe en CUP no es válido.",
        },
        { status: 400 }
      );
    }

    const { data: settings, error: settingsError } =
      await supabaseAdmin
        .from("manual_payment_settings")
        .select("transfer_exchange_rate")
        .eq("id", 1)
        .single();

    if (settingsError || !settings) {
      console.error(
        "Error consultando configuración TRANSFERENCIA CUP:",
        settingsError
      );

      return NextResponse.json(
        {
          success: false,
          error: "No se pudo consultar la tasa de cambio.",
        },
        { status: 500 }
      );
    }

    const exchangeRate = Number(settings.transfer_exchange_rate);

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "La tasa de cambio configurada no es válida.",
        },
        { status: 500 }
      );
    }

    const balanceAmount = Number(
      (amountCup / exchangeRate).toFixed(4)
    );

    if (!Number.isFinite(balanceAmount) || balanceAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No se pudo calcular el crédito.",
        },
        { status: 400 }
      );
    }

    const { data: order, error: insertError } =
      await supabaseAdmin
        .from("manual_orders")
        .insert({
          user_id: user.id,
          method: "transferencia_cup",
          amount_cup: amountCup,
          exchange_rate: exchangeRate,
          balance_amount: balanceAmount,
          confirmation_number: null,
          receipt_url: null,
          status: "pending",
        })
        .select(
          "id, user_id, method, amount_cup, exchange_rate, balance_amount, status, created_at"
        )
        .single();

    if (insertError || !order) {
      console.error(
        "Error creando solicitud TRANSFERENCIA CUP:",
        insertError
      );

      return NextResponse.json(
        {
          success: false,
          error: "No se pudo crear la solicitud.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Tu solicitud se creó correctamente.",
        order,
        redirectTo: "/orders",
        actionLabel: "IR A ÓRDENES",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("TRANSFERENCIA CUP POST:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}
