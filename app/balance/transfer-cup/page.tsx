
"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type TransferSettings = {
  exchange_rate: number;
  transfer_card: string;
  confirmation_number: string;
};

type CreatedOrder = {
  id: string;
  amount_cup: number;
  exchange_rate: number;
  balance_amount: number;
  status: string;
  created_at: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function TransferCupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [settings, setSettings] =
    useState<TransferSettings | null>(null);

  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);

  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [receiptUploaded, setReceiptUploaded] = useState(false);

  const [userToken, setUserToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/");
          return;
        }

        if (!active) return;

        setUserToken(session.access_token);

        const response = await fetch(
          "/api/transfer-cup/settings",
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "No se pudo cargar la configuración."
          );
        }

        const rate = Number(result.exchange_rate);

        if (!Number.isFinite(rate) || rate <= 0) {
          throw new Error("La tasa configurada no es válida.");
        }

        if (active) {
          setSettings({
            exchange_rate: rate,
            transfer_card: result.transfer_card || "",
            confirmation_number:
              result.confirmation_number || "",
          });
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los datos."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [router]);

  const amountCup = Number(amount);
  const exchangeRate = settings?.exchange_rate || 0;

  const balanceAmount =
    amountCup > 0 && exchangeRate > 0
      ? Number((amountCup / exchangeRate).toFixed(4))
      : 0;

  function handleAmountChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setAmount(event.target.value);
    setError("");
  }

  function handleReceiptChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null;

    setError("");

    if (!file) {
      setReceipt(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setReceipt(null);
      event.target.value = "";
      setError("Selecciona una imagen JPG, PNG o WEBP.");
      return;
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      setReceipt(null);
      event.target.value = "";
      setError("La imagen debe pesar como máximo 5 MB.");
      return;
    }

    setReceipt(file);
  }

  async function uploadReceipt(orderId: string) {
    if (!receipt || !userToken) {
      throw new Error("Selecciona la fotografía del comprobante.");
    }

    const formData = new FormData();

    formData.append("order_id", orderId);
    formData.append("receipt", receipt);

    const response = await fetch(
      "/api/manual-payment/receipt",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "No se pudo subir el comprobante."
      );
    }

    setReceiptUploaded(true);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting || receiptUploaded) return;

    setError("");

    if (!userToken) {
      setError("Tu sesión ha expirado. Inicia sesión nuevamente.");
      return;
    }

    if (!settings || exchangeRate <= 0) {
      setError("La tasa no está disponible.");
      return;
    }

    if (
      !Number.isFinite(amountCup) ||
      amountCup <= 0 ||
      amountCup > 100000000
    ) {
      setError("Introduce un importe CUP válido.");
      return;
    }

    if (!receipt) {
      setError("Debes seleccionar la fotografía del comprobante.");
      return;
    }

    setSubmitting(true);

    try {
      let currentOrder = order;

      // Si ya existe una orden, no creamos otra.
      // Esto permite reintentar solamente la subida del comprobante.
      if (!currentOrder) {
        const response = await fetch(
          "/api/transfer-cup/orders",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userToken}`,
            },
            body: JSON.stringify({
              amount_cup: amountCup,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "No se pudo registrar la solicitud."
          );
        }

        if (!result.order?.id) {
          throw new Error(
            "El servidor no devolvió el identificador de la orden."
          );
        }

        currentOrder = result.order as CreatedOrder;
        setOrder(currentOrder);
      }

      await uploadReceipt(currentOrder.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al enviar la solicitud."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="transfer-page">
        <div className="transfer-loading">
          <div className="transfer-logo">SG</div>
          <div className="transfer-spinner" />
          <p>CARGANDO TRANSFERENCIA CUP...</p>
        </div>
        <TransferStyles />
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="transfer-page">
        <div className="transfer-background" />

        <section className="transfer-container">
          <div className="success-card">
            <h2>NO SE PUDO CARGAR</h2>
            <p>{error || "Inténtalo nuevamente."}</p>

            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/balance")}
            >
              VOLVER A MI BILLETERA
            </button>
          </div>
        </section>

        <TransferStyles />
      </main>
    );
  }

  // Confirmación después de crear la orden y subir el comprobante.
  if (order && receiptUploaded) {
    return (
      <main className="transfer-page">
        <div className="transfer-background" />

        <header className="transfer-header">
          <button
            type="button"
            className="transfer-back"
            onClick={() => router.push("/balance")}
          >
            ←
          </button>

          <div>
            <small>STORE GAMING</small>
            <h1>
              PEDIDO <span>ENVIADO</span>
            </h1>
          </div>
        </header>

        <section className="transfer-container">
          <div className="success-card">
            <div className="success-icon">✓</div>

            <div className="success-label">
              SOLICITUD ENVIADA
            </div>

            <h2>COMPROBANTE RECIBIDO</h2>

            <p>
              Tu solicitud y la fotografía del comprobante
              fueron enviadas correctamente. Está pendiente
              de revisión por el administrador.
            </p>

            <div className="reference-box">
              <small>IDENTIFICADOR DE ORDEN</small>
              <strong>{order.id}</strong>
            </div>

            <div className="summary">
              <div>
                <span>Importe enviado</span>
                <strong>
                  {Number(order.amount_cup).toFixed(2)} CUP
                </strong>
              </div>

              <div>
                <span>Tasa utilizada</span>
                <strong>
                  {Number(order.exchange_rate).toFixed(4)}
                </strong>
              </div>

              <div>
                <span>Saldo STORE GAMING solicitado</span>
                <strong>
                  ${Number(order.balance_amount).toFixed(4)} USD
                </strong>
              </div>

              <div>
                <span>Estado</span>
                <strong className="pending-status">
                  PENDIENTE DE REVISIÓN
                </strong>
              </div>

              <div>
                <span>Fecha de registro</span>
                <strong>
                  {new Date(order.created_at).toLocaleString("es-ES")}
                </strong>
              </div>
            </div>

            <div className="info-warning">
              <span>ℹ️</span>
              <p>
                El saldo interno de STORE GAMING se añadirá
                a tu billetera únicamente después de que
                el administrador apruebe la solicitud.
                Puedes consultar el estado de tu pedido
                desde la sección Órdenes.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/orders")}
            >
              IR A ÓRDENES
              <span>→</span>
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => router.push("/balance")}
            >
              VOLVER A MI BILLETERA
            </button>
          </div>
        </section>

        <TransferStyles />
      </main>
    );
  }

  return (
    <main className="transfer-page">
      <div className="transfer-background" />

      <header className="transfer-header">
        <button
          type="button"
          className="transfer-back"
          onClick={() => router.push("/balance")}
          aria-label="Volver"
        >
          ←
        </button>

        <div>
          <small>STORE GAMING</small>
          <h1>
            TRANSFERENCIA <span>CUP</span>
          </h1>
        </div>

        <div className="transfer-header-icon">⇄</div>
      </header>

      <section className="transfer-container">
        <div className="transfer-intro">
          <span className="intro-tag">
            RECARGA DE BILLETERA
          </span>

          <h2>TRANSFERENCIA CUP</h2>

          <p>
            Realiza la transferencia, adjunta una fotografía
            del comprobante y envía tu solicitud para revisión.
          </p>
        </div>

        <div className="rate-card">
          <div>
            <small>TASA CONFIGURADA</small>
            <strong>
              1 BALANCE = {exchangeRate.toFixed(4)} CUP
            </strong>
          </div>
          <span>↔</span>
        </div>

        <form
          className="transfer-form"
          onSubmit={handleSubmit}
        >
          <div className="form-heading">
            <h2>DATOS DE LA TRANSFERENCIA</h2>
            <span>TRANSFERENCIA CUP</span>
          </div>

          <label htmlFor="amount">
            IMPORTE EN CUP
          </label>

          <input
            id="amount"
            type="number"
            min="0.01"
            max="100000000"
            step="0.01"
            placeholder="Ejemplo: 1000"
            value={amount}
            onChange={handleAmountChange}
            disabled={submitting || !!order}
            required
          />

          <div className="calculation-card">
            <span>CRÉDITO QUE SOLICITAS</span>
            <strong>{balanceAmount.toFixed(4)}</strong>
            <small>
              Se acreditará en tu billetera después de la aprobación.
            </small>
          </div>

          <div className="payment-details">
            <div className="payment-detail">
              <span>TARJETA A ENVIAR</span>
              <strong>{settings.transfer_card}</strong>
            </div>

            <div className="payment-detail">
              <span>NÚMERO A CONFIRMAR</span>
              <strong>{settings.confirmation_number}</strong>
            </div>
          </div>

          <label htmlFor="receipt">
            FOTOGRAFÍA DEL COMPROBANTE
          </label>

          <div className="receipt-upload">
            <input
              id="receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleReceiptChange}
              disabled={submitting || receiptUploaded}
              required={!receiptUploaded}
            />

            <div className="receipt-hint">
              <span className="receipt-icon">▧</span>
              <strong>
                {receipt
                  ? "COMPROBANTE SELECCIONADO"
                  : "SELECCIONAR FOTOGRAFÍA"}
              </strong>
              <small>
                JPG, PNG o WEBP · Máximo 5 MB
              </small>

              {receipt && (
                <span className="receipt-filename">
                  {receipt.name}
                </span>
              )}
            </div>
          </div>

          {order && !receiptUploaded && (
            <div className="info-warning">
              <span>!</span>
              <p>
                Tu solicitud ya fue creada. Solo falta
                enviar el comprobante. Al reintentar no
                se creará otra orden.
              </p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <span>!</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={
              submitting ||
              !amount ||
              !Number.isFinite(amountCup) ||
              amountCup <= 0 ||
              !receipt ||
              receiptUploaded
            }
          >
            {submitting
              ? "ENVIANDO SOLICITUD..."
              : order
                ? "REINTENTAR ENVÍO DEL COMPROBANTE"
                : "ENVIAR SOLICITUD"}
            <span>→</span>
          </button>
        </form>

        <button
          type="button"
          className="secondary-button"
          onClick={() => router.push("/balance")}
          disabled={submitting}
        >
          CANCELAR Y VOLVER
        </button>
      </section>

      <TransferStyles />
    </main>
  );
}

function TransferStyles() {
  return (
    <style jsx global>{`
      .transfer-page {
        min-height: 100vh;
        background: #070707;
        color: #fff;
        position: relative;
        overflow: hidden;
        padding-bottom: 50px;
        font-family: Arial, Helvetica, sans-serif;
      }

      .transfer-background {
        position: fixed;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(
            circle at 50% 0%,
            rgba(180,25,35,.16),
            transparent 38%
          ),
          radial-gradient(
            circle at 100% 70%,
            rgba(35,75,145,.07),
            transparent 35%
          );
      }

      .transfer-header {
        position: relative;
        z-index: 1;
        max-width: 760px;
        margin: auto;
        padding: 25px 20px;
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .transfer-header small {
        color: #999;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 2px;
      }

      .transfer-header h1 {
        margin: 4px 0 0;
        font-size: 20px;
        font-weight: 950;
      }

      .transfer-header h1 span {
        color: #e04444;
      }

      .transfer-back {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        border: 1px solid #333;
        background: #151515;
        color: white;
        font-size: 23px;
        cursor: pointer;
      }

      .transfer-header-icon {
        margin-left: auto;
        font-size: 25px;
        color: #e04444;
      }

      .transfer-container {
        position: relative;
        z-index: 1;
        width: min(100% - 30px, 620px);
        margin: 10px auto;
      }

      .transfer-intro {
        margin-bottom: 20px;
      }

      .intro-tag {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 6px;
        background: rgba(224,68,68,.12);
        color: #f06a6a;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 1px;
      }

      .transfer-intro h2 {
        margin: 12px 0 7px;
        font-size: 19px;
        font-weight: 950;
      }

      .transfer-intro p {
        color: #999;
        font-size: 12px;
        line-height: 1.6;
      }

      .rate-card {
        margin: 15px 0 24px;
        padding: 17px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: 12px;
        background: #121212;
        border: 1px solid #292929;
      }

      .rate-card small,
      .rate-card strong {
        display: block;
      }

      .rate-card small {
        color: #999;
        font-size: 9px;
        margin-bottom: 7px;
      }

      .rate-card strong {
        font-size: 14px;
        color: #e9c16d;
      }

      .rate-card > span {
        color: #777;
        font-size: 25px;
      }

      .transfer-form,
      .success-card {
        padding: 21px;
        border-radius: 16px;
        border: 1px solid #292929;
        background: linear-gradient(160deg,#151515,#0c0c0c);
      }

      .form-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 22px;
      }

      .form-heading h2 {
        font-size: 14px;
        margin: 0;
        font-weight: 950;
      }

      .form-heading span {
        color: #f0c46b;
        font-size: 9px;
        font-weight: 900;
      }

      .transfer-form > label {
        display: block;
        color: #bbb;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .7px;
        margin: 17px 0 8px;
      }

      .transfer-form input[type="number"] {
        box-sizing: border-box;
        width: 100%;
        min-height: 48px;
        border-radius: 10px;
        border: 1px solid #333;
        outline: none;
        background: #090909;
        color: white;
        padding: 0 13px;
        font-size: 15px;
      }

      .transfer-form input:focus {
        border-color: #c94343;
      }

      .calculation-card {
        margin-top: 12px;
        padding: 14px;
        border-radius: 10px;
        background: rgba(38,161,123,.08);
        border: 1px solid rgba(38,161,123,.2);
      }

      .calculation-card span,
      .calculation-card strong,
      .calculation-card small {
        display: block;
      }

      .calculation-card span {
        color: #aaa;
        font-size: 9px;
        font-weight: 900;
      }

      .calculation-card strong {
        margin: 7px 0;
        color: #57d6a7;
        font-size: 25px;
      }

      .calculation-card small {
        color: #888;
        font-size: 10px;
        line-height: 1.5;
      }

      .payment-details {
        display: grid;
        gap: 12px;
        margin-top: 20px;
      }

      .payment-detail {
        padding: 16px;
        border-radius: 11px;
        background: #090909;
        border: 1px solid #343434;
      }

      .payment-detail span,
      .payment-detail strong {
        display: block;
      }

      .payment-detail span {
        color: #e04444;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 1px;
        margin-bottom: 9px;
      }

      .payment-detail strong {
        color: #fff;
        font-size: 19px;
        letter-spacing: 1px;
        overflow-wrap: anywhere;
      }

      .receipt-upload {
        position: relative;
        min-height: 125px;
        border: 1px dashed #555;
        border-radius: 12px;
        background: #0a0a0a;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 15px;
        box-sizing: border-box;
      }

      .receipt-upload input[type="file"] {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        z-index: 2;
      }

      .receipt-hint {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 7px;
        text-align: center;
        pointer-events: none;
      }

      .receipt-icon {
        color: #e04444;
        font-size: 28px;
      }

      .receipt-hint strong {
        color: #eee;
        font-size: 11px;
        font-weight: 950;
      }

      .receipt-hint small {
        color: #888;
        font-size: 10px;
      }

      .receipt-filename {
        color: #57d6a7;
        font-size: 10px;
        max-width: 100%;
        overflow-wrap: anywhere;
      }

      .info-warning {
        display: flex;
        gap: 10px;
        margin: 18px 0;
        padding: 13px;
        border: 1px solid rgba(230,172,55,.2);
        border-radius: 10px;
        background: rgba(230,172,55,.06);
      }

      .info-warning p {
        margin: 0;
        color: #c4b58f;
        font-size: 10px;
        line-height: 1.6;
      }

      .error-message {
        margin-top: 14px;
        padding: 11px;
        border-radius: 9px;
        background: rgba(220,50,50,.1);
        border: 1px solid rgba(220,50,50,.3);
        color: #ff8585;
        font-size: 11px;
      }

      .primary-button,
      .secondary-button {
        width: 100%;
        min-height: 49px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 950;
        cursor: pointer;
      }

      .primary-button {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        margin-top: 18px;
        color: white;
        border: 1px solid rgba(255,100,100,.4);
        background: linear-gradient(135deg,#bd3434,#791d1d);
        box-shadow: 0 10px 25px rgba(180,35,35,.18);
      }

      .primary-button:disabled {
        opacity: .6;
        cursor: not-allowed;
      }

      .secondary-button {
        margin-top: 12px;
        color: #bbb;
        border: 1px solid #333;
        background: #111;
      }

      .success-card {
        text-align: center;
      }

      .success-icon {
        width: 62px;
        height: 62px;
        margin: 5px auto 15px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: rgba(38,161,123,.13);
        border: 1px solid rgba(38,161,123,.4);
        color: #57d6a7;
        font-size: 30px;
        font-weight: 900;
      }

      .success-label {
        color: #57d6a7;
        font-size: 10px;
        font-weight: 950;
      }

      .success-card h2 {
        margin: 12px 0;
        font-size: 19px;
      }

      .success-card > p {
        color: #999;
        font-size: 11px;
        line-height: 1.6;
      }

      .reference-box {
        margin: 20px 0;
        padding: 14px;
        border-radius: 10px;
        background: #0a0a0a;
        border: 1px dashed #555;
      }

      .reference-box small,
      .reference-box strong {
        display: block;
      }

      .reference-box small {
        color: #999;
        font-size: 9px;
      }

      .reference-box strong {
        margin-top: 8px;
        color: #e9c16d;
        font-size: 14px;
        overflow-wrap: anywhere;
      }

      .summary {
        margin-bottom: 18px;
        text-align: left;
      }

      .summary > div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid #292929;
      }

      .summary span {
        color: #999;
        font-size: 10px;
      }

      .summary strong {
        color: #eee;
        font-size: 11px;
        text-align: right;
      }

      .summary .pending-status {
        color: #e9c16d;
      }

      .transfer-loading {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 15px;
        color: #aaa;
        font-size: 11px;
        font-weight: 900;
      }

      .transfer-logo {
        color: #e04444;
        font-size: 35px;
        font-weight: 950;
      }

      .transfer-spinner {
        width: 35px;
        height: 35px;
        border: 3px solid #333;
        border-top-color: #d04444;
        border-radius: 50%;
        animation: transfer-spin .8s linear infinite;
      }

      @keyframes transfer-spin {
        to { transform: rotate(360deg); }
      }

      @media (max-width: 420px) {
        .transfer-form,
        .success-card {
          padding: 16px;
        }

        .payment-detail strong {
          font-size: 16px;
        }

        .summary > div {
          flex-direction: column;
          gap: 5px;
        }

        .summary strong {
          text-align: left;
        }
      }
    `}</style>
  );
}
