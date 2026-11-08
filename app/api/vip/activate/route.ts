
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "SERVER_CONFIGURATION_ERROR" },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "INVALID_SESSION" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const idempotencyKey = body?.idempotencyKey;

    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.trim().length < 16 ||
      idempotencyKey.trim().length > 200
    ) {
      return NextResponse.json(
        { success: false, error: "INVALID_IDEMPOTENCY_KEY" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "store_gaming_activate_vip",
      {
        p_user_id: user.id,
        p_idempotency_key: idempotencyKey.trim(),
      }
    );

    if (error) {
      console.error("VIP activation error:", error);

      const message = error.message || "";

      if (message.includes("INSUFFICIENT_BALANCE")) {
        return NextResponse.json(
          { success: false, error: "INSUFFICIENT_BALANCE" },
          { status: 400 }
        );
      }

      if (message.includes("PROFILE_NOT_FOUND")) {
        return NextResponse.json(
          { success: false, error: "PROFILE_NOT_FOUND" },
          { status: 404 }
        );
      }

      if (message.includes("IDEMPOTENCY_KEY_ALREADY_USED")) {
        return NextResponse.json(
          { success: false, error: "IDEMPOTENCY_KEY_ALREADY_USED" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, error: "VIP_ACTIVATION_FAILED" },
        { status: 500 }
      );
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      return NextResponse.json(
        { success: false, error: "EMPTY_VIP_RESPONSE" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "VIP_ACTIVATED",
      payment_id: result.payment_id,
      vip_started_at: result.vip_started_at,
      vip_expires_at: result.vip_expires_at,
      balance: result.balance,
      created: result.created,
    });
  } catch (error) {
    console.error("VIP API error:", error);

    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
