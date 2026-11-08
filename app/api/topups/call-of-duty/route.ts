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

    let body: any;

    try {
      body =
        await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no es válido.",
        400
      );
    }

    const offerId =
      normalizeString(
        body?.offerId
      );

    const userId =
      normalizeUserId(
        body?.userId ??
          body?.playerId
      );

    const idempotencyKey =
      normalizeIdempotencyKey(
        body?.idempotencyKey
      );

    /*
     * ---------------------------------------------------------------
     * 4. VALIDAR OFERTA
     * ---------------------------------------------------------------
     */

    if (!offerId) {
      return jsonError(
        "Debe seleccionar una oferta."
      );
    }

    const selectedOffer =
      CALL_OF_DUTY.offers.find(
        (offer) =>
          offer.id ===
          offerId
      );

    if (!selectedOffer) {
      return jsonError(
        "La oferta seleccionada no existe.",
        400
      );
    }

    /*
     * ---------------------------------------------------------------
     * 5. VALIDAR ID DE ACTIVISION
     * ---------------------------------------------------------------
     */

    if (!userId) {
      return jsonError(
        "Debe introducir el ID de usuario de Activision."
      );
    }

    if (
      !isValidUserId(
        userId
      )
    ) {
      return jsonError(
        "El ID de usuario de Activision no tiene un formato válido."
      );
    }

    /*
     * ---------------------------------------------------------------
     * 6. VALIDAR IDEMPOTENCIA
     * ---------------------------------------------------------------
     */

    if (
      !isValidIdempotencyKey(
        idempotencyKey
      )
    ) {
      return jsonError(
        "La clave de la orden no es válida."
      );
    }

    /*
     * ---------------------------------------------------------------
     * 7. COMPROBAR ORDEN DUPLICADA
     * ---------------------------------------------------------------
     */

    const {
      data: existingOrder,
      error:
        existingOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .select("*")
        .eq(
          "user_id",
          authenticatedUser.id
        )
        .eq(
          "idempotency_key",
          idempotencyKey
        )
        .maybeSingle();

    if (
      existingOrderError
    ) {
      console.error(
        "CHECK EXISTING TOPUP ORDER ERROR:",
        existingOrderError
      );

      return jsonError(
        "No se pudo comprobar la orden.",
        500
      );
    }

    if (existingOrder) {
      const existing =
        existingOrder as TopupOrderRow;

      return jsonSuccess({
        message:
          "Esta orden ya fue procesada.",

        order: {
          ...existing,

          order_number:
            existing.id,

          price:
            existing.retail_price,

          amount:
            existing.retail_price,

          supplier_status:
            existing.status,
        },
      });
    }

    /*
     * ---------------------------------------------------------------
     * 8. DATOS DEL USUARIO
     * ---------------------------------------------------------------
     *
     * NO consultamos profiles aquí.
     *
     * Esto evita que una diferencia en la tabla
     * profiles bloquee la recarga.
     *
     * El saldo se controla mediante:
     *
     * store_gaming_reserve_balance
     * ---------------------------------------------------------------
     */

    const username =
      authenticatedUser
        .user_metadata
        ?.username ||
      null;

    const email =
      authenticatedUser.email ||
      null;

    /*
     * ---------------------------------------------------------------
     * 9. PRECIO
     * ---------------------------------------------------------------
     */

    const retailPrice =
      roundMoney(
        toNumber(
          selectedOffer.price
        )
      );

    const supplierPrice =
      roundMoney(
        toNumber(
          selectedOffer.supplierPrice
        )
      );

    if (
      !Number.isFinite(
        retailPrice
      ) ||
      retailPrice <= 0
    ) {
      return jsonError(
        "El precio de la oferta no es válido.",
        500
      );
    }

    /*
     * ---------------------------------------------------------------
     * 10. CREAR ORDEN LOCAL
     * ---------------------------------------------------------------
     */

    const supplierFields = {
      user_id:
        userId,
    };

    const orderToInsert = {
      user_id:
        authenticatedUser.id,

      username,

      email,

      game:
        CALL_OF_DUTY.name,

      category_id:
        CATEGORY_ID,

      offer_id:
        selectedOffer.id,

      offer_name:
        selectedOffer.displayName,

      player_id:
        userId,

      retail_price:
        retailPrice,

      supplier_price:
        supplierPrice,

      currency:
        "USDT",

      status:
        "RESERVED",

      idempotency_key:
        idempotencyKey,

      supplier_fields:
        supplierFields,

      supplier_order_id:
        null,

      supplier_response:
        null,
    };

    const {
      data: insertedOrder,
      error:
        insertOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert(
          orderToInsert
        )
        .select("*")
        .single();

    if (
      insertOrderError ||
      !insertedOrder
    ) {
      console.error(
        "INSERT CALL OF DUTY TOPUP ORDER ERROR:",
        insertOrderError
      );

      return jsonError(
        "No se pudo crear la orden.",
        500
      );
    }

    insertedOrderId =
      insertedOrder.id;

    /*
     * ---------------------------------------------------------------
     * 11. RESERVAR SALDO
     * ---------------------------------------------------------------
     */

    const {
      data: reserveResult,
      error:
        reserveError,
    } =
      await supabaseAdmin.rpc(
        "store_gaming_reserve_balance",
        {
          p_user_id:
                        authenticatedUser.id,

          p_amount:
            retailPrice,
        }
      );

    if (reserveError) {
      console.error(
        "RESERVE BALANCE ERROR:",
        reserveError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REJECTED",

          failed_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return jsonError(
        "No tienes saldo suficiente para realizar esta compra.",
        400
      );
    }

    let reserveOk = true;

    if (
      typeof reserveResult ===
      "boolean"
    ) {
      reserveOk =
        reserveResult;
    }

    if (
      reserveResult &&
      typeof reserveResult ===
        "object" &&
      "success" in
        (reserveResult as Record<
          string,
          unknown
        >)
    ) {
      reserveOk =
        Boolean(
          (
            reserveResult as Record<
              string,
              unknown
            >
          ).success
        );
    }

    if (!reserveOk) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REJECTED",

          failed_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return jsonError(
        "No tienes saldo suficiente para realizar esta compra.",
        400
      );
    }

    reservedBalance = true;

    /*
     * ---------------------------------------------------------------
     * 12. ENVIAR ORDEN A FAZERCARDS
     * ---------------------------------------------------------------
     */

    const supplierUrl =
      `${FAZER_API_BASE}/topups/order`;

    const supplierBody = {
      category_id:
        CATEGORY_ID,

      offer_id:
        selectedOffer.supplierOfferId,

      fields: {
        user_id:
          userId,
      },
    };

    console.log(
      "CALL OF DUTY → FAZERCARDS:",
      {
        category_id:
          CATEGORY_ID,

        offer_id:
          selectedOffer.supplierOfferId,

        fields: {
          user_id:
            userId,
        },
      }
    );

    let supplierResponse:
      Response;

    let supplierData:
      SupplierResponse | null =
        null;

    try {
      supplierResponse =
        await fetchWithTimeout(
          supplierUrl,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              "X-API-Key":
                FAZERCARDS_API_KEY,

              "Idempotency-Key":
                idempotencyKey,

              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",

              Referer:
                "https://reseller.fazercards.com/",

              Origin:
                "https://reseller.fazercards.com",
            },

            body:
              JSON.stringify(
                supplierBody
              ),
          }
        );

      const supplierText =
        await supplierResponse.text();

      console.log(
        "FAZERCARDS CALL OF DUTY RESPONSE:",
        {
          status:
            supplierResponse.status,

          body:
            supplierText,
        }
      );

      try {
        supplierData =
          supplierText
            ? JSON.parse(
                supplierText
              )
            : null;
      } catch {
        supplierData = {
          ok: false,

          message:
            supplierText ||
            "Respuesta no JSON del proveedor.",
        };
      }
    } catch (error) {
      console.error(
        "FAZERCARDS CALL OF DUTY REQUEST ERROR:",
        error
      );

      /*
       * Si no conseguimos contactar al proveedor,
       * devolvemos el saldo reservado.
       */

      if (
        reservedBalance &&
        insertedOrderId
      ) {
        await refundOrder(
          insertedOrderId
        );

        reservedBalance =
          false;
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REJECTED",

          failed_at:
            new Date().toISOString(),

          supplier_response: {
            error:
              "No fue posible conectar con FazerCards.",
          },
        })
        .eq(
          "id",
          insertedOrderId
        );

      return jsonError(
        "No fue posible conectar con FazerCards.",
        502
      );
    }

    /*
     * ---------------------------------------------------------------
     * 13. GUARDAR RESPUESTA DE FAZERCARDS
     * ---------------------------------------------------------------
     */

    await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_response:
          supplierData,
      })
      .eq(
        "id",
        insertedOrderId
      );

    /*
     * ---------------------------------------------------------------
     * 14. FAZERCARDS RECHAZÓ
     * ---------------------------------------------------------------
     */

    if (
      !supplierResponse.ok ||
      supplierData?.ok === false
    ) {
      console.error(
        "FAZERCARDS CALL OF DUTY ERROR:",
        {
          status:
            supplierResponse.status,

          response:
            supplierData,
        }
      );

      if (
        reservedBalance &&
        insertedOrderId
      ) {
        await refundOrder(
          insertedOrderId
        );

        reservedBalance =
          false;
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REJECTED",

          failed_at:
            new Date().toISOString(),

          supplier_response:
            supplierData,
        })
        .eq(
          "id",
          insertedOrderId
        );

      return jsonError(
        supplierData?.error ||
          supplierData?.message ||
          "FazerCards rechazó la orden.",
        502,
        {
          supplierStatus:
            supplierResponse.status,

          supplier:
            supplierData,
        }
      );
    }

    /*
     * ---------------------------------------------------------------
     * 15. EXTRAER ORDEN DEL PROVEEDOR
     * ---------------------------------------------------------------
     */

    const supplierOrderId =
      extractSupplierOrderId(
        supplierData
      );

    const finalSupplierStatus =
      extractSupplierStatus(
        supplierData
      );

    const normalizedSupplierStatus =
      finalSupplierStatus
        .toLowerCase()
        .trim();
        /*
     * ---------------------------------------------------------------
     * 16. ESTADOS
     * ---------------------------------------------------------------
     */

    const completedStatuses = [
      "completed",
      "complete",
      "success",
      "successful",
      "delivered",
      "done",
    ];

    const pendingStatuses = [
      "pending",
      "processing",
      "in_progress",
      "in-progress",
      "created",
      "waiting",
      "queued",
    ];

    const failedStatuses = [
      "failed",
      "failure",
      "rejected",
      "cancelled",
      "canceled",
      "error",
    ];

    const isCompleted =
      completedStatuses.includes(
        normalizedSupplierStatus
      );

    const isFailed =
      failedStatuses.includes(
        normalizedSupplierStatus
      );

    const isPending =
      pendingStatuses.includes(
        normalizedSupplierStatus
      );

    /*
     * ---------------------------------------------------------------
     * 17. ORDEN COMPLETADA
     * ---------------------------------------------------------------
     */

    if (isCompleted) {
      if (supplierOrderId) {
        const {
          error:
            completeError,
        } =
          await supabaseAdmin.rpc(
            "store_gaming_complete_order",
            {
              p_supplier_order_id:
                supplierOrderId,
            }
          );

        if (completeError) {
          console.error(
            "COMPLETE CALL OF DUTY ORDER ERROR:",
            completeError
          );
        }
      }

      reservedBalance =
        false;
    }

    /*
     * ---------------------------------------------------------------
     * 18. ORDEN FALLIDA
     * ---------------------------------------------------------------
     */

    if (
      isFailed &&
      reservedBalance &&
      insertedOrderId
    ) {
      await refundOrder(
        insertedOrderId
      );

      reservedBalance =
        false;
    }

    /*
     * ---------------------------------------------------------------
     * 19. FAZERCARDS ACEPTÓ PERO ESTÁ PENDIENTE
     * ---------------------------------------------------------------
     */

    if (
      !isCompleted &&
      !isFailed
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id:
            supplierOrderId,

          supplier_response:
            supplierData,

          status:
            "SUPPLIER_PENDING",
        })
        .eq(
          "id",
          insertedOrderId
        );

      return jsonSuccess(
        {
          message:
            "La orden fue enviada a FazerCards y quedó pendiente de procesamiento.",

          order: {
            ...insertedOrder,

            order_number:
              insertedOrder.id,

            supplier_order_id:
              supplierOrderId,

            status:
              "SUPPLIER_PENDING",
          },

          supplier:
            supplierData,

          supplierOrderId:
            supplierOrderId,
        },
        202
      );
    }

    /*
     * ---------------------------------------------------------------
     * 20. ESTADO LOCAL
     * ---------------------------------------------------------------
     */

    let localStatus =
      "SUPPLIER_PENDING";

    if (isCompleted) {
      localStatus =
        "COMPLETED";
    } else if (isFailed) {
      localStatus =
        "REJECTED";
    } else if (isPending) {
      localStatus =
        "SUPPLIER_PENDING";
    }

    /*
     * ---------------------------------------------------------------
     * 21. ACTUALIZAR ORDEN FINAL
     * ---------------------------------------------------------------
     */

    const {
      data: updatedOrder,
      error:
        updateOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id:
            supplierOrderId,

          supplier_response:
            supplierData,

          status:
            localStatus,

          completed_at:
            isCompleted
              ? new Date().toISOString()
              : null,

          failed_at:
            isFailed
              ? new Date().toISOString()
              : null,
        })
        .eq(
          "id",
          insertedOrderId
        )
        .select("*")
        .single();

    if (
      updateOrderError
    ) {
      console.error(
        "UPDATE CALL OF DUTY TOPUP ORDER ERROR:",
        updateOrderError
      );

      /*
       * FazerCards ya recibió la orden.
       *
       * NO se vuelve a enviar.
       */

      return jsonSuccess({
        message:
          "La orden fue enviada a FazerCards, pero no se pudo actualizar completamente el registro local.",

        order: {
          ...insertedOrder,

          supplier_order_id:
            supplierOrderId,

          status:
            localStatus,

          order_number:
            insertedOrder.id,
        },

        supplier:
          supplierData,

        supplierOrderId:
          supplierOrderId,
      });
    }

    /*
     * ---------------------------------------------------------------
     * 22. RESPUESTA FINAL
     * ---------------------------------------------------------------
     */

    return jsonSuccess({
      message:
        isCompleted
          ? "Orden de Call of Duty Mobile completada correctamente."
          : isFailed
          ? "FazerCards rechazó la orden."
          : "Orden de Call of Duty Mobile enviada correctamente a FazerCards.",

      order: {
        ...updatedOrder,

        order_number:
          updatedOrder.id,
      },

      supplier:
        supplierData,

      supplierOrderId:
        supplierOrderId,
    });
  } catch (error: any) {
    console.error(
      "CALL OF DUTY TOPUP ERROR:",
      error
    );

    /*
     * Si hubo un error inesperado después
     * de reservar el saldo, intentamos
     * devolverlo.
     */

    if (
      reservedBalance &&
      insertedOrderId
    ) {
      await refundOrder(
        insertedOrderId
      );

      try {
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "REJECTED",

            failed_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            insertedOrderId
          );
      } catch (updateError) {
        console.error(
          "FINAL ORDER UPDATE ERROR:",
          updateError
        );
      }
    }

    return jsonError(
      error?.message ||
        "Error interno al procesar la orden.",
      500
    );
  }
  }
