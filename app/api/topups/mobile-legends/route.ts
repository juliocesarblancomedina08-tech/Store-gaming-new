
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
  retail_price: number;
  supplier_price: number;
};

type SupplierResponse = {
  success?: boolean;
  ok?: boolean;
  error?: string;
  message?: string;
  order_id?: string | number;
  id?: string | number;
  status?: string;
  data?: {
    order_id?: string | number;
    id?: string | number;
    status?: string;
  };
  order?: {
    order_id?: string | number;
    id?: string | number;
    status?: string;
  };
};

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
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

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePlayerId(value: unknown): string {
  return normalizeString(value).replace(/\s+/g, "");
}

function normalizeServerId(value: unknown): string {
  return normalizeString(value).replace(/\s+/g, "");
}

function roundMoney(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function toNumber(value: unknown): number {
  const parsed =
    typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidPlayerId(value: string): boolean {
  return /^[0-9]{4,20}$/.test(value);
}

function isValidServerId(value: string): boolean {
  return /^[0-9]{1,20}$/.test(value);
}

function isValidIdempotencyKey(value: string): boolean {
  return value.length >= 8 && value.length <= 200;
}

function isCompletedStatus(status: string): boolean {
  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "done",
  ].includes(status.toLowerCase().trim());
}

function isFailedStatus(status: string): boolean {
  return [
    "failed",
    "failure",
    "rejected",
    "cancelled",
    "canceled",
    "error",
  ].includes(status.toLowerCase().trim());
}

function extractSupplierOrderId(
  data: SupplierResponse | null
): string | null {
  if (!data) return null;

  const value =
    data.order_id ??
    data.id ??
    data.order?.order_id ??
    data.order?.id ??
    data.data?.order_id ??
    data.data?.id;

  return value === undefined || value === null
    ? null
    : String(value);
}

function extractSupplierStatus(
  data: SupplierResponse | null
): string {
  return (
    data?.status ||
    data?.order?.status ||
    data?.data?.status ||
    "pending"
  );
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 30000
) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeout
  );

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

async function getAuthenticatedUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization") || "";

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match || !match[1].trim()) {
    return {
      user: null,
      error: "Token de autenticación inválido o ausente.",
    };
  }

  const {
    data,
    error,
  } = await supabaseAdmin.auth.getUser(
    match[1].trim()
  );

  if (error || !data.user) {
    return {
      user: null,
      error: "No se pudo verificar el usuario.",
    };
  }

  return {
    user: data.user,
    error: null,
  };
}

async function updateOrder(
  orderId: string,
  values: Record<string, unknown>
) {
  const { error } = await supabaseAdmin
    .from("topup_orders")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error(
      "MOBILE LEGENDS ORDER UPDATE ERROR:",
      error
    );

    return false;
  }

  return true;
}

async function refundOrder(
  orderId: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.rpc(
      "refund_topup_balance",
      {
        p_order_id: orderId,
      }
    );

    if (error) {
      console.error(
        "MOBILE LEGENDS REFUND ERROR:",
        error
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "MOBILE LEGENDS REFUND EXCEPTION:",
      error
    );

    return false;
  }
}

async function getVipStatus(userId: string) {
  const {
    data: profile,
    error,
  } = await supabaseAdmin
    .from("profiles")
    .select("vip_expires_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "MOBILE LEGENDS VIP PROFILE ERROR:",
      error
    );

    throw new Error(
      "No se pudo comprobar la membresía del usuario."
    );
  }

  const expiration = profile?.vip_expires_at
    ? new Date(profile.vip_expires_at).getTime()
    : 0;

  return (
    Number.isFinite(expiration) &&
    expiration > Date.now()
  );
}

function getRetailPrice(
  supplierPrice: number,
  vipActive: boolean
): number {
  const markup = vipActive
    ? VIP_MARKUP
    : NORMAL_MARKUP;

  return roundMoney(
    supplierPrice * (1 + markup)
  );
}

