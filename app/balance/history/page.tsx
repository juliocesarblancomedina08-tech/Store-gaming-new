
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type MovementType =
  | "DEPOSITO"
  | "COMPRA"
  | "REEMBOLSO";

type Movement = {
  id: string;
  type: MovementType;
  title: string;
  description: string;
  amount: number;
  network?: string;
  status: string;
  createdAt?: string;
};

type DepositRow = {
  id: string;
  amount: number | string;
  network: string | null;
  status: string | null;
};

type TopupOrderRow = {
  id: string;
  game: string;
  offer_name: string;
  retail_price: number | string;
  currency: string | null;
  status: string;
  created_at: string;
};

export default function BalanceHistoryPage() {
  const router = useRouter();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadMovements() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          if (mounted) {
            router.replace("/");
          }
          return;
        }

        const userId = session.user.id;

        const {
          data: depositsData,
          error: depositsError,
        } = await supabase
          .from("deposits")
          .select(`
            id,
            amount,
            network,
            status
          `)
          .eq("user_id", userId);

        if (depositsError) {
          console.error(
            "ERROR CARGANDO DEPÓSITOS:",
            depositsError
          );
        }

        const {
          data: ordersData,
          error: ordersError,
        } = await supabase
          .from("topup_orders")
          .select(`
            id,
            game,
            offer_name,
            retail_price,
            currency,
            status,
            created_at
          `)
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          });

        if (ordersError) {
          console.error(
            "ERROR CARGANDO COMPRAS:",
            ordersError
          );
        }

        const deposits =
          ((depositsData || []) as DepositRow[]).map(
            (deposit): Movement => ({
              id: `deposit-${deposit.id}`,
              type: "DEPOSITO",
              title: "DEPÓSITO",
              description: deposit.network
                ? `USDT • ${deposit.network}`
                : "Ingreso de balance",
              amount: Number(deposit.amount) || 0,
              network: deposit.network || undefined,
              status: deposit.status || "PENDING",
            })
          );

        const orders =
          ((ordersData || []) as TopupOrderRow[]).map(
            (order): Movement => {
              const normalizedStatus =
                String(order.status || "").toUpperCase();

              const isRefunded =
                normalizedStatus === "REFUNDED" ||
                normalizedStatus === "CANCELLED" ||
                normalizedStatus === "CANCELED" ||
                normalizedStatus === "FAILED";

              return {
                id: `order-${order.id}`,
                type: isRefunded
                  ? "REEMBOLSO"
                  : "COMPRA",
                title: isRefunded
                  ? "REEMBOLSO"
                  : "COMPRA",
                description:
                  `${order.game} • ${order.offer_name}`,
                amount: Number(order.retail_price) || 0,
                status: order.status,
                createdAt: order.created_at,
              };
            }
          );

        const allMovements = [
          ...deposits,
          ...orders,
        ];

        const sortedMovements =
          allMovements.sort((a, b) => {
            if (!a.createdAt && !b.createdAt) return 0;
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;

            return (
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
            );
          });

        if (mounted) {
          setMovements(sortedMovements);
          setLoading(false);
        }
      } catch (error) {
        console.error(
          "ERROR INESPERADO CARGANDO HISTORIAL:",
          error
        );

        if (mounted) {
          setMovements([]);
          setLoading(false);
        }
      }
    }

    loadMovements();

    return () => {
      mounted = false;
    };
  }, [router]);

  function formatDate(date?: string) {
    if (!date) return "";

    try {
      return new Date(date).toLocaleString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  function getStatusText(status: string) {
    const normalized = String(status || "").toUpperCase();

    if (
      normalized === "CONFIRMED" ||
      normalized === "COMPLETED" ||
      normalized === "CONFIRMADO" ||
      normalized === "CONFIRMADA" ||
      normalized === "COMPLETADA"
    ) {
      return "CONFIRMADO";
    }

    if (normalized === "REFUNDED") {
      return "REEMBOLSADO";
    }

    if (
      normalized === "FAILED" ||
      normalized === "CANCELLED" ||
      normalized === "CANCELED"
    ) {
      return "CANCELADO";
    }

    if (
      normalized === "SUPPLIER_PENDING" ||
      normalized === "PROCESSING"
    ) {
      return "PROCESANDO";
    }

    return "PENDIENTE";
  }

  function getStatusClass(status: string) {
    const normalized = String(status || "").toUpperCase();

    if (
      normalized === "CONFIRMED" ||
      normalized === "COMPLETED" ||
      normalized === "CONFIRMADO" ||
      normalized === "CONFIRMADA" ||
      normalized === "COMPLETADA"
    ) {
      return "history-status-confirmed";
    }

    if (normalized === "REFUNDED") {
      return "history-status-refunded";
    }

    if (
      normalized === "FAILED" ||
      normalized === "CANCELLED" ||
      normalized === "CANCELED"
    ) {
      return "history-status-cancelled";
    }

    if (
      normalized === "SUPPLIER_PENDING" ||
      normalized === "PROCESSING"
    ) {
      return "history-status-processing";
    }

    return "history-status-pending";
  }

  const totalDeposits = useMemo(() => {
    return movements
      .filter((movement) => movement.type === "DEPOSITO")
      .reduce((sum, movement) => sum + movement.amount, 0);
  }, [movements]);

  const totalPurchases = useMemo(() => {
    return movements
      .filter((movement) => movement.type === "COMPRA")
      .reduce((sum, movement) => sum + movement.amount, 0);
  }, [movements]);

  const totalRefunds = useMemo(() => {
    return movements
      .filter((movement) => movement.type === "REEMBOLSO")
      .reduce((sum, movement) => sum + movement.amount, 0);
  }, [movements]);

  if (loading) {
    return (
      <main className="balance-history-page">
        <div className="balance-history-background" />

        <div className="balance-history-loading">
          <div className="balance-history-loading-logo">
            🛒🎮
          </div>

          <div className="balance-history-spinner" />

          <strong>CARGANDO MOVIMIENTOS...</strong>
          <span>Un momento por favor</span>
        </div>

        <style jsx global>{styles}</style>
      </main>
    );
  }

  return (
    <main className="balance-history-page">
      <div className="balance-history-background" />

      <div className="balance-history-container">

        <header className="balance-history-header">
          <button
            type="button"
            className="balance-history-back-button"
            onClick={() => router.push("/balance")}
            aria-label="Regresar"
          >
            ←
          </button>

          <div className="balance-history-header-title">
            <small>STORE GAMING</small>
            <h1>
              HISTORIAL DE <span>MOVIMIENTOS</span>
            </h1>
          </div>

          <div className="balance-history-header-icon">
            ▣
          </div>
        </header>

        <section className="balance-history-summary">

          <div className="balance-history-summary-card summary-income">
            <div className="history-summary-top">
              <span>↓</span>
              <small>INGRESOS</small>
            </div>

            <strong>+${totalDeposits.toFixed(2)}</strong>
            <small className="summary-description">
              Balance añadido
            </small>
          </div>

          <div className="balance-history-summary-card summary-expense">
            <div className="history-summary-top">
              <span>↑</span>
              <small>COMPRAS</small>
            </div>

            <strong>-${totalPurchases.toFixed(2)}</strong>
            <small className="summary-description">
              Balance utilizado
            </small>
          </div>

          <div className="balance-history-summary-card summary-refund">
            <div className="history-summary-top">
              <span>↩</span>
              <small>REEMBOLSOS</small>
            </div>

            <strong>+${totalRefunds.toFixed(2)}</strong>
            <small className="summary-description">
              Balance devuelto
            </small>
          </div>

        </section>

        <section className="balance-history-title-section">
          <div className="history-list-heading">
            <span className="history-heading-icon">▣</span>

            <div>
              <strong>TODOS LOS MOVIMIENTOS</strong>
              <small>Ingresos y descuentos de tu billetera</small>
            </div>
          </div>

          <span className="balance-history-count">
            {movements.length}
          </span>
        </section>

        <section className="balance-history-list">

          {movements.length === 0 ? (
            <div className="balance-history-empty">
              <div className="balance-history-empty-icon">
                ▣
              </div>

              <strong>NO HAY MOVIMIENTOS</strong>

              <p>
                Todavía no tienes ingresos ni compras registradas.
              </p>

              <button
                type="button"
                onClick={() => router.push("/balance")}
              >
                ← VOLVER A LA BILLETERA
              </button>
            </div>
          ) : (
            movements.map((movement) => {
              const isDeposit =
                movement.type === "DEPOSITO";

              const isRefund =
                movement.type === "REEMBOLSO";

              const isPositive =
                isDeposit || isRefund;

              return (
                <article
                  key={movement.id}
                  className={`balance-movement-card ${
                    isDeposit
                      ? "movement-deposit"
                      : isRefund
                      ? "movement-refund"
                      : "movement-purchase"
                  }`}
                >
                  <div className="balance-movement-icon">
                    {isDeposit ? (
                      <span>↓</span>
                    ) : isRefund ? (
                      <span>↩</span>
                    ) : (
                      <span>↑</span>
                    )}
                  </div>

                  <div className="balance-movement-info">
                    <strong>{movement.title}</strong>

                    <span>{movement.description}</span>

                    {movement.network && (
                      <small>RED: {movement.network}</small>
                    )}

                    {movement.createdAt && (
                      <small className="movement-date">
                        ◷ {formatDate(movement.createdAt)}
                      </small>
                    )}
                  </div>

                  <div className="balance-movement-right">
                    <strong
                      className={
                        isPositive
                          ? "movement-positive"
                          : "movement-negative"
                      }
                    >
                      {isPositive ? "+" : "-"}$
                      {movement.amount.toFixed(2)}
                    </strong>

                    <span
                      className={getStatusClass(movement.status)}
                    >
                      {getStatusText(movement.status)}
                    </span>
                  </div>
                </article>
              );
            })
          )}

        </section>

        <section className="balance-history-security">
          <div className="balance-history-security-icon">
            🛡️
          </div>

          <div>
            <strong>MOVIMIENTOS DE TU BILLETERA</strong>

            <p>
              Consulta los ingresos realizados y el balance
              utilizado en tus compras de STORE GAMING.
            </p>
          </div>
        </section>

        <button
          type="button"
          className="balance-history-return-button"
          onClick={() => router.push("/balance")}
        >
          ← REGRESAR A MI BILLETERA
        </button>

      </div>

      <style jsx global>{styles}</style>
    </main>
  );
}

const styles = `
.balance-history-page {
  min-height: 100vh;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: #070b10;
  color: #f4f7fb;
  padding: 30px 18px 50px;
  font-family: Arial, Helvetica, sans-serif;
}

.balance-history-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 15% 5%, rgba(0, 255, 140, .10), transparent 35%),
    radial-gradient(ellipse at 90% 35%, rgba(0, 140, 255, .08), transparent 35%),
    linear-gradient(145deg, #080d13, #05080d 65%, #09110f);
}

.balance-history-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}

.balance-history-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 30px;
}

.balance-history-back-button {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 14px;
  color: #fff;
  background: rgba(255,255,255,.055);
  font-size: 25px;
  cursor: pointer;
  transition: .2s;
}

.balance-history-back-button:hover {
  background: rgba(0,255,140,.13);
  border-color: rgba(0,255,140,.4);
}

.balance-history-header-title {
  flex: 1;
  min-width: 0;
}

.balance-history-header-title small {
  color: #00ed91;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 3px;
}

.balance-history-header-title h1 {
  margin: 6px 0 0;
  font-size: clamp(17px, 3vw, 25px);
  font-weight: 950;
  letter-spacing: .5px;
}

.balance-history-header-title h1 span {
  color: #00e98c;
}

.balance-history-header-icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(0,255,140,.2);
  border-radius: 14px;
  color: #00ed91;
  background: rgba(0,255,140,.07);
  font-size: 23px;
}

.balance-history-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 13px;
  margin-bottom: 34px;
}

.balance-history-summary-card {
  min-width: 0;
  padding: 19px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255,255,255,.065), rgba(255,255,255,.025));
  box-shadow: 0 12px 30px rgba(0,0,0,.16);
}

.history-summary-top {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 16px;
}

.history-summary-top span {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  font-size: 18px;
  font-weight: 900;
}

.history-summary-top small {
  color: #aab5c2;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
}

.balance-history-summary-card > strong {
  display: block;
  overflow-wrap: anywhere;
  font-size: clamp(17px, 2.5vw, 25px);
  font-weight: 950;
}

.summary-description {
  display: block;
  margin-top: 7px;
  color: #87929e;
  font-size: 11px;
}

.summary-income {
  border-color: rgba(0,238,135,.20);
}

.summary-income .history-summary-top span {
  color: #00f092;
  background: rgba(0,238,135,.12);
}

.summary-income > strong {
  color: #00f092;
}

.summary-expense {
  border-color: rgba(255,75,90,.20);
}

.summary-expense .history-summary-top span {
  color: #ff5968;
  background: rgba(255,75,90,.12);
}

.summary-expense > strong {
  color: #ff6573;
}

.summary-refund {
  border-color: rgba(0,190,255,.20);
}

.summary-refund .history-summary-top span {
  color: #43c9ff;
  background: rgba(0,190,255,.12);
}

.summary-refund > strong {
  color: #43c9ff;
}

.balance-history-title-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
}

.history-list-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-heading-icon {
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #00ed91;
  background: rgba(0,237,145,.10);
  font-size: 20px;
}

.history-list-heading strong {
  display: block;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: .5px;
}

.history-list-heading small {
  display: block;
  margin-top: 5px;
  color: #87929e;
  font-size: 11px;
}

.balance-history-count {
  min-width: 32px;
  height: 30px;
  display: grid;
  place-items: center;
  padding: 0 9px;
  border: 1px solid rgba(0,237,145,.20);
  border-radius: 10px;
  color: #00ed91;
  background: rgba(0,237,145,.07);
  font-size: 12px;
  font-weight: 900;
}

.balance-history-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.balance-movement-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 17px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 17px;
  background: linear-gradient(110deg, rgba(255,255,255,.055), rgba(255,255,255,.025));
  transition: transform .2s, border-color .2s, background .2s;
}

.balance-movement-card:hover {
  transform: translateY(-2px);
}

.movement-deposit {
  border-left: 3px solid #00e98c;
}

.movement-deposit:hover {
  border-color: rgba(0,233,140,.45);
  background: rgba(0,233,140,.055);
}

.movement-purchase {
  border-left: 3px solid #ff5968;
}

.movement-purchase:hover {
  border-color: rgba(255,89,104,.45);
  background: rgba(255,89,104,.055);
}

.movement-refund {
  border-left: 3px solid #43c9ff;
}

.movement-refund:hover {
  border-color: rgba(67,201,255,.45);
  background: rgba(67,201,255,.055);
}

.balance-movement-icon {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 14px;
  font-size: 25px;
  font-weight: 900;
}

.movement-deposit .balance-movement-icon {
  color: #00f092;
  background: rgba(0,240,146,.12);
}

.movement-purchase .balance-movement-icon {
  color: #ff6573;
  background: rgba(255,89,104,.12);
}

.movement-refund .balance-movement-icon {
  color: #43c9ff;
  background: rgba(67,201,255,.12);
}

.balance-movement-info {
  flex: 1;
  min-width: 0;
}

.balance-movement-info > strong {
  display: block;
  margin-bottom: 5px;
  color: #f4f7fb;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: .5px;
}

.balance-movement-info > span {
  display: block;
  overflow-wrap: anywhere;
  color: #aeb9c5;
  font-size: 12px;
}

.balance-movement-info > small {
  display: block;
  margin-top: 6px;
  color: #7e8a97;
  font-size: 10px;
}

.balance-movement-info .movement-date {
  color: #8995a2;
}

.balance-movement-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.balance-movement-right > strong {
  font-size: clamp(15px, 2vw, 19px);
  font-weight: 950;
  white-space: nowrap;
}

.movement-positive {
  color: #00f092;
}

.movement-negative {
  color: #ff6573;
}

.history-status-confirmed,
.history-status-refunded,
.history-status-cancelled,
.history-status-pending,
.history-status-processing {
  padding: 5px 8px;
  border-radius: 7px;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .4px;
  white-space: nowrap;
}

.history-status-confirmed {
  color: #00ef91;
  background: rgba(0,239,145,.12);
}

.history-status-refunded {
  color: #43c9ff;
  background: rgba(67,201,255,.12);
}

.history-status-cancelled {
  color: #ff6573;
  background: rgba(255,89,104,.12);
}

.history-status-pending {
  color: #ffc45b;
  background: rgba(255,196,91,.12);
}

.history-status-processing {
  color: #65baff;
  background: rgba(101,186,255,.12);
}

.balance-history-empty {
  padding: 55px 20px;
  text-align: center;
  border: 1px dashed rgba(255,255,255,.14);
  border-radius: 19px;
  background: rgba(255,255,255,.025);
}

.balance-history-empty-icon {
  width: 65px;
  height: 65px;
  display: grid;
  place-items: center;
  margin: 0 auto 18px;
  border-radius: 20px;
  color: #00ed91;
  background: rgba(0,237,145,.10);
  font-size: 30px;
}

.balance-history-empty > strong {
  font-size: 14px;
  font-weight: 950;
}

.balance-history-empty p {
  margin: 9px 0 20px;
  color: #929eaa;
  font-size: 12px;
}

.balance-history-empty button {
  padding: 12px 17px;
  border: 1px solid rgba(0,237,145,.3);
  border-radius: 10px;
  color: #00ed91;
  background: rgba(0,237,145,.08);
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
}

.balance-history-security {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  margin-top: 25px;
  padding: 17px;
  border: 1px solid rgba(0,237,145,.14);
  border-radius: 16px;
  background: rgba(0,237,145,.045);
}

.balance-history-security-icon {
  font-size: 25px;
}

.balance-history-security strong {
  display: block;
  color: #dce8e2;
  font-size: 11px;
  font-weight: 950;
}

.balance-history-security p {
  margin: 7px 0 0;
  color: #8e9c97;
  font-size: 11px;
  line-height: 1.6;
}

.balance-history-return-button {
  width: 100%;
  margin-top: 20px;
  padding: 16px;
  border: 1px solid rgba(0,237,145,.25);
  border-radius: 13px;
  color: #00ed91;
  background: rgba(0,237,145,.07);
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .5px;
  cursor: pointer;
  transition: .2s;
}

.balance-history-return-button:hover {
  background: rgba(0,237,145,.15);
  border-color: #00ed91;
}

.balance-history-loading {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.balance-history-loading-logo {
  font-size: 43px;
}

.balance-history-loading strong {
  color: #00ed91;
  font-size: 13px;
  letter-spacing: 1px;
}

.balance-history-loading > span {
  color: #84919d;
  font-size: 12px;
}

.balance-history-spinner {
  width: 34px;
  height: 34px;
  border: 3px solid rgba(255,255,255,.10);
  border-top-color: #00ed91;
  border-radius: 50%;
  animation: history-spin .8s linear infinite;
}

@keyframes history-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 600px) {
  .balance-history-page {
    padding: 20px 12px 35px;
  }

  .balance-history-header {
    gap: 10px;
    margin-bottom: 23px;
  }

  .balance-history-back-button,
  .balance-history-header-icon {
    width: 40px;
    height: 40px;
  }

  .balance-history-summary {
    gap: 8px;
  }

  .balance-history-summary-card {
    padding: 12px 9px;
    border-radius: 13px;
  }

  .history-summary-top {
    gap: 5px;
    margin-bottom: 12px;
  }

  .history-summary-top span {
    width: 23px;
    height: 23px;
    font-size: 15px;
  }

  .history-summary-top small {
    font-size: 8px;
    letter-spacing: .4px;
  }

  .summary-description {
    font-size: 9px;
  }

  .balance-movement-card {
    gap: 10px;
    padding: 13px 10px;
  }

  .balance-movement-icon {
    width: 39px;
    height: 39px;
    border-radius: 12px;
    font-size: 21px;
  }

  .balance-movement-info > strong {
    font-size: 11px;
  }

  .balance-movement-info > span {
    font-size: 10px;
  }

  .balance-movement-info > small {
    font-size: 9px;
  }

  .balance-movement-right > strong {
    font-size: 14px;
  }

  .history-status-confirmed,
  .history-status-refunded,
  .history-status-cancelled,
  .history-status-pending,
  .history-status-processing {
    padding: 4px 5px;
    font-size: 8px;
  }
}

@media (max-width: 370px) {
  .balance-history-summary-card {
    padding: 10px 7px;
  }

  .balance-movement-card {
    gap: 7px;
    padding: 11px 8px;
  }

  .balance-movement-icon {
    width: 34px;
    height: 34px;
  }

  .balance-movement-right > strong {
    font-size: 12px;
  }
}
`;
