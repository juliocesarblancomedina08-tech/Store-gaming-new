import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

function getSupabaseClients() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Falta la variable NEXT_PUBLIC_SUPABASE_URL en Vercel."
    );
  }

  if (!anonKey) {
    throw new Error(
      "Falta la variable NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Falta la variable SUPABASE_SERVICE_ROLE_KEY en Vercel."
    );
  }

  const supabaseAuth = createClient(
    supabaseUrl,
    anonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const supabaseAdmin = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return {
    supabaseAuth,
    supabaseAdmin,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const token = authorization.substring(7);

    const {
      supabaseAuth,
      supabaseAdmin,
    } = getSupabaseClients();

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      console.error(
        "ERROR DE AUTENTICACIÓN:",
        userError
      );

      return NextResponse.json(
        { error: "Sesión inválida." },
        { status: 401 }
      );
    }

    if (
      (user.email || "").toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos de administrador.",
        },
        { status: 403 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const view =
      searchParams.get("view") || "pending";

    if (view === "pending") {
      const {
        data: deposits,
        error: depositsError,
      } = await supabaseAdmin
        .from("deposits")
        .select(`
          id,
          user_id,
          username,
          email,
          amount,
          currency,
          payment_method,
          network,
          wallet_address,
          tx_hash,
          status,
          created_at,
          confirmed_at,
          credited_at,
          expires_at
        `)
        .eq("status", "PENDING")
        .order("created_at", {
          ascending: false,
        });

      if (depositsError) {
        console.error(
          "ERROR AL OBTENER DEPÓSITOS PENDIENTES:",
          depositsError
        );

        return NextResponse.json(
          {
            error:
              "No se pudieron cargar los depósitos.",
          },
          { status: 500 }
        );
      }

      const formattedDeposits =
        (deposits || []).map((deposit) => ({
          ...deposit,
          address: deposit.wallet_address,
        }));

      return NextResponse.json({
        deposits: formattedDeposits,
      });
    }

    if (view === "history") {
      const {
        data: deposits,
        error: depositsError,
      } = await supabaseAdmin
        .from("deposits")
        .select(`
          id,
          user_id,
          username,
          email,
          amount,
          currency,
          payment_method,
          network,
          wallet_address,
          tx_hash,
          status,
          created_at,
          confirmed_at,
          credited_at,
          expires_at
        `)
        .neq("status", "PENDING")
        .order("created_at", {
          ascending: false,
        });

      if (depositsError) {
        console.error(
          "ERROR AL OBTENER HISTORIAL:",
          depositsError
        );

        return NextResponse.json(
          {
            error:
              "No se pudo cargar el historial.",
          },
          { status: 500 }
        );
      }

      const formattedDeposits =
        (deposits || []).map((deposit) => ({
          ...deposit,
          address: deposit.wallet_address,
        }));

      return NextResponse.json({
        deposits: formattedDeposits,
      });
    }

    return NextResponse.json(
      { error: "Vista inválida." },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "ERROR EN /api/admin/deposits:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}
