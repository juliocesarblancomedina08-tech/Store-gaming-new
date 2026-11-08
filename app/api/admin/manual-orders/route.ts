import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";
const RECEIPT_BUCKET = "manual-payment-receipts";
const SIGNED_URL_SECONDS = 600;

const ALLOWED_METHODS = ["saldo_cup", "transferencia_cup"];

const VALID_STATUSES = [
"all",
"pending",
"approved",
"completed",
"rejected",
"cancelled",
"canceled",
];

function responseError(message: string, status = 400) {
return NextResponse.json(
{ success: false, error: message },
{
status,
headers: { "Cache-Control": "private, no-store" },
}
);
}

async function authenticateAdmin(request: NextRequest) {
const authorization = request.headers.get("authorization");

if (!authorization?.startsWith("Bearer ")) {
return { error: "Sesión no autorizada.", status: 401 };
}

const token = authorization.slice(7).trim();

if (!token) {
return { error: "Token de sesión ausente.", status: 401 };
}

const {
data: { user },
error,
} = await supabaseAdmin.auth.getUser(token);

if (error || !user) {
return {
error: "La sesión no es válida o ha expirado.",
status: 401,
};
}

if (
String(user.email || "").toLowerCase() !==
ADMIN_EMAIL.toLowerCase()
) {
return {
error: "No tienes permisos de administrador.",
status: 403,
};
}

return { user };
}

// GET: consultar solicitudes manuales.
// Si no se especifica estado, devuelve todos los estados.
export async function GET(request: NextRequest) {
try {
const auth = await authenticateAdmin(request);

if ("error" in auth) {
  return responseError(auth.error, auth.status);
}

const { searchParams } = new URL(request.url);

const requestedStatus = (
  searchParams.get("status") || "all"
).trim().toLowerCase();

const method = (
  searchParams.get("method") || "all"
).trim();

if (!VALID_STATUSES.includes(requestedStatus)) {
  return responseError("Filtro de estado no válido.");
}

if (
  method !== "all" &&
  !ALLOWED_METHODS.includes(method)
) {
  return responseError("Filtro de método no válido.");
}

let query = supabaseAdmin
  .from("manual_orders")
  .select("*")
  .order("created_at", { ascending: false });

// Solo filtrar cuando se solicita un estado concreto.
if (requestedStatus !== "all") {
  if (requestedStatus === "cancelled" || requestedStatus === "canceled") {
    query = query.in("status", [
      "cancelled",
      "canceled",
      "rejected",
    ]);
  } else if (requestedStatus === "completed") {
    query = query.in("status", ["completed", "approved"]);
  } else {
    query = query.eq("status", requestedStatus);
  }
}

if (method !== "all") {
  query = query.eq("method", method);
}

const { data: orders, error } = await query;

if (error) {
  console.error("Manual orders GET:", error);

  return responseError(
    "No se pudieron consultar las solicitudes.",
    500
  );
}

const enrichedOrders = await Promise.all(
  (orders || []).map(async (order) => {
    let email: string | null = null;
    let receipt_signed_url: string | null = null;
    let receipt_error: string | null = null;

    // Obtener correo del perfil.
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", order.user_id)
        .maybeSingle();

    if (profileError) {
      console.error("Profile lookup:", profileError);
    }

    email = profile?.email || null;

    // Si el perfil no tiene correo, consultar Auth.
    if (!email && order.user_id) {
      const { data: userData, error: userError } =
        await supabaseAdmin.auth.admin.getUserById(
          order.user_id
        );

      if (userError) {
        console.error("User lookup:", userError);
      }

      email = userData?.user?.email || null;
    }

    // Generar enlace temporal para el comprobante.
    if (
      ALLOWED_METHODS.includes(order.method) &&
      typeof order.receipt_url === "string" &&
      order.receipt_url.trim()
    ) {
      const receiptPath = order.receipt_url.trim();
      const expectedPrefix = `${order.user_id}/${order.id}/`;

      if (!receiptPath.startsWith(expectedPrefix)) {
        receipt_error =
          "La ruta del comprobante no es válida.";
      } else {
        const {
          data: signedData,
          error: signedError,
        } = await supabaseAdmin.storage
          .from(RECEIPT_BUCKET)
          .createSignedUrl(
            receiptPath,
            SIGNED_URL_SECONDS
          );

        if (signedError || !signedData?.signedUrl) {
          console.error("Signed URL:", signedError);

          receipt_error =
            "No se pudo generar el enlace del comprobante.";
        } else {
          receipt_signed_url = signedData.signedUrl;
        }
      }
    }

    const normalizedStatus = String(
      order.status || ""
    ).toLowerCase();

    const isCompleted = [
      "approved",
      "completed",
    ].includes(normalizedStatus);

    const isCancelled = [
      "rejected",
      "cancelled",
      "canceled",
    ].includes(normalizedStatus);

    return {
      ...order,
      status: normalizedStatus,
      email,
      username: null,
      receipt_signed_url,
      receipt_error,
      demo_mode: false,
      can_process:
        ALLOWED_METHODS.includes(order.method) &&
        normalizedStatus === "pending",
      is_completed: isCompleted,
      is_cancelled: isCancelled,
    };
  })
);

const counts = {
  total: enrichedOrders.length,
  pending: enrichedOrders.filter(
    (order) => order.status === "pending"
  ).length,
  completed: enrichedOrders.filter(
    (order) => order.is_completed
  ).length,
  cancelled: enrichedOrders.filter(
    (order) => order.is_cancelled
  ).length,
};

return NextResponse.json(
  {
    success: true,
    orders: enrichedOrders,
    counts,
  },
  {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  }
);

} catch (error) {
console.error("Manual orders GET error:", error);

return responseError(
  "Error interno al consultar las solicitudes.",
  500
);

}
}

