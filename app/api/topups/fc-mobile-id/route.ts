
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID = "eafc_mobile_id";

const STORE_MARGIN = 0.20;

/*
 * ============================================================
 * CATÁLOGO EAFC MOBILE INDONESIA
 * ============================================================
 *
 * supplierPrice = precio real de FazerCards
 * price         = precio para el cliente
 */

const OFFERS = [
  {
    id: "40_fc_points",
    name: "40 FC Points",
    display: "40 FC POINTS",
    icon: "⚽",
    supplierPrice: 0.3426,
    price: 0.5426,
  },
  {
    id: "100_fc_points",
    name: "100 FC Points",
    display: "100 FC POINTS",
    icon: "⚽",
    supplierPrice: 0.8463,
    price: 1.0463,
  },
  {
    id: "520_fc_points",
    name: "520 FC Points",
    display: "520 FC POINTS",
    icon: "⚽",
    supplierPrice: 4.1912,
    price: 4.3912,
  },
  {
    id: "1070_fc_points",
    name: "1070 FC Puntos",
    display: "1070 FC POINTS",
    icon: "⚽",
    supplierPrice: 8.4227,
    price: 8.6227,
  },
  {
    id: "2200_fc_points",
    name: "2200 FC Points",
    display: "2200 FC POINTS",
    icon: "⚽",
    supplierPrice: 17.4298,
    price: 17.6298,
  },
  {
    id: "5750_fc_points",
    name: "5750 FC Points",
    display: "5750 FC POINTS",
    icon: "⚽",
    supplierPrice: 42.3352,
    price: 42.5352,
  },
  {
    id: "12000_fc_points",
    name: "12000 FC Points",
    display: "12000 FC POINTS",
    icon: "⚽",
    supplierPrice: 84.7308,
    price: 84.9308,
  },
  {
    id: "39_silver",
    name: "39 Silver",
    display: "39 SILVER",
    icon: "🪙",
    supplierPrice: 0.3426,
    price: 0.5426,
  },
  {
    id: "99_silver",
    name: "99 Silver",
    display: "99 SILVER",
    icon: "🪙",
    supplierPrice: 0.8463,
    price: 1.0463,
  },
  {
    id: "499_silver",
    name: "499 Silver",
    display: "499 SILVER",
    icon: "🪙",
    supplierPrice: 4.1912,
    price: 4.3912,
  },
  {
    id: "999_plata",
    name: "999 Plata",
    display: "999 SILVER",
    icon: "🪙",
    supplierPrice: 8.4227,
    price: 8.6227,
  },
  {
    id: "1999_plata",
    name: "1999 Plata",
    display: "1999 SILVER",
    icon: "🪙",
    supplierPrice: 17.4298,
    price: 17.6298,
  },
  {
    id: "4999_plata",
    name: "4999 Plata",
    display: "4999 SILVER",
    icon: "🪙",
    supplierPrice: 42.3352,
    price: 42.5352,
  },
  {
    id: "9999_plata",
    name: "9999 Plata",
    display: "9999 SILVER",
    icon: "🪙",
    supplierPrice: 84.7308,
    price: 84.9308,
  },
] as const;

/*
 * ============================================================
 * BEARER TOKEN
 * ============================================================
 */

function getBearerToken(request: NextRequest) {
  const authorization =
    request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim();
}

/*
 * ============================================================
 * OBTENER ID DE ORDEN DE FAZERCARDS
 * ============================================================
 */

function getSupplierOrderId(data: any): string | null {
  const candidates = [
    data?.order_id,
    data?.orderId,
    data?.supplier_order_id,
    data?.supplierOrderId,
    data?.id,

    data?.data?.order_id,
    data?.data?.orderId,
    data?.data?.supplier_order_id,
    data?.data?.supplierOrderId,
    data?.data?.id,

    data?.order?.order_id,
    data?.order?.orderId,
    data?.order?.supplier_order_id,
    data?.order?.supplierOrderId,
    data?.order?.id,
  ];

  for (const value of candidates) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value);
    }
  }

  return null;
}

/*
 * ============================================================
 * OBTENER ESTADO
 * ============================================================
 */

function getSupplierStatus(data: any): string | null {
  const candidates = [
    data?.status,
    data?.order_status,
    data?.orderStatus,

    data?.data?.status,
    data?.data?.order_status,
    data?.data?.orderStatus,

    data?.order?.status,
    data?.order?.order_status,
    data?.order?.orderStatus,
  ];

  for (const value of candidates) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim().toLowerCase();
    }
  }

  return null;
}

/*
 * ============================================================
 * ESTADOS RECHAZADOS
 * ============================================================
 */

function isSupplierRejected(status: string | null) {
  if (!status) {
    return false;
  }

  return [
    "rejected",
    "reject",
    "failed",
    "failure",
    "cancelled",
    "canceled",
    "declined",
    "error",
  ].includes(status);
}

/*
 * ============================================================
 * ESTADOS COMPLETADOS
 * ============================================================
 */

function isSupplierCompleted(status: string | null) {
  if (!status) {
    return false;
  }

  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "done",
  ].includes(status);
}

/*
 * ============================================================
 * PRECIO
 * ============================================================
 */

function getRetailPrice(
  offer: (typeof OFFERS)[number]
) {
  return Number(
    Number(
      offer.supplierPrice + STORE_MARGIN
    ).toFixed(4)
  );
}

/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(request: NextRequest) {
  let insertedOrderId: string | null = null;

  try {
    /*
     * ========================================================
     * AUTH
     * ========================================================
     */

    const accessToken =
      getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "No autorizado. Inicie sesión.",
        },
        { status: 401 }
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
      return NextResponse.json(
        {
          error:
            "Sesión inválida o expirada.",
        },
        { status: 401 }
      );
    }

    const user = userData.user;

    /*
     * ========================================================
     * BODY
     * ========================================================
     */
