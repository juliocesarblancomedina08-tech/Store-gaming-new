"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

type CupSettings = {
  exchange_rate: number;
  transfer_exchange_rate: number;
  transfer_phone: string;
  updated_at: string | null;
};

export default function CupRatesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saldoRate, setSaldoRate] = useState("100");
  const [transferRate, setTransferRate] = useState("100");
  const [settings, setSettings] = useState<CupSettings | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const showMessage = (
    text: string,
    type: "success" | "error"
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  const loadSettings = useCallback(async () => {
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
        (session.user.email || "").toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
      ) {
        router.replace("/home");
        return;
      }

      const response = await fetch("/api/manual-payment/settings", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.settings) {
        throw new Error(
          result.error || "No se pudo cargar la configuración."
        );
      }

      const data: CupSettings = result.settings;

      setSettings(data);
      setSaldoRate(String(data.exchange_rate));
      setTransferRate(String(data.transfer_exchange_rate));
    } catch (error) {
      console.error("Error cargando tasas CUP:", error);
      showMessage(
        error instanceof Error
          ? error.message
          : "Error al cargar las tasas CUP.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function saveRates() {
    if (saving) return;

    const saldo = Number(saldoRate);
    const transfer = Number(transferRate);

    if (
      !Number.isFinite(saldo) ||
      saldo <= 0 ||
      saldo > 100000000
    ) {
      showMessage("Introduce una tasa válida para SALDO CUP.", "error");
      return;
    }

    if (
      !Number.isFinite(transfer) ||
      transfer <= 0 ||
      transfer > 100000000
    ) {
      showMessage(
        "Introduce una tasa válida para TRANSFERENCIA CUP.",
        "error"
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/manual-payment/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          exchange_rate: saldo,
          transfer_exchange_rate: transfer,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "No se pudieron guardar las tasas."
        );
      }

      setSettings(result.settings);
      setSaldoRate(String(result.settings.exchange_rate));
      setTransferRate(
        String(result.settings.transfer_exchange_rate)
      );

      showMessage(
        "Las dos tasas CUP se actualizaron correctamente.",
        "success"
      );
    } catch (error) {
      console.error("Error guardando tasas CUP:", error);
      showMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al guardar.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  function formatDate(date: string | null | undefined) {
    if (!date) return "Sin información";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Sin información";
    }

    return parsed.toLocaleString("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (loading) {
    return (
      <main className="loading-page">
        <div className="loader" />
        <p>Cargando configuración CUP...</p>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 15px;
            background: #08090d;
            color: #aaa;
            font-family: Arial, sans-serif;
          }

          .loader {
            width: 42px;
            height: 42px;
            border: 4px solid #292a34;
            border-top-color: #ff3047;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <button
          className="back-button"
          type="button"
          onClick={() => router.push("/admin")}
        >
          ← VOLVER AL PANEL
        </button>

        <header className="header">
          <div className="logo">💱</div>

          <div>
            <span className="brand">STORE GAMING</span>
            <h1>TASAS CUP</h1>
            <p>Configuración independiente de las tasas CUP.</p>
          </div>
        </header>

        <section className="intro">
          <span className="section-label">CONFIGURACIÓN DE CAMBIO</span>
          <h2>Administrar tasas</h2>
          <p>
            Cada modalidad tiene su propia tasa. Modificar una no cambia
            la otra.
          </p>
        </section>

        {message && (
          <div
            className={`message ${
              messageType === "success" ? "success" : "error"
            }`}
            role="status"
          >
            <span>{messageType === "success" ? "✓" : "!"}</span>
            {message}
          </div>
        )}

        <section className="rates-grid">
          <article className="rate-card">
            <div className="rate-icon">💵</div>

            <span className="rate-label">MODALIDAD 01</span>
            <h3>SALDO CUP</h3>

            <p className="description">
              Tasa correspondiente a la modalidad de saldo CUP.
            </p>

            <label htmlFor="saldo-rate">Tasa de cambio</label>

            <div className="input-wrapper">
              <input
                id="saldo-rate"
                type="number"
                min="0.0001"
                max="100000000"
                step="0.0001"
                inputMode="decimal"
                value={saldoRate}
                onChange={(event) => setSaldoRate(event.target.value)}
                placeholder="Ej. 100"
              />
              <span>CUP</span>
            </div>

            <div className="rate-note">
              <span className="note-dot" />
              Configuración independiente
            </div>
          </article>

          <article className="rate-card transfer-card">
            <div className="rate-icon">📲</div>

            <span className="rate-label">MODALIDAD 02</span>
            <h3>TRANSFERENCIA CUP</h3>

            <p className="description">
              Tasa correspondiente a la modalidad de transferencia.
            </p>

            <label htmlFor="transfer-rate">Tasa de cambio</label>

            <div className="input-wrapper">
              <input
                id="transfer-rate"
                type="number"
                min="0.0001"
                max="100000000"
                step="0.0001"
                inputMode="decimal"
                value={transferRate}
                onChange={(event) =>
                  setTransferRate(event.target.value)
                }
                placeholder="Ej. 100"
              />
              <span>CUP</span>
            </div>

            <div className="rate-note">
              <span className="note-dot" />
              Configuración independiente
            </div>
          </article>
        </section>

        <button
          type="button"
          className="save-button"
          onClick={saveRates}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="button-loader" />
              GUARDANDO...
            </>
          ) : (
            <>✓ GUARDAR LAS DOS TASAS</>
          )}
        </button>

        <section className="info-card">
          <div className="info-icon">🛡️</div>

          <div>
            <h4>Configuración protegida</h4>
            <p>
              Solo la cuenta administrativa autorizada puede modificar
              estas tasas. Los cambios no modifican las tasas de cripto
              ni la configuración de USDT BEP20.
            </p>
          </div>
        </section>

        <section className="last-update">
          <span>ÚLTIMA ACTUALIZACIÓN</span>
          <strong>
            {formatDate(settings?.updated_at)}
          </strong>
        </section>

        <footer>
          <strong>🎮 STORE GAMING</strong>
          <span>Panel de configuración CUP</span>
        </footer>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 25px 16px 40px;
          background:
            radial-gradient(
              ellipse at 50% -10%,
              rgba(255, 48, 71, 0.15),
              transparent 45%
            ),
            #08090d;
          color: #f5f5f7;
          font-family: Arial, Helvetica, sans-serif;
        }

        .container {
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
        }

        .back-button {
          padding: 11px 15px;
          border: 1px solid #373843;
          border-radius: 10px;
          background: #15161d;
          color: #eee;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.7px;
          cursor: pointer;
        }

        .back-button:hover {
          border-color: #ff3047;
          color: #ff6477;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin: 28px 0 34px;
          padding-bottom: 24px;
          border-bottom: 1px solid #292a34;
        }

        .logo {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          flex-shrink: 0;
          border: 1px solid #49303a;
          border-radius: 17px;
          background: #1c171e;
          font-size: 27px;
        }

        .brand {
          color: #ff5267;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .header h1 {
          margin: 5px 0;
          font-size: 25px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .header p {
          margin: 0;
          color: #999aa5;
          font-size: 11px;
          line-height: 1.6;
        }

        .intro {
          margin-bottom: 22px;
        }

        .section-label {
          color: #ff5267;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.7px;
        }

        .intro h2 {
          margin: 9px 0 7px;
          font-size: 23px;
          font-weight: 900;
        }

        .intro p {
          margin: 0;
          color: #999aa5;
          font-size: 12px;
          line-height: 1.7;
        }

        .message {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 17px;
          padding: 13px 14px;
          border: 1px solid;
          border-radius: 11px;
          font-size: 12px;
          line-height: 1.6;
        }

        .message.success {
          border-color: #245a3b;
          background: #10251a;
          color: #a6e4b8;
        }

        .message.error {
          border-color: #71303b;
          background: #2a151a;
          color: #ff9aa7;
        }

        .message > span {
          font-weight: 900;
        }

        .rates-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .rate-card {
          min-width: 0;
          padding: 18px 15px;
          border: 1px solid #30313b;
          border-radius: 16px;
          background: linear-gradient(145deg, #191a23, #111218);
        }

        .transfer-card {
          border-color: #57303b;
          background: linear-gradient(145deg, #21171e, #111218);
        }

        .rate-icon {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          margin-bottom: 17px;
          border: 1px solid #3c3d48;
          border-radius: 13px;
          background: #24252f;
          font-size: 22px;
        }

        .rate-label {
          color: #ff6477;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        .rate-card h3 {
          min-height: 34px;
          margin: 8px 0;
          font-size: 14px;
          line-height: 1.4;
          font-weight: 900;
        }

        .description {
          min-height: 55px;
          margin: 0 0 17px;
          color: #999aa5;
          font-size: 11px;
          line-height: 1.65;
        }

        .rate-card label {
          display: block;
          margin-bottom: 8px;
          color: #d5d5dc;
          font-size: 10px;
          font-weight: 800;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          border: 1px solid #41424e;
          border-radius: 10px;
          background: #0c0d12;
        }

        .input-wrapper:focus-within {
          border-color: #ff5267;
          box-shadow: 0 0 0 3px #ff304718;
        }

        .input-wrapper input {
          width: 100%;
          min-width: 0;
          padding: 13px 0;
          border: 0;
          outline: none;
          background: transparent;
          color: #fff;
          font-size: 17px;
          font-weight: 900;
        }

        .input-wrapper input::-webkit-inner-spin-button,
        .input-wrapper input::-webkit-outer-spin-button {
          margin: 0;
          -webkit-appearance: none;
        }

        .input-wrapper input[type="number"] {
          -moz-appearance: textfield;
        }

        .input-wrapper > span {
          color: #ff6477;
          font-size: 10px;
          font-weight: 900;
        }

        .rate-note {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 15px;
          color: #92939f;
          font-size: 9px;
          line-height: 1.5;
        }

        .note-dot {
          width: 6px;
          height: 6px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #48c774;
        }

        .save-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          min-height: 51px;
          margin-top: 19px;
          border: 1px solid #ff5368;
          border-radius: 12px;
          background: linear-gradient(110deg, #ff3047, #c81734);
          color: white;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1px;
          cursor: pointer;
          box-shadow: 0 7px 23px #ff304725;
          transition: 0.2s ease;
        }

        .save-button:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .save-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .button-loader {
          width: 15px;
          height: 15px;
          border: 2px solid #ffffff55;
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .info-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-top: 20px;
          padding: 16px;
          border: 1px solid #30313b;
          border-radius: 13px;
          background: #14151c;
        }

        .info-icon {
          font-size: 21px;
        }

        .info-card h4 {
          margin: 0 0 6px;
          font-size: 12px;
        }

        .info-card p {
          margin: 0;
          color: #999aa5;
          font-size: 11px;
          line-height: 1.7;
        }

        .last-update {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-top: 22px;
          padding: 15px 0;
          border-bottom: 1px solid #292a34;
        }

        .last-update span {
          color: #ff6477;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        .last-update strong {
          color: #d7d7df;
          font-size: 11px;
          font-weight: 600;
        }

        footer {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-top: 22px;
          color: #858692;
          font-size: 10px;
        }

        footer strong {
          color: #c8c8d0;
          letter-spacing: 1px;
        }

        @media (max-width: 480px) {
          .page {
            padding: 18px 12px 30px;
          }

          .rates-grid {
            grid-template-columns: 1fr;
          }

          .rate-card {
            padding: 17px;
          }

          .rate-card h3,
          .description {
            min-height: 0;
          }

          .description {
            margin-bottom: 15px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .save-button,
          .back-button {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
      }
