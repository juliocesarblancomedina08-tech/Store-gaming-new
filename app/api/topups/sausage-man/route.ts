import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

import { SAUSAGE_MAN } from "../../../../lib/games/sausage-man";

export const dynamic = "force-dynamic";

const FAZERCARDS_BASE_URL =
  process.env.FAZERCARDS_BASE_URL ||
  "https://api.fzr.cards/api/v2";

const FAZERCARDS_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID =
  SAUSAGE_MAN.categoryId;

const REQUEST_TIMEOUT = 30000;

/*
 * ================================================================
 * TIPOS
 * ================================================================
 */

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

/*
 * ================================================================
 * RESPUESTAS
 * ================================================================
 */

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
    {
      status,
    }
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
    {
      status,
    }
  );
}

/*
 * ================================================================
 * UTILIDADES
 * ================================================================
 */

function normalizeString(
  value: unknown
): string {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value.trim();
}

function normalizeCharacterId(
  value: unknown
): string {
  return normalizeString(
    value
  ).replace(/\s+/g, "");
}

function normalizeIdempotencyKey(
  value: unknown
): string {
  return normalizeString(
    value
  );
}

function isValidCharacterId(
  value: string
): boolean {
  return /^\d{4,20}$/.test(
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
  return (
    Math.round(
      value * 10000
    ) / 10000
  );
}

function toNumber(
  value: unknown
): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

/*
 * ================================================================
 * EXTRAER ORDEN DE FAZERCARDS
 * ================================================================
 */

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
      order_id:
        data.order_id,
      status:
        data.status,
      state:
        data.state,
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

/*
 * ================================================================
 * FETCH CON TIMEOUT
 * ================================================================
 */

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(() => {
      controller.abort();
    }, timeout);

  try {
    return await fetch(
      url,
      {
        ...options,
        signal:
          controller.signal,
        cache: "no-store",
      }
    );
  } finally {
    clearTimeout(timer);
  }
}

/*
 * ================================================================
 * AUTENTICACIÓN
 * ================================================================
 */

async function getAuthenticatedUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    ) || "";

  if (!authorization) {
    return {
      user: null,
      error:
        "Falta el token de autenticación.",
    };
  }

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i
    );

  if (!match) {
    return {
      user: null,
      error:
        "Token de autenticación inválido.",
    };
  }

  const accessToken =
    match[1].trim();

  if (!accessToken) {
    return {
      user: null,
      error:
        "Token de autenticación vacío.",
    };
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (
    error ||
    !data.user
  ) {
    return {
      user: null,
      error:
        error?.message ||
        "No se pudo verificar el usuario.",
    };
  }

  return {
    user: data.user,
    error: null,
  };
}

/*
 * ================================================================
 * REEMBOLSO
 * ================================================================
 */

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
        "SAUSAGE MAN REFUND ERROR:",
        error
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "SAUSAGE MAN REFUND EXCEPTION:",
      error
    );

    return false;
  }
}

/*
 * ================================================================
 * GET
 * ================================================================
 */

export async function GET() {
  try {
    return jsonSuccess({
      category: {
        id:
          SAUSAGE_MAN.categoryId,

        name:
          SAUSAGE_MAN.name,

        note:
          SAUSAGE_MAN.note,
      },

      fields: [
        {
          key:
            SAUSAGE_MAN.field.key,

          label:
            SAUSAGE_MAN.field.label,

          type:
            SAUSAGE_MAN.field.type,
        },
      ],

      offers:
        SAUSAGE_MAN.offers.map(
          (offer) => ({
            id:
              offer.id,

            offer_id:
              offer.id,

            name:
              offer.name,

            price:
              offer.price,

            price_usd:
              offer.price.toFixed(
                4
              ),

            supplier_price:
              offer.supplierPrice,
          })
        ),
    });
  } catch (error: any) {
    console.error(
      "SAUSAGE MAN GET ERROR:",
      error
    );

    return jsonError(
      error?.message ||
        "Error obteniendo el catálogo.",
      500
    );
  }
}

/*
 * ================================================================
 * POST
 * ================================================================
 */

