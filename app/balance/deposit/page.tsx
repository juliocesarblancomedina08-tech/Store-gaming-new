
"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { supabase } from "../../../lib/supabase";

type Network = "BEP20" | "TRC20" | "TON";

type NetworkInfo = {
  name: string;
  address: string;
};

type DepositStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "EXPIRED";

const NETWORKS: Record<Network, NetworkInfo> = {
  BEP20: {
    name: "USDT (BEP20)",
    address: "0xdcdEe992E26cDBe1b024e171a3a980078BeaAC77",
  },
  TRC20: {
    name: "USDT (TRC20)",
    address: "TTYHTFZJTMisUGZcSEooegLpxYt3zVo6YQ",
  },
  TON: {
    name: "USDT (TON)",
    address: "UQCKwyZB4Ph58WjL78LIYyd3U81nTYGuwWFNGaz2_YAvJJDg",
  },
};

const DEPOSIT_DURATION_MS = 10 * 60 * 1000;
const EXCHANGE_RATE = 1;

function UsdtLogo() {
  return (
    <span className="usdt-logo" aria-label="USDT">
      <img
        src="/images/usdt-bep20-logo.png"
        alt="USDT"
      />
    </span>
  );
}

function DepositContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState<Network | null>(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [depositId, setDepositId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  const [copied, setCopied] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [depositStatus, setDepositStatus] =
    useState<DepositStatus>("PENDING");

  const selectedNetwork = network
    ? NETWORKS[network]
    : null;

  const numericAmount = Number(amount);

  const balanceToReceive =
    Number.isFinite(numericAmount) && numericAmount > 0
      ? numericAmount * EXCHANGE_RATE
      : 0;

  /*
   * INICIALIZAR DEPÓSITO
   */

  useEffect(() => {
    let active = true;

    async function initializeDeposit() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          router.replace("/");
          return;
        }

        const urlNetwork = searchParams.get("network");

        if (!urlNetwork) {
          if (active) {
            setError("No se seleccionó una red de depósito.");
            setLoading(false);
          }
          return;
        }

        const normalizedNetwork =
          urlNetwork.toUpperCase() as Network;

        if (!NETWORKS[normalizedNetwork]) {
          if (active) {
            setError("La red seleccionada no es válida.");
            setLoading(false);
          }
          return;
        }

        if (!active) return;

        setNetwork(normalizedNetwork);

        const urlAmount = searchParams.get("amount");

        if (urlAmount) {
          const parsedAmount = Number(urlAmount);

          if (
            Number.isFinite(parsedAmount) &&
            parsedAmount > 0
          ) {
            setAmount(parsedAmount.toString());
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("ERROR AL PREPARAR DEPÓSITO:", err);

        if (active) {
          setError("No se pudo preparar el depósito.");
          setLoading(false);
        }
      }
    }

    initializeDeposit();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  /*
   * VALIDAR CANTIDAD
   */

  function validateAmount() {
    const value = Number(amount);

    if (
      !amount.trim() ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      setError("Introduce una cantidad válida de USDT.");
      return false;
    }

    if (value > 1000000) {
      setError("La cantidad supera el límite permitido.");
      return false;
    }

    setError("");
    return true;
  }

  /*
   * CONTINUAR A VERIFICACIÓN
   */

  function continueToVerification() {
    if (!validateAmount()) return;

    setDepositStatus("PENDING");
    setShowVerification(true);
  }

  /*
   * CREAR DEPÓSITO
   */

  async function createDeposit() {
    if (creating || created) return;

    if (!validateAmount()) {
      setShowVerification(false);
      return;
    }

    try {
      setCreating(true);
      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        router.replace("/");
        return;
      }

      if (!network || !selectedNetwork) {
        setError("Selecciona una red válida.");
        return;
      }

      const depositAmount = Number(amount);

      const email = session.user.email || "";
      const username = email.split("@")[0].replace(/^@/, "");

      const expiration = new Date(
        Date.now() + DEPOSIT_DURATION_MS
      ).toISOString();

      const {
        data,
        error: insertError,
      } = await supabase
        .from("deposits")
        .insert({
          user_id: session.user.id,
          username,
          email,
          amount: depositAmount,
          currency: "USDT",
          payment_method: "CRYPTO",
          network,
          wallet_address: selectedNetwork.address,
          tx_hash: null,
          status: "PENDING",
          expires_at: expiration,
        })
        .select(`
          id,
          created_at,
          expires_at,
          status
        `)
        .single();

      if (insertError) {
        console.error("ERROR CREANDO DEPÓSITO:", insertError);

        setError(
          insertError.message ||
          "No se pudo crear el depósito."
        );

        return;
      }

      if (!data) {
        setError("No se recibió información del depósito.");
        return;
      }

      setDepositId(data.id);

      setOrderNumber(
        `DEP-${Date.now().toString().slice(-8)}`
      );

      setExpiresAt(new Date(data.expires_at).getTime());

      setRemainingSeconds(
        Math.max(
          0,
          Math.ceil(
            (new Date(data.expires_at).getTime() - Date.now()) / 1000
          )
        )
      );

      setDepositStatus("PENDING");
      setShowVerification(false);
      setCreated(true);
    } catch (err) {
      console.error("ERROR CREANDO DEPÓSITO:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Error inesperado al crear el depósito."
      );
    } finally {
      setCreating(false);
    }
  }

  /*
   * CONTADOR
   */

  useEffect(() => {
    if (
      !created ||
      !expiresAt ||
      depositStatus !== "PENDING"
    ) {
      return;
    }

    function updateTimer() {
      const difference = expiresAt! - Date.now();

      if (difference <= 0) {
        setRemainingSeconds(0);
        setDepositStatus("EXPIRED");
        return;
      }

      setRemainingSeconds(Math.ceil(difference / 1000));
    }

    updateTimer();

    const timer = window.setInterval(updateTimer, 1000);

    return () => window.clearInterval(timer);
  }, [created, expiresAt, depositStatus]);

  /*
   * COMPROBAR ESTADO DEL DEPÓSITO
   */

  useEffect(() => {
    if (
      !created ||
      !depositId ||
      depositStatus !== "PENDING"
    ) {
      return;
    }

    let cancelled = false;

    async function checkDepositStatus() {
      try {
        const {
          data,
          error: statusError,
        } = await supabase
          .from("deposits")
          .select("status, expires_at")
          .eq("id", depositId)
          .single();

        if (cancelled || statusError || !data) {
          return;
        }

        const status = String(data.status).toUpperCase();

        if (
          status === "CONFIRMED" ||
          status === "REJECTED" ||
          status === "EXPIRED"
        ) {
          setDepositStatus(status as DepositStatus);
          return;
        }

        if (data.expires_at) {
          const expiration = new Date(data.expires_at).getTime();

          if (Date.now() >= expiration) {
            setDepositStatus("EXPIRED");
          }
        }
      } catch (err) {
        console.error("ERROR CONSULTANDO DEPÓSITO:", err);
      }
    }

    checkDepositStatus();

    const interval = window.setInterval(
      checkDepositStatus,
      5000
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [created, depositId, depositStatus]);

  /*
   * COPIAR MONTO
   */

  async function copyAmount() {
    try {
      await navigator.clipboard.writeText(amount);
      setCopiedAmount(true);

      window.setTimeout(() => {
        setCopiedAmount(false);
      }, 2000);
    } catch (err) {
      console.error("ERROR COPIANDO MONTO:", err);
    }
  }

  /*
   * COPIAR DIRECCIÓN
   */

  async function copyAddress() {
    if (!selectedNetwork) return;

    try {
      await navigator.clipboard.writeText(
        selectedNetwork.address
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("ERROR COPIANDO DIRECCIÓN:", err);
    }
  }

  function formatRemainingTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  }

  /*
   * PANTALLA DE CARGA
   */

  if (loading) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <div className="balance-loading">
          <div className="balance-loading-logo">🛒🎮</div>
          <div className="balance-spinner" />
          <p>PREPARANDO DEPÓSITO...</p>
        </div>
      </main>
    );
  }

  /*
   * PANTALLA DE ERROR
   */

  if (error && !created && !showVerification) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">
          <div className="balance-card">
            <div className="balance-card-header">
              <span>⚠️</span>
              <h1>DEPÓSITO</h1>
            </div>

            <div className="deposit-error">{error}</div>

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={() => router.push("/balance")}
            >
              VOLVER A MI BILLETERA
              <span>→</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  /*
   * INTRODUCIR CANTIDAD
   */

  if (
    !created &&
    selectedNetwork &&
    !showVerification
  ) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">
          <div className="balance-card deposit-input-card">
            <div className="deposit-verify-logo">
              <UsdtLogo />
            </div>

            <div className="deposit-verify-content">
              <h1>INGRESAR BALANCE</h1>
              <p>
                Introduce la cantidad de USDT que deseas depositar.
              </p>
            </div>

            <div className="exchange-rate-card">
              <span className="exchange-rate-icon">⇄</span>

              <div>
                <small>TASA DE CAMBIO</small>
                <strong>1 USDT = 1 BALANCE</strong>
                <span>
                  Tu depósito se convierte automáticamente.
                </span>
              </div>
            </div>

            <div className="deposit-network-badge deposit-network-badge-compact">
              <span>{selectedNetwork.name}</span>
            </div>

            <div className="deposit-amount-entry">
              <div className="deposit-amount-entry-heading">
                <div>
                  <span className="deposit-amount-step">01</span>
                  <div>
                    <label htmlFor="deposit-amount">
                      CANTIDAD A ENVIAR
                    </label>
                    <small>Introduce el monto de tu depósito</small>
                  </div>
                </div>

                <span className="deposit-amount-network">
                  {network}
                </span>
              </div>

              <div className="deposit-premium-input">
                <div className="deposit-premium-input-icon">
                  <UsdtLogo />
                </div>

                <div className="deposit-premium-input-field">
                  <input
                    id="deposit-amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError("");
                    }}
                  />

                  <span>USDT</span>
                </div>
              </div>

              <div className="deposit-amount-hint">
                <span>ⓘ</span>
                <p>
                  Introduce la cantidad exacta que enviarás
                  desde tu billetera.
                </p>
              </div>

              <div className="deposit-calculation-card deposit-calculation-modern">
                <div>
                  <span className="deposit-calculation-label">
                    RECIBIRÁS EN TU BALANCE
                  </span>
                  <small>Conversión estimada</small>
                </div>

                <div className="deposit-calculation-result">
                  <strong>
                    {balanceToReceive.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                  <span>BALANCE</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="deposit-error">{error}</div>
            )}

            <button
              type="button"
              className="deposit-confirm-button"
              disabled={
                !amount ||
                !Number.isFinite(numericAmount) ||
                numericAmount <= 0 ||
                numericAmount > 1000000
              }
              onClick={continueToVerification}
            >
              CONTINUAR
              <span>→</span>
            </button>

            <button
              type="button"
              className="deposit-back-button"
              onClick={() => router.push("/balance")}
            >
              CANCELAR
            </button>
          </div>
        </section>

        <style jsx global>{`
          .deposit-amount-entry {
            margin: 24px 0 20px;
            padding: 18px;
            border-radius: 20px;
            background:
              linear-gradient(145deg, rgba(38,161,123,.075), rgba(255,255,255,.018)),
              #080b0a;
            border: 1px solid rgba(38,161,123,.2);
            box-shadow: inset 0 1px rgba(255,255,255,.035);
          }

          .deposit-amount-entry-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 17px;
          }

          .deposit-amount-entry-heading > div {
            display: flex;
            align-items: center;
            gap: 11px;
          }

          .deposit-amount-step {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 35px;
            height: 35px;
            flex-shrink: 0;
            border-radius: 11px;
            background: rgba(38,161,123,.14);
            border: 1px solid rgba(38,161,123,.25);
            color: #45d4a3;
            font-size: 12px;
            font-weight: 950;
          }

          .deposit-amount-entry-heading label {
            display: block;
            color: #f0f0f0;
            font-size: 12px;
            font-weight: 950;
            letter-spacing: .07em;
          }

          .deposit-amount-entry-heading small {
            display: block;
            margin-top: 4px;
            color: #858585;
            font-size: 11px;
          }

          .deposit-amount-network {
            padding: 7px 10px;
            border-radius: 9px;
            background: rgba(38,161,123,.1);
            border: 1px solid rgba(38,161,123,.2);
            color: #45d4a3;
            font-size: 10px;
            font-weight: 950;
          }

          .deposit-premium-input {
            display: flex;
            align-items: center;
            gap: 13px;
            min-height: 82px;
            padding: 13px 15px;
            border-radius: 17px;
            background:
              linear-gradient(135deg, rgba(38,161,123,.09), transparent 65%),
              #050706;
            border: 1px solid rgba(38,161,123,.4);
            box-shadow:
              0 0 0 3px rgba(38,161,123,.045),
              inset 0 1px rgba(255,255,255,.035);
            transition: border-color .2s, box-shadow .2s;
          }

          .deposit-premium-input:focus-within {
            border-color: #35c99a;
            box-shadow:
              0 0 0 4px rgba(38,161,123,.12),
              0 0 24px rgba(38,161,123,.08);
          }

          .deposit-premium-input-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 47px;
            height: 47px;
            flex-shrink: 0;
            overflow: hidden;
            border-radius: 50%;
            background: #26a17b;
          }

          .deposit-premium-input-icon .usdt-logo {
            display: flex;
            width: 100%;
            height: 100%;
          }

          .deposit-premium-input-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .deposit-premium-input-field {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
            min-width: 0;
          }

          .deposit-premium-input-field input {
            width: 100%;
            min-width: 0;
            padding: 5px 0;
            border: 0;
            outline: none;
            background: transparent;
            color: #fff;
            font-size: clamp(25px, 7vw, 34px);
            font-weight: 950;
            letter-spacing: -.04em;
          }

          .deposit-premium-input-field input::placeholder {
            color: #4b5550;
          }

          .deposit-premium-input-field input::-webkit-inner-spin-button,
          .deposit-premium-input-field input::-webkit-outer-spin-button {
            opacity: 0;
          }

          .deposit-premium-input-field > span {
            flex-shrink: 0;
            padding: 8px 10px;
            border-radius: 9px;
            background: rgba(38,161,123,.13);
            color: #45d4a3;
            font-size: 12px;
            font-weight: 950;
          }

          .deposit-amount-hint {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin: 12px 2px 17px;
          }

          .deposit-amount-hint > span {
            color: #45d4a3;
            font-size: 14px;
          }

          .deposit-amount-hint p {
            margin: 0;
            color: #929a96;
            font-size: 11px;
            line-height: 1.5;
          }

          .deposit-calculation-modern {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin: 0;
            padding: 15px;
            border-radius: 15px;
            background: rgba(38,161,123,.075);
            border: 1px solid rgba(38,161,123,.2);
          }

          .deposit-calculation-modern > div:first-child {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }

          .deposit-calculation-modern .deposit-calculation-label {
            color: #d4ded9;
            font-size: 10px;
            font-weight: 950;
            letter-spacing: .045em;
          }

          .deposit-calculation-modern small {
            color: #7e8983;
            font-size: 10px;
          }

          .deposit-calculation-result {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 2px;
          }

          .deposit-calculation-result strong {
            color: #45d4a3;
            font-size: 25px;
            font-weight: 950;
            line-height: 1.1;
          }

          .deposit-calculation-result span {
            color: #8a9b92;
            font-size: 9px;
            font-weight: 950;
            letter-spacing: .1em;
          }

          .deposit-confirm-button:disabled {
            opacity: .4;
            cursor: not-allowed;
            transform: none;
          }

          .balance-page .deposit-back-button {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            min-height: 50px;
            margin-top: 12px;
            padding: 12px 18px;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,.13);
            background: linear-gradient(
              145deg,
              rgba(255,255,255,.075),
              rgba(255,255,255,.025)
            );
            color: #c9c9c9;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: .12em;
            cursor: pointer;
            transition: all .2s ease;
          }

          .balance-page .deposit-back-button:hover {
            background: rgba(220,60,60,.12);
            border-color: rgba(255,75,75,.4);
            color: #ff7777;
            box-shadow: 0 0 18px rgba(255,60,60,.08);
            transform: translateY(-2px);
          }

          .balance-page .deposit-back-button:active {
            transform: scale(.98);
          }

          .balance-page .deposit-back-button:disabled {
            opacity: .45;
            cursor: not-allowed;
            transform: none;
          }

          @media (max-width: 420px) {
            .deposit-amount-entry {
              padding: 14px;
            }

            .deposit-premium-input {
              min-height: 72px;
              padding: 10px;
              gap: 9px;
            }

            .deposit-premium-input-icon {
              width: 40px;
              height: 40px;
            }

            .deposit-calculation-modern {
              align-items: flex-start;
              flex-direction: column;
            }

            .deposit-calculation-result {
              align-items: flex-start;
            }
          }

          @media (max-width: 600px) {
            .balance-page .deposit-payment-card {
              border-radius: 20px;
            }

            .balance-page .deposit-payment-header {
              gap: 10px;
              flex-wrap: wrap;
            }

            .balance-page .deposit-timer {
              width: 100%;
            }

            .balance-page .deposit-address-box {
              flex-direction: column;
              align-items: stretch;
            }

            .balance-page .deposit-copy-button {
              width: 100%;
              min-height: 44px;
            }

            .balance-page .deposit-qr-box {
              padding: 12px;
            }
          }
        `}</style>
      </main>
    );
  }

  /*
   * PANTALLA DE VERIFICACIÓN
   */

  if (
    !created &&
    selectedNetwork &&
    showVerification
  ) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">
          <div className="balance-card">
            <div className="deposit-verify-logo">
              <UsdtLogo />
            </div>

            <div className="deposit-verify-content">
              <h1>MONTO A DEPOSITAR</h1>

              <div className="deposit-verify-amount">
                ${Number(amount).toFixed(2)} USDT
              </div>

              <p>
                Verifica cuidadosamente los datos antes de continuar.
              </p>
            </div>

            <div className="exchange-rate-card">
              <div>
                <small>TASA DE CAMBIO</small>
                <strong>1 USDT = 1 BALANCE</strong>
              </div>
            </div>

            <div className="deposit-calculation-card">
              <span>BALANCE QUE RECIBIRÁS</span>
              <strong>{balanceToReceive.toFixed(2)}</strong>
            </div>

            <div className="deposit-network-badge deposit-network-badge-compact">
              <span>{selectedNetwork.name}</span>
            </div>

            <div className="deposit-warning">
              <span>⚠️</span>
              <p>
                Comprueba el monto y la red antes de continuar.
              </p>
            </div>

            {error && (
              <div className="deposit-error">{error}</div>
            )}

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={createDeposit}
              disabled={creating}
            >
              {creating
                ? "CREANDO DEPÓSITO..."
                : "HE REVISADO LOS DATOS"}

              {!creating && <span>→</span>}
            </button>

            <button
              type="button"
              className="deposit-back-button"
              onClick={() => {
                setShowVerification(false);
                setError("");
              }}
              disabled={creating}
            >
              MODIFICAR CANTIDAD
            </button>
          </div>
        </section>
      </main>
    );
  }

  /*
   * DEPÓSITO EXPIRADO
   */

  if (created && depositStatus === "EXPIRED") {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">
          <div className="balance-card">
            <div className="deposit-status-icon deposit-status-expired">
              ⏱️
            </div>

            <h1 className="deposit-success-title">
              DEPÓSITO EXPIRADO
            </h1>

            <p className="deposit-success-text">
              El tiempo de pago de 10 minutos ha terminado.
            </p>

            <div className="deposit-reference-text">
              ID DE DEPÓSITO:
              <br />
              <strong>{depositId}</strong>
            </div>

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={() => router.push("/balance")}
            >
              VOLVER A MI BILLETERA
              <span>→</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  /*
   * DEPÓSITO CONFIRMADO
   */

  if (created && depositStatus === "CONFIRMED") {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">
          <div className="balance-card">
            <div className="deposit-status-icon deposit-status-confirmed">
              ✓
            </div>

            <h1 className="deposit-success-title">
              DEPÓSITO COMPLETADO
            </h1>

            <p className="deposit-success-text">
              El pago fue confirmado correctamente.
            </p>

            <div className="deposit-amount-card">
              <small>MONTO ACREDITADO</small>
              <strong>${amount}</strong>
              <span>USDT</span>
            </div>

            <div className="deposit-reference-text">
              ID DE DEPÓSITO:
              <br />
              <strong>{depositId}</strong>
            </div>

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={() => router.push("/balance")}
            >
              VOLVER A MI BILLETERA
              <span>→</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  /*
   * DEPÓSITO RECHAZADO
   */

  if (created && depositStatus === "REJECTED") {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">
          <div className="balance-card">
            <div className="deposit-status-icon deposit-status-rejected">
              ✕
            </div>

            <h1 className="deposit-success-title">
              DEPÓSITO RECHAZADO
            </h1>

            <p className="deposit-success-text">
              Este depósito no pudo ser aprobado.
            </p>

            <div className="deposit-reference-text">
              ID DE DEPÓSITO:
              <br />
              <strong>{depositId}</strong>
            </div>

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={() => router.push("/balance")}
            >
              VOLVER A MI BILLETERA
              <span>→</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  /*
   * PANTALLA DE PAGO
   */

  return (
    <main className="balance-page">
      <div className="balance-background" />

      <section className="balance-section">
        <div className="balance-card deposit-payment-card">
          <div className="deposit-payment-logo-top">
            <UsdtLogo />
          </div>

          <div className="balance-card-header deposit-payment-header">
            <div className="deposit-title-content">
              <span className="deposit-title-label">
                PAGAR CON
              </span>

              <h1>DEPÓSITO USDT</h1>
            </div>

            {depositStatus === "PENDING" && (
              <div className="deposit-timer">
                <span>⏱ TIEMPO RESTANTE</span>

                <strong>
                  {formatRemainingTime(remainingSeconds)}
                  <span className="deposit-rotating-clock">
                    🕑
                  </span>
                </strong>
              </div>
            )}
          </div>

          <div className="deposit-amount-card deposit-copyable-amount">
            <small>MONTO A ENVIAR</small>

            <button
              type="button"
              className="deposit-copy-amount-button"
              onClick={copyAmount}
              aria-label="Copiar monto a enviar"
            >
              <span className="deposit-amount-value">
                <strong>${amount}</strong>
                <span>USDT</span>
              </span>

              <span className="deposit-copy-amount-label">
                {copiedAmount ? "✓ COPIADO" : "COPIAR MONTO"}
              </span>
            </button>
          </div>

          <div className="deposit-network-badge">
            <div>
              <span className="deposit-network-label">
                RED DE PAGO
              </span>

              <strong>{selectedNetwork?.name}</strong>
            </div>
          </div>

          <div className="deposit-order-reference">
            <span>REFERENCIA DEL PEDIDO</span>
            <strong>{orderNumber}</strong>
          </div>

          <div className="deposit-payment-section">
            <div className="deposit-payment-section-title">
              <span>01</span>

              <div>
                <strong>DIRECCIÓN DE PAGO</strong>
                <small>Envía el monto a esta dirección</small>
              </div>
            </div>

            <div className="deposit-address-box">
              <div className="deposit-address-content">
                <span>{selectedNetwork?.address}</span>
              </div>

              <button
                type="button"
                onClick={copyAddress}
                className="deposit-copy-button"
              >
                {copied ? "✓ COPIADO" : "COPIAR"}
              </button>
            </div>
          </div>

          <div className="deposit-payment-section">
            <div className="deposit-payment-section-title">
              <span>02</span>

              <div>
                <strong>CÓDIGO QR</strong>
                <small>Escanea para realizar el pago</small>
              </div>
            </div>

            <div className="deposit-qr-box">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                  selectedNetwork?.address || ""
                )}`}
                alt={`QR ${selectedNetwork?.name}`}
              />
            </div>
          </div>

          <div className="deposit-warning">
            <span>⚠️</span>

            <div>
              <strong>IMPORTANTE</strong>

              <p>
                Envía exactamente <b>${amount} USDT</b>{" "}
                utilizando la red <b>{selectedNetwork?.name}</b>.
                <br />
                <br />
                No utilices otra red. Una transferencia enviada
                por una red incorrecta puede perderse.
              </p>
            </div>
          </div>

          <div className="deposit-reference-text">
            <span>ID DE DEPÓSITO</span>
            <strong>{depositId}</strong>
          </div>

          <div className="deposit-pending-message">
            <span>🔎</span>

            <div>
              <strong>ESPERANDO EL PAGO</strong>

              <p>
                Estamos esperando la confirmación del depósito.
                <br />
                No cierres esta página hasta completar la transferencia.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="deposit-confirm-button"
            onClick={() => router.push("/balance")}
          >
            VOLVER A MI BILLETERA
            <span>→</span>
          </button>
        </div>
      </section>

      <style jsx global>{`
        .balance-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 50% 0%, rgba(38,161,123,.13), transparent 38%),
            linear-gradient(180deg, #0b0b0b 0%, #050505 100%);
          color: #fff;
        }

        .balance-page .deposit-payment-card,
        .balance-page .deposit-input-card {
          background:
            linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.015)),
            #0b0b0b;
          border: 1px solid rgba(38,161,123,.22);
          box-shadow:
            0 24px 70px rgba(0,0,0,.55),
            0 0 35px rgba(38,161,123,.08);
        }

        .balance-page .deposit-payment-header {
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .balance-page .deposit-network-badge {
          background: linear-gradient(145deg, rgba(38,161,123,.12), rgba(255,255,255,.025));
          border: 1px solid rgba(38,161,123,.25);
        }

        .balance-page .deposit-amount-card {
          background: linear-gradient(145deg, rgba(38,161,123,.11), rgba(255,255,255,.025));
          border: 1px solid rgba(38,161,123,.22);
        }

        .balance-page .deposit-amount-value strong {
          color: #fff;
        }

        .balance-page .deposit-amount-value span,
        .balance-page .deposit-order-reference strong,
        .balance-page .deposit-reference-text strong {
          color: #26a17b;
        }

        .balance-page .deposit-order-reference,
        .balance-page .deposit-reference-text {
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
        }

        .balance-page .deposit-payment-section {
          background: rgba(255,255,255,.018);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 18px;
          padding: 16px;
        }

        .balance-page .deposit-payment-section-title {
          margin-bottom: 14px;
        }

        .balance-page .deposit-payment-section-title > span {
          background: rgba(38,161,123,.13);
          color: #26a17b;
          border: 1px solid rgba(38,161,123,.2);
        }

        .balance-page .deposit-address-box {
          background: #070707;
          border: 1px solid rgba(38,161,123,.22);
          border-radius: 14px;
          padding: 12px;
        }

        .balance-page .deposit-address-content span {
          color: #ddd;
          word-break: break-all;
          font-size: 13px;
          line-height: 1.5;
        }

        .balance-page .deposit-copy-button {
          background: #26a17b;
          color: #04120d;
          border: 0;
          font-weight: 900;
          border-radius: 10px;
        }

        .balance-page .deposit-qr-box {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 18px;
          background: #fff;
          border-radius: 18px;
          border: 3px solid rgba(38,161,123,.42);
        }

        .balance-page .deposit-qr-box img {
          display: block;
          width: min(100%, 330px);
          height: auto;
          aspect-ratio: 1;
          object-fit: contain;
          border-radius: 8px;
        }

        .balance-page .deposit-warning {
          background: rgba(245,158,11,.055);
          border: 1px solid rgba(245,158,11,.18);
          border-radius: 16px;
        }

        .balance-page .deposit-pending-message {
          background: rgba(38,161,123,.055);
          border: 1px solid rgba(38,161,123,.18);
          border-radius: 16px;
        }

        .balance-page .deposit-pending-message strong {
          color: #26a17b;
        }

        .balance-page .deposit-confirm-button {
          background: linear-gradient(135deg, #26a17b, #147a5c);
          border: 1px solid rgba(75,220,171,.45);
          box-shadow:
            0 14px 32px rgba(38,161,123,.18),
            inset 0 1px rgba(255,255,255,.16);
        }

        .balance-page .deposit-timer {
          background: rgba(38,161,123,.08);
          border: 1px solid rgba(38,161,123,.18);
          border-radius: 12px;
          padding: 9px 12px;
        }

        .balance-page .deposit-timer strong {
          color: #26a17b;
        }

        .balance-page .deposit-back-button {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 50px;
          margin-top: 12px;
          padding: 12px 18px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.13);
          background: linear-gradient(
            145deg,
            rgba(255,255,255,.075),
            rgba(255,255,255,.025)
          );
          color: #c9c9c9;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .12em;
          cursor: pointer;
          transition: all .2s ease;
        }

        .balance-page .deposit-back-button:hover {
          background: rgba(220,60,60,.12);
          border-color: rgba(255,75,75,.4);
          color: #ff7777;
          box-shadow: 0 0 18px rgba(255,60,60,.08);
          transform: translateY(-2px);
        }

        .balance-page .deposit-back-button:active {
          transform: scale(.98);
        }

        .balance-page .deposit-back-button:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .balance-page .deposit-verify-logo,
        .balance-page .deposit-payment-logo-top {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          margin: 2px auto 16px;
        }

        .balance-page .deposit-verify-logo .usdt-logo,
        .balance-page .deposit-payment-logo-top .usdt-logo {
          width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          overflow: hidden;
          background: #26a17b;
          box-shadow: 0 0 30px rgba(38,161,123,.25);
        }

        .balance-page .deposit-verify-logo .usdt-logo img,
        .balance-page .deposit-payment-logo-top .usdt-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .balance-page .deposit-verify-content {
          text-align: center;
          margin-bottom: 18px;
        }

        .balance-page .deposit-verify-content h1 {
          margin: 0 0 8px;
          font-size: 24px;
          font-weight: 950;
          color: #fff;
        }

        .balance-page .deposit-verify-amount {
          color: #26a17b;
          font-size: 25px;
          font-weight: 950;
          margin-bottom: 10px;
        }

        .balance-page .deposit-verify-content p {
          max-width: 520px;
          margin: 0 auto;
          color: #aaa;
          line-height: 1.55;
          font-size: 14px;
        }

        .balance-page .deposit-network-badge-compact {
          justify-content: center;
          margin-bottom: 14px;
        }

        .balance-page .deposit-copyable-amount {
          padding-bottom: 12px;
        }

        .balance-page .deposit-copy-amount-button {
          width: 100%;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          padding: 4px 0 0;
          text-align: left;
        }

        .balance-page .deposit-copy-amount-button .deposit-amount-value {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
        }

        .balance-page .deposit-copy-amount-label {
          display: inline-flex;
          margin-top: 10px;
          padding: 7px 10px;
          border-radius: 9px;
          background: rgba(38,161,123,.09);
          color: #26a17b;
          font-size: 10px;
          font-weight: 950;
        }

        .balance-page .deposit-rotating-clock {
          display: inline-block;
          margin-left: 8px;
          animation: depositClockSpin 1.2s linear infinite;
        }

        @keyframes depositClockSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .deposit-input-card {
          background:
            linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.015)),
            #0b0b0b;
          border: 1px solid rgba(38,161,123,.24);
          box-shadow: 0 24px 70px rgba(0,0,0,.5);
        }

        .exchange-rate-card {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 17px;
          margin: 18px 0;
          border-radius: 17px;
          border: 1px solid rgba(38,161,123,.35);
          background: linear-gradient(135deg, rgba(38,161,123,.17), rgba(38,161,123,.045));
        }

        .exchange-rate-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 14px;
          background: rgba(38,161,123,.2);
          color: #48d6a6;
          font-size: 28px;
          font-weight: 900;
        }

        .exchange-rate-card div {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .exchange-rate-card small {
          color: #8d9e97;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .exchange-rate-card strong {
          color: #45d4a3;
          font-size: 19px;
          font-weight: 950;
        }

        .exchange-rate-card div span {
          color: #aaa;
          font-size: 11px;
        }

        .deposit-calculation-card {
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 17px;
          margin-bottom: 18px;
          border-radius: 15px;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.09);
        }

        .deposit-calculation-card > span {
          color: #999;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .deposit-calculation-card > strong {
          color: #45d4a3;
          font-size: 29px;
          font-weight: 950;
        }

        .deposit-calculation-card > small {
          color: #777;
          font-size: 11px;
        }

        .deposit-confirm-button:disabled {
          opacity: .4;
          cursor: not-allowed;
          transform: none;
        }

        .deposit-amount-entry {
          margin: 24px 0 20px;
          padding: 18px;
          border-radius: 20px;
          background:
            linear-gradient(145deg, rgba(38,161,123,.075), rgba(255,255,255,.018)),
            #080b0a;
          border: 1px solid rgba(38,161,123,.2);
          box-shadow: inset 0 1px rgba(255,255,255,.035);
        }

        .deposit-amount-entry-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 17px;
        }

        .deposit-amount-entry-heading > div {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .deposit-amount-step {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 35px;
          height: 35px;
          flex-shrink: 0;
          border-radius: 11px;
          background: rgba(38,161,123,.14);
          border: 1px solid rgba(38,161,123,.25);
          color: #45d4a3;
          font-size: 12px;
          font-weight: 950;
        }

        .deposit-amount-entry-heading label {
          display: block;
          color: #f0f0f0;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .07em;
        }

        .deposit-amount-entry-heading small {
          display: block;
          margin-top: 4px;
          color: #858585;
          font-size: 11px;
        }

        .deposit-amount-network {
          padding: 7px 10px;
          border-radius: 9px;
          background: rgba(38,161,123,.1);
          border: 1px solid rgba(38,161,123,.2);
          color: #45d4a3;
          font-size: 10px;
          font-weight: 950;
        }

        .deposit-premium-input {
          display: flex;
          align-items: center;
          gap: 13px;
          min-height: 82px;
          padding: 13px 15px;
          border-radius: 17px;
          background:
            linear-gradient(135deg, rgba(38,161,123,.09), transparent 65%),
            #050706;
          border: 1px solid rgba(38,161,123,.4);
          box-shadow:
            0 0 0 3px rgba(38,161,123,.045),
            inset 0 1px rgba(255,255,255,.035);
          transition: border-color .2s, box-shadow .2s;
        }

        .deposit-premium-input:focus-within {
          border-color: #35c99a;
          box-shadow:
            0 0 0 4px rgba(38,161,123,.12),
            0 0 24px rgba(38,161,123,.08);
        }

        .deposit-premium-input-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 47px;
          height: 47px;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 50%;
          background: #26a17b;
        }

        .deposit-premium-input-icon .usdt-logo {
          display: flex;
          width: 100%;
          height: 100%;
        }

        .deposit-premium-input-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .deposit-premium-input-field {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }

        .deposit-premium-input-field input {
          width: 100%;
          min-width: 0;
          padding: 5px 0;
          border: 0;
          outline: none;
          background: transparent;
          color: #fff;
          font-size: clamp(25px, 7vw, 34px);
          font-weight: 950;
          letter-spacing: -.04em;
        }

        .deposit-premium-input-field input::placeholder {
          color: #4b5550;
        }

        .deposit-premium-input-field input::-webkit-inner-spin-button,
        .deposit-premium-input-field input::-webkit-outer-spin-button {
          opacity: 0;
        }

        .deposit-premium-input-field > span {
          flex-shrink: 0;
          padding: 8px 10px;
          border-radius: 9px;
          background: rgba(38,161,123,.13);
          color: #45d4a3;
          font-size: 12px;
          font-weight: 950;
        }

        .deposit-amount-hint {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin: 12px 2px 17px;
        }

        .deposit-amount-hint > span {
          color: #45d4a3;
          font-size: 14px;
        }

        .deposit-amount-hint p {
          margin: 0;
          color: #929a96;
          font-size: 11px;
          line-height: 1.5;
        }

        .deposit-calculation-modern {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 0;
          padding: 15px;
          border-radius: 15px;
          background: rgba(38,161,123,.075);
          border: 1px solid rgba(38,161,123,.2);
        }

        .deposit-calculation-modern > div:first-child {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .deposit-calculation-modern .deposit-calculation-label {
          color: #d4ded9;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .045em;
        }

        .deposit-calculation-modern small {
          color: #7e8983;
          font-size: 10px;
        }

        .deposit-calculation-result {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .deposit-calculation-result strong {
          color: #45d4a3;
          font-size: 25px;
          font-weight: 950;
          line-height: 1.1;
        }

        .deposit-calculation-result span {
          color: #8a9b92;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .1em;
        }

        @media (max-width: 420px) {
          .deposit-amount-entry {
            padding: 14px;
          }

          .deposit-premium-input {
            min-height: 72px;
            padding: 10px;
            gap: 9px;
          }

          .deposit-premium-input-icon {
            width: 40px;
            height: 40px;
          }

          .deposit-calculation-modern {
            align-items: flex-start;
            flex-direction: column;
          }

          .deposit-calculation-result {
            align-items: flex-start;
          }
        }

        @media (max-width: 600px) {
          .balance-page .deposit-payment-card {
            border-radius: 20px;
          }

          .balance-page .deposit-payment-header {
            gap: 10px;
            flex-wrap: wrap;
          }

          .balance-page .deposit-timer {
            width: 100%;
          }

          .balance-page .deposit-address-box {
            flex-direction: column;
            align-items: stretch;
          }

          .balance-page .deposit-copy-button {
            width: 100%;
            min-height: 44px;
          }

          .balance-page .deposit-qr-box {
            padding: 12px;
          }
        }
      `}</style>
    </main>
  );
}

/*
 * PÁGINA PRINCIPAL
 */

export default function DepositPage() {
  return (
    <Suspense
      fallback={
        <main className="balance-page">
          <div className="balance-background" />

          <div className="balance-loading">
            <div className="balance-loading-logo">🛒🎮</div>
            <div className="balance-spinner" />
            <p>PREPARANDO DEPÓSITO...</p>
          </div>
        </main>
      }
    >
      <DepositContent />
    </Suspense>
  );
}
