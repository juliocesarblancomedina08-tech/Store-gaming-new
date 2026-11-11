
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { isAdminUser } from "../../../../lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const authorized = await isAdminUser(accessToken);

    if (!authorized) {
      return NextResponse.json(
        { error: "Acceso denegado." },
        { status: 403 }
      );
    }

    const adminId = "c1d707aa-9454-4a7a-b6f6-1c776a818286";

    const { data: adminProfile, error: adminError } =
      await supabaseAdmin
        .from("profiles")
        .select("id,email,balance")
        .eq("id", adminId)
        .maybeSingle();

    if (adminError) {
      console.error("ERROR CONSULTANDO ADMIN:", adminError);

      return NextResponse.json(
        { error: "Error consultando el perfil administrativo." },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,email,balance")
      .order("email", { ascending: true });

    if (error) {
      console.error("ERROR CARGANDO BALANCES:", error);

      return NextResponse.json(
        { error: "No se pudieron cargar los balances." },
        { status: 500 }
      );
    }

    const balances = (data || []).map((profile) => ({
      id: profile.id,
      email: profile.email || "Sin correo",
      balance: Number(profile.balance) || 0,
    }));

    const adminInList = balances.find(
      (profile) => profile.id === adminId
    );

    console.log("DIAGNOSTICO BALANCE ADMIN:", {
      directProfile: adminProfile,
      profileInList: adminInList,
    });

    return NextResponse.json(
      {
        ok: true,
        balances,
        totalClients: balances.length,
        diagnostic: {
          directProfile: adminProfile,
          profileInList: adminInList,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("ERROR API ADMIN BALANCES:", error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
