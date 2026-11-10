
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID = "honor_of_kings";
const GAME_NAME = "Honor of Kings";
const STORE_MARGIN = 0.20;

const supabaseAdmin = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY || "placeholder-key",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

type Offer = {
  id: string;
  name: string;
  supplierPrice: number;
  retailPrice: number;
};

const RAW_OFFERS = [
  ["16_tokens", "16 Tokens", 0.1713],
  ["double_token_lucky_bag", "Double Token Lucky Bag", 0.3224],
  ["honor_point_value_pack", "Honor Point Value Pack", 0.3224],
  ["standard_purchase_rebate_pack", "Standard Purchase Rebate Pack", 0.3224],
  ["80_tokens", "80 Tokens", 0.8463],
  ["weekly_card", "Weekly Card", 0.9471],
  ["premium_purchase_rebate_pack", "Premium Purchase Rebate Pack", 1.1888],
  ["240_tokens", "240 Tokens", 2.5288],
  ["weekly_card_plus", "Weekly Card Plus", 2.9016],
  ["400_tokens", "400 Tokens", 4.2214],
  ["560_tokens", "560 Tokens", 5.9140],
  ["830_tokens", "830 Tokens", 8.4429],
  ["1245_tokens", "1245 Tokens", 12.6643],
  ["2508_tokens", "2508 Tokens", 25.3386],
  ["4180_tokens", "4180 Tokens", 42.2344],
  ["8360_tokens", "8360 Tokens", 84.4688],
] as const;

const OFFERS: Offer[] = RAW_OFFERS.map(
  ([id, name, supplierPrice]) => ({
    id,
    name,
    supplierPrice,
    retailPrice: Number(
      (supplierPrice + STORE_MARGIN).toFixed(4)
    ),
  })
);

