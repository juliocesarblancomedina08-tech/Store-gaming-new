
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { isAdminUser } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

function getBearerToken(request: NextRequest) {
  const authorization =
    request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function toAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeStatus(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function getDate(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return jsonError("No autorizado.", 401);
    }

    const authorized = await isAdminUser(token);

    if (!authorized) {
      return jsonError("Acceso denegado.", 403);
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    /*
     * LISTA DE USUARIOS
     */
    if (!userId) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id,email,balance")
        .order("email", { ascending: true });

      if (error) {
        console.error("ERROR CARGANDO USUARIOS:", error);
        return jsonError(
          "No se pudieron cargar los usuarios.",
          500
        );
      }

      return NextResponse.json({
        ok: true,
        users: (data || []).map((user) => ({
          id: user.id,
          email: user.email || "Sin correo",
          balance: toAmount(user.balance),
        })),
      });
    }

    /*
     * PERFIL DEL USUARIO
     */
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id,email,balance")
        .eq("id", userId)
        .maybeSingle();

    if (profileError) {
      console.error("ERROR CARGANDO PERFIL:", profileError);
      return jsonError("No se pudo cargar el usuario.", 500);
    }

    if (!profile) {
      return jsonError("No se encontró el usuario.", 404);
    }

    /*
     * MOVIMIENTOS DE SALDO
     */
    const { data: transactions, error: transactionsError } =
      await supabaseAdmin
        .from("transactions")
        .select(
          "id,user_id,type,amount,description,created_at,order_id,deposit_id"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10000);

    if (transactionsError) {
      console.error(
        "ERROR CARGANDO TRANSACTIONS:",
        transactionsError
      );

      return jsonError(
        "No se pudieron cargar los movimientos de saldo.",
        500
      );
    }

    /*
     * DEPÓSITOS
     *
     * Solo incluimos depósitos que tengan credited_at.
     * Los depósitos pendientes o expirados no son ingresos
     * acreditados al saldo.
     */
    const { data: deposits, error: depositsError } =
      await supabaseAdmin
        .from("deposits")
        .select(
          "id,user_id,amount,currency,payment_method,status,tx_hash,created_at,confirmed_at,credited_at"
        )
        .eq("user_id", userId)
        .not("credited_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(10000);

    if (depositsError) {
      console.error("ERROR CARGANDO DEPÓSITOS:", depositsError);

      return jsonError(
        "No se pudieron cargar los depósitos.",
        500
      );
    }

    /*
     * PEDIDOS
     *
     * Usamos únicamente topup_orders.
     * store_gaming_orders contiene los mismos pedidos e IDs,
     * por lo que consultar ambas tablas duplicaría el historial.
     */
    const { data: orders, error: ordersError } =
      await supabaseAdmin
        .from("topup_orders")
        .select(
          "id,user_id,game,offer_name,retail_price,currency,status,refunded_at,completed_at,failed_at,created_at,updated_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10000);

    if (ordersError) {
      console.error("ERROR CARGANDO PEDIDOS:", ordersError);

      return jsonError(
        "No se pudieron cargar las compras.",
        500
      );
    }

    type Movement = {
      id: string;
      kind: "ADD" | "SUBTRACT" | "PURCHASE";
      amount: number;
      description: string;
      product: string;
      date: string | null;
      status: string;
    };

    const movements: Movement[] = [];

    /*
     * AJUSTES Y REEMBOLSOS REGISTRADOS
     */
    for (const transaction of transactions || []) {
      const amount = toAmount(transaction.amount);

      if (amount <= 0) continue;

      const type = normalizeStatus(transaction.type);

      if (type === "ADMIN_ADD") {
        movements.push({
          id: `transaction-${transaction.id}`,
          kind: "ADD",
          amount,
          description:
            transaction.description || "Ingreso manual de saldo",
          product: "",
          date: getDate(transaction.created_at),
          status: "CONFIRMED",
        });

        continue;
      }

      if (type === "ADMIN_SUBTRACT") {
        movements.push({
          id: `transaction-${transaction.id}`,
          kind: "SUBTRACT",
          amount,
          description:
            transaction.description || "Descuento manual de saldo",
          product: "",
          date: getDate(transaction.created_at),
          status: "CONFIRMED",
        });

        continue;
      }

      if (type === "REFUND") {
        movements.push({
          id: `transaction-${transaction.id}`,
          kind: "ADD",
          amount,
          description:
            transaction.description || "Reembolso de compra",
          product: transaction.order_id
            ? `Pedido ${transaction.order_id}`
            : "",
          date: getDate(transaction.created_at),
          status: "REFUNDED",
        });
      }
    }

    /*
     * DEPÓSITOS ACREDITADOS
     */
    for (const deposit of deposits || []) {
      const amount = toAmount(deposit.amount);

      if (amount <= 0 || !deposit.credited_at) continue;

      movements.push({
        id: `deposit-${deposit.id}`,
        kind: "ADD",
        amount,
        description: [
          "Depósito acreditado",
          deposit.payment_method
            ? `Método: ${deposit.payment_method}`
            : "",
          deposit.currency
            ? `Moneda: ${deposit.currency}`
            : "",
          deposit.tx_hash
            ? `Referencia: ${deposit.tx_hash}`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
        product: "",
        date: getDate(
          deposit.credited_at,
          deposit.confirmed_at,
          deposit.created_at
        ),
        status: normalizeStatus(deposit.status),
      });
    }

    /*
     * COMPRAS
     *
     * Conservamos el historial de pedidos, incluidos los
     * reembolsados. Los fallidos y cancelados no cuentan como
     * gasto en el resumen.
     */
    for (const order of orders || []) {
      const amount = toAmount(order.retail_price);

      if (amount <= 0) continue;

      const status = normalizeStatus(order.status);

      movements.push({
        id: `order-${order.id}`,
        kind: "PURCHASE",
        amount,
        description:
          status === "REFUNDED" || order.refunded_at
            ? "Compra reembolsada"
            : status === "FAILED"
              ? "Pedido fallido"
              : status === "CANCELLED" ||
                  status === "CANCELED"
                ? "Pedido cancelado"
                : "Compra",
        product: order.offer_name || order.game || "Producto",
        date: getDate(
          order.created_at,
          order.completed_at,
          order.updated_at
        ),
        status:
          order.refunded_at && status !== "REFUNDED"
            ? "REFUNDED"
            : status,
      });
    }

    /*
     * MÁS RECIENTES PRIMERO
     */
    movements.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;

      return dateB - dateA;
    });

    /*
     * RESUMEN
     *
     * AGREGADO: depósitos acreditados, ajustes positivos y
     * reembolsos registrados en transactions.
     *
     * GASTADO: compras no fallidas, no canceladas y no
     * reembolsadas, más descuentos manuales.
     *
     * BALANCE ACTUAL: saldo guardado en profiles.
     */
    const totalAdded = movements
      .filter((movement) => movement.kind === "ADD")
      .reduce((total, movement) => total + movement.amount, 0);

    const totalSpent = movements
      .filter((movement) => {
        if (movement.kind === "SUBTRACT") return true;
        if (movement.kind !== "PURCHASE") return false;

        const status = normalizeStatus(movement.status);

        return (
          status !== "FAILED" &&
          status !== "CANCELLED" &&
          status !== "CANCELED" &&
          status !== "REFUNDED"
        );
      })
      .reduce((total, movement) => total + movement.amount, 0);

    const currentBalance = toAmount(profile.balance);

    return NextResponse.json({
      ok: true,

      user: {
        id: profile.id,
        email: profile.email || "Sin correo",
        balance: currentBalance,
      },

      summary: {
        totalAdded,
        totalSpent,
        balance: currentBalance,

        // Alias para compatibilidad con versiones anteriores.
        added: totalAdded,
        spent: totalSpent,
      },

      movements,
    });
  } catch (error) {
    console.error("ERROR API ADMIN MOVEMENTS:", error);

    return jsonError("Error interno del servidor.", 500);
  }
}