export async function POST(
  request: NextRequest
) {
  let reservedBalance =
    false;

  let insertedOrderId:
    | string
    | null = null;

  try {
    /*
     * --------------------------------------------------------------
     * 1. CONFIGURACIÓN
     * --------------------------------------------------------------
     */

    if (!FAZERCARDS_API_KEY) {
      return jsonError(
        "FAZERCARDS_API_KEY no está configurada.",
        500
      );
    }

    /*
     * --------------------------------------------------------------
     * 2. AUTENTICACIÓN
     * --------------------------------------------------------------
     */

    const {
      user,
      error:
        authError,
    } =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return jsonError(
        authError ||
          "No autorizado.",
        401
      );
    }

    /*
     * --------------------------------------------------------------
     * 3. BODY
     * --------------------------------------------------------------
     */

    let body: any;

    try {
      body =
        await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no es JSON válido.",
        400
      );
    }

    const offerId =
      normalizeString(
        body?.offerId
      );

    /*
     * El APP GAME envía:
     *
     * characterId
     *
     * hacia este API.
     */

    const characterId =
      normalizeCharacterId(
        body?.characterId
      );

    const idempotencyKey =
      normalizeIdempotencyKey(
        body?.idempotencyKey
      );

    /*
     * --------------------------------------------------------------
     * 4. VALIDAR OFERTA
     * --------------------------------------------------------------
     */

    if (!offerId) {
      return jsonError(
        "Falta offerId."
      );
    }

    const selectedOffer =
      SAUSAGE_MAN.offers.find(
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
     * --------------------------------------------------------------
     * 5. VALIDAR CHARACTER ID
     * --------------------------------------------------------------
     */

    if (!characterId) {
      return jsonError(
        "Falta el Character ID."
      );
    }

    if (
      !isValidCharacterId(
        characterId
      )
    ) {
      return jsonError(
        "El Character ID debe contener entre 4 y 20 números."
      );
    }

    /*
     * --------------------------------------------------------------
     * 6. VALIDAR IDEMPOTENCIA
     * --------------------------------------------------------------
     */

    if (
      !isValidIdempotencyKey(
        idempotencyKey
      )
    ) {
      return jsonError(
        "idempotencyKey inválida."
      );
    }

    /*
     * --------------------------------------------------------------
     * 7. PRECIOS
     * --------------------------------------------------------------
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
      retailPrice <= 0
    ) {
      return jsonError(
        "El precio de la oferta no es válido.",
        500
      );
    }

    /*
     * --------------------------------------------------------------
     * 8. COMPROBAR ORDEN DUPLICADA
     * --------------------------------------------------------------
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
          user.id
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
        "CHECK EXISTING SAUSAGE MAN ORDER ERROR:",
        existingOrderError
      );

      return jsonError(
        "No se pudo comprobar la orden.",
        500
      );
    }

    if (existingOrder) {
      return jsonSuccess({
        message:
          "La orden ya había sido creada.",

        order: {
          ...existingOrder,

          order_number:
            existingOrder.id,
        },

        supplierOrderId:
          existingOrder.supplier_order_id,

        duplicate:
          true,
      });
    }

    /*
     * --------------------------------------------------------------
     * 9. DATOS DEL USUARIO
     * --------------------------------------------------------------
     */

    const username =
      user.user_metadata
        ?.username ||
      null;

    const email =
      user.email ||
      null;

    /*
     * --------------------------------------------------------------
     * 10. CAMPOS DEL PROVEEDOR
     * --------------------------------------------------------------
     *
     * IMPORTANTE:
     *
     * La tabla necesita player_id.
     *
     * FazerCards necesita:
     *
     * character_id
     *
     * Por eso guardamos ambos.
     * --------------------------------------------------------------
     */

    const supplierFields = {
      character_id:
        characterId,
    };

    /*
     * --------------------------------------------------------------
     * 11. CREAR ORDEN LOCAL
     * --------------------------------------------------------------
     */

    const {
      data: insertedOrder,
      error:
        insertOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id:
            user.id,

          username,

          email,

          game:
            SAUSAGE_MAN.name,

          category_id:
            CATEGORY_ID,

          offer_id:
            selectedOffer.id,

          offer_name:
            selectedOffer.name,

          /*
           * ESTE ERA EL ERROR.
           *
           * player_id es NOT NULL
           * en topup_orders.
           */
          player_id:
            characterId,

          retail_price:
            retailPrice,

          supplier_price:
            supplierPrice,

          /*
           * Tu log mostró que esta columna
           * está utilizando USD.
           */
          currency:
            "USD",

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
        })
        .select("*")
        .single();

    if (
      insertOrderError ||
      !insertedOrder
    ) {
      console.error(
        "Error creando orden:",
        insertOrderError
      );

      return jsonError(
        insertOrderError?.message ||
          "No se pudo crear la orden.",
        500,
        {
          code:
            insertOrderError?.code,

          details:
            insertOrderError?.details,

          hint:
            insertOrderError?.hint,
        }
      );
    }

    insertedOrderId =
      insertedOrder.id;

    /*
     * --------------------------------------------------------------
     * 12. RESERVAR SALDO
     * --------------------------------------------------------------
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
            user.id,

          p_amount:
            retailPrice,
        }
      );

    if (reserveError) {
      console.error(
        "SAUSAGE MAN RESERVE BALANCE ERROR:",
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
        reserveError.message ||
          "No tienes saldo suficiente para realizar esta compra.",
        400
      );
    }

    let reserveOk =
      true;

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
        (
          reserveResult as Record<
            string,
            unknown
          >
        )
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

    reservedBalance =
      true;

    /*
     * --------------------------------------------------------------
     * 13. ENVIAR A FAZERCARDS
     * --------------------------------------------------------------
     */

    const supplierUrl =
      `${FAZERCARDS_BASE_URL}/topups/order`;

    /*
     * EXACTAMENTE el formato que
     * necesita Sausage Man:
     *
     * category_id: sausage_man
     * offer_id: 61_candies
     * fields:
     *   character_id: ID
     */

    const supplierBody = {
      category_id:
        CATEGORY_ID,

      offer_id:
        selectedOffer.id,

      fields: {
        character_id:
          characterId,
      },
    };

    console.log(
      "SAUSAGE MAN → FAZERCARDS:",
      {
        category_id:
          CATEGORY_ID,

        offer_id:
          selectedOffer.id,

        fields: {
          character_id:
            characterId,
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
            method:
              "POST",

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
        "FAZERCARDS SAUSAGE MAN RESPONSE:",
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
        "FAZERCARDS SAUSAGE MAN REQUEST ERROR:",
        error
      );

      /*
       * No sabemos si FazerCards
       * recibió la solicitud.
       *
       * La orden queda pendiente.
       */

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response: {
            error:
              "No se pudo confirmar la respuesta de FazerCards.",
          },
        })
        .eq(
          "id",
          insertedOrderId
        );

      return jsonSuccess(
        {
          message:
            "La orden quedó pendiente de confirmación del proveedor.",

          order: {
            ...insertedOrder,

            order_number:
              insertedOrder.id,

            status:
              "SUPPLIER_PENDING",
          },
        },
        202
      );
    }

    /*
     * --------------------------------------------------------------
     * 14. GUARDAR RESPUESTA DEL PROVEEDOR
     * --------------------------------------------------------------
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
     * --------------------------------------------------------------
     * 15. ERROR DEL PROVEEDOR
     * --------------------------------------------------------------
     */

    if (
      !supplierResponse.ok ||
      supplierData?.ok ===
        false
    ) {
      console.error(
        "FAZERCARDS SAUSAGE MAN ERROR:",
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
     * --------------------------------------------------------------
     * 16. EXTRAER ORDEN DEL PROVEEDOR
     * --------------------------------------------------------------
     */

    const supplierOrderId =
      extractSupplierOrderId(
        supplierData
      );

    const supplierStatus =
      extractSupplierStatus(
        supplierData
      );

    const normalizedStatus =
      supplierStatus
        .toLowerCase()
        .trim();

    /*
     * --------------------------------------------------------------
     * 17. ESTADOS
     * --------------------------------------------------------------
     */

    const completedStatuses = [
      "completed",
      "complete",
      "success",
      "successful",
      "delivered",
      "done",
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
        normalizedStatus
      );

    const isFailed =
      failedStatuses.includes(
        normalizedStatus
      );

    /*
     * --------------------------------------------------------------
     * 18. ORDEN COMPLETADA
     * --------------------------------------------------------------
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
            "SAUSAGE MAN COMPLETE ORDER ERROR:",
            completeError
          );
        }
      }

      reservedBalance =
        false;
    }

    /*
     * --------------------------------------------------------------
     * 19. ORDEN FALLIDA
     * --------------------------------------------------------------
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
     * --------------------------------------------------------------
     * 20. ORDEN PENDIENTE
     * --------------------------------------------------------------
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
     * --------------------------------------------------------------
     * 21. ESTADO FINAL
     * --------------------------------------------------------------
     */

    const localStatus =
      isCompleted
        ? "COMPLETED"
        : "REJECTED";

    /*
     * --------------------------------------------------------------
     * 22. ACTUALIZAR ORDEN
     * --------------------------------------------------------------
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
        "UPDATE SAUSAGE MAN ORDER ERROR:",
        updateOrderError
      );

      /*
       * FazerCards ya recibió
       * la orden.
       *
       * NO volvemos a enviarla.
       */

      return jsonSuccess({
        message:
          "La orden fue enviada a FazerCards, pero no se pudo actualizar completamente el registro local.",

        order: {
          ...insertedOrder,

          order_number:
            insertedOrder.id,

          supplier_order_id:
            supplierOrderId,

          status:
            localStatus,
        },

        supplier:
          supplierData,

        supplierOrderId:
          supplierOrderId,
      });
    }

    /*
     * --------------------------------------------------------------
     * 23. RESPUESTA FINAL
     * --------------------------------------------------------------
     */

    return jsonSuccess({
      message:
        isCompleted
          ? "Orden de Sausage Man completada correctamente."
          : "Orden de Sausage Man procesada.",

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
      "SAUSAGE MAN TOPUP ERROR:",
      error
    );

    /*
     * Solo reembolsamos si sabemos
     * que el saldo fue reservado.
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
          "SAUSAGE MAN FINAL ORDER UPDATE ERROR:",
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
