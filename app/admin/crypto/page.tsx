"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

type CryptoSettings = {
  id: number;
  buy_cup_rate: number | string | null;
  buy_mobile_rate: number | string | null;
  sell_cup_rate: number | string | null;
  sell_mobile_rate: number | string | null;
  bep20_wallet: string | null;
  payment_instructions: string | null;
  updated_at?: string | null;
};

type RateForm = {
  buy_cup_rate: string;
  buy_mobile_rate: string;
  sell_cup_rate: string;
  sell_mobile_rate: string;
  bep20_wallet: string;
  payment_instructions: string;
};

const EMPTY_FORM: RateForm = {
  buy_cup_rate: "",
  buy_mobile_rate: "",
  sell_cup_rate: "",
  sell_mobile_rate: "",
  bep20_wallet: "",
  payment_instructions: "",
};

function toInputValue(value: number | string | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

export default function AdminCryptoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [form, setForm] = useState<RateForm>(EMPTY_FORM);
  const [lastUpdated, setLastUpdated] = useState("");
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("crypto_settings")
      .select(
        "id, buy_cup_rate, buy_mobile_rate, sell_cup_rate, sell_mobile_rate, bep20_wallet, payment_instructions, updated_at"
      )
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const settings = data as CryptoSettings;

      setForm({
        buy_cup_rate: toInputValue(settings.buy_cup_rate),
        buy_mobile_rate: toInputValue(settings.buy_mobile_rate),
        sell_cup_rate: toInputValue(settings.sell_cup_rate),
        sell_mobile_rate: toInputValue(settings.sell_mobile_rate),
        bep20_wallet: settings.bep20_wallet ?? "",
        payment_instructions: settings.payment_instructions ?? "",
      });

      setLastUpdated(settings.updated_at ?? "");
    } else {
      setForm(EMPTY_FORM);
      setLastUpdated("");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (!session) {
          router.replace("/login");
          return;
        }

        if (
          session.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
        ) {
          router.replace("/home");
          return;
        }

        if (!mounted) return;
        setAuthorized(true);

        const { data, error: settingsError } = await supabase
          .from("crypto_settings")
          .select(
            "id, buy_cup_rate, buy_mobile_rate, sell_cup_rate, sell_mobile_rate, bep20_wallet, payment_instructions, updated_at"
          )
          .eq("id", 1)
          .maybeSingle();

        if (settingsError) throw settingsError;

        if (!mounted) return;

        if (data) {
          const settings = data as CryptoSettings;

          setForm({
            buy_cup_rate: toInputValue(settings.buy_cup_rate),
            buy_mobile_rate: toInputValue(settings.buy_mobile_rate),
            sell_cup_rate: toInputValue(settings.sell_cup_rate),
            sell_mobile_rate: toInputValue(settings.sell_mobile_rate),
            bep20_wallet: settings.bep20_wallet ?? "",
            payment_instructions: settings.payment_instructions ?? "",
          });

          setLastUpdated(settings.updated_at ?? "");
        }
      } catch (error) {
        console.error("Error cargando las tasas de cripto:", error);

        if (mounted) {
          setNotice({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudieron cargar las tasas.",
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [router]);

  function updateField(field: keyof RateForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice(null);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const rateFields: (keyof RateForm)[] = [
      "buy_cup_rate",
      "buy_mobile_rate",
      "sell_cup_rate",
      "sell_mobile_rate",
    ];

    for (const field of rateFields) {
      const value = form[field].trim();

      if (!value || !Number.isFinite(Number(value)) || Number(value) <= 0) {
        setNotice({
          type: "error",
          message:
            "Introduce una tasa válida y mayor que cero en los cuatro campos.",
        });
        return;
      }
    }

    setSaving(true);

    try {
      const updatedAt = new Date().toISOString();

      const payload = {
        id: 1,
        buy_cup_rate: Number(form.buy_cup_rate),
        buy_mobile_rate: Number(form.buy_mobile_rate),
        sell_cup_rate: Number(form.sell_cup_rate),
        sell_mobile_rate: Number(form.sell_mobile_rate),
        bep20_wallet: form.bep20_wallet.trim(),
        payment_instructions: form.payment_instructions.trim(),
        updated_at: updatedAt,
      };

      const { error } = await supabase
        .from("crypto_settings")
        .upsert(payload, { onConflict: "id" });

      if (error) throw error;

      setLastUpdated(updatedAt);
      setNotice({
        type: "success",
        message: "Las tasas y la configuración se guardaron correctamente.",
      });
    } catch (error) {
      console.error("Error guardando las tasas:", error);

      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron guardar los cambios. Comprueba Supabase.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setNotice({
        type: "error",
        message: "No se pudo cerrar la sesión.",
      });
      return;
    }

    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="loading-page">
        <div className="spinner" />
        <p>Cargando configuración de criptomonedas...</p>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background: #08090d;
            color: #999aa5;
            font-family: Arial, Helvetica, sans-serif;
          }

          .spinner {
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

  if (!authorized) return null;

  return (
    <main className="page">
      <div className="container">
        <header className="topbar">
          <button
            type="button"
            className="back-button"
            onClick={() => router.push("/admin")}
          >
            <span>←</span>
            Panel principal
          </button>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </header>

        <section className="hero">
          <div className="eyebrow">
            <span className="red-dot" />
            CONFIGURACIÓN FINANCIERA
          </div>

          <h1>
            Tasas de <span>cripto.</span>
          </h1>

          <p>
            Configura los precios de compra y venta de USDT para los clientes
            de STORE GAMING.
          </p>

          <div className="status-card">
            <div className="status-icon">🪙</div>
            <div className="status-copy">
              <strong>USDT · BEP20</strong>
              <span>Configuración de operaciones</span>
            </div>
            <div className="active-status">
              <span />
              Administrable
            </div>
          </div>
        </section>

        {notice && (
          <div
            className={`notice ${notice.type}`}
            role="status"
            aria-live="polite"
          >
            <span>{notice.type === "success" ? "✓" : "!"}</span>
            <p>{notice.message}</p>
          </div>
        )}

        <form onSubmit={handleSave}>
          <section className="rates-section">
            <div className="section-heading">
              <div>
                <span className="section-label">01 / COMPRA</span>
                <h2>Compra de USDT</h2>
                <p>Precio para las operaciones de compra de USDT.</p>
              </div>
              <div className="section-icon">📥</div>
            </div>

            <div className="rate-grid">
              <label className="field">
                <span className="field-label">Tasa en CUP</span>
                <span className="field-help">
                  Precio por cada 1 USDT
                </span>
                <div className="input-wrap">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.000001"
                    step="any"
                    placeholder="Ej. 1030"
                    value={form.buy_cup_rate}
                    onChange={(event) =>
                      updateField("buy_cup_rate", event.target.value)
                    }
                    required
                  />
                  <span className="unit">CUP</span>
                </div>
              </label>

              <label className="field">
                <span className="field-label">Tasa en saldo móvil</span>
                <span className="field-help">
                  Precio por cada 1 USDT
                </span>
                <div className="input-wrap">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.000001"
                    step="any"
                    placeholder="Ej. 310"
                    value={form.buy_mobile_rate}
                    onChange={(event) =>
                      updateField("buy_mobile_rate", event.target.value)
                    }
                    required
                  />
                  <span className="unit">SALDO</span>
                </div>
              </label>
            </div>
          </section>

          <section className="rates-section">
            <div className="section-heading">
              <div>
                <span className="section-label">02 / VENTA</span>
                <h2>Venta de USDT</h2>
                <p>Precio para las operaciones de venta de USDT.</p>
              </div>
              <div className="section-icon">📤</div>
            </div>

            <div className="rate-grid">
              <label className="field">
                <span className="field-label">Tasa en CUP</span>
                <span className="field-help">
                  Precio por cada 1 USDT
                </span>
                <div className="input-wrap">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.000001"
                    step="any"
                    placeholder="Ej. 1030"
                    value={form.sell_cup_rate}
                    onChange={(event) =>
                      updateField("sell_cup_rate", event.target.value)
                    }
                    required
                  />
                  <span className="unit">CUP</span>
                </div>
              </label>

              <label className="field">
                <span className="field-label">Tasa en saldo móvil</span>
                <span className="field-help">
                  Precio por cada 1 USDT
                </span>
                <div className="input-wrap">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.000001"
                    step="any"
                    placeholder="Ej. 310"
                    value={form.sell_mobile_rate}
                    onChange={(event) =>
                      updateField("sell_mobile_rate", event.target.value)
                    }
                    required
                  />
                  <span className="unit">SALDO</span>
                </div>
              </label>
            </div>
          </section>

          <section className="rates-section">
            <div className="section-heading">
              <div>
                <span className="section-label">03 / OPERACIONES</span>
                <h2>Datos de pago</h2>
                <p>Información que utilizará el sistema de criptomonedas.</p>
              </div>
              <div className="section-icon">🔐</div>
            </div>

            <label className="field full-field">
              <span className="field-label">Billetera USDT BEP20</span>
              <input
                type="text"
                autoComplete="off"
                placeholder="Dirección BEP20"
                value={form.bep20_wallet}
                onChange={(event) =>
                  updateField("bep20_wallet", event.target.value)
                }
              />
            </label>

            <label className="field full-field">
              <span className="field-label">Instrucciones de pago</span>
              <textarea
                rows={4}
                placeholder="Instrucciones de pago..."
                value={form.payment_instructions}
                onChange={(event) =>
                  updateField("payment_instructions", event.target.value)
                }
              />
            </label>
          </section>

          <section className="save-section">
            <div className="save-info">
              <div className="save-icon">💾</div>
              <div>
                <strong>Guardar configuración</strong>
                <p>Los cambios se almacenan en Supabase.</p>
              </div>
            </div>

            <button
              type="submit"
              className="save-button"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="button-spinner" />
                  Guardando...
                </>
              ) : (
                <>
                  Guardar cambios
                  <span>✓</span>
                </>
              )}
            </button>

            {lastUpdated && (
              <p className="updated-at">
                Última actualización:{" "}
                {new Date(lastUpdated).toLocaleString()}
              </p>
            )}
          </section>
        </form>

        <footer className="footer">
          <strong>🎮 STORE GAMING</strong>
          <span>Panel administrativo · Tasas de cripto</span>
        </footer>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 24px 18px 36px;
          background:
            radial-gradient(
              ellipse at 50% -10%,
              rgba(255, 48, 71, 0.12),
              transparent 40%
            ),
            #08090d;
          color: #f5f5f7;
          font-family: Arial, Helvetica, sans-serif;
        }

        .container {
          width: 100%;
          max-width: 780px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 22px;
          border-bottom: 1px solid #252630;
        }

        .back-button,
        .logout-button {
          padding: 10px 12px;
          border: 1px solid #343540;
          border-radius: 10px;
          background: #15161d;
          color: #e5e5eb;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.2s ease, color 0.2s ease;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .back-button span {
          color: #ff5367;
          font-size: 18px;
        }

        .back-button:hover,
        .logout-button:hover {
          border-color: #ff3047;
          color: #ff6477;
        }

        .hero {
          padding: 32px 0 26px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ff5367;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.6px;
        }

        .red-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ff3047;
          box-shadow: 0 0 12px #ff304780;
        }

        .hero h1 {
          margin: 14px 0 10px;
          font-size: clamp(30px, 6vw, 40px);
          font-weight: 900;
          letter-spacing: -1.4px;
        }

        .hero h1 span {
          color: #ff3047;
        }

        .hero > p {
          max-width: 570px;
          margin: 0;
          color: #9697a3;
          font-size: 13px;
          line-height: 1.8;
        }

        .status-card {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 22px;
          padding: 14px;
          border: 1px solid #2a2b35;
          border-radius: 14px;
          background: linear-gradient(120deg, #171820, #101116);
        }

        .status-icon,
        .section-icon,
        .save-icon {
          display: grid;
          flex-shrink: 0;
          place-items: center;
          width: 42px;
          height: 42px;
          border: 1px solid #363741;
          border-radius: 12px;
          background: #22232c;
          font-size: 20px;
        }

        .status-copy {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .status-copy strong {
          font-size: 12px;
        }

        .status-copy span {
          color: #92939e;
          font-size: 10px;
        }

        .active-status {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #9fdbb0;
          font-size: 10px;
          white-space: nowrap;
        }

        .active-status span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #48c774;
        }

        .notice {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin: 0 0 18px;
          padding: 14px;
          border: 1px solid;
          border-radius: 12px;
        }

        .notice > span {
          font-size: 16px;
          font-weight: 900;
        }

        .notice p {
          margin: 1px 0 0;
          font-size: 12px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .notice.success {
          border-color: #286542;
          background: #102219;
          color: #a9e5bd;
        }

        .notice.error {
          border-color: #79313c;
          background: #271317;
          color: #ffb5bf;
        }

        .rates-section {
          margin-top: 17px;
          padding: 22px;
          border: 1px solid #292a34;
          border-radius: 16px;
          background: linear-gradient(145deg, #15161d, #101116);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 23px;
        }

        .section-label {
          color: #ff5367;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .section-heading h2 {
          margin: 8px 0 6px;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.4px;
        }

        .section-heading p {
          margin: 0;
          color: #92939e;
          font-size: 11px;
          line-height: 1.6;
        }

        .section-icon {
          width: 45px;
          height: 45px;
          font-size: 21px;
        }

        .rate-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .field-label {
          color: #f0f0f4;
          font-size: 12px;
          font-weight: 800;
        }

        .field-help {
          color: #858692;
          font-size: 10px;
          line-height: 1.5;
        }

        .input-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          padding: 0 11px;
          border: 1px solid #363741;
          border-radius: 10px;
          background: #0c0d12;
          transition: border-color 0.2s ease;
        }

        .input-wrap:focus-within {
          border-color: #ff3047;
        }

        input,
        textarea {
          width: 100%;
          min-width: 0;
          border: 1px solid #363741;
          border-radius: 10px;
          outline: none;
          background: #0c0d12;
          color: #f5f5f7;
          font: inherit;
          font-size: 13px;
          transition: border-color 0.2s ease;
        }

        .input-wrap input {
          padding: 13px 0;
          border: 0;
          border-radius: 0;
          background: transparent;
        }

        input:focus,
        textarea:focus {
          border-color: #ff3047;
        }

        .input-wrap:focus-within input {
          border-color: transparent;
        }

        input::placeholder,
        textarea::placeholder {
          color: #60616d;
        }

        .unit {
          flex-shrink: 0;
          color: #ff6577;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .full-field {
          margin-top: 19px;
        }

        .full-field input,
        .full-field textarea {
          padding: 13px;
        }

        textarea {
          min-height: 105px;
          resize: vertical;
          line-height: 1.7;
        }

        .save-section {
          margin-top: 18px;
          padding: 20px;
          border: 1px solid #30313b;
          border-radius: 15px;
          background: #13141a;
        }

        .save-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .save-info strong {
          font-size: 13px;
        }

        .save-info p {
          margin: 5px 0 0;
          color: #92939e;
          font-size: 11px;
          line-height: 1.6;
        }

        .save-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 15px;
          border: 1px solid #ff3047;
          border-radius: 11px;
          background: linear-gradient(100deg, #ff3047, #d91f39);
          color: white;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          transition:
            filter 0.2s ease,
            transform 0.2s ease;
        }

        .save-button:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .save-button:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        .button-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid #ffffff66;
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .updated-at {
          margin: 13px 0 0;
          color: #858692;
          font-size: 10px;
          text-align: center;
        }

        .footer {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 10px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #252630;
        }

        .footer strong {
          color: #c7c7d0;
          font-size: 10px;
          letter-spacing: 1px;
        }

        .footer span {
          color: #737480;
          font-size: 10px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 520px) {
          .page {
            padding: 18px 12px 28px;
          }

          .topbar {
            gap: 8px;
          }

          .back-button,
          .logout-button {
            padding: 9px;
            font-size: 10px;
          }

          .status-card {
            gap: 9px;
            padding: 11px;
          }

          .status-icon {
            width: 36px;
            height: 36px;
          }

          .status-copy strong {
            font-size: 11px;
          }

          .status-copy span {
            font-size: 9px;
          }

          .active-status {
            font-size: 9px;
          }

          .rates-section {
            padding: 16px 13px;
          }

          .section-heading h2 {
            font-size: 18px;
          }

          .section-heading p {
            font-size: 10px;
          }

          .section-icon {
            width: 38px;
            height: 38px;
          }

          .rate-grid {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .save-section {
            padding: 15px;
          }

          .footer {
            flex-direction: column;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}
