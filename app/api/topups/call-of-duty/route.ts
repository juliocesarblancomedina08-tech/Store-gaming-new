
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

import { CALL_OF_DUTY } from "../../../../lib/games/call-of-duty";

export const dynamic = "force-dynamic";

const FAZER_API_BASE =
  process.env.FAZERCARDS_BASE_URL ||
  "https://api.fzr.cards/api/v2";

const FAZERCARDS_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID =
  CALL_OF_DUTY.categoryId;

const REQUEST_TIMEOUT = 30000;

type TopupOrderRow = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  game: string;
  category_id: string;
  offer_id: string;
  offer_name: string;
  player_id: string | null;
  retail_price: number;
  supplier_price: number;
  currency: string;
  status: string;
  idempotency_key: string;
  supplier_fields: Record<string, unknown> | null;
  supplier_order_id: string | null;
  supplier_response: unknown;
  updated_at: string | null;
  refunded_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
};

type SupplierOrder = {
  id?: string;
  order_id?: string;
  status?: string;
  state?: string;
};

type SupplierResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  message?: string;
  order?: SupplierOrder;
  data?: SupplierOrder;
  result?: SupplierOrder;
  id?: string;
  order_id?: string;
  status?: string;
  state?: string;
};

function jsonError(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...extra,
    },
    { status }
  );
}

function jsonSuccess(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    {
      ok: true,
      ...data,
    },
    { status }
  );
}

function normalizeString(
  value: unknown
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeUserId(
  value: unknown
): string {
  return normalizeString(value).replace(
    /\s+/g,
    ""
  );
}

function normalizeIdempotencyKey(
  value: unknown
): string {
  return normalizeString(value);
}

function isValidUserId(
  value: string
): boolean {
  return /^[A-Za-z0-9_-]{4,32}$/.test(
    value
  );
}

function isValidIdempotencyKey(
  value: string
): boolean {
  return (
    value.length >= 8 &&
    value.length <= 200
  );
}

function roundMoney(
  value: number
): number {
  return Math.round(value * 10000) / 10000;
}

function toNumber(
  value: unknown
): number {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  return 0;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT
) {
  const controller =
    new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

function extractSupplierOrder(
  data: SupplierResponse | null
): SupplierOrder | null {
  if (!data) {
    return null;
  }

  if (data.order) {
    return data.order;
  }

  if (data.data) {
    return data.data;
  }

  if (data.result) {
    return data.result;
  }

  if (
    data.id ||
    data.order_id ||
    data.status ||
    data.state
  ) {
    return {
      id: data.id,
      order_id: data.order_id,
      status: data.status,
      state: data.state,
    };
  }

  return null;
}

function extractSupplierOrderId(
  data: SupplierResponse | null
): string | null {
  const order =
    extractSupplierOrder(data);

  if (!order) {
    return null;
  }

  return (
    order.id ||
    order.order_id ||
    null
  );
}

function extractSupplierStatus(
  data: SupplierResponse | null
): string {
  const order =
    extractSupplierOrder(data);

  return (
    order?.status ||
    order?.state ||
    data?.status ||
    data?.state ||
    "pending"
  );
}

async function refundOrder(
  orderId: string
) {
  try {
    const {
      error,
    } =
      await supabaseAdmin.rpc(
        "store_gaming_refund_balance",
        {
          p_order_id:
            orderId,
        }
      );

    if (error) {
      console.error(
        "CALL OF DUTY REFUND ERROR:",
        error
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "CALL OF DUTY REFUND EXCEPTION:",
      error
    );

    return false;
  }
}

export async function POST(
  request: NextRequest
) {
  let reservedBalance = false;

  let insertedOrderId:
    | string
    | null = null;

  try {
    /*
     * ---------------------------------------------------------------
     * 1. CONFIGURACIÓN
     * ---------------------------------------------------------------
     */

    if (!FAZERCARDS_API_KEY) {
      console.error(
        "FAZERCARDS_API_KEY no está configurada."
      );

      return jsonError(
        "El servicio de recarga no está configurado.",
        500
      );
    }

    /*
     * ---------------------------------------------------------------
     * 2. AUTENTICACIÓN SUPABASE
     * ---------------------------------------------------------------
     */

    const authorization =
      request.headers.get(
        "authorization"
      ) || "";

    if (
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return jsonError(
        "Sesión no válida.",
        401
      );
    }

    const accessToken =
      authorization
        .slice(7)
        .trim();

    if (!accessToken) {
      return jsonError(
        "Token de autenticación no válido.",
        401
      );
    }

    const {
      data: userData,
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !userData?.user
    ) {
      console.error(
        "SUPABASE AUTH ERROR:",
        userError
      );

      return jsonError(
        "La sesión ha expirado. Inicie sesión nuevamente.",
        401
      );
    }

    const authenticatedUser =
      userData.user;

    /*
     * ---------------------------------------------------------------
     * 3. LEER BODY
     * ---------------------------------------------------------------
     */
