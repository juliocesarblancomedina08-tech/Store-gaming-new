
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("manual_payment_settings")
      .select("transfer_exchange_rate")
      .eq("id", 1)
      .single();

    if (error || !data) {
      console.error("Transfer CUP settings:", error);

      return NextResponse.json(
        {
          success: false,
          error: "No se pudo consultar la configuración."
        },
        { status: 500 }
      );
    }

    const exchangeRate = Number(data.transfer_exchange_rate);

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "La tasa de transferencia no es válida."
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      exchange_rate: exchangeRate,
      transfer_card: "9238-9598-7208-5651",
      confirmation_number: "58617939"
    });

  } catch (error) {
    console.error("Transfer CUP settings GET:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor."
      },
      { status: 500 }
    );
  }
}
