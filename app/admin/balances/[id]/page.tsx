
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

type Client = {
  id: string;
  email: string | null;
  balance: number | string;
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  balances?: Client[];
  client?: {
    id: string;
    balance: number | string;
  };
};

function formatBalance(value: number | string | null | undefined) {
  const balance = Number(value ?? 0);
  return Number.isFinite(balance) ? balance.toFixed(4) : "0.0000";
}

async function parseResponse(response: Response): Promise<ApiResponse> {
  const text = await response.text();

  let data: ApiResponse;

  try {
    data = JSON.parse(text) as ApiResponse;
  } catch {
    console.error(
      "Respuesta inesperada de la API:",
      response.status,
      text.slice(0, 500)
    );

    if (response.status === 404) {
      throw new Error(
        "Error 404: Vercel no encuentra la API de ajuste de saldo. Comprueba app/api/admin/balances/adjust/route.ts y el despliegue."
      );
    }

    throw new Error(
      `El servidor devolvió una respuesta inesperada (HTTP ${response.status}).`
    );
  }

  if (!response.ok || data.ok === false) {
    throw new Error(
      data.error || data.message || `Error del servidor: ${response.status}`
    );
  }

  return data;
}

export default function AdminBalanceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = params.id;

  const [client, setClient] = useState<Client | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">(
    ""
  );

  const loadClient = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      if (
        session.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
      ) {
        router.replace("/");
        return;
      }

      const response = await fetch("/api/admin/balances", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const data = await parseResponse(response);
      const found = data.balances?.find(
        (item) => item.id === clientId
      );

      if (!found) {
        setClient(null);
        setMessage("No se encontró el usuario seleccionado.");
        setMessageType("error");
        return;
      }

      setClient(found);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la información del usuario."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, [clientId, router]);

  useEffect(() => {
    if (clientId) {
      void loadClient();
    }
  }, [clientId, loadClient]);

  async function adjustBalance(action: "ADD" | "SUBTRACT") {
    if (processing || loading || !client) return;

    const normalizedAmount = amount.trim();

    if (!/^\d+(?:\.\d{1,4})?$/.test(normalizedAmount)) {
      setMessage(
        "Introduce una cantidad positiva con un máximo de 4 decimales. Ejemplo: 0.1234."
      );
      setMessageType("error");
      return;
    }

    const numericAmount = Number(normalizedAmount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage("La cantidad debe ser mayor que cero.");
      setMessageType("error");
      return;
    }

    const operation = action === "ADD" ? "agregar" : "restar";

    const confirmed = window.confirm(
      `¿Confirmas ${operation} $${normalizedAmount} ${
        action === "ADD" ? "al saldo de" : "del saldo de"
      } ${client.email || "este usuario"}?`
    );

    if (!confirmed) return;

    setProcessing(true);
    setMessage("");
    setMessageType("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(
          "Tu sesión ha caducado. Inicia sesión nuevamente."
        );
      }

      const response = await fetch("/api/admin/balances/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: client.id,
          amount: normalizedAmount,
          action,
        }),
      });

      const data = await parseResponse(response);

      setMessage(
        data.message ||
          (action === "ADD"
            ? "Saldo agregado correctamente."
            : "Saldo restado correctamente.")
      );
      setMessageType("success");
      setAmount("");

      // El servidor confirma el ajuste antes de mostrar el éxito.
      // Se vuelve a consultar el saldo real de la base de datos.
      await loadClient();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo completar el ajuste."
      );
      setMessageType("error");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="balance-page">
      <div className="balance-container">
        <button
          type="button"
          className="back-button"
          onClick={() => router.push("/admin/balances")}
        >
          <span aria-hidden="true">←</span> Volver a los saldos
        </button>

        <header className="page-header">
          <div className="logo-title">
            🛒STORE <span>GAMING</span>🎮
          </div>
          <p>Panel de administración</p>
        </header>

        <section className="form-card">
          <div className="card-heading">
            <div className="heading-icon">＄</div>
            <div>
              <h1>Administrar saldo</h1>
              <p>Gestiona el saldo de este cliente</p>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Cargando información del cliente...</p>
            </div>
          ) : client ? (
            <>
              <div className="client-card">
                <div className="client-avatar">
                  {(client.email || "C").charAt(0).toUpperCase()}
                </div>

                <div className="client-info">
                  <span className="field-label">CLIENTE</span>
                  <p className="client-email">
                    {client.email || "Sin correo registrado"}
                  </p>
                  <span className="client-status">
                    <span className="status-dot" />
                    Cuenta seleccionada
                  </span>
                </div>
              </div>

              <div className="balance-card">
                <span className="field-label">SALDO ACTUAL</span>
                <div className="balance-amount">
                  <span className="currency">$</span>
                  {formatBalance(client.balance)}
                </div>
                <p>Saldo disponible del cliente</p>
              </div>

              <div className="amount-section">
                <label htmlFor="amount">Cantidad a ajustar</label>

                <div className="amount-input-wrapper">
                  <span className="input-currency">$</span>
                  <input
                    id="amount"
                    className="amount-input"
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    inputMode="decimal"
                    placeholder="0.0000"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    disabled={processing}
                  />
                </div>

                <p className="input-hint">
                  Puedes introducir hasta 4 decimales. Ejemplo: 1.2345.
                </p>
              </div>

              {message && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`message-box ${
                    messageType === "success"
                      ? "message-success"
                      : "message-error"
                  }`}
                >
                  <span className="message-icon">
                    {messageType === "success" ? "✓" : "!"}
                  </span>
                  <span>{message}</span>
                </div>
              )}

              <div className="buttons-row">
                <button
                  type="button"
                  className="add-button"
                  onClick={() => void adjustBalance("ADD")}
                  disabled={processing || !amount.trim()}
                >
                  {processing ? (
                    "Procesando..."
                  ) : (
                    <>
                      <span className="button-symbol">＋</span>
                      Agregar saldo
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="subtract-button"
                  onClick={() => void adjustBalance("SUBTRACT")}
                  disabled={processing || !amount.trim()}
                >
                  {processing ? (
                    "Procesando..."
                  ) : (
                    <>
                      <span className="button-symbol">−</span>
                      Restar saldo
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                className="refresh-button"
                onClick={() => void loadClient()}
                disabled={processing || loading}
              >
                ↻ Actualizar información
              </button>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">!</div>
              <p>{message || "No se encontró el cliente."}</p>
              <button
                type="button"
                className="refresh-button"
                onClick={() => void loadClient()}
              >
                Intentar nuevamente
              </button>
            </div>
          )}
        </section>

        <p className="security-note">
          🔒 Operaciones protegidas para el administrador.
        </p>
      </div>

      <style jsx>{`
        .balance-page {
          min-height: 100vh;
          background: #080808;
          color: #f5f5f5;
          padding: 28px 16px 40px;
        }

        .balance-container {
          width: 100%;
          max-width: 540px;
          margin: 0 auto;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          min-height: 42px;
          padding: 10px 14px;
          color: #d4d4d4;
          background: #111;
          border: 1px solid #292929;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.2s, border-color 0.2s;
        }

        .back-button:hover {
          background: #191919;
          border-color: #e50914;
        }

        .page-header {
          margin: 26px 0 24px;
          text-align: center;
        }

        .logo-title {
          font-size: clamp(22px, 5vw, 30px);
          font-weight: 900;
          letter-spacing: -0.8px;
        }

        .logo-title span {
          color: #e50914;
          text-shadow: 0 0 18px #e5091440;
        }

        .page-header p {
          margin-top: 7px;
          color: #888;
          font-size: 13px;
        }

        .form-card {
          padding: 24px;
          background: linear-gradient(155deg, #151515, #0d0d0d 70%);
          border: 1px solid #292929;
          border-radius: 20px;
          box-shadow: 0 18px 50px #0008;
        }

        .card-heading {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 25px;
        }

        .heading-icon {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border: 1px solid #e5091455;
          border-radius: 14px;
          color: #ff424a;
          background: #e5091415;
          font-size: 26px;
          font-weight: 800;
        }

        .card-heading h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
        }

        .card-heading p {
          margin-top: 5px;
          color: #888;
          font-size: 13px;
        }

        .client-card {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 16px;
          background: #090909;
          border: 1px solid #292929;
          border-radius: 14px;
        }

        .client-avatar {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 50%;
          color: #fff;
          background: linear-gradient(145deg, #e50914, #79050a);
          font-size: 20px;
          font-weight: 800;
        }

        .client-info {
          min-width: 0;
        }

        .field-label {
          display: block;
          color: #858585;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .client-email {
          margin-top: 5px;
          overflow-wrap: anywhere;
          font-size: 14px;
          font-weight: 600;
        }

        .client-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          color: #aaa;
          font-size: 11px;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
        }

        .balance-card {
          margin-top: 16px;
          padding: 21px;
          text-align: center;
          border: 1px solid #1c5135;
          border-radius: 14px;
          background: linear-gradient(140deg, #0d2016, #0b110d);
        }

        .balance-amount {
          display: flex;
          justify-content: center;
          align-items: baseline;
          gap: 3px;
          margin-top: 10px;
          color: #4ade80;
          font-size: clamp(29px, 8vw, 39px);
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .currency {
          font-size: 23px;
          color: #22c55e;
        }

        .balance-card > p {
          margin-top: 7px;
          color: #8b9b8f;
          font-size: 12px;
        }

        .amount-section {
          margin-top: 24px;
        }

        .amount-section label {
          display: block;
          margin-bottom: 10px;
          font-size: 14px;
          font-weight: 700;
        }

        .amount-input-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 15px;
          background: #080808;
          border: 1px solid #333;
          border-radius: 12px;
          transition: border-color 0.2s;
        }

        .amount-input-wrapper:focus-within {
          border-color: #e50914;
          box-shadow: 0 0 0 3px #e5091415;
        }

        .input-currency {
          color: #aaa;
          font-size: 20px;
          font-weight: 700;
        }

        .amount-input {
          width: 100%;
          min-width: 0;
          height: 52px;
          color: #fff;
          background: transparent;
          border: 0;
          outline: none;
          font-size: 18px;
        }

        .amount-input:focus {
          outline: none;
          box-shadow: none;
        }

        .amount-input:disabled {
          opacity: 0.6;
        }

        .input-hint {
          margin-top: 8px;
          color: #777;
          font-size: 11px;
          line-height: 1.5;
        }

        .buttons-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 20px;
        }

        .add-button,
        .subtract-button {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          min-height: 49px;
          padding: 12px 9px;
          border: 0;
          border-radius: 11px;
          color: white;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s, background 0.15s;
        }

        .add-button {
          background: #15803d;
        }

        .add-button:hover {
          background: #16a34a;
        }

        .subtract-button {
          background: #c20d18;
        }

        .subtract-button:hover {
          background: #e50914;
        }

        .add-button:active,
        .subtract-button:active {
          transform: scale(0.98);
        }

        .add-button:disabled,
        .subtract-button:disabled,
        .refresh-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .button-symbol {
          font-size: 19px;
          line-height: 1;
        }

        .refresh-button {
          width: 100%;
          min-height: 44px;
          margin-top: 12px;
          padding: 11px;
          color: #ccc;
          background: #151515;
          border: 1px solid #303030;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .refresh-button:hover {
          background: #202020;
        }

        .message-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-top: 18px;
          padding: 13px;
          border: 1px solid;
          border-radius: 11px;
          font-size: 13px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .message-success {
          color: #86efac;
          background: #052e16;
          border-color: #166534;
        }

        .message-error {
          color: #fca5a5;
          background: #2a0c0c;
          border-color: #7f1d1d;
        }

        .message-icon {
          display: grid;
          place-items: center;
          width: 21px;
          height: 21px;
          flex-shrink: 0;
          border: 1px solid currentColor;
          border-radius: 50%;
          font-weight: 900;
        }

        .loading-state,
        .empty-state {
          padding: 34px 10px;
          text-align: center;
          color: #aaa;
        }

        .loading-state p {
          margin-top: 15px;
          font-size: 13px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          margin: 0 auto;
          border: 3px solid #333;
          border-top-color: #e50914;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        
        .empty-icon {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          margin: 0 auto 14px;
          border: 1px solid #7f1d1d;
          border-radius: 50%;
          color: #fca5a5;
          background: #2a0c0c;
          font-size: 22px;
          font-weight: 900;
        }

        .empty-state p {
          font-size: 13px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .security-note {
          margin-top: 19px;
          color: #666;
          text-align: center;
          font-size: 11px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 420px) {
          .balance-page {
            padding: 20px 12px 32px;
          }

          .form-card {
            padding: 17px;
          }

          .card-heading h1 {
            font-size: 20px;
          }

          .buttons-row {
            grid-template-columns: 1fr;
          }

          .add-button,
          .subtract-button {
            min-height: 48px;
            font-size: 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .spinner {
            animation-duration: 2s;
          }

          .back-button,
          .add-button,
          .subtract-button,
          .refresh-button {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
