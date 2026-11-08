"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Deposit = {
  id: string;
  user_id: string;
  username?: string | null;
  email?: string | null;
  amount: number;
  currency?: string | null;
  payment_method?: string | null;
  network: "BEP20" | "TRC20" | "TON";
  address: string;
  wallet_address?: string | null;
  tx_hash?: string | null;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "EXPIRED";
  created_at: string;
  confirmed_at?: string | null;
  credited_at?: string | null;
};

type ViewMode = "pending" | "history";

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [view, setView] = useState<ViewMode>("pending");

  async function loadDeposits(selectedView: ViewMode = view) {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/";
        return;
      }

      const response = await fetch(
        `/api/admin/deposits?view=${selectedView}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudieron cargar los depósitos."
        );
      }

      setDeposits(result.deposits || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al cargar los depósitos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeposits(view);
  }, [view]);

  async function processDeposit(
    depositId: string,
    action: "CONFIRM" | "REJECT" | "RECREDIT"
  ) {
    let confirmation = "";

    if (action === "CONFIRM") {
      confirmation =
        "¿Confirmar este depósito?\n\nEl monto será acreditado al saldo del usuario.";
    }

    if (action === "REJECT") {
      confirmation =
        "¿Rechazar este depósito?\n\nEl saldo del usuario NO será modificado.";
    }

    if (action === "RECREDIT") {
      confirmation =
        "¿Acreditar nuevamente este depósito?\n\nEsta acción solo funcionará si el depósito está confirmado pero todavía no tiene el crédito registrado.";
    }

    if (!window.confirm(confirmation)) {
      return;
    }

    setProcessing(depositId);
    setError("");
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/";
        return;
      }

      const response = await fetch(
        "/api/admin/deposits/action",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            depositId,
            action,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudo procesar el depósito."
        );
      }

      if (action === "CONFIRM") {
        setMessage(
          "✓ DEPÓSITO CONFIRMADO Y CRÉDITO ACREDITADO CORRECTAMENTE."
        );
      }

      if (action === "REJECT") {
        setMessage("✓ DEPÓSITO RECHAZADO CORRECTAMENTE.");
      }

      if (action === "RECREDIT") {
        setMessage(
          "✓ CRÉDITO ACREDITADO CORRECTAMENTE AL USUARIO."
        );
      }

      await loadDeposits(view);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al procesar el depósito."
      );
    } finally {
      setProcessing(null);
    }
  }

  function formatDate(date: string) {
    try {
      return new Date(date).toLocaleString("es-ES", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return date;
    }
  }

  function getStatusLabel(status: Deposit["status"]) {
    switch (status) {
      case "PENDING":
        return "⏳ PENDIENTE";

      case "CONFIRMED":
        return "✅ CONFIRMADO";

      case "REJECTED":
        return "❌ RECHAZADO";

      case "EXPIRED":
        return "⌛ EXPIRADO";

      default:
        return status;
    }
  }

  function getStatusClass(status: Deposit["status"]) {
    switch (status) {
      case "CONFIRMED":
        return "admin-confirmed-badge";

      case "REJECTED":
        return "admin-rejected-badge";

      case "EXPIRED":
        return "admin-expired-badge";

      default:
        return "admin-pending-badge";
    }
  }

  return (
    <main className="admin-deposits-page">
      <section className="admin-deposits-container">

        {/* HEADER */}

        <header className="admin-deposits-header">
          <div>
            <div className="admin-deposits-logo">
              STORE 🛒 GAMING
            </div>

            <h1>DEPÓSITOS ADMIN</h1>

            <p>
              Administración de créditos de clientes
            </p>
          </div>
        </header>

        {/* NAVEGACIÓN */}

        <div className="admin-deposits-tabs">

          <button
            type="button"
            className={
              view === "pending"
                ? "admin-deposits-tab active"
                : "admin-deposits-tab"
            }
            onClick={() => {
              setView("pending");
              setMessage("");
              setError("");
            }}
          >
            ⏳ PENDIENTES
          </button>

          <button
            type="button"
            className={
              view === "history"
                ? "admin-deposits-tab active"
                : "admin-deposits-tab"
            }
            onClick={() => {
              setView("history");
              setMessage("");
              setError("");
            }}
          >
            📜 HISTORIAL DE CRÉDITOS
          </button>

        </div>

        {/* MENSAJES */}

        {error && (
          <div className="admin-deposits-error">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="admin-deposits-success">
            {message}
          </div>
        )}

        {/* TÍTULO */}

        <section className="admin-deposits-section">

          <div className="admin-deposits-section-header">

            <div>
              <h2>
                {view === "pending"
                  ? "DEPÓSITOS PENDIENTES"
                  : "HISTORIAL DE CRÉDITOS"}
              </h2>

              <p>
                {view === "pending"
                  ? "Aquí aparecen únicamente los depósitos que todavía necesitan ser procesados."
                  : "Historial completo de depósitos procesados para soporte y revisión."}
              </p>
            </div>

            <button
              type="button"
              className="admin-refresh-button"
              onClick={() => loadDeposits(view)}
              disabled={loading}
            >
              {loading ? "CARGANDO..." : "↻ ACTUALIZAR"}
            </button>

          </div>

          {/* LOADING */}

          {loading ? (
            <div className="admin-deposits-loading">
              <div className="admin-spinner" />
              <p>
                CARGANDO DEPÓSITOS...
              </p>
            </div>
          ) : deposits.length === 0 ? (
            <div className="admin-deposits-empty">

              <div className="admin-empty-icon">
                {view === "pending" ? "✓" : "📜"}
              </div>

              <h3>
                {view === "pending"
                  ? "NO HAY DEPÓSITOS PENDIENTES"
                  : "NO HAY HISTORIAL"}
              </h3>

              <p>
                {view === "pending"
                  ? "Todos los depósitos han sido procesados."
                  : "Todavía no existen depósitos procesados."}
              </p>

            </div>
          ) : (
            <div className="admin-deposits-list">

              {deposits.map((deposit) => {

                const isProcessing =
                  processing === deposit.id;

                const alreadyCredited =
                  !!deposit.credited_at;

                return (
                  <article
                    key={deposit.id}
                    className="admin-deposit-card"
                  >

                    {/* HEADER DE TARJETA */}

                    <div className="admin-deposit-card-header">

                      <div>
                        <small>
                          ID DEL DEPÓSITO
                        </small>

                        <strong>
                          {deposit.id}
                        </strong>
                      </div>

                      <span
                        className={getStatusClass(
                          deposit.status
                        )}
                      >
                        {getStatusLabel(
                          deposit.status
                        )}
                      </span>

                    </div>

                    {/* MONTO */}

                    <div className="admin-deposit-amount">

                      <small>
                        MONTO
                      </small>

                      <strong>
                        ${Number(
                          deposit.amount
                        ).toFixed(2)}
                      </strong>

                      <span>
                        USDT
                      </span>

                    </div>

                    {/* RED */}

                    <div className="admin-deposit-network">

                      <span className="admin-usdt-symbol">
                        ₮
                      </span>

                      <div>
                        <strong>
                          USDT
                        </strong>

                        <span>
                          RED {deposit.network}
                        </span>
                      </div>

                    </div>

                    {/* USUARIO */}

                    <div className="admin-deposit-user">

                      <small>
                        USUARIO
                      </small>

                      <p>
                        {deposit.username
                          ? `@${deposit.username}`
                          : "Usuario no disponible"}
                      </p>

                      {deposit.email && (
                        <span>
                          {deposit.email}
                        </span>
                      )}

                    </div>

                    {/* USER ID */}

                    <div className="admin-deposit-user">

                      <small>
                        ID DEL USUARIO
                      </small>

                      <p>
                        {deposit.user_id}
                      </p>

                    </div>

                    {/* DIRECCIÓN */}

                    <div className="admin-deposit-address">

                      <small>
                        DIRECCIÓN UTILIZADA
                      </small>

                      <p>
                        {deposit.address ||
                          deposit.wallet_address ||
                          "No disponible"}
                      </p>

                    </div>

                    {/* TX HASH */}

                    {deposit.tx_hash && (
                      <div className="admin-deposit-address">

                        <small>
                          TX HASH
                        </small>

                        <p>
                          {deposit.tx_hash}
                        </p>

                      </div>
                    )}

                    {/* FECHA */}

                    <div className="admin-deposit-date">

                      <small>
                        FECHA DEL DEPÓSITO
                      </small>

                      <span>
                        {formatDate(
                          deposit.created_at
                        )}
                      </span>

                    </div>

                    {/* FECHA CONFIRMACIÓN */}

                    {deposit.confirmed_at && (
                      <div className="admin-deposit-date">

                        <small>
                          FECHA DE CONFIRMACIÓN
                        </small>

                        <span>
                          {formatDate(
                            deposit.confirmed_at
                          )}
                        </span>

                      </div>
                    )}

                    {/* ESTADO DE ACREDITACIÓN */}

                    {deposit.status ===
                      "CONFIRMED" && (
                      <div className="admin-credit-status">

                        <small>
                          ESTADO DEL CRÉDITO
                        </small>

                        {alreadyCredited ? (
                          <strong className="admin-credit-done">
                            ✅ CRÉDITO ACREDITADO
                          </strong>
                        ) : (
                          <strong className="admin-credit-missing">
                            ⚠️ CRÉDITO NO ACREDITADO
                          </strong>
                        )}

                        {deposit.credited_at && (
                          <span>
                            {formatDate(
                              deposit.credited_at
                            )}
                          </span>
                        )}

                      </div>
                    )}

                    {/* ACCIONES */}

                    {view === "pending" && (
                      <div className="admin-deposit-actions">

                        <button
                          type="button"
                          className="admin-confirm-deposit"
                          disabled={isProcessing}
                          onClick={() =>
                            processDeposit(
                              deposit.id,
                              "CONFIRM"
                            )
                          }
                        >
                          {isProcessing
                            ? "PROCESANDO..."
                            : "✓ CONFIRMAR"}
                        </button>

                        <button
                          type="button"
                          className="admin-reject-deposit"
                          disabled={isProcessing}
                          onClick={() =>
                            processDeposit(
                              deposit.id,
                              "REJECT"
                            )
                          }
                        >
                          ✕ RECHAZAR
                        </button>

                      </div>
                    )}

                    {/* REACREDITACIÓN */}

                    {view === "history" &&
                      deposit.status ===
                        "CONFIRMED" &&
                      !alreadyCredited && (
                        <div className="admin-deposit-actions">

                          <button
                            type="button"
                            className="admin-recredit-deposit"
                            disabled={isProcessing}
                            onClick={() =>
                              processDeposit(
                                deposit.id,
                                "RECREDIT"
                              )
                            }
                          >
                            {isProcessing
                              ? "ACREDITANDO..."
                              : "💳 ACREDITAR CRÉDITO"}
                          </button>

                        </div>
                      )}

                  </article>
                );
              })}

            </div>
          )}

        </section>

      </section>
    </main>
  );
        }