// POST: aprobar o rechazar solicitudes.
export async function POST(request: NextRequest) {
try {
const auth = await authenticateAdmin(request);

if ("error" in auth) {
  return responseError(auth.error, auth.status);
}

let body: {
  orderId?: string;
  action?: string;
  adminNote?: string;
};

try {
  body = await request.json();
} catch {
  return responseError(
    "El contenido enviado no es válido."
  );
}

const orderId = String(body.orderId || "").trim();
const action = String(body.action || "").trim();

const adminNote =
  typeof body.adminNote === "string"
    ? body.adminNote.trim().slice(0, 1000)
    : null;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!uuidPattern.test(orderId)) {
  return responseError(
    "Identificador de solicitud no válido."
  );
}

if (!["approve", "reject"].includes(action)) {
  return responseError("Acción no permitida.");
}

const { data: order, error: orderError } =
  await supabaseAdmin
    .from("manual_orders")
    .select("id, user_id, method, status, receipt_url")
    .eq("id", orderId)
    .maybeSingle();

if (orderError) {
  console.error("Manual order lookup:", orderError);

  return responseError(
    "No se pudo verificar la solicitud.",
    500
  );
}

if (!order) {
  return responseError("La solicitud no existe.", 404);
}

if (!ALLOWED_METHODS.includes(order.method)) {
  return responseError(
    "El método de pago no está permitido."
  );
}

if (String(order.status || "").toLowerCase() !== "pending") {
  return responseError(
    "Esta solicitud ya fue procesada."
  );
}

if (action === "approve") {
  if (
    typeof order.receipt_url !== "string" ||
    !order.receipt_url.trim()
  ) {
    return responseError(
      "No se puede aprobar una solicitud sin comprobante."
    );
  }

  const expectedPrefix = `${order.user_id}/${orderId}/`;

  if (!order.receipt_url.startsWith(expectedPrefix)) {
    return responseError(
      "El comprobante no tiene una ruta válida."
    );
  }
}

// La función SQL mantiene la operación atómica y
// evita acreditar dos veces una solicitud.
const { data, error } = await supabaseAdmin.rpc(
  "process_manual_order",
  {
    p_order_id: orderId,
    p_admin_id: auth.user.id,
    p_action: action,
    p_admin_note: adminNote,
  }
);

if (error) {
  console.error("Manual order RPC:", error);

  return responseError(
    error.message ||
      "No se pudo procesar la solicitud.",
    400
  );
}

return NextResponse.json(
  {
    success: true,
    message:
      action === "approve"
        ? "Solicitud aprobada correctamente. Balance acreditado."
        : "Solicitud rechazada correctamente. No se modificó el balance.",
    result: data,
  },
  {
    headers: {
      "Cache-Control": "private, no-store",
    },
  }
);

} catch (error) {
console.error("Manual orders POST error:", error);

return responseError(
  "Error interno al procesar la solicitud.",
  500
);

}
}
