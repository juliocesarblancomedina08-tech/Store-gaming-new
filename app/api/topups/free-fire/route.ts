
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
const CATEGORY_ID = "free_fire_latam";

const VIP_MARKUP = 0.08;

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

const FREE_FIRE_OFFERS = [
  { id: "ff-110", supplierOfferId: "110_diamonds", name: "110 Diamonds", price: 0.78, supplierPrice: 0.6871 },
  { id: "ff-341", supplierOfferId: "341_diamonds", name: "341 Diamonds", price: 2.2094, supplierPrice: 2.0594 },
  { id: "ff-572", supplierOfferId: "572_diamonds", name: "572 Diamonds", price: 3.6429, supplierPrice: 3.4929 },
  { id: "ff-1166", supplierOfferId: "1166_diamonds", name: "1166 Diamonds", price: 6.631, supplierPrice: 6.481 },
  { id: "ff-2398", supplierOfferId: "2398_diamonds", name: "2398 Diamonds", price: 13.011, supplierPrice: 12.861 },
  { id: "ff-6160", supplierOfferId: "6160_diamantes", name: "6160 Diamonds", price: 32.8881, supplierPrice: 32.7381 },
  { id: "ff-210", supplierOfferId: "210_diamantes", name: "210 Diamonds", price: 2.0945, supplierPrice: 1.9445 },
  { id: "ff-530", supplierOfferId: "530_diamantes", name: "530 Diamonds", price: 5.0162, supplierPrice: 4.8662 },
  { id: "ff-1080", supplierOfferId: "1080_diamantes", name: "1080 Diamonds", price: 9.8724, supplierPrice: 9.7224 },
  { id: "ff-2200", supplierOfferId: "2200_diamantes", name: "2200 Diamonds", price: 19.5948, supplierPrice: 19.4448 },
  { id: "ff-weekly-lite", supplierOfferId: "weekly_lite", name: "Semanal Lite", price: 0.6538, supplierPrice: 0.5038 },
  { id: "ff-weekly-membership", supplierOfferId: "membresía_semanal", name: "Membresía semanal", price: 2.3282, supplierPrice: 2.1782 },
  { id: "ff-elite-pass", supplierOfferId: "booyah_pass", name: "Booyah Pass", price: 4.0138, supplierPrice: 3.8638 },
  { id: "ff-monthly-membership", supplierOfferId: "membresía_mensual", name: "Membresía mensual", price: 10.632, supplierPrice: 10.482 },
  { id: "ff-100", supplierOfferId: "100_diamantes", name: "100 Diamonds", price: 1.1273, supplierPrice: 0.9773 },
] as const;

type Obj = Record<string, any>;

function isObject(value: unknown): value is Obj {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function findOffer(id: string) {
  return FREE_FIRE_OFFERS.find(
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

  if (response !== undefined) {
    supplierResponse.response = response;
  }

  await updateOrder(orderId, {
    status: "SUPPLIER_PENDING",
    supplier_response: supplierResponse,
  });
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

    if (!offerId || !playerId) {
      return NextResponse.json(
        {
          ok: false,
          error: !offerId
            ? "Falta seleccionar una oferta."
            : "Debe introducir el ID del jugador.",
        },
        { status: 400 }
      );
    }

    const offer = findOffer(offerId);

    if (!offer) {
      return NextResponse.json(
        { ok: false, error: "La oferta de Free Fire no existe en STORE GAMING." },
        { status: 400 }
      );
    }

    // Verificar membresía VIP.
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("vip_expires_at")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error("Error verificando VIP:", profileError);

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo verificar tu membresía VIP.",
        },
        { status: 500 }
      );
    }

    const vipExpiresAt = profile?.vip_expires_at
      ? new Date(profile.vip_expires_at).getTime()
      : 0;

    const vipActive =
      Number.isFinite(vipExpiresAt) &&
      vipExpiresAt > Date.now();

    // Calcular precio.
    const supplierPrice = Number(offer.supplierPrice);

    const retailPrice = vipActive
      ? Number((supplierPrice + VIP_MARKUP).toFixed(4))
      : Number(offer.price);

    if (
      !Number.isFinite(supplierPrice) ||
      !Number.isFinite(retailPrice) ||
      supplierPrice <= 0 ||
      retailPrice <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo calcular correctamente el precio.",
        },
        { status: 500 }
      );
    }

    console.info("Precio calculado para Free Fire", {
      userId: user.id,
      offerId: offer.id,
      vipActive,
      supplierPrice,
      retailPrice,
    });

    // Crear pedido en topup_orders y reservar saldo.
    const { data: reservation, error: reservationError } =
      await supabaseAdmin.rpc("create_topup_order_and_reserve_balance", {
        p_user_id: user.id,
        p_username:
          user.user_metadata?.username ||
          user.user_metadata?.name ||
          user.email ||
          "Cliente",
        p_email: user.email ?? null,
        p_game: "Free Fire LATAM",
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
          supplier_offer_id: offer.supplierOfferId,
          vip_active: vipActive,
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
      fields: { player_id: playerId },
    };

    const headers: Record<string, string> = {
      "X-API-Key": FAZER_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (providerOrigin) {
      headers.Origin = providerOrigin;
    }

    console.info("Enviando nueva orden de Free Fire a FazerCards", {
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

        if (supplierId) {
          values.supplier_order_id = supplierId;
        }

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

    // Guardar ID de FazerCards en la tabla central.
    await updateOrder(orderId, {
      supplier_order_id: supplierId,
      supplier_response: result,
    });

    const { data: savedOrder, error: verifyIdError } =
      await supabaseAdmin
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
      // FINALIZACIÓN UNIVERSAL POR ID INTERNO DE topup_orders.
      const { error: completeError } = await supabaseAdmin.rpc(
        "store_gaming_complete_order_by_id",
        { p_order_id: orderId }
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

      const { data: finalOrder, error: finalError } =
        await supabaseAdmin
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

    console.error("Free Fire API error:", {
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
