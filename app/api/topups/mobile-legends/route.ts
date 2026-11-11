import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const CATEGORY_ID = "mobile_legends_united_states";
const GAME_NAME = "Mobile Legends (United States)";

const NORMAL_MARKUP = 0.20;
const VIP_MARKUP = 0.08;

type Offer = {
  id: string;
  name: string;
  supplierPrice: number;
};

type ExistingOrder = {
  id: string;
  user_id: string;
  status: string | null;
  supplier_order_id: string | null;
  offer_id: string | null;
  offer_name: string | null;
  player_id: string | null;
  retail_price: number | null;
  supplier_price: number | null;
  supplier_fields: {
    server_id?: string;
    vip_active?: boolean;
  } | null;
};

type AtomicOrderResult = {
  order_id: string;
  order_status: string;
  created: boolean;
};

const OFFERS: Offer[] = [
  {
    id: "51_5_diamonds",
    name: "51 + 5 Diamonds",
    supplierPrice: 0.8665,
  },
  {
    id: "weekly_diamond_pass",
    name: "Weekly Diamond Pass",
    supplierPrice: 1.7430,
  },
  {
    id: "253_25_diamonds",
    name: "253 + 25 Diamonds",
    supplierPrice: 4.3423,
  },
  {
    id: "505_66_diamonds",
    name: "505 + 66 Diamonds",
    supplierPrice: 8.7048,
  },
  {
    id: "1010_182_diamonds",
    name: "1010 + 182 Diamonds",
    supplierPrice: 17.3391,
  },
  {
    id: "1515_273_diamonds",
    name: "1515 + 273 Diamonds",
    supplierPrice: 25.9935,
  },
  {
    id: "2525_480_diamonds",
    name: "2525 + 480 Diamonds",
    supplierPrice: 43.3225,
  },
  {
    id: "3030_576_diamonds",
    name: "3030 + 576 Diamonds",
    supplierPrice: 51.9870,
  },
  {
    id: "4008_802_diamonds",
    name: "4008 + 802 Diamonds",
    supplierPrice: 69.3160,
  },
  {
    id: "5010_1002_diamonds",
    name: "5010 + 1002 Diamonds",
    supplierPrice: 86.6450,
  },
];

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function calculatePrice(
  supplierPrice: number,
  vipActive: boolean
): number {
  const markup = vipActive ? VIP_MARKUP : NORMAL_MARKUP;

  return Number((supplierPrice + markup).toFixed(4));
}

function getOffer(offerId: string): Offer | null {
  return OFFERS.find((offer) => offer.id === offerId) ?? null;
}

function isSuccessfulSupplierStatus(status: string): boolean {
  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "done",
  ].includes(status.toLowerCase().trim());
}

function isRejectedSupplierStatus(status: string): boolean {
  return [
    "rejected",
    "failed",
    "failure",
    "cancelled",
    "canceled",
    "error",
    "refund",
    "refunded",
    "refund_success",
  ].includes(status.toLowerCase().trim());
}

function getSupplierOrderId(data: any): string | null {
  const id =
    data?.order?.id ??
    data?.data?.order?.id ??
    data?.order_id ??
    data?.orderId ??
    data?.data?.order_id ??
    data?.data?.orderId ??
    data?.data?.id ??
    data?.id ??
    null;

  return id == null ? null : String(id);
}

function getSupplierStatus(data: any): string {
  return String(
    data?.status ??
    data?.order?.status ??
    data?.data?.status ??
    data?.data?.order?.status ??
    ""
  ).trim();
}

async function authenticate(request: NextRequest) {
  const authorization =
    request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return {
      user: null,
      error: "No autorizado.",
    };
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return {
      user: null,
      error: "Token inválido.",
    };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      error: "Sesión inválida o expirada.",
    };
  }

  return {
    user,
    error: null,
  };
}

async function getVipStatus(userId: string): Promise<boolean> {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("vip_expires_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    throw new Error("No se pudo comprobar el estado VIP.");
  }

  const expiration = profile.vip_expires_at
    ? new Date(profile.vip_expires_at).getTime()
    : 0;

  return Number.isFinite(expiration) && expiration > Date.now();
}

async function updateOrder(
  orderId: string,
  values: Record<string, any>
) {
  return await supabaseAdmin
    .from("topup_orders")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
}

async function refundOrder(orderId: string) {
  const { error } = await supabaseAdmin.rpc(
    "refund_topup_balance",
    {
      p_order_id: orderId,
    }
  );

  if (error) {
    console.error("ERROR DEVOLVIENDO SALDO:", error);
    return false;
  }

  return true;
}