function normalizeStatus(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function extractSupplierOrderId(data: any): string {
  return String(
    data?.order_id ||
      data?.orderId ||
      data?.supplier_order_id ||
      data?.supplierOrderId ||
      data?.data?.order_id ||
      data?.data?.orderId ||
      data?.data?.supplier_order_id ||
      data?.data?.supplierOrderId ||
      ""
  );
}

function extractSupplierStatus(data: any): string {
  return normalizeStatus(
    data?.status ||
      data?.order_status ||
      data?.data?.status ||
      data?.data?.order_status
  );
}

function getProviderError(data: any): string {
  return String(
    data?.error ||
      data?.message ||
      data?.detail ||
      data?.data?.error ||
      data?.data?.message ||
      "El proveedor rechazó la orden."
  );
}

async function refundOrder(orderId: string) {
  const { error } = await supabaseAdmin.rpc(
    "refund_topup_balance",
    {
      p_order_id: orderId,
    }
  );

  return error;
}

export async function POST(request: NextRequest) {
  let createdOrderId: string | null = null;

  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: "Configuración de Supabase incompleta." },
        { status: 500 }
      );
    }

    if (!FAZER_API_KEY) {
      return NextResponse.json(
        { error: "Configuración de FazerCards incompleta." },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.substring("Bearer ".length);

    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      return NextResponse.json(
        { error: "Sesión inválida." },
        { status: 401 }
      );
    }

    const user = userData.user;
    const body = await request.json();

    const offerId = String(body?.offerId || "").trim();
    const playerId = String(body?.playerId || "").trim();
    const idempotencyKey = String(
      body?.idempotencyKey || ""
    ).trim();

    if (!offerId) {
      return NextResponse.json(
        { error: "Falta la oferta." },
        { status: 400 }
      );
    }

    if (!playerId) {
      return NextResponse.json(
        { error: "Falta el Player ID." },
        { status: 400 }
      );
    }

    if (!/^\d{4,20}$/.test(playerId)) {
      return NextResponse.json(
        {
          error:
            "El Player ID debe contener entre 4 y 20 dígitos.",
        },
        { status: 400 }
      );
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Falta la clave de idempotencia." },
        { status: 400 }
      );
    }

    const offer = OFFERS.find(
      (item) => item.id === offerId
    );

    if (!offer) {
      return NextResponse.json(
        { error: "La oferta seleccionada no existe." },
        { status: 400 }
      );
    }

    /*
     * VALIDACIÓN DE PRECIO
     *
     * El precio de venta se calcula exclusivamente
     * en el servidor. No usamos body.retailPrice.
     */
    const supplierPrice = Number(offer.supplierPrice);
    const retailPrice = Number(offer.retailPrice);

    if (
      !Number.isFinite(supplierPrice) ||
      supplierPrice <= 0 ||
      !Number.isFinite(retailPrice) ||
      retailPrice <= supplierPrice
    ) {
      console.error("HONOR OF KINGS: precio inválido", {
        offerId: offer.id,
        supplierPrice,
        retailPrice,
      });

      return NextResponse.json(
        {
          error:
            "El precio configurado para esta oferta no es válido.",
        },
        { status: 500 }
      );
    }

    /*
     * COMPROBAR IDEMPOTENCIA
     */
    const {
      data: existingOrder,
      error: existingOrderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingOrderError) {
      console.error(
        "HONOR OF KINGS: error comprobando orden",
        existingOrderError
      );

      return NextResponse.json(
        { error: "No se pudo comprobar la orden." },
        { status: 500 }
      );
    }

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        alreadyExists: true,
        order: existingOrder,
        orderNumber:
          existingOrder.order_number || existingOrder.id,
        supplierOrderId:
          existingOrder.supplier_order_id || "",
        status: existingOrder.status || "",
      });
    }

    /*
     * COMPROBAR SALDO
     */
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: "No se pudo comprobar el saldo." },
        { status: 500 }
      );
    }

    const balance = Number(profile?.balance || 0);

    if (!Number.isFinite(balance) || balance < retailPrice) {
      return NextResponse.json(
        { error: "Saldo insuficiente." },
        { status: 400 }
      );
    }

    /*
     * CREAR ORDEN
     */
    const {
      data: insertedOrder,
      error: insertError,
    } = await supabaseAdmin
      .from("topup_orders")
      .insert({
        user_id: user.id,
        game: GAME_NAME,
        category_id: CATEGORY_ID,
        offer_id: offer.id,
        offer_name: offer.name,
        player_id: playerId,
        currency: "USDT",
        retail_price: retailPrice,
        supplier_price: supplierPrice,
        status: "RESERVED",
        idempotency_key: idempotencyKey,
        supplier_fields: {
          player_id: playerId,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (insertError || !insertedOrder) {
      console.error(
        "HONOR OF KINGS: error creando orden",
        insertError
      );

      return NextResponse.json(
        {
          error: "No se pudo crear la orden.",
          details: insertError?.message,
        },
        { status: 500 }
      );
    }

    createdOrderId = insertedOrder.id;

    /*
     * RESERVAR SALDO
     */
    const { error: reserveError } =
      await supabaseAdmin.rpc(
        "reserve_topup_balance",
        {
          p_order_id: insertedOrder.id,
        }
      );

    if (reserveError) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "FAILED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", insertedOrder.id);

      return NextResponse.json(
        {
          error:
            reserveError.message ||
            "No se pudo reservar el saldo.",
        },
        { status: 400 }
      );
    }

    /*
     * ENVIAR ORDEN A FAZERCARDS
     */
    const supplierPayload = {
      category_id: CATEGORY_ID,
      offer_id: offer.id,
      fields: {
        player_id: playerId,
      },
    };

    let supplierResponse: any = null;
    let supplierHttpStatus = 0;

    try {
      const supplierRequest = await fetch(
        `${FAZER_API_BASE}/topups/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": FAZER_API_KEY,
            "Idempotency-Key": idempotencyKey,
            Accept: "application/json",
          },
          body: JSON.stringify(supplierPayload),
          cache: "no-store",
        }
      );

      supplierHttpStatus = supplierRequest.status;

      const responseText = await supplierRequest.text();

      try {
        supplierResponse = responseText
          ? JSON.parse(responseText)
          : null;
      } catch {
        supplierResponse = { raw: responseText };
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_response: supplierResponse,
          updated_at: new Date().toISOString(),
        })
        .eq("id", insertedOrder.id);

      /*
       * RECHAZO HTTP DEL PROVEEDOR
       */
      if (!supplierRequest.ok) {
        console.error(
          "FAZERCARDS rechazó Honor of Kings",
          {
            httpStatus: supplierHttpStatus,
            offerId: offer.id,
            configuredSupplierPrice: supplierPrice,
            providerResponse: supplierResponse,
          }
        );

        const refundError = await refundOrder(
          insertedOrder.id
        );

        if (refundError) {
          await supabaseAdmin
            .from("topup_orders")
            .update({
              status: "REFUND_PENDING",
              updated_at: new Date().toISOString(),
            })
            .eq("id", insertedOrder.id);

          return NextResponse.json(
            {
              error:
                "El proveedor rechazó la orden y el reembolso quedó pendiente.",
              provider: supplierResponse,
            },
            { status: 502 }
          );
        }

        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "FAILED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", insertedOrder.id);

        return NextResponse.json(
          {
            error: getProviderError(supplierResponse),
            provider: supplierResponse,
          },
          { status: 502 }
        );
      }
    } catch (supplierError) {
      /*
       * No reembolsar automáticamente ante un error
       * de red: el proveedor podría haber recibido
       * la orden aunque la respuesta no llegara.
       */
      console.error(
        "HONOR OF KINGS: error de comunicación con FazerCards",
        supplierError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          supplier_response: {
            network_error:
              supplierError instanceof Error
                ? supplierError.message
                : String(supplierError),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", insertedOrder.id);

      return NextResponse.json(
        {
          ok: true,
          order: {
            ...insertedOrder,
            status: "SUPPLIER_PENDING",
          },
          orderNumber:
            insertedOrder.order_number || insertedOrder.id,
          supplierOrderId: "",
          status: "SUPPLIER_PENDING",
          message:
            "La orden quedó pendiente de confirmación del proveedor. Comprueba su estado antes de volver a enviarla.",
        },
        { status: 202 }
      );
    }

    /*
     * LEER RESPUESTA DEL PROVEEDOR
     */
    const supplierOrderId =
      extractSupplierOrderId(supplierResponse);

    const supplierStatus =
      extractSupplierStatus(supplierResponse);

    /*
     * SIN ID DE ORDEN: DEJAR PENDIENTE
     */
    if (!supplierOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", insertedOrder.id);

      return NextResponse.json(
        {
          ok: true,
          order: {
            ...insertedOrder,
            status: "SUPPLIER_PENDING",
          },
          orderNumber:
            insertedOrder.order_number || insertedOrder.id,
          supplierOrderId: "",
          status: "SUPPLIER_PENDING",
          message:
            "El proveedor respondió, pero no devolvió un número de orden. La orden quedó pendiente de verificación.",
        },
        { status: 202 }
      );
    }

    /*
     * ESTADO DE LA ORDEN
     */
    const completedStatuses = [
      "COMPLETED",
      "COMPLETE",
      "SUCCESS",
      "SUCCEEDED",
      "DONE",
    ];

    const finalStatus =
      completedStatuses.includes(supplierStatus)
        ? "COMPLETED"
        : "SUPPLIER_PENDING";

    const {
      data: updatedOrder,
      error: updateError,
    } = await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_order_id: supplierOrderId,
        supplier_response: supplierResponse,
        status: finalStatus,
        completed_at:
          finalStatus === "COMPLETED"
            ? new Date().toISOString()
            : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", insertedOrder.id)
      .select("*")
      .single();

    if (updateError) {
      console.error(
        "HONOR OF KINGS: no se pudo actualizar la orden",
        updateError
      );
    }

    return NextResponse.json({
      ok: true,
      order: updatedOrder || {
        ...insertedOrder,
        supplier_order_id: supplierOrderId,
        status: finalStatus,
      },
      orderNumber:
        updatedOrder?.order_number ||
        insertedOrder.order_number ||
        insertedOrder.id,
      supplierOrderId,
      status: finalStatus,
    });
  } catch (error) {
    console.error(
      "HONOR_OF_KINGS_ORDER_ERROR:",
      error
    );

    if (createdOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", createdOrderId);
    }

    return NextResponse.json(
      {
        error:
          "No se pudo completar el procesamiento de la orden.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
