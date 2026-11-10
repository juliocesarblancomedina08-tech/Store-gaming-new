
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY;
const FAZERCARDS_ORIGIN = process.env.FAZERCARDS_ORIGIN?.trim();
const CATEGORY_ID = "genshin_impact_global";
const STORE_MARGIN = 0.30;

const supabaseAdmin = createClient(
  SUPABASE_URL || "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY || "missing-service-role-key",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const GENSHIN_OFFERS = [
  { id: "60_genesis_crystals", supplierOfferId: "60_genesis_crystals", name: "60 Genesis Crystals", price: 1.2048, supplierPrice: 1.0048 },
  { id: "300_30_genesis_crystals", supplierOfferId: "300_30_genesis_crystals", name: "300 + 30 Genesis Crystals", price: 5.2039, supplierPrice: 5.0039 },
  { id: "980_110_genesis_crystals", supplierOfferId: "980_110_genesis_crystals", name: "980 + 110 Genesis Crystals", price: 15.1915, supplierPrice: 14.9915 },
  { id: "1980_260_genesis_crystals", supplierOfferId: "1980_260_genesis_crystals", name: "1980 + 260 Genesis Crystals", price: 30.1729, supplierPrice: 29.9729 },
  { id: "3280_600_genesis_crystals", supplierOfferId: "3280_600_genesis_crystals", name: "3280 + 600 Genesis Crystals", price: 50.1583, supplierPrice: 49.9583 },
  { id: "6480_1600_genesis_crystals", supplierOfferId: "6480_1600_genesis_crystals", name: "6480 + 1600 Genesis Crystals", price: 100.0963, supplierPrice: 99.8963 },
  { id: "blessing_of_the_welkin_moon", supplierOfferId: "blessing_of_the_welkin_moon", name: "Blessing of the Welkin Moon", price: 5.2039, supplierPrice: 5.0039 },
] as const;

type Obj = Record<string, any>;

function isObject(value: unknown): value is Obj {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function findOffer(id: string) {
  return GENSHIN_OFFERS.find(
    (offer) => offer.id === id || offer.supplierOfferId === id
  );
}

function getSupplierOrderId(value: unknown): string {
  if (!isObject(value)) return "";

  const data = isObject(value.data) ? value.data : {};
  const order = isObject(value.order) ? value.order : {};
  const dataOrder = isObject(data.order) ? data.order : {};

  const candidates = [
    order.id,
    dataOrder.id,
    value.order_id,
    value.orderId,
    data.order_id,
    data.orderId,
    data.id,
    value.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" && typeof candidate !== "number") {
      continue;
    }

    const id = String(candidate).trim();
    if (/^ord-[A-Za-z0-9_-]+$/.test(id)) return id;
  }

  return "";
}

function getSupplierStatus(value: unknown): string {
  if (!isObject(value)) return "PENDING";

  const data = isObject(value.data) ? value.data : {};
  const order = isObject(value.order) ? value.order : {};
  const dataOrder = isObject(data.order) ? data.order : {};

  return String(
    order.status ??
    dataOrder.status ??
    value.status ??
    data.status ??
    "PENDING"
  ).trim().toUpperCase();
}

async function getUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice(7).trim();
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) return null;
  return data.user;
}

async function updateOrder(orderId: string, values: Obj) {
  const { data, error } = await supabaseAdmin
    .from("topup_orders")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `No se pudo actualizar la orden: ${error?.message || "orden no encontrada"}`
    );
  }
}

async function setPending(
  orderId: string,
  reason: string,
  response?: unknown
) {
  const supplierResponse: Obj = {
    requires_reconciliation: true,
    reason,
    saved_at: new Date().toISOString(),
  };

  if (response !== undefined) supplierResponse.response = response;

  await updateOrder(orderId, {
    status: "SUPPLIER_PENDING",
    supplier_response: supplierResponse,
  });
}

async function refundAndVerify(orderId: string) {
  const { error } = await supabaseAdmin.rpc("refund_topup_balance", {
    p_order_id: orderId,
  });

  if (error) throw new Error(`Error de reembolso: ${error.message}`);

  const { data, error: verifyError } = await supabaseAdmin
    .from("topup_orders")
    .select("status, refunded_at")
    .eq("id", orderId)
    .maybeSingle();

  if (
    verifyError ||
    !data ||
    String(data.status).toUpperCase() !== "REFUNDED" ||
    !data.refunded_at
  ) {
    throw new Error("No se pudo verificar el reembolso.");
  }
}

