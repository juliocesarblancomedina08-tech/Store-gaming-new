
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

async function authenticateAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  if (
    (data.user.email || "").toLowerCase() !==
    ADMIN_EMAIL.toLowerCase()
  ) {
    return null;
  }

  return data.user;
}

// Consultar las dos tasas CUP y el teléfono de transferencia.
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("manual_payment_settings")
      .select(
        "exchange_rate, transfer_exchange_rate, transfer_phone, updated_at"
      )
      .eq("id", 1)
      .single();

    if (error || !data) {
      console.error("Error consultando tasas CUP:", error);

      return NextResponse.json(
        {
          success: false,
          error: "No se pudo obtener la configuración del pago.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: {
        exchange_rate: Number(data.exchange_rate),
        transfer_exchange_rate: Number(data.transfer_exchange_rate),
        transfer_phone: data.transfer_phone,
        updated_at: data.updated_at,
      },
    });
  } catch (error) {
    console.error("Error interno consultando tasas CUP:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}

// Actualizar ambas tasas CUP.
// Solo puede hacerlo el administrador autorizado.
export async function PATCH(request: NextRequest) {
  try {
    const admin = await authenticateAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No tienes autorización para modificar esta configuración.",
        },
        { status: 401 }
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "El contenido enviado no es válido.",
        },
        { status: 400 }
      );
    }

    const exchangeRate = Number(body.exchange_rate);
    const transferExchangeRate = Number(
      body.transfer_exchange_rate
    );

    if (
      !Number.isFinite(exchangeRate) ||
      exchangeRate <= 0 ||
      exchangeRate > 100000000
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "La tasa de SALDO CUP no es válida.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(transferExchangeRate) ||
      transferExchangeRate <= 0 ||
      transferExchangeRate > 100000000
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "La tasa de TRANSFERENCIA CUP no es válida.",
        },
        { status: 400 }
      );
    }

    const updateData = {
      exchange_rate: exchangeRate,
      transfer_exchange_rate: transferExchangeRate,
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    };

    const { data, error } = await supabaseAdmin
      .from("manual_payment_settings")
      .update(updateData)
      .eq("id", 1)
      .select(
        "exchange_rate, transfer_exchange_rate, transfer_phone, updated_at"
      )
      .single();

    if (error || !data) {
      console.error("Error guardando tasas CUP:", error);

      return NextResponse.json(
        {
          success: false,
          error: "No se pudieron guardar las tasas CUP.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Las dos tasas CUP se actualizaron correctamente.",
      settings: {
        exchange_rate: Number(data.exchange_rate),
        transfer_exchange_rate: Number(
          data.transfer_exchange_rate
        ),
        transfer_phone: data.transfer_phone,
        updated_at: data.updated_at,
      },
    });
  } catch (error) {
    console.error("Error interno actualizando tasas CUP:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}
