import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

function getSupabaseClients() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

  return {
    supabaseAdmin,
    supabaseAuth,
  };
}

export async function POST(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    const token =
      authorization.substring(7);

    const {
      supabaseAdmin,
      supabaseAuth,
    } = getSupabaseClients();

    /*
     * VERIFICAR SESIÓN
     */

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      console.error(
        "ERROR DE AUTENTICACIÓN:",
        userError
      );

      return NextResponse.json(
        {
          error: "Sesión inválida.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * VERIFICAR ADMIN
     */

    if (
      (user.email || "").toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos de administrador.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * LEER DATOS
     */

    const body = await request.json();

    const depositId =
      body?.depositId;

    const action =
      body?.action;

    if (
      typeof depositId !== "string" ||
      !depositId
    ) {
      return NextResponse.json(
        {
          error:
            "ID de depósito inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      action !== "CONFIRM" &&
      action !== "REJECT" &&
      action !== "RECREDIT"
    ) {
      return NextResponse.json(
        {
          error:
            "Acción inválida.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * CONFIRMAR DEPÓSITO
     * ==========================================
     */

    if (action === "CONFIRM") {
      const {
        data,
        error,
      } =
        await supabaseAdmin.rpc(
          "confirm_deposit",
          {
            p_deposit_id:
              depositId,
          }
        );

      if (error) {
        console.error(
          "ERROR AL CONFIRMAR:",
          error
        );

        return NextResponse.json(
          {
            error:
              error.message ||
              "No se pudo confirmar el depósito.",
          },
          {
            status: 400,
          }
        );
      }

      return NextResponse.json({
        success: true,
        action: "CONFIRMED",
        deposit: data,
      });
    }

    /*
     * ==========================================
     * RECHAZAR DEPÓSITO
     * ==========================================
     */

    if (action === "REJECT") {
      const {
        data: rejectedDeposit,
        error: rejectError,
      } =
        await supabaseAdmin
          .from("deposits")
          .update({
            status: "REJECTED",
          })
          .eq("id", depositId)
          .eq("status", "PENDING")
          .select()
          .single();

      if (
        rejectError ||
        !rejectedDeposit
      ) {
        console.error(
          "ERROR AL RECHAZAR:",
          rejectError
        );

        return NextResponse.json(
          {
            error:
              "El depósito no existe, ya fue procesado o no pudo ser rechazado.",
          },
          {
            status: 400,
          }
        );
      }

      return NextResponse.json({
        success: true,
        action: "REJECTED",
        deposit:
          rejectedDeposit,
      });
    }

    /*
     * ==========================================
     * REACREDITAR DEPÓSITO
     * ==========================================
     *
     * IMPORTANTE:
     *
     * Esta función solamente funcionará si:
     *
     * status = CONFIRMED
     *
     * y
     *
     * credited_at IS NULL
     *
     * La función SQL se encarga de bloquear
     * una segunda acreditación.
     */

    if (action === "RECREDIT") {
      const {
        data,
        error,
      } =
        await supabaseAdmin.rpc(
          "recredit_deposit",
          {
            p_deposit_id:
              depositId,
          }
        );

      if (error) {
        console.error(
          "ERROR AL REACREDITAR:",
          error
        );

        return NextResponse.json(
          {
            error:
              error.message ||
              "No se pudo acreditar el crédito.",
          },
          {
            status: 400,
          }
        );
      }

      return NextResponse.json({
        success: true,
        action: "RECREDITED",
        deposit: data,
      });
    }

    return NextResponse.json(
      {
        error:
          "Acción no procesada.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "ERROR EN ACTION:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor.",
      },
      {
        status: 500,
      }
    );
  }
}
