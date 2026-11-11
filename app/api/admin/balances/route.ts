
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { isAdminUser } from "../../../../lib/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const ADMIN_ID = "c1d707aa-9454-4a7a-b6f6-1c776a818286";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "No autorizado." },
        { status: 401 }
      );
    }

    const authorized = await isAdminUser(accessToken);

    if (!authorized) {
      return NextResponse.json(
        { ok: false, error: "Acceso denegado." },
        { status: 403 }
      );
    }

    // 1. Consultar directamente el perfil del administrador.
    const { data: adminProfile, error: adminError } =
      await supabaseAdmin
        .from("profiles")
        .select("id,email,balance")
        .eq("id", ADMIN_ID)
        .maybeSingle();

    if (adminError) {
      console.error("ERROR CONSULTANDO ADMIN:", adminError);

      return NextResponse.json(
        {
          ok: false,
          error: "Error consultando el perfil administrativo.",
        },
        { status: 500 }
      );
    }

    if (!adminProfile) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se encontró el perfil del administrador.",
        },
        { status: 404 }
      );
    }

    // 2. Consultar todos los perfiles.
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,email,balance")
      .order("email", { ascending: true });

    if (error) {
      console.error("ERROR CARGANDO BALANCES:", error);

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudieron cargar los balances.",
        },
        { status: 500 }
      );
    }

    // 3. Construir la lista normal de clientes.
    const balances = (data || []).map((profile) => ({
      id: profile.id,
      email: profile.email || "Sin correo",
      balance: Number(profile.balance) || 0,
    }));

    // 4. Sustituir el saldo del administrador por el valor
    // obtenido directamente de su perfil en Supabase.
    const directAdminBalance = Number(adminProfile.balance);

    const adminIndex = balances.findIndex(
      (profile) => profile.id === ADMIN_ID
    );

    if (adminIndex !== -1) {
      balances[adminIndex] = {
        id: adminProfile.id,
        email: adminProfile.email || "Sin correo",
        balance: directAdminBalance,
      };
    } else {
      balances.push({
        id: adminProfile.id,
        email: adminProfile.email || "Sin correo",
        balance: directAdminBalance,
      });
    }

    // 5. Obtener el registro final que se enviará al panel.
    const adminInList = balances.find(
      (profile) => profile.id === ADMIN_ID
    );

    const totalBalance = balances.reduce(
      (total, profile) => total + profile.balance,
      0
    );

    console.log("DIAGNOSTICO FINAL BALANCES:", {
      directProfile: adminProfile,
      finalAdminBalance: adminInList?.balance,
    });

    return NextResponse.json(
      {
        ok: true,
        balances,
        totalClients: balances.length,
        totalBalance,
        diagnostic: {
          directProfile: adminProfile,
          profileInList: adminInList || null,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("ERROR API ADMIN BALANCES:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}
