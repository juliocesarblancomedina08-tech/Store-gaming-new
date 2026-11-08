import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type JsonObject = Record<string, unknown>;

type Profile = {
  id: string;
  email: string | null;
  balance: number | string | null;
};

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const CATEGORY_ID = "roblox_global";
const MARKUP_PER_CARD = 0.25;
const MAX_QUANTITY = 100;

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, { status });
}

function isObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function getNumber(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function findNestedValue(
  payload: unknown,
  keys: string[],
  depth = 0,
): unknown {
  if (!isObject(payload) || depth > 6) {
    return undefined;
  }

  for (const key of keys) {
    const value = payload[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  for (const key of [
    "data",
    "order",
    "result",
    "response",
    "payload",
  ]) {
    const nested = payload[key];

    if (isObject(nested)) {
      const found = findNestedValue(
        nested,
        keys,
        depth + 1,
      );

      if (found !== undefined) {
        return found;
      }
    }
  }

  return undefined;
}

function getProviderStatus(payload: unknown): string {
  return getText(
    findNestedValue(payload, ["status", "order_status"]),
  )
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function getProviderOrderId(payload: unknown): string {
  const value = findNestedValue(payload, [
    "supplier_order_id",
    "order_id",
    "orderId",
    "id",
  ]);

  return getText(value);
}

function getProviderCodes(payload: unknown): unknown {
  return findNestedValue(payload, [
    "gift_codes",
    "giftCodes",
    "codes",
    "keys",
    "serials",
  ]);
}

function getOffers(payload: unknown): JsonObject[] {
  const candidates: unknown[] = [];

  if (Array.isArray(payload)) {
    candidates.push(payload);
  }

  if (isObject(payload)) {
    candidates.push(
      payload.cards,
      payload.offers,
      payload.results,
      payload.data,
    );

    if (isObject(payload.data)) {
      candidates.push(
        payload.data.cards,
        payload.data.offers,
        payload.data.results,
      );
    }
  }

  for (const candidate of candidates) {
    if (
      Array.isArray(candidate) &&
      candidate.every(isObject)
    ) {
      return candidate;
    }
  }

  return [];
}

function getOfferId(offer: JsonObject): string {
  return getText(
    offer.offer_id ??
      offer.card_id ??
      offer.id,
  );
}

function getOfferName(offer: JsonObject): string {
  return (
    getText(
      offer.name ??
        offer.offer_name ??
        offer.title,
    ) || "Roblox Global"
  );
}

function getOfferPrice(
  offer: JsonObject,
): number | null {
  return getNumber(
    offer.price_usd ??
      offer.price ??
      offer.cost,
  );
}

function getMetadataUsername(
  user: {
    user_metadata?: unknown;
    email?: string;
    id: string;
  },
): string {
  const metadata = isObject(user.user_metadata)
    ? user.user_metadata
    : {};

  return (
    getText(metadata.username) ||
    getText(metadata.full_name) ||
    getText(metadata.name) ||
    getText(user.email) ||
    user.id
  );
}

async function readResponse(
  response: Response,
): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

export async function POST(request: NextRequest) {
  let reservedOrderId: string | null = null;

  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error(
        "[STORE GAMING] Faltan variables de Supabase.",
      );

      return json(
        {
          success: false,
          error: "La base de datos no está configurada.",
        },
        500,
      );
    }

    if (!FAZER_API_KEY) {
      return json(
        {
          success: false,
          error: "Falta configurar FAZERCARDS_API_KEY.",
        },
        500,
      );
    }

    const authorization =
      request.headers.get("authorization") || "";

    const tokenMatch = authorization.match(
      /^Bearer\s+(.+)$/i,
    );

    if (!tokenMatch) {
      return json(
        {
          success: false,
          error: "Debes iniciar sesión para comprar.",
        },
        401,
      );
    }

    const token = tokenMatch[1].trim();

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      return json(
        {
          success: false,
          error: "La sesión no es válida. Inicia sesión nuevamente.",
        },
        401,
      );
    }

    const user = authData.user;

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return json(
        {
          success: false,
          error: "El cuerpo de la solicitud no es JSON válido.",
        },
        400,
      );
    }

    if (!isObject(body)) {
      return json(
        {
          success: false,
          error: "Los datos de la compra no son válidos.",
        },
        400,
      );
    }

    const cardId = getText(
      body.card_id ?? body.offer_id,
    );

    const quantityValue = getNumber(body.quantity);
    const quantity = quantityValue ?? 1;
    const idempotencyKey = getText(
      body.idempotency_key,
    );

    if (!cardId) {
      return json(
        {
          success: false,
          error: "Falta seleccionar una tarjeta.",
        },
        400,
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY
    ) {
      return json(
        {
          success: false,
          error: `La cantidad debe estar entre 1 y ${MAX_QUANTITY}.`,
        },
        400,
      );
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey,
      )
    ) {
      return json(
        {
          success: false,
          error: "La clave de compra no es válida. Inténtalo nuevamente.",
        },
        400,
      );
    }

    /*
     * IMPORTANTE:
     * profiles no tiene una columna username.
     * Solo consultamos columnas que existen.
     */
    const {
      data: profileData,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, email, balance")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "[STORE GAMING] Error leyendo perfil:",
        profileError,
      );

      return json(
        {
          success: false,
          error: "No se pudo consultar tu perfil.",
        },
        500,
      );
    }

    /*
     * Se declara el tipo explícitamente para evitar que
     * TypeScript infiera profile como never.
     */
    const profile: Profile | null = profileData
      ? {
          id: getText(
            (profileData as Record<string, unknown>).id,
          ),
          email:
            getText(
              (profileData as Record<string, unknown>).email,
            ) || null,
          balance:
            (profileData as Record<string, unknown>)
              .balance as number | string | null,
        }
      : null;

    if (!profile) {
      return json(
        {
          success: false,
          error: "No existe un perfil para esta cuenta.",
        },
        404,
      );
    }

    const email =
      getText(profile.email) ||
      getText(user.email);

    const username = getMetadataUsername(user);

    if (!email) {
      return json(
        {
          success: false,
          error: "Tu cuenta no tiene un correo disponible.",
        },
        400,
      );
    }

    /*
     * Consultar catálogo del proveedor.
     */
    const catalogUrl =
      `${FAZER_API_BASE}/giftcards/cards` +
      `?category_id=${encodeURIComponent(CATEGORY_ID)}`;

    let catalogResponse: Response;

    try {
      catalogResponse = await fetch(catalogUrl, {
        method: "GET",
        headers: {
          "X-API-Key": FAZER_API_KEY,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
    } catch (error) {
      console.error(
        "[STORE GAMING] Error conectando con el catálogo:",
        error,
      );

      return json(
        {
          success: false,
          error: "No se pudo conectar con FazerCards.",
        },
        502,
      );
    }

    const catalogPayload =
      await readResponse(catalogResponse);

    if (!catalogResponse.ok) {
      console.error(
        "[STORE GAMING] Error de catálogo:",
        catalogResponse.status,
        catalogPayload,
      );

      return json(
        {
          success: false,
          error: "FazerCards no permitió consultar las tarjetas.",
          provider_status: catalogResponse.status,
        },
        502,
      );
    }

    const offers = getOffers(catalogPayload);

    const selectedOffer = offers.find(
      (offer) => getOfferId(offer) === cardId,
    );

    if (!selectedOffer) {
      return json(
        {
          success: false,
          error: "La tarjeta seleccionada no está disponible en el catálogo.",
        },
        400,
      );
    }

    const supplierUnitPrice =
      getOfferPrice(selectedOffer);

    if (
      supplierUnitPrice === null ||
      supplierUnitPrice <= 0
    ) {
      console.error(
        "[STORE GAMING] Precio inválido:",
        selectedOffer,
      );

      return json(
        {
          success: false,
          error: "No se pudo verificar el precio de la tarjeta.",
        },
        502,
      );
    }

    const offerName = getOfferName(selectedOffer);
    const retailUnitPrice =
      Math.round(
        (supplierUnitPrice + MARKUP_PER_CARD) * 100,
      ) / 100;

    const retailTotal =
      Math.round(retailUnitPrice * quantity * 100) /
      100;

    const supplierTotal =
      Math.round(
        supplierUnitPrice * quantity * 100,
      ) / 100;

    /*
     * Reservar saldo y crear la orden de forma atómica.
     * La RPC debe devolver order_id y created.
     */
    const {
      data: reserveData,
      error: reserveError,
    } = await supabaseAdmin.rpc(
      "create_gift_card_order_and_reserve_balance",
      {
        p_user_id: user.id,
        p_username: username,
        p_email: email,
        p_category_id: CATEGORY_ID,
        p_card_id: cardId,
        p_offer_name: offerName,
        p_quantity: quantity,
        p_retail_price: retailTotal,
        p_supplier_price: supplierTotal,
        p_idempotency_key: idempotencyKey,
      },
    );

    if (reserveError) {
      console.error(
        "[STORE GAMING] Error reservando saldo:",
        reserveError,
      );

      return json(
        {
          success: false,
          error: "No se pudo crear la orden ni reservar el saldo.",
        },
        500,
      );
    }

    const reserveRow = Array.isArray(reserveData)
      ? reserveData[0]
      : reserveData;

    if (!isObject(reserveRow)) {
      console.error(
        "[STORE GAMING] Respuesta inesperada de la RPC:",
        reserveData,
      );

      return json(
        {
          success: false,
          error: "La base de datos devolvió una respuesta inesperada.",
        },
        500,
      );
    }

    const internalOrderId = getText(
      reserveRow.order_id ??
        reserveRow.gift_card_order_id ??
        reserveRow.id,
    );

    const createdValue =
      reserveRow.created ?? reserveRow.is_new;

    const isNewOrder =
      createdValue === true ||
      createdValue === 1 ||
      createdValue === "true";

    if (!internalOrderId) {
      console.error(
        "[STORE GAMING] La RPC no devolvió el ID de la orden:",
        reserveData,
      );

      return json(
        {
          success: false,
          error: "No se recibió el identificador de la orden.",
        },
        500,
      );
    }

    /*
     * No volver a enviar al proveedor una compra existente.
     * Esto evita duplicar tarjetas por reintentos del cliente.
     */
    if (!isNewOrder) {
      return json({
        success: true,
        duplicate_request: true,
        orderId: internalOrderId,
        message:
          "Esta solicitud ya había sido procesada. No se creó otra compra.",
      });
    }

    reservedOrderId = internalOrderId;

    /*
     * Enviar la compra a FazerCards.
     */
    let supplierResponse: Response;

    try {
      supplierResponse = await fetch(
        `${FAZER_API_BASE}/giftcards/order`,
        {
          method: "POST",
          headers: {
            "X-API-Key": FAZER_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            category_id: CATEGORY_ID,
            card_id: cardId,
            quantity,
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        },
      );
    } catch (error) {
      /*
       * Un timeout no demuestra que el proveedor no recibió
       * la orden. Se deja pendiente para reconciliación.
       * No reintentar automáticamente aquí.
       */
      console.error(
        "[STORE GAMING] Resultado incierto al enviar a FazerCards:",
        error,
      );

      const { error: updateError } =
        await supabaseAdmin
          .from("gift_card_orders")
          .update({
            status: "SUPPLIER_PENDING",
            supplier_response: {
              message:
                "No se pudo confirmar la respuesta HTTP del proveedor.",
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", internalOrderId);

      if (updateError) {
        console.error(
          "[STORE GAMING] No se pudo guardar el estado pendiente:",
          updateError,
        );
      }

      return json(
        {
          success: true,
          pending: true,
          orderId: internalOrderId,
          status: "SUPPLIER_PENDING",
          message:
            "La orden quedó pendiente de confirmación. No repitas la compra.",
        },
        202,
      );
    }

    const supplierPayload =
      await readResponse(supplierResponse);

    const supplierOrderId =
      getProviderOrderId(supplierPayload);

    const supplierStatus =
      getProviderStatus(supplierPayload);

    /*
     * Si el proveedor rechazó explícitamente la solicitud,
     * guardar la respuesta y solicitar el reembolso mediante
     * la RPC idempotente.
     */
    if (!supplierResponse.ok) {
      const ambiguous =
        supplierResponse.status >= 500 ||
        supplierResponse.status === 429;

      const { error: updateError } =
        await supabaseAdmin
          .from("gift_card_orders")
          .update({
            ...(supplierOrderId
              ? { supplier_order_id: supplierOrderId }
              : {}),
            supplier_response: isObject(supplierPayload)
              ? supplierPayload
              : { response: supplierPayload },
            status: ambiguous ? "SUPPLIER_PENDING" : "FAILED",
            ...(!ambiguous
              ? { failed_at: new Date().toISOString() }
              : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", internalOrderId);

      if (updateError) {
        console.error(
          "[STORE GAMING] Error guardando rechazo del proveedor:",
          updateError,
        );

        return json(
          {
            success: false,
            error:
              "No se pudo guardar la respuesta del proveedor. La orden requiere revisión.",
            orderId: internalOrderId,
          },
          500,
        );
      }

      if (ambiguous) {
        return json(
          {
            success: true,
            pending: true,
            orderId: internalOrderId,
            supplierOrderId: supplierOrderId || null,
            status: "SUPPLIER_PENDING",
            message:
              "El resultado del proveedor es incierto. No repitas la compra.",
          },
          202,
        );
      }

      const { error: refundError } =
        await supabaseAdmin.rpc(
          "refund_gift_card_order",
          {
            p_order_id: internalOrderId,
          },
        );

      if (refundError) {
        console.error(
          "[STORE GAMING] Error reembolsando la orden:",
          refundError,
        );

        return json(
          {
            success: false,
            error:
              "El proveedor rechazó la compra, pero el reembolso necesita revisión.",
            orderId: internalOrderId,
          },
          500,
        );
      }

      return json(
        {
          success: false,
          error: "FazerCards rechazó la compra.",
          orderId: internalOrderId,
          supplier_status: supplierResponse.status,
          status: "REFUNDED",
        },
        400,
      );
    }

    /*
     * Guardar siempre la respuesta del proveedor.
     */
    const normalizedStatus =
      supplierStatus || "PENDING";

    const completedStatuses = [
      "COMPLETED",
      "COMPLETE",
      "SUCCESS",
      "SUCCEEDED",
      "DELIVERED",
      "DONE",
    ];

    const failedStatuses = [
      "FAILED",
      "FAILURE",
      "REJECTED",
      "DECLINED",
      "DENIED",
      "ERROR",
    ];

    const codes = getProviderCodes(supplierPayload);

    const hasCodes =
      (Array.isArray(codes) && codes.length > 0) ||
      (typeof codes === "string" && codes.trim().length > 0);

    /*
     * No marcar COMPLETED solo porque HTTP fue 200.
     * Se requiere un estado final de éxito y códigos recibidos.
     */
    const isCompleted =
      completedStatuses.includes(normalizedStatus) &&
      hasCodes;

    const isFailed =
      failedStatuses.includes(normalizedStatus);

    const nextStatus = isCompleted
      ? "COMPLETED"
      : isFailed
        ? "FAILED"
        : "SUPPLIER_PENDING";

    const updatePayload: Record<string, unknown> = {
      ...(supplierOrderId
        ? { supplier_order_id: supplierOrderId }
        : {}),
      supplier_response: isObject(supplierPayload)
        ? supplierPayload
        : { response: supplierPayload },
      status: nextStatus,
      updated_at: new Date().toISOString(),
      ...(isCompleted
        ? {
            gift_codes: codes,
            completed_at: new Date().toISOString(),
          }
        : {}),
      ...(isFailed
        ? { failed_at: new Date().toISOString() }
        : {}),
    };

    const { error: saveError } =
      await supabaseAdmin
        .from("gift_card_orders")
        .update(updatePayload)
        .eq("id", internalOrderId);

    if (saveError) {
      console.error(
        "[STORE GAMING] Error guardando la orden del proveedor:",
        saveError,
      );

      return json(
        {
          success: false,
          error:
            "El proveedor respondió, pero no se pudo guardar la respuesta. La orden requiere revisión.",
          orderId: internalOrderId,
          supplierOrderId: supplierOrderId || null,
        },
        500,
      );
    }

    if (isFailed) {
      const { error: refundError } =
        await supabaseAdmin.rpc(
          "refund_gift_card_order",
          {
            p_order_id: internalOrderId,
          },
        );

      if (refundError) {
        console.error(
          "[STORE GAMING] Error reembolsando orden fallida:",
          refundError,
        );

        return json(
          {
            success: false,
            error:
              "La orden falló en el proveedor, pero el reembolso necesita revisión.",
            orderId: internalOrderId,
          },
          500,
        );
      }

      return json({
        success: false,
        orderId: internalOrderId,
        supplierOrderId: supplierOrderId || null,
        status: "REFUNDED",
        message:
          "FazerCards indicó que la compra falló. El saldo fue devuelto.",
      });
    }

    if (isCompleted) {
      return json({
        success: true,
        orderId: internalOrderId,
        supplierOrderId: supplierOrderId || null,
        status: "COMPLETED",
        gift_codes: codes,
        message: "Compra completada correctamente.",
      });
    }

    return json(
      {
        success: true,
        pending: true,
        orderId: internalOrderId,
        supplierOrderId: supplierOrderId || null,
        supplier_status: normalizedStatus,
        status: "SUPPLIER_PENDING",
        message:
          "La orden está pendiente de confirmación o entrega por FazerCards.",
      },
      202,
    );
  } catch (error) {
    console.error(
      "[STORE GAMING] Error inesperado en la compra:",
      error,
    );

    /*
     * Si ya existe una orden reservada, no hacer otro POST
     * al proveedor ni reembolsar automáticamente un resultado
     * que podría ser incierto.
     */
    if (reservedOrderId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseAdmin = createClient(
          SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          },
        );

        await supabaseAdmin
          .from("gift_card_orders")
          .update({
            status: "SUPPLIER_PENDING",
            updated_at: new Date().toISOString(),
          })
          .eq("id", reservedOrderId);
      } catch (saveError) {
        console.error(
          "[STORE GAMING] Error guardando estado de revisión:",
          saveError,
        );
      }
    }

    return json(
      {
        success: false,
        error:
          "Ocurrió un error procesando la compra. Revisa el estado de la orden antes de intentarlo nuevamente.",
        ...(reservedOrderId
          ? { orderId: reservedOrderId }
          : {}),
      },
      500,
    );
  }
}
