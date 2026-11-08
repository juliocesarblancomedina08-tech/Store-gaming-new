
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

export async function GET(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: "Falta configurar Supabase." },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Sesión no autorizada." },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Sesión inválida." },
        { status: 401 }
      );
    }

    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "No tienes permisos." },
        { status: 403 }
      );
    }

    const authClients: any[] = [];

    let page = 1;
    const perPage = 1000;

    while (true) {
      const {
        data: { users },
        error,
      } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        console.error("Error consultando usuarios:", error);

        return NextResponse.json(
          { success: false, error: "No se pudieron cargar los clientes." },
          { status: 500 }
        );
      }

      authClients.push(...users);

      if (users.length < perPage) break;
      page++;
    }

    const { data: profiles, error: profilesError } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, username, avatar_url, vip_started_at, vip_expires_at, vip_source"
        );

    if (profilesError) {
      console.error("Error consultando perfiles:", profilesError);

      return NextResponse.json(
        {
          success: false,
          error: "No se pudieron consultar los perfiles y membresías VIP.",
        },
        { status: 500 }
      );
    }

    const profilesById = new Map(
      (profiles || []).map((profile) => [profile.id, profile])
    );

    const now = Date.now();

    const clients = authClients.map((client) => {
      const profile = profilesById.get(client.id);

      const vipStartedAt = profile?.vip_started_at || null;
      const vipExpiresAt = profile?.vip_expires_at || null;

      const vipActive =
        Boolean(vipExpiresAt) &&
        new Date(vipExpiresAt).getTime() > now;

      const metadata = client.user_metadata || {};

      const username =
        profile?.username ||
        metadata.username ||
        metadata.user_name ||
        metadata.full_name ||
        metadata.name ||
        client.email?.split("@")[0] ||
        "Usuario";

      const vipSource = vipActive
        ? profile?.vip_source || "purchase"
        : null;

      return {
        id: client.id,
        email: client.email || "",
        created_at: client.created_at,
        name: username,
        username,
        avatar_url: profile?.avatar_url || metadata.avatar_url || null,
        email_confirmed: Boolean(client.email_confirmed_at),

        vip_started_at: vipStartedAt,
        vip_expires_at: vipExpiresAt,
        vip_active: vipActive,
        vip_source: vipSource,
        vip_purchased: vipActive && vipSource === "purchase",
        vip_manual: vipActive && vipSource === "manual",
      };
    });

    clients.sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );

    return NextResponse.json(
      {
        success: true,
        total: clients.length,
        clients,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error en API de clientes:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error interno al consultar los clientes.",
      },
      { status: 500 }
    );
  }
}