async function findExistingOrder(
  userId: string,
  idempotencyKey: string
): Promise<ExistingOrder | null> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("topup_orders")
    .select(
      [
        "id",
        "user_id",
        "status",
        "supplier_order_id",
        "offer_id",
        "offer_name",
        "player_id",
        "retail_price",
        "supplier_price",
        "supplier_fields",
      ].join(",")
    )
    .eq("user_id", userId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    console.error(
      "MOBILE LEGENDS EXISTING ORDER ERROR:",
      error
    );

    throw new Error(
      "No se pudo comprobar la orden anterior."
    );
  }

  return data as ExistingOrder | null;
}

async function createAtomicOrder(
  userId: string,
  username: string | null,
  email: string | null,
  offer: Offer,
  playerId: string,
  serverId: string,
  retailPrice: number,
  supplierPrice: number,
  idempotencyKey: string,
  vipActive: boolean
): Promise<AtomicOrderResult> {
  const {
    data,
    error,
  } = await supabaseAdmin.rpc(
    "create_topup_order_and_reserve_balance",
    {
      p_user_id: userId,
      p_username: username,
      p_email: email,
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

  if (error) {
    console.error(
      "MOBILE LEGENDS ATOMIC ORDER ERROR:",
      error
    );

    throw new Error(
      error.message ||
        "No se pudo reservar el saldo y crear la orden."
    );
  }

  let result: any = data;

  if (Array.isArray(result)) {
    result = result[0];
  }

  if (
    result &&
    typeof result === "object" &&
    "data" in result
  ) {
    result = result.data;
  }

  if (
    !result ||
    !result.order_id ||
    !result.order_status
  ) {
    console.error(
      "MOBILE LEGENDS ATOMIC ORDER INVALID RESPONSE:",
      data
    );

    throw new Error(
      "La función de reserva devolvió una respuesta inválida."
    );
  }

  return {
    order_id: String(result.order_id),
    order_status: String(result.order_status),
    retail_price: toNumber(result.retail_price),
    supplier_price: toNumber(result.supplier_price),
  };
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("topup_catalog")
      .select("*")
      .eq("category_id", CATEGORY_ID)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(
        "MOBILE LEGENDS CATALOG ERROR:",
        error
      );

      return jsonError(
        "No se pudo obtener el catálogo.",
        500
      );
    }

    return jsonSuccess({
      game: GAME_NAME,
      categoryId: CATEGORY_ID,
      offers: data || [],
    });
  } catch (error: any) {
    console.error(
      "MOBILE LEGENDS GET ERROR:",
      error
    );

    return jsonError(
      error?.message ||
        "Error obteniendo el catálogo.",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;
  let reserved = false;
  let supplierRequestStarted = false;
  let supplierDefinitelyRejected = false;

  try {
    // 1. COMPROBAR CONFIGURACIÓN

    const fazerApiKey =
      process.env.FAZERCARDS_API_KEY || "";

    if (!fazerApiKey) {
      return jsonError(
        "FAZERCARDS_API_KEY no está configurada.",
        500
      );
    }

    // 2. AUTENTICACIÓN

    const {
      user,
      error: authError,
    } = await getAuthenticatedUser(request);

    if (!user) {
      return jsonError(
        authError || "No autorizado.",
        401
      );
    }

    // 3. LEER BODY

    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no es JSON válido.",
        400
      );
    }

    const offerId = normalizeString(body?.offerId);
    const playerId = normalizePlayerId(body?.playerId);
    const serverId = normalizeServerId(body?.serverId);

    const idempotencyKey =
      normalizeString(body?.idempotencyKey);

    // 4. VALIDAR OFERTA

    if (!offerId) {
      return jsonError("Falta offerId.");
    }

    // 5. VALIDAR PLAYER ID

    if (
      !playerId ||
      !isValidPlayerId(playerId)
    ) {
      return jsonError(
        "El ID del jugador debe contener entre 4 y 20 números."
      );
    }

    // 6. VALIDAR SERVER ID

    if (
      !serverId ||
      !isValidServerId(serverId)
    ) {
      return jsonError(
        "El ID del servidor no es válido."
      );
    }

    // 7. VALIDAR IDEMPOTENCIA

    if (
      !idempotencyKey ||
      !isValidIdempotencyKey(idempotencyKey)
    ) {
      return jsonError(
        "La clave de idempotencia no es válida."
      );
    }

    // 8. COMPROBAR CATÁLOGO

    const {
      data: catalogOffer,
      error: catalogError,
    } = await supabaseAdmin
      .from("topup_catalog")
      .select("*")
      .eq("category_id", CATEGORY_ID)
      .eq("offer_id", offerId)
      .eq("is_active", true)
      .maybeSingle();

    if (catalogError) {
      console.error(
        "MOBILE LEGENDS CATALOG OFFER ERROR:",
        catalogError
      );

      return jsonError(
        "No se pudo verificar la oferta.",
        500
      );
    }

    if (!catalogOffer) {
      return jsonError(
        "La oferta seleccionada no está disponible."
      );
    }

    const supplierPrice = toNumber(
      catalogOffer.supplier_price
    );

    if (
      !Number.isFinite(supplierPrice) ||
      supplierPrice <= 0
    ) {
      return jsonError(
        "El precio del proveedor no es válido.",
        500
      );
    }

    const offer: Offer = {
      id: offerId,
      name:
        catalogOffer.name ||
        catalogOffer.offer_name ||
        offerId,
      supplierPrice,
    };

    // 9. COMPROBAR VIP

    const vipActive = await getVipStatus(user.id);

    // 10. CALCULAR PRECIO

    const retailPrice = getRetailPrice(
      supplierPrice,
      vipActive
    );

    if (
      !Number.isFinite(retailPrice) ||
      retailPrice <= 0
    ) {
      return jsonError(
        "El precio final no es válido.",
        500
      );
    }

    // 11. COMPROBAR ORDEN DUPLICADA

    const existingOrder = await findExistingOrder(
      user.id,
      idempotencyKey
    );

    if (existingOrder) {
      if (
        existingOrder.offer_id !== offerId ||
        String(existingOrder.player_id) !== playerId
      ) {
        return jsonError(
          "La clave de idempotencia ya fue utilizada con otros datos.",
          409
        );
      }

      const existingFields =
        existingOrder.supplier_fields || {};

      if (
        existingFields.server_id &&
        String(existingFields.server_id) !== serverId
      ) {
        return jsonError(
          "La clave ya fue utilizada con otro servidor.",
          409
        );
      }

      return jsonSuccess({
        message: "La orden ya había sido creada.",
        order: {
          ...existingOrder,
          order_number: existingOrder.id,
        },
        supplierOrderId:
          existingOrder.supplier_order_id || null,
        duplicate: true,
      });
    }

    // 12. CREAR ORDEN Y RESERVAR SALDO ATÓMICAMENTE

    const username =
      user.user_metadata?.username ||
      user.user_metadata?.user_name ||
      user.user_metadata?.name ||
      null;

    const email = user.email || null;

    const atomicResult = await createAtomicOrder(
      user.id,
      username,
      email,
      offer,
      playerId,
      serverId,
      retailPrice,
      supplierPrice,
      idempotencyKey,
      vipActive
    );

    internalOrderId = atomicResult.order_id;

    if (
      atomicResult.order_status === "EXISTING"
    ) {
      return jsonSuccess({
        message: "La orden ya existía.",
        orderId: internalOrderId,
        duplicate: true,
      });
    }

    reserved = true;

    // 13. ENVIAR ORDEN A FAZERCARDS

    const supplierBody = {
      category_id: CATEGORY_ID,
      offer_id: offerId,
      fields: {
        player_id: playerId,
        server_id: serverId,
      },
    };

    console.log(
      "MOBILE LEGENDS → FAZERCARDS:",
      {
        category_id: CATEGORY_ID,
        offer_id: offerId,
        player_id: playerId,
        server_id: serverId,
        internalOrderId,
      }
    );

    supplierRequestStarted = true;

    let supplierResponse: Response;
    let supplierData: SupplierResponse | null = null;

    try {
      supplierResponse = await fetchWithTimeout(
        `${FAZER_API_BASE}/topups/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-API-Key": fazerApiKey,
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(supplierBody),
        }
      );

      const supplierText =
        await supplierResponse.text();

      try {
        supplierData = supplierText
          ? JSON.parse(supplierText)
          : null;
      } catch {
        supplierData = {
          message:
            supplierText ||
            "Respuesta no JSON del proveedor.",
        };
      }

      console.log(
        "FAZERCARDS MOBILE LEGENDS RESPONSE:",
        {
          status: supplierResponse.status,
          body: supplierData,
        }
      );
    } catch (supplierError) {
      console.error(
        "FAZERCARDS MOBILE LEGENDS REQUEST ERROR:",
        supplierError
      );

      await updateOrder(internalOrderId, {
        status: "SUPPLIER_PENDING",
        supplier_response: {
          error:
            "No se pudo confirmar la respuesta del proveedor.",
        },
      });

      // La solicitud pudo haber llegado al proveedor.
      // No se devuelve el saldo automáticamente.

      return jsonSuccess(
        {
          message:
            "La orden quedó pendiente de confirmación del proveedor.",
          orderId: internalOrderId,
          status: "SUPPLIER_PENDING",
        },
        202
      );
    }

    // 14. GUARDAR RESPUESTA

    await updateOrder(internalOrderId, {
      supplier_response: supplierData,
    });

    // 15. DETECTAR RECHAZO EXPLÍCITO

    const supplierRejected =
      !supplierResponse.ok ||
      supplierData?.ok === false ||
      supplierData?.success === false;

    if (supplierRejected) {
      supplierDefinitelyRejected = true;

      console.error(
        "FAZERCARDS MOBILE LEGENDS REJECTED:",
        {
          status: supplierResponse.status,
          response: supplierData,
        }
      );

      const refunded = await refundOrder(
        internalOrderId
      );

      if (refunded) {
        reserved = false;

        await updateOrder(internalOrderId, {
          status: "FAILED",
          failed_at: new Date().toISOString(),
          supplier_response: supplierData,
        });

        return jsonError(
          supplierData?.error ||
            supplierData?.message ||
            "FazerCards rechazó la orden. El saldo fue devuelto.",
          502
        );
      }

      await updateOrder(internalOrderId, {
        status: "REFUND_PENDING",
        supplier_response: supplierData,
      });

      return jsonSuccess(
        {
          message:
            "El proveedor rechazó la orden, pero el reembolso necesita revisión.",
          orderId: internalOrderId,
          status: "REFUND_PENDING",
        },
        202
      );
    }

    // 16. EXTRAER ID DEL PROVEEDOR

    const supplierOrderId =
      extractSupplierOrderId(supplierData);

    const supplierStatus =
      extractSupplierStatus(supplierData);

    // 17. SI NO HAY ID, DEJAR PENDIENTE

    if (!supplierOrderId) {
      await updateOrder(internalOrderId, {
        status: "SUPPLIER_PENDING",
        supplier_response: supplierData,
      });

      return jsonSuccess(
        {
          message:
            "La orden fue enviada y quedó pendiente de confirmación.",
          orderId: internalOrderId,
          supplierOrderId: null,
          status: "SUPPLIER_PENDING",
        },
        202
      );
    }

    // 18. DETERMINAR ESTADO

    const completed = isCompletedStatus(
      supplierStatus
    );

    const failed = isFailedStatus(
      supplierStatus
    );

    // 19. ORDEN COMPLETADA

    if (completed) {
      const {
        error: completeError,
      } = await supabaseAdmin.rpc(
        "complete_topup_order",
        {
          p_supplier_order_id: supplierOrderId,
        }
      );

      if (completeError) {
        console.error(
          "MOBILE LEGENDS COMPLETE ORDER ERROR:",
          completeError
        );

        await updateOrder(internalOrderId, {
          status: "SUPPLIER_PENDING",
          supplier_order_id: supplierOrderId,
          supplier_response: supplierData,
        });

        return jsonSuccess(
          {
            message:
              "El proveedor informó que la orden fue completada, pero la actualización interna necesita revisión.",
            orderId: internalOrderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
          },
          202
        );
      }

      reserved = false;

      await updateOrder(internalOrderId, {
        status: "COMPLETED",
        supplier_order_id: supplierOrderId,
        completed_at: new Date().toISOString(),
        supplier_response: supplierData,
      });

      return jsonSuccess({
        message:
          "Orden de Mobile Legends completada correctamente.",
        orderId: internalOrderId,
        supplierOrderId,
        status: "COMPLETED",
        retailPrice,
        supplierPrice,
        vipActive,
      });
    }

    // 20. ORDEN FALLIDA

    if (failed) {
      const refunded = await refundOrder(
        internalOrderId
      );

      if (!refunded) {
        await updateOrder(internalOrderId, {
          status: "REFUND_PENDING",
          supplier_order_id: supplierOrderId,
          supplier_response: supplierData,
        });

        return jsonSuccess(
          {
            message:
              "La orden fue rechazada, pero el reembolso necesita revisión.",
            orderId: internalOrderId,
            supplierOrderId,
            status: "REFUND_PENDING",
          },
          202
        );
      }

      reserved = false;

      await updateOrder(internalOrderId, {
        status: "FAILED",
        supplier_order_id: supplierOrderId,
        failed_at: new Date().toISOString(),
        supplier_response: supplierData,
      });

      return jsonError(
        "FazerCards informó que la orden fue rechazada y el saldo fue devuelto.",
        502
      );
    }

    // 21. ORDEN PENDIENTE

    await updateOrder(internalOrderId, {
      status: "SUPPLIER_PENDING",
      supplier_order_id: supplierOrderId,
      supplier_response: supplierData,
    });

    return jsonSuccess(
      {
        message:
          "La orden fue enviada a FazerCards y está pendiente de procesamiento.",
        orderId: internalOrderId,
        supplierOrderId,
        status: "SUPPLIER_PENDING",
        retailPrice,
        supplierPrice,
        vipActive,
        supplierStatus,
      },
      202
    );
  } catch (error: any) {
    console.error(
      "MOBILE LEGENDS TOPUP ERROR:",
      error
    );

    // Si no se inició la solicitud al proveedor,
    // se puede intentar devolver el saldo.
    //
    // Si la solicitud ya comenzó, no se devuelve
    // automáticamente porque el proveedor pudo recibirla.

    if (
      reserved &&
      internalOrderId &&
      !supplierRequestStarted
    ) {
      const refunded = await refundOrder(
        internalOrderId
      );

      if (refunded) {
        reserved = false;

        await updateOrder(internalOrderId, {
          status: "FAILED",
          failed_at: new Date().toISOString(),
        });
      } else {
        await updateOrder(internalOrderId, {
          status: "REFUND_PENDING",
        });
      }
    } else if (
      reserved &&
      internalOrderId &&
      supplierRequestStarted
    ) {
      await updateOrder(internalOrderId, {
        status: "SUPPLIER_PENDING",
        supplier_response: {
          error: "INTERNAL_PROCESSING_ERROR",
          message: String(error),
        },
      });
    }

    return jsonError(
      "No se pudo procesar la orden. Revisa su estado antes de volver a comprar.",
      500
    );
  }
    }