function responseForExistingOrder(
  orderId: string,
  status: string
) {
  const normalized = status.toUpperCase();

  if (normalized === "COMPLETED") {
    return NextResponse.json({
      ok: true,
      orderId,
      status: normalized,
      message: "Esta solicitud ya figura como completada.",
    });
  }

  if (
    normalized === "REFUNDED" ||
    normalized === "CANCELLED"
  ) {
    return NextResponse.json(
      {
        ok: false,
        orderId,
        status: normalized,
        message: "Esta solicitud ya tiene un estado final. No se envió otra compra.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      orderId,
      status: normalized,
      message:
        "Esta solicitud ya está registrada. No se volvió a enviar a FazerCards.",
    },
    { status: 202 }
  );
}

export async function POST(request: NextRequest) {
  let orderId: string | null = null;
  let providerRequestStarted = false;
  let providerResponseReceived = false;
  let providerResponseBody: unknown;

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Supabase no está configurado en el servidor." },
        { status: 500 }
      );
    }

    if (!FAZER_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Falta configurar FazerCards en el servidor." },
        { status: 500 }
      );
    }

    let providerOrigin: string | undefined;

    if (FAZERCARDS_ORIGIN) {
      try {
        providerOrigin = new URL(FAZERCARDS_ORIGIN).origin;
      } catch {
        return NextResponse.json(
          { ok: false, error: "FAZERCARDS_ORIGIN no es una URL válida." },
          { status: 500 }
        );
      }
    }

    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "No autorizado." },
        { status: 401 }
      );
    }

    let body: Obj;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "El cuerpo de la solicitud no es JSON válido." },
        { status: 400 }
      );
    }

    const offerId = String(body.offerId ?? "").trim();
    const playerId = String(body.playerId ?? "").trim();
    const server = String(body.server ?? "").trim().toLowerCase();

    const idempotencyKey = String(
      request.headers.get("idempotency-key") ??
      body.idempotencyKey ??
      ""
    ).trim();

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(idempotencyKey)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Falta una clave de idempotencia UUID válida. El frontend debe enviar una clave estable por compra.",
          code: "IDEMPOTENCY_KEY_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (!offerId || !playerId || !server) {
      return NextResponse.json(
        {
          ok: false,
          error: !offerId
            ? "Falta seleccionar una oferta."
            : !playerId
              ? "Debe introducir el Player ID."
              : "Debe seleccionar el servidor.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4,20}$/.test(playerId)) {
      return NextResponse.json(
        { ok: false, error: "El Player ID debe contener entre 4 y 20 dígitos." },
        { status: 400 }
      );
    }

    if (!["america", "asia", "europe", "tw_hk_mo"].includes(server)) {
      return NextResponse.json(
        { ok: false, error: "El servidor seleccionado no es válido." },
        { status: 400 }
      );
    }

    const offer = findOffer(offerId);

    if (!offer) {
      return NextResponse.json(
        { ok: false, error: "La oferta de Genshin Impact no existe en STORE GAMING." },
        { status: 400 }
      );
    }

    const offersResponse = await fetch(
      `${FAZER_API_BASE}/topups/offers?category_id=${encodeURIComponent(CATEGORY_ID)}`,
      {
        method: "GET",
        headers: {
          "X-API-Key": FAZER_API_KEY,
          Accept: "application/json",
          "User-Agent": "STORE-GAMING/1.0",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    const offersText = await offersResponse.text();
    let offersData: any = null;
    try {
      offersData = offersText ? JSON.parse(offersText) : null;
    } catch {
      offersData = null;
    }

    const currentSupplierOffer = Array.isArray(offersData?.offers)
      ? offersData.offers.find(
          (item: any) => String(item?.offer_id ?? "") === offer.supplierOfferId
        )
      : null;

    const supplierPrice = Number(
      currentSupplierOffer?.price_usd ?? currentSupplierOffer?.precio_usd
    );

    if (
      !offersResponse.ok ||
      offersData?.ok !== true ||
      !currentSupplierOffer ||
      !Number.isFinite(supplierPrice) ||
      supplierPrice <= 0
    ) {
      console.error("GENSHIN IMPACT: no se pudo verificar el precio actual del proveedor", {
        httpStatus: offersResponse.status,
        offerId: offer.supplierOfferId,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo verificar el precio actual de esta oferta en FazerCards. No se realizó ningún cobro; inténtalo nuevamente más tarde.",
          code: "SUPPLIER_PRICE_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    const retailPrice = Number((supplierPrice + STORE_MARGIN).toFixed(4));

    const { data: reservation, error: reservationError } =
      await supabaseAdmin.rpc("create_topup_order_and_reserve_balance", {
        p_user_id: user.id,
        p_username:
          user.user_metadata?.username ||
          user.user_metadata?.name ||
          user.email ||
          "Cliente",
        p_email: user.email ?? null,
        p_game: "Genshin Impact (Global)",
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
          server,
          supplier_offer_id: offer.supplierOfferId,
        },
      });

    if (reservationError) {
      const errorText = reservationError.message || "";

      console.error("Error reservando saldo y creando orden:", errorText);

      const insufficientBalance =
        /INSUFFICIENT_BALANCE|saldo insuficiente/i.test(errorText);

      const keyConflict =
        /IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_ORDER/i.test(errorText);

      return NextResponse.json(
        {
          ok: false,
          error: insufficientBalance
            ? "Saldo insuficiente para realizar esta recarga."
            : keyConflict
              ? "Esta clave ya se usó para una compra diferente. Inicia una solicitud nueva."
              : "No se pudo crear la orden ni reservar el saldo.",
          code: insufficientBalance
            ? "INSUFFICIENT_BALANCE"
            : keyConflict
              ? "IDEMPOTENCY_CONFLICT"
              : "ORDER_RESERVATION_FAILED",
        },
        { status: insufficientBalance ? 400 : keyConflict ? 409 : 500 }
      );
    }

    const reservationRow = Array.isArray(reservation)
      ? reservation[0]
      : reservation;

    if (
      !reservationRow ||
      typeof reservationRow.order_id !== "string" ||
      typeof reservationRow.created !== "boolean"
    ) {
      console.error("Respuesta inesperada de la función SQL:", reservation);

      return NextResponse.json(
        {
          ok: false,
          error:
            "La reserva devolvió una respuesta inesperada. No repitas la solicitud; verifica el estado antes de continuar.",
        },
        { status: 500 }
      );
    }

    orderId = reservationRow.order_id;

    if (!reservationRow.created) {
      return responseForExistingOrder(
        orderId,
        String(reservationRow.order_status || "SUPPLIER_PENDING")
      );
    }

    await updateOrder(orderId, { status: "PROCESSING" });

    const payload = {
      category_id: CATEGORY_ID,
      offer_id: offer.supplierOfferId,
      fields: { player_id: playerId, server },
    };

    const headers: Record<string, string> = {
      "X-API-Key": FAZER_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (providerOrigin) headers.Origin = providerOrigin;

    console.info("Enviando nueva orden de Genshin Impact a FazerCards", {
      orderId,
      offerId: offer.id,
      categoryId: CATEGORY_ID,
    });

    providerRequestStarted = true;

    const response = await fetch(`${FAZER_API_BASE}/topups/order`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });

    const responseText = await response.text();
    let result: unknown;

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      result = { raw: responseText };
    }

    providerResponseReceived = true;
    providerResponseBody = result;

    const supplierId = getSupplierOrderId(result);
    const supplierStatus = getSupplierStatus(result);
    const now = new Date().toISOString();

    console.info("Respuesta de FazerCards", {
      orderId,
      httpStatus: response.status,
      hasSupplierId: Boolean(supplierId),
      supplierStatus,
    });

    if (!response.ok) {
      const ambiguous =
        response.status === 408 ||
        response.status === 425 ||
        response.status === 429 ||
        response.status >= 500;

      if (ambiguous || supplierId) {
        const values: Obj = {
          status: "SUPPLIER_PENDING",
          supplier_response: {
            response: result,
            requires_reconciliation: true,
            reason: "NON_SUCCESS_HTTP_RESPONSE",
            saved_at: now,
          },
        };

        if (supplierId) values.supplier_order_id = supplierId;

        await updateOrder(orderId, values);

        return NextResponse.json(
          {
            ok: true,
            orderId,
            supplierOrderId: supplierId || null,
            status: "SUPPLIER_PENDING",
            message:
              "No se pudo confirmar el resultado. No repitas la compra; se requiere reconciliación.",
          },
          { status: 202 }
        );
      }

      await setPending(
        orderId,
        "HTTP_ERROR_WITHOUT_SUPPLIER_ID",
        result
      );

      return NextResponse.json(
        {
          ok: true,
          orderId,
          status: "SUPPLIER_PENDING",
          message:
            "FazerCards respondió con error sin un identificador de orden. La solicitud quedó pendiente de verificación.",
        },
        { status: 202 }
      );
    }

    if (!supplierId) {
      await setPending(
        orderId,
        "MISSING_OR_INVALID_SUPPLIER_ORDER_ID",
        result
      );

      return NextResponse.json(
        {
          ok: true,
          orderId,
          status: "SUPPLIER_PENDING",
          message:
            "FazerCards respondió, pero falta un ID válido. No repitas la compra; requiere verificación.",
        },
        { status: 202 }
      );
    }

    await updateOrder(orderId, {
      supplier_order_id: supplierId,
      supplier_response: result,
    });

    const { data: savedOrder, error: verifyIdError } = await supabaseAdmin
      .from("topup_orders")
      .select("supplier_order_id")
      .eq("id", orderId)
      .maybeSingle();

    if (
      verifyIdError ||
      !savedOrder ||
      savedOrder.supplier_order_id !== supplierId
    ) {
      await setPending(
        orderId,
        "SUPPLIER_ID_SAVE_NOT_VERIFIED",
        result
      );

      return NextResponse.json(
        {
          ok: true,
          orderId,
          supplierOrderId: supplierId,
          status: "SUPPLIER_PENDING",
          message:
            "No se pudo verificar el ID guardado. No repitas la compra.",
        },
        { status: 202 }
      );
    }

    const completedStatuses = [
      "COMPLETED",
      "COMPLETE",
      "SUCCESS",
      "SUCCESSFUL",
      "SUCCEEDED",
      "DELIVERED",
      "DONE",
    ];

    if (completedStatuses.includes(supplierStatus)) {
      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_topup_order",
        { p_supplier_order_id: supplierId }
      );

      if (completeError) {
        console.error("Error completando orden:", completeError);

        await setPending(
          orderId,
          "COMPLETION_RPC_FAILED",
          result
        );

        return NextResponse.json(
          {
            ok: true,
            orderId,
            supplierOrderId: supplierId,
            status: "SUPPLIER_PENDING",
            message:
              "El proveedor informa que terminó, pero la orden requiere reconciliación.",
          },
          { status: 202 }
        );
      }

      const { data: finalOrder, error: finalError } = await supabaseAdmin
        .from("topup_orders")
        .select("status, refunded_at")
        .eq("id", orderId)
        .maybeSingle();

      if (
        finalError ||
        !finalOrder ||
        String(finalOrder.status).toUpperCase() !== "COMPLETED" ||
        finalOrder.refunded_at
      ) {
        return NextResponse.json(
          {
            ok: true,
            orderId,
            supplierOrderId: supplierId,
            status: "SUPPLIER_PENDING",
            message:
              "La finalización necesita verificación mediante reconciliación.",
          },
          { status: 202 }
        );
      }

      return NextResponse.json({
        ok: true,
        orderId,
        supplierOrderId: supplierId,
        status: "COMPLETED",
        message: "Recarga completada correctamente.",
      });
    }

    const failedStatuses = [
      "FAILED",
      "FAILURE",
      "ERROR",
      "REJECTED",
      "DECLINED",
      "DENIED",
      "CANCELLED",
      "CANCELED",
      "REFUND",
      "REFUNDED",
      "REFUND_SUCCESS",
      "REFUND_FAILED",
    ];

    if (failedStatuses.includes(supplierStatus)) {
      await setPending(
        orderId,
        `SUPPLIER_REPORTED_${supplierStatus}`,
        result
      );

      return NextResponse.json(
        {
          ok: true,
          orderId,
          supplierOrderId: supplierId,
          status: "SUPPLIER_PENDING",
          message:
            "El proveedor informó un estado de fallo. Se verificará antes de devolver el saldo.",
        },
        { status: 202 }
      );
    }

    const nextStatus = ["CONFIRMED", "ACCEPTED"].includes(supplierStatus)
      ? "CONFIRMED"
      : supplierStatus === "PROCESSING"
        ? "PROCESSING"
        : "SUPPLIER_PENDING";

    await updateOrder(orderId, {
      status: nextStatus,
      supplier_response: result,
    });

    return NextResponse.json(
      {
        ok: true,
        orderId,
        supplierOrderId: supplierId,
        status: nextStatus,
        message:
          "La orden quedó registrada y se verificará con FazerCards.",
      },
      { status: 202 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("Genshin Impact API error:", {
      orderId,
      providerRequestStarted,
      providerResponseReceived,
      message,
    });

    if (orderId) {
      try {
        if (providerResponseReceived) {
          await setPending(
            orderId,
            "ERROR_AFTER_PROVIDER_RESPONSE",
            providerResponseBody
          );
        } else if (providerRequestStarted) {
          await setPending(
            orderId,
            "PROVIDER_REQUEST_RESULT_UNKNOWN"
          );
        } else {
          await setPending(
            orderId,
            "ERROR_BEFORE_PROVIDER_REQUEST",
            { error: message }
          );
        }
      } catch (saveError) {
        console.error(
          "No se pudo guardar el estado pendiente:",
          orderId,
          saveError
        );
      }

      return NextResponse.json(
        {
          ok: false,
          orderId,
          status: "SUPPLIER_PENDING",
          message:
            "No se pudo confirmar el resultado. No repitas la compra; verifica el estado de la orden.",
        },
        { status: 202 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        status: "ERROR",
        message: "No se pudo iniciar la orden.",
      },
      { status: 500 }
    );
  }
}
