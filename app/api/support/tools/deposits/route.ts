
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DepositRecord = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  amount: number | string;
  currency: string;
  payment_method: string | null;
  network: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  expires_at: string;
  credited_at: string | null;
};

function normalizeStatus(status: string | null | undefined): string {
  return (status || "").trim().toUpperCase();
}

function getDepositSituation(deposit: DepositRecord): string {
  const status = normalizeStatus(deposit.status);

  // La acreditación registrada tiene prioridad sobre el estado textual.
  if (deposit.credited_at) {
    return "DEPÓSITO ACREDITADO";
  }

  if (status === "EXPIRED") {
    return "DEPÓSITO EXPIRADO, SIN ACREDITACIÓN REGISTRADA";
  }

  if (status === "CONFIRMED") {
    return "CONFIRMADO, PERO SIN ACREDITACIÓN REGISTRADA";
  }

  if (
    status === "FAILED" ||
    status === "CANCELLED" ||
    status === "CANCELED"
  ) {
    return "DEPÓSITO FALLIDO O CANCELADO";
  }

  if (status === "PENDING") {
    return "DEPÓSITO PENDIENTE";
  }

  if (status === "REFUNDED") {
    return "DEPÓSITO MARCADO COMO REEMBOLSADO";
  }

  return "ESTADO PENDIENTE DE REVISIÓN";
}

export async function GET(request: NextRequest) {
  try {
    // 1. Comprobar el token de sesión.
    const authorization =
      request.headers.get("authorization") || "";

    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    const accessToken = tokenMatch?.[1]?.trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    // 2. Verificar la sesión con Supabase.
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "La sesión no es válida o ha expirado.",
        },
        { status: 401 }
      );
    }

    // 3. Leer y validar los parámetros.
    const { searchParams } = new URL(request.url);

    const depositId =
      searchParams.get("deposit_id")?.trim() || "";

    const limitParam =
      searchParams.get("limit")?.trim() || "100";

    let limit = Number.parseInt(limitParam, 10);

    if (!Number.isFinite(limit) || limit < 1) {
      limit = 100;
    }

    limit = Math.min(limit, 500);

    if (depositId) {
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidPattern.test(depositId)) {
        return NextResponse.json(
          {
            success: false,
            error: "El identificador del depósito no es válido.",
          },
          { status: 400 }
        );
      }
    }

    // 4. Consultar exclusivamente los depósitos del usuario autenticado.
    let query = supabaseAdmin
      .from("deposits")
      .select(
        [
          "id",
          "user_id",
          "username",
          "email",
          "amount",
          "currency",
          "payment_method",
          "network",
          "status",
          "created_at",
          "confirmed_at",
          "expires_at",
          "credited_at",
        ].join(", ")
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (depositId) {
      query = query.eq("id", depositId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "Error consultando depósitos de soporte:",
        error.message
      );

      return NextResponse.json(
        {
          success: false,
          error: "No fue posible consultar los depósitos.",
        },
        { status: 500 }
      );
    }

    // Corrección del error de TypeScript de Vercel.
    const deposits = (data ?? []) as unknown as DepositRecord[];

    // 5. Preparar los registros para el agente de soporte.
    const formattedDeposits = deposits.map((deposit) => ({
      id: deposit.id,
      amount: Number(deposit.amount),
      currency: deposit.currency,
      payment_method: deposit.payment_method,
      network: deposit.network,
      status: deposit.status,
      created_at: deposit.created_at,
      confirmed_at: deposit.confirmed_at,
      expires_at: deposit.expires_at,
      credited_at: deposit.credited_at,
      situation: getDepositSituation(deposit),
    }));

    // 6. Crear un resumen del historial consultado.
    const summary = {
      total: formattedDeposits.length,

      credited: formattedDeposits.filter(
        (deposit) => Boolean(deposit.credited_at)
      ).length,

      confirmedNotCredited: formattedDeposits.filter(
        (deposit) =>
          normalizeStatus(deposit.status) === "CONFIRMED" &&
          !deposit.credited_at
      ).length,

      expiredNotCredited: formattedDeposits.filter(
        (deposit) =>
          normalizeStatus(deposit.status) === "EXPIRED" &&
          !deposit.credited_at
      ).length,

      pending: formattedDeposits.filter(
        (deposit) =>
          normalizeStatus(deposit.status) === "PENDING" &&
          !deposit.credited_at
      ).length,

      failedOrCancelled: formattedDeposits.filter((deposit) =>
        ["FAILED", "CANCELLED", "CANCELED"].includes(
          normalizeStatus(deposit.status)
        )
      ).length,
    };

    // No se devuelve el correo ni otros datos personales innecesarios.
    return NextResponse.json(
      {
        success: true,
        summary,
        deposits: formattedDeposits,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error inesperado en /api/support/tools/deposits:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Ocurrió un error al consultar los depósitos.",
      },
      { status: 500 }
    );
  }
}