/*
 * GET: CATÁLOGO DE MOBILE LEGENDS
 */

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);

    if (!user) {
      return jsonError(error || "No autorizado.", 401);
    }

    const vipActive = await getVipStatus(user.id);

    const offers = OFFERS.map((offer) => ({
      offer_id: offer.id,
      name: offer.name,
      supplier_price: offer.supplierPrice,
      retail_price: calculatePrice(
        offer.supplierPrice,
        vipActive
      ),
      vip_active: vipActive,
    }));

    return NextResponse.json({
      ok: true,
      game: GAME_NAME,
      category_id: CATEGORY_ID,
      currency: "USD",
      vip_active: vipActive,
      fields: [
        {
          key: "player_id",
          label: "Player ID",
          type: "text",
        },
        {
          key: "server_id",
          label: "Server ID",
          type: "text",
        },
      ],
      offers,
    });
  } catch (error) {
    console.error("ERROR CATÁLOGO MOBILE LEGENDS:", error);

    return jsonError(
      "No se pudo cargar el catálogo.",
      500
    );
  }
}

/*
 * POST: CREAR Y PROCESAR PEDIDO
 */

export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;
  let supplierRequestStarted = false;

  try {
    /*
     * 1. AUTENTICACIÓN
     */

    const { user, error } = await authenticate(request);

    if (!user) {
      return jsonError(error || "No autorizado.", 401);
    }

    /*
     * 2. COMPROBAR CONFIGURACIÓN
     */

    const fazerApiKey = process.env.FAZERCARDS_API_KEY;

    if (!fazerApiKey) {
      return jsonError(
        "El servicio de recargas no está configurado.",
        500
      );
    }

    /*
     * 3. LEER SOLICITUD
     */

    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "La solicitud no contiene JSON válido.",
        400
      );
    }

    const offerId =
      typeof body?.offerId === "string"
        ? body.offerId.trim()
        : "";

    const playerId =
      typeof body?.playerId === "string"
        ? body.playerId.trim()
        : "";

    const serverId =
      typeof body?.serverId === "string"
        ? body.serverId.trim()
        : "";

    const idempotencyKey =
      typeof body?.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";

    /*
     * 4. VALIDAR OFERTA
     */

    const offer = getOffer(offerId);

    if (!offer) {
      return jsonError(
        "La oferta seleccionada no existe.",
        400
      );
    }

    /*
     * 5. VALIDAR PLAYER ID
     */

    if (!/^[0-9]{3,20}$/.test(playerId)) {
      return jsonError(
        "El Player ID no es válido.",
        400
      );
    }

    /*
     * 6. VALIDAR SERVER ID
     */

    if (!/^[0-9]{1,20}$/.test(serverId)) {
      return jsonError(
        "El Server ID no es válido.",
        400
      );
    }

    /*
     * 7. VALIDAR IDEMPOTENCIA
     */

    if (
      !idempotencyKey ||
      idempotencyKey.length < 10 ||
      idempotencyKey.length > 200
    ) {
      return jsonError(
        "La clave de seguridad del pedido no es válida.",
        400
      );
    }

    /*
     * 8. COMPROBAR VIP
     */

    const vipActive = await getVipStatus(user.id);

    /*
     * 9. CALCULAR PRECIOS EN EL SERVIDOR
     */

    const supplierPrice = Number(offer.supplierPrice);

    const retailPrice = calculatePrice(
      supplierPrice,
      vipActive
    );

    if (
      !Number.isFinite(supplierPrice) ||
      supplierPrice <= 0 ||
      !Number.isFinite(retailPrice) ||
      retailPrice <= 0
    ) {
      return jsonError(
        "El precio de la oferta no es válido.",
        400
      );
    }

    /*
     * 10. CREAR PEDIDO Y RESERVAR SALDO
     *
     * IMPORTANTE:
     * Esta función realiza ambas operaciones
     * dentro de una sola transacción.
     *
     * NO llamar a reserve_topup_balance después.
     */

    const username =
      user.user_metadata?.username ??
      user.user_metadata?.user_name ??
      user.user_metadata?.name ??
      "Cliente";

    const { data: atomicData, error: atomicError } =
      await supabaseAdmin.rpc(
        "create_topup_order_and_reserve_balance",
        {
          p_user_id: user.id,
          p_username: String(username),
          p_email: user.email ?? null,
          p_game: GAME_NAME,
          p_category_id: CATEGORY_ID,
          p_offer_id: offer.id,
          p_offer_name: offer.name,
          p_player_id: playerId,
          p_retail_price: retailPrice,
          p_supplier_price: supplierPrice,
          p_currency: "USD",
          p_idempotency_key: idempotencyKey,
          p_supplier_fields: {
            player_id: playerId,
            server_id: serverId,
            vip_active: vipActive,
          },
        }
      );

    if (atomicError) {
      console.error(
        "ERROR CREANDO Y RESERVANDO ORDEN:",
        atomicError
      );

      const errorMessage = (
        atomicError.message || ""
      ).toUpperCase();

      if (errorMessage.includes("INSUFFICIENT_BALANCE")) {
        return jsonError("SALDO INSUFICIENTE.", 400);
      }

      if (errorMessage.includes("PROFILE_NOT_FOUND")) {
        return jsonError(
          "No se encontró el perfil del usuario.",
          400
        );
      }

      if (
        errorMessage.includes(
          "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_ORDER"
        )
      ) {
        return jsonError(
          "La clave ya fue utilizada con otros datos.",
          409
        );
      }

      return jsonError(
        "No se pudo crear el pedido ni reservar el saldo.",
        500
      );
    }

    const atomicRows =
      atomicData as unknown as AtomicOrderResult[] | null;

    const atomicOrder = Array.isArray(atomicRows)
      ? atomicRows[0]
      : null;

    if (!atomicOrder?.order_id) {
      console.error(
        "RESPUESTA INVÁLIDA DE CREACIÓN ATÓMICA:",
        atomicData
      );

      return jsonError(
        "No se pudo confirmar la creación del pedido.",
        500
      );
    }

    internalOrderId = atomicOrder.order_id;

    /*
     * 11. COMPROBAR SI YA EXISTÍA
     */

    if (!atomicOrder.created) {
      const { data: existingOrderData, error: existingError } =
        await supabaseAdmin
          .from("topup_orders")
          .select(
            "id,user_id,status,supplier_order_id,offer_id,offer_name,player_id,retail_price,supplier_price,supplier_fields"
          )
          .eq("id", internalOrderId)
          .maybeSingle();

      if (existingError || !existingOrderData) {
        console.error(
          "ERROR CONSULTANDO ORDEN EXISTENTE:",
          existingError
        );

        return jsonError(
          "El pedido anterior existe, pero no se pudo consultar.",
          500
        );
      }

      const existingOrder =
        existingOrderData as unknown as ExistingOrder;

      const existingFields =
        existingOrder.supplier_fields || {};

      if (
        existingOrder.user_id !== user.id ||
        existingOrder.offer_id !== offer.id ||
        String(existingOrder.player_id) !== playerId ||
        String(existingFields.server_id ?? "") !== serverId
      ) {
        return jsonError(
          "La clave ya fue utilizada con otros datos.",
          409
        );
      }

      /*
       * No reenviar una orden existente al proveedor.
       * Evita duplicar compras cuando el usuario reintenta.
       */

      return NextResponse.json({
        ok: true,
        reused: true,
        alreadyCreated: true,
        orderNumber: existingOrder.id,
        supplierOrderId: existingOrder.supplier_order_id,
        status: existingOrder.status,
        offerId: existingOrder.offer_id,
        offerName: existingOrder.offer_name,
        playerId: existingOrder.player_id,
        retailPrice: existingOrder.retail_price,
        supplierPrice: existingOrder.supplier_price,
        vipActive: existingFields.vip_active ?? false,
        message:
          "Este pedido ya existe. No se ha enviado una segunda compra.",
      });
    }

    /*
     * 12. ENVIAR PEDIDO A FAZERCARDS
     */

    let supplierResponse: Response;
    let supplierText: string;

    try {
      /*
       * Desde este punto no se debe devolver automáticamente
       * el saldo por un error de conexión.
       *
       * El proveedor podría haber recibido el pedido.
       */

      supplierRequestStarted = true;

      supplierResponse = await fetch(
        `${FAZER_API_BASE}/topups/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-API-Key": fazerApiKey,
            "Idempotency-Key": idempotencyKey,
            "User-Agent": "STORE-GAMING/1.0",
          },
          body: JSON.stringify({
            category_id: CATEGORY_ID,
            offer_id: offer.id,
            fields: {
              player_id: playerId,
              server_id: serverId,
            },
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        }
      );

      supplierText = await supplierResponse.text();
    } catch (connectionError) {
      console.error(
        "ERROR DE CONEXIÓN FAZERCARDS:",
        connectionError
      );

      const { error: pendingError } = await updateOrder(
        internalOrderId,
        {
          status: "SUPPLIER_PENDING",
          supplier_response: {
            error: "SUPPLIER_CONNECTION_OUTCOME_UNKNOWN",
            message: String(connectionError),
          },
        }
      );

      if (pendingError) {
        console.error(
          "ERROR GUARDANDO ORDEN PENDIENTE:",
          pendingError
        );
      }

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          status: "SUPPLIER_PENDING",
          retailPrice,
          supplierPrice,
          vipActive,
          message:
            "El proveedor no confirmó la recepción. El pedido queda pendiente de verificación y el saldo permanece reservado.",
        },
        { status: 202 }
      );
    }

    /*
     * 13. PROCESAR RESPUESTA
     */

    let supplierData: any = {};

    try {
      supplierData = supplierText
        ? JSON.parse(supplierText)
        : {};
    } catch {
      supplierData = {
        raw: supplierText,
      };
    }

    console.log(
      "RESPUESTA FAZERCARDS MOBILE LEGENDS:",
      supplierResponse.status,
      supplierData
    );

    const supplierOrderId =
      getSupplierOrderId(supplierData);

    const supplierStatus =
      getSupplierStatus(supplierData);

    const successful =
      isSuccessfulSupplierStatus(supplierStatus);

    const rejected =
      isRejectedSupplierStatus(supplierStatus);

    /*
     * 14. RECHAZO EXPLÍCITO DEL PROVEEDOR
     */

    if (rejected) {
      const now = new Date().toISOString();

      const { error: failedUpdateError } =
        await updateOrder(internalOrderId, {
          status: "FAILED",
          ...(supplierOrderId
            ? { supplier_order_id: supplierOrderId }
            : {}),
          supplier_response: supplierData,
          failed_at: now,
        });

      if (failedUpdateError) {
        console.error(
          "ERROR GUARDANDO RECHAZO:",
          failedUpdateError
        );

        /*
         * Si el ID del proveedor provoca una colisión,
         * intentamos guardar el rechazo sin ese ID.
         */

        const { error: fallbackError } =
          await updateOrder(internalOrderId, {
            status: "FAILED",
            supplier_response: supplierData,
            failed_at: now,
          });

        if (fallbackError) {
          console.error(
            "ERROR GUARDANDO RECHAZO SIN ID:",
            fallbackError
          );

          return jsonError(
            "El proveedor rechazó el pedido, pero no se pudo actualizar el registro.",
            500
          );
        }
      }

      const refunded = await refundOrder(internalOrderId);

      if (!refunded) {
        return jsonError(
          "El proveedor rechazó el pedido, pero el reembolso necesita revisión.",
          500
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            supplierData?.message ||
            supplierData?.error ||
            "FazerCards rechazó el pedido.",
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "REFUNDED",
          retailPrice,
        },
        { status: 400 }
      );
    }

    /*
     * 15. RESPUESTA HTTP NO EXITOSA O AMBIGUA
     *
     * No devolvemos el saldo automáticamente.
     * Una respuesta HTTP no exitosa no demuestra por sí sola
     * que el proveedor no haya procesado el pedido.
     */

    if (!supplierResponse.ok) {
      const { error: pendingError } = await updateOrder(
        internalOrderId,
        {
          status: "SUPPLIER_PENDING",
          ...(supplierOrderId
            ? { supplier_order_id: supplierOrderId }
            : {}),
          supplier_response: supplierData,
        }
      );

      if (pendingError) {
        console.error(
          "ERROR GUARDANDO RESPUESTA AMBIGUA:",
          pendingError
        );
      }

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
          retailPrice,
          supplierPrice,
          message:
            "La respuesta del proveedor necesita verificación. El saldo permanece reservado.",
        },
        { status: 202 }
      );
    }

    /*
     * 16. SIN IDENTIFICADOR DE ORDEN DEL PROVEEDOR
     */

    if (!supplierOrderId) {
      const { error: pendingError } = await updateOrder(
        internalOrderId,
        {
          status: "SUPPLIER_PENDING",
          supplier_response: supplierData,
        }
      );

      if (pendingError) {
        console.error(
          "ERROR GUARDANDO PEDIDO SIN ID:",
          pendingError
        );
      }

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          supplierOrderId: null,
          status: "SUPPLIER_PENDING",
          offerId: offer.id,
          offerName: offer.name,
          playerId,
          serverId,
          retailPrice,
          supplierPrice,
          vipActive,
          supplierStatus: supplierStatus || "pending",
          message:
            "El pedido necesita confirmación del proveedor.",
        },
        { status: 202 }
      );
    }

    /*
     * 17. GUARDAR PEDIDO ANTES DE COMPLETARLO
     *
     * Se guarda como pendiente para que complete_topup_order
     * pueda encontrarlo y registrar también la recompensa
     * de primera compra, si corresponde.
     */

    const { error: supplierSaveError } =
      await updateOrder(internalOrderId, {
        status: "SUPPLIER_PENDING",
        supplier_order_id: supplierOrderId,
        supplier_response: supplierData,
      });

    if (supplierSaveError) {
      console.error(
        "ERROR GUARDANDO ID DEL PROVEEDOR:",
        supplierSaveError
      );

      /*
       * Una colisión de supplier_order_id no debe provocar
       * un reembolso automático.
       */

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          status: "SUPPLIER_PENDING",
          message:
            "El proveedor recibió el pedido, pero el registro necesita revisión.",
        },
        { status: 202 }
      );
    }

    /*
     * 18. PROVEEDOR COMPLETÓ EL PEDIDO
     */

    if (successful) {
      const { error: completeError } =
        await supabaseAdmin.rpc(
          "complete_topup_order",
          {
            p_supplier_order_id: supplierOrderId,
          }
        );

      if (completeError) {
        console.error(
          "ERROR COMPLETANDO PEDIDO:",
          completeError
        );

        return NextResponse.json(
          {
            ok: true,
            orderNumber: internalOrderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
            retailPrice,
            supplierPrice,
            vipActive,
            message:
              "El proveedor informó que completó el pedido, pero falta confirmar el registro interno.",
          },
          { status: 202 }
        );
      }

      /*
       * Comprobar el estado real después de ejecutar el RPC.
       */

      const { data: completedOrder, error: completedError } =
        await supabaseAdmin
          .from("topup_orders")
          .select("status")
          .eq("id", internalOrderId)
          .maybeSingle();

      if (completedError || completedOrder?.status !== "COMPLETED") {
        console.error(
          "NO SE PUDO CONFIRMAR LA FINALIZACIÓN:",
          completedError,
          completedOrder
        );

        return NextResponse.json(
          {
            ok: true,
            orderNumber: internalOrderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
            retailPrice,
            supplierPrice,
            vipActive,
          },
          { status: 202 }
        );
      }

      return NextResponse.json({
        ok: true,
        orderNumber: internalOrderId,
        supplierOrderId,
        status: "COMPLETED",
        offerId: offer.id,
        offerName: offer.name,
        playerId,
        serverId,
        retailPrice,
        supplierPrice,
        vipActive,
        supplierStatus,
        message: "Pedido completado correctamente.",
      });
    }

    /*
     * 19. PEDIDO AÚN PENDIENTE EN FAZERCARDS
     */

    return NextResponse.json(
      {
        ok: true,
        orderNumber: internalOrderId,
        supplierOrderId,
        status: "SUPPLIER_PENDING",
        offerId: offer.id,
        offerName: offer.name,
        playerId,
        serverId,
        retailPrice,
        supplierPrice,
        vipActive,
        supplierStatus: supplierStatus || "pending",
        message:
          "El proveedor recibió el pedido. Está pendiente de confirmación.",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error(
      "ERROR GENERAL MOBILE LEGENDS:",
      error
    );

    /*
     * Si la solicitud ya pudo llegar a FazerCards,
     * nunca devolver automáticamente el saldo.
     */

    if (internalOrderId && supplierRequestStarted) {
      try {
        const { data: currentOrder } =
          await supabaseAdmin
            .from("topup_orders")
            .select("status")
            .eq("id", internalOrderId)
            .maybeSingle();

        if (
          currentOrder &&
          !["COMPLETED", "REFUNDED", "FAILED"].includes(
            String(currentOrder.status).toUpperCase()
          )
        ) {
          await updateOrder(internalOrderId, {
            status: "SUPPLIER_PENDING",
            supplier_response: {
              error: "INTERNAL_PROCESSING_ERROR",
              message: String(error),
            },
          });
        }
      } catch (pendingError) {
        console.error(
          "ERROR GUARDANDO ESTADO DE REVISIÓN:",
          pendingError
        );
      }
    }

    return jsonError(
      "No se pudo procesar la orden. Revisa su estado antes de volver a comprar.",
      500
    );
  }
    }
