
"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type PaymentSettings = {
  exchange_rate: number;
  transfer_phone: string;
};

type CreatedOrder = {
  id: string;
  amount_cup: number;
  balance_amount: number;
  status: string;
};

export default function ManualDepositPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [settings, setSettings] =
    useState<PaymentSettings | null>(null);

  const [amount, setAmount] = useState("");
  const [confirmationNumber, setConfirmationNumber] =
    useState("");

  const [receipt, setReceipt] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [order, setOrder] = useState<CreatedOrder | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [userToken, setUserToken] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const params = new URLSearchParams(
          window.location.search
        );

        const method = params.get("method") || "saldo_cup";

        if (method !== "saldo_cup") {
          router.replace("/balance");
          return;
        }

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
          "/api/manual-payment/settings",
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "No se pudo cargar la tasa."
          );
        }

        if (!active) return;

        setSettings({
          exchange_rate: Number(
            result.settings.exchange_rate
          ),
          transfer_phone:
            result.settings.transfer_phone,
        });
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la página."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const cupAmount = Number(amount);

  const creditAmount =
    settings &&
    Number.isFinite(cupAmount) &&
    cupAmount > 0
      ? Number(
          (cupAmount / settings.exchange_rate).toFixed(4)
        )
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
    const file = event.target.files?.[0];

    setError("");

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Selecciona una imagen JPG, PNG o WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar los 5 MB.");
      event.target.value = "";
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setReceipt(file);
    setPreview(URL.createObjectURL(file));
  }

  async function sendRequest() {
    if (sending) return;

    setError("");

    if (!userToken) {
      setError("Tu sesión ha expirado. Inicia sesión nuevamente.");
      return;
    }

    if (!settings) {
      setError("No se ha podido cargar la configuración.");
      return;
    }

    if (!Number.isFinite(cupAmount) || cupAmount <= 0) {
      setError("Introduce un importe válido en CUP.");
      return;
    }

    if (!receipt && !order) {
      setError("Debes seleccionar el comprobante de transferencia.");
      return;
    }

    setSending(true);

    try {
      let currentOrder = order;

      // PASO 1: Crear la solicitud.
      // Si ya existe una solicitud pendiente en esta pantalla,
      // no creamos otra al reintentar la subida.

      if (!currentOrder) {
        const orderResponse = await fetch(
          "/api/manual-payment/orders",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userToken}`,
            },
            body: JSON.stringify({
              amount_cup: cupAmount,
              confirmation_number:
                confirmationNumber.trim() || null,
            }),
          }
        );

        const orderResult = await orderResponse.json();

        if (!orderResponse.ok || !orderResult.success) {
          throw new Error(
            orderResult.error ||
              "No se pudo crear la solicitud."
          );
        }

        currentOrder = orderResult.order;
        setOrder(currentOrder);
      }

      // PASO 2: Subir el comprobante.
      if (!receipt) {
        throw new Error(
          "Selecciona el comprobante para continuar."
        );
      }

      const formData = new FormData();

      formData.append("order_id", currentOrder.id);
      formData.append("receipt", receipt);

      const receiptResponse = await fetch(
        "/api/manual-payment/receipt",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
          body: formData,
        }
      );

      const receiptResult = await receiptResponse.json();

      if (
        !receiptResponse.ok ||
        !receiptResult.success
      ) {
        throw new Error(
          receiptResult.error ||
            "No se pudo enviar el comprobante."
        );
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al enviar la solicitud."
      );
    } finally {
      setSending(false);
    }
  }

  async function copyPhone() {
    if (!settings?.transfer_phone) return;

    try {
      await navigator.clipboard.writeText(
        settings.transfer_phone
      );
    } catch {
      setError("No se pudo copiar el número.");
    }
  }

  if (loading) {
    return (
      <main className="manual-page">
        <div className="manual-loading">
          <div className="manual-spinner" />
          <p>CARGANDO SALDO CUP...</p>
        </div>
      </main>
    );
  }

  // CONFIRMACIÓN DE SOLICITUD ENVIADA
  if (success) {
    return (
      <main className="manual-page">
        <div className="manual-background" />

        <section className="manual-success">
          <div className="success-icon">✓</div>

          <small>STORE GAMING</small>

          <h1>
            SOLICITUD <span>ENVIADA</span>
          </h1>

          <p>
            Tu comprobante fue recibido correctamente.
            Tu solicitud está pendiente de revisión
            administrativa.
          </p>

          <div className="success-details">
            <div>
              <span>IMPORTE TRANSFERIDO</span>
              <strong>
                {cupAmount.toFixed(2)} CUP
              </strong>
            </div>

            <div>
              <span>CRÉDITO SOLICITADO</span>
              <strong>
                {creditAmount.toFixed(4)}
              </strong>
            </div>

            <div>
              <span>ESTADO</span>
              <strong className="pending-label">
                PENDIENTE DE APROBACIÓN
              </strong>
            </div>

            {order && (
              <div>
                <span>NÚMERO DE SOLICITUD</span>
                <strong className="order-reference">
                  {order.id}
                </strong>
              </div>
            )}
          </div>

          <p className="success-warning">
            Tu balance no se acreditará hasta que el
            administrador revise y apruebe el pago.
          </p>

          <button
            type="button"
            className="success-orders-button"
            onClick={() => router.push("/orders")}
          >
            <span>VER MI PEDIDO</span>
            <span>→</span>
          </button>

          <button
            type="button"
            className="success-balance-button"
            onClick={() => router.push("/balance")}
          >
            VOLVER A MI BILLETERA
          </button>
        </section>

        <ManualStyles />
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="manual-page">
        <div className="manual-background" />

        <section className="manual-error">
          <h2>NO SE PUDO CARGAR EL DEPÓSITO</h2>
          <p>{error || "Inténtalo nuevamente más tarde."}</p>

          <button
            type="button"
            onClick={() => router.push("/balance")}
          >
            VOLVER
          </button>
        </section>

        <ManualStyles />
      </main>
    );
  }

  return (
    <main className="manual-page">
      <div className="manual-background" />

      <header className="manual-header">
        <button
          type="button"
          className="manual-back"
          onClick={() => router.push("/balance")}
        >
          ←
        </button>

        <div>
          <small>STORE GAMING</small>
          <h1>
            SALDO <span>CUP</span>
          </h1>
        </div>

        <div className="manual-header-icon">💵</div>
      </header>

      <section className="manual-content">
        <div className="manual-intro">
          <span className="manual-tag">
            DEPÓSITO MANUAL
          </span>

          <h2>RECARGA TU BILLETERA</h2>

          <p>
            Realiza tu transferencia y envía el comprobante
            para que podamos verificar tu pago.
          </p>
        </div>

        {/* TASA DE CAMBIO */}
        <div className="manual-rate-card">
          <div>
            <small>TASA DE CAMBIO ACTUAL</small>
            <strong>
              1 BALANCE = {settings.exchange_rate} CUP
            </strong>
          </div>

          <span className="rate-icon">⇄</span>
        </div>

        {/* IMPORTE */}
        <div className="manual-card">
          <label htmlFor="cup-amount">
            IMPORTE QUE VAS A TRANSFERIR
          </label>

          <div className="manual-input-wrap">
            <input
              id="cup-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Ejemplo: 200"
              value={amount}
              onChange={handleAmountChange}
              disabled={sending || !!order}
            />

            <span>CUP</span>
          </div>

          <div className="manual-credit-result">
            <div>
              <small>RECIBES EN TU BILLETERA</small>
              <strong>
                {creditAmount.toFixed(4)}
              </strong>
            </div>

            <span>CRÉDITO</span>
          </div>
        </div>

        {/* TRANSFERENCIA */}
        <div className="manual-card">
          <div className="manual-section-title">
            <span>01</span>
            <div>
              <h3>REALIZA TU TRANSFERENCIA</h3>
              <p>Envía el importe al siguiente número.</p>
            </div>
          </div>

          <div className="manual-phone-box">
            <div>
              <small>NÚMERO DE TRANSFERENCIA</small>
              <strong>{settings.transfer_phone}</strong>
            </div>

            <button
              type="button"
              onClick={copyPhone}
            >
              COPIAR
            </button>
          </div>

          <div className="manual-notice">
            <span>!</span>
            <p>
              Verifica el importe y el destinatario antes
              de realizar la transferencia. Guarda el
              comprobante para adjuntarlo a continuación.
            </p>
          </div>
        </div>

        {/* COMPROBANTE */}
        <div className="manual-card">
          <div className="manual-section-title">
            <span>02</span>
            <div>
              <h3>ADJUNTA TU COMPROBANTE</h3>
              <p>Sube una imagen clara de la transferencia.</p>
            </div>
          </div>

          <label
            htmlFor="manual-receipt"
            className="manual-upload"
          >
            {preview ? (
              <img
                src={preview}
                alt="Vista previa del comprobante"
              />
            ) : (
              <>
                <span className="upload-icon">📷</span>
                <strong>SELECCIONAR IMAGEN</strong>
                <small>JPG · PNG · WEBP · MÁXIMO 5 MB</small>
              </>
            )}
          </label>

          <input
            id="manual-receipt"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleReceiptChange}
            disabled={sending}
            className="manual-file-input"
          />

          {receipt && (
            <div className="manual-file-name">
              <span>✓</span>
              {receipt.name}
            </div>
          )}

          <label
            htmlFor="confirmation-number"
            className="manual-confirmation-label"
          >
            NÚMERO DE CONFIRMACIÓN (OPCIONAL)
          </label>

          <input
            id="confirmation-number"
            className="manual-confirmation-input"
            type="text"
            placeholder="Introduce el número si aparece"
            value={confirmationNumber}
            onChange={(event) =>
              setConfirmationNumber(event.target.value)
            }
            disabled={sending || !!order}
            maxLength={100}
          />
        </div>

        {/* RESUMEN */}
        <div className="manual-summary">
          <h3>RESUMEN DE TU SOLICITUD</h3>

          <div>
            <span>Importe en CUP</span>
            <strong>
              {cupAmount > 0
                ? `${cupAmount.toFixed(2)} CUP`
                : "0.00 CUP"}
            </strong>
          </div>

          <div>
            <span>Tasa aplicada</span>
            <strong>{settings.exchange_rate}</strong>
          </div>

          <div className="summary-total">
            <span>CRÉDITO QUE RECIBIRÁS</span>
            <strong>{creditAmount.toFixed(4)}</strong>
          </div>
        </div>

        {order && (
          <div className="manual-notice">
            <span>!</span>
            <p>
              Tu solicitud ya fue creada. Si la subida del
              comprobante falló, puedes volver a intentarlo
              sin crear otra solicitud.
            </p>
          </div>
        )}

        {error && (
          <div className="manual-error-message">
            {error}
          </div>
        )}

        <button
          type="button"
          className="manual-submit"
          onClick={sendRequest}
          disabled={
            sending ||
            !amount ||
            cupAmount <= 0 ||
            !receipt
          }
        >
          {sending
            ? "ENVIANDO SOLICITUD..."
            : order
              ? "REINTENTAR ENVÍO DEL COMPROBANTE"
              : "ENVIAR SOLICITUD"}
          {!sending && <span>→</span>}
        </button>

        <div className="manual-security">
          <span>🛡️</span>
          <p>
            Tu solicitud será revisada por administración.
            El crédito solamente se añadirá a tu billetera
            después de la aprobación.
          </p>
        </div>

        <button
          type="button"
          className="manual-cancel"
          onClick={() => router.push("/balance")}
          disabled={sending}
        >
          CANCELAR Y VOLVER
        </button>
      </section>

      <ManualStyles />
    </main>
  );
}

function ManualStyles() {
  return (
    <style jsx global>{`
      .manual-page {
        min-height: 100vh;
        position: relative;
        overflow: hidden;
        background: #070707;
        color: #fff;
        padding-bottom: 45px;
        font-family: Arial, Helvetica, sans-serif;
      }

      .manual-background {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(
            circle at 50% 0%,
            rgba(190, 25, 35, .17),
            transparent 36%
          ),
          radial-gradient(
            circle at 100% 45%,
            rgba(120, 15, 25, .08),
            transparent 35%
          );
      }

      .manual-header {
        position: relative;
        z-index: 1;
        max-width: 650px;
        margin: auto;
        padding: 24px 18px;
        display: flex;
        align-items: center;
        gap: 15px;
        border-bottom: 1px solid rgba(255,255,255,.07);
      }

      .manual-back {
        width: 42px;
        height: 42px;
        border: 1px solid #303030;
        border-radius: 12px;
        background: #151515;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
      }

      .manual-header small,
      .manual-intro .manual-tag {
        color: #e13a45;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 2px;
      }

      .manual-header h1 {
        margin: 4px 0 0;
        font-size: 21px;
        font-weight: 950;
      }

      .manual-header h1 span {
        color: #ed3441;
      }

      .manual-header-icon {
        margin-left: auto;
        font-size: 27px;
      }

      .manual-content {
        position: relative;
        z-index: 1;
        width: min(100% - 28px, 600px);
        margin: 25px auto;
      }

      .manual-intro {
        margin-bottom: 22px;
      }

      .manual-intro h2 {
        margin: 10px 0 7px;
        font-size: 23px;
        font-weight: 950;
      }

      .manual-intro p {
        margin: 0;
        color: #999;
        font-size: 13px;
        line-height: 1.7;
      }

      .manual-rate-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 19px;
        margin-bottom: 15px;
        border: 1px solid rgba(225, 55, 66, .35);
        border-radius: 15px;
        background: linear-gradient(
          130deg,
          rgba(130, 20, 30, .24),
          #151515
        );
      }

      .manual-rate-card small,
      .manual-rate-card strong {
        display: block;
      }

      .manual-rate-card small {
        color: #aaa;
        font-size: 10px;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }

      .manual-rate-card strong {
        color: #fff;
        font-size: 17px;
        font-weight: 950;
      }

      .rate-icon {
        color: #f04450;
        font-size: 32px;
      }

      .manual-card {
        padding: 19px;
        margin-bottom: 15px;
        border: 1px solid #292929;
        border-radius: 15px;
        background: linear-gradient(145deg, #171717, #0d0d0d);
      }

      .manual-card > label {
        display: block;
        margin-bottom: 12px;
        color: #ddd;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .7px;
      }

      .manual-input-wrap {
        display: flex;
        align-items: center;
        border: 1px solid #3a3a3a;
        border-radius: 11px;
        background: #080808;
        padding: 0 14px;
      }

      .manual-input-wrap:focus-within {
        border-color: #e13a45;
      }

      .manual-input-wrap input {
        flex: 1;
        width: 100%;
        min-width: 0;
        padding: 16px 0;
        border: none;
        outline: none;
        background: transparent;
        color: #fff;
        font-size: 23px;
        font-weight: 900;
      }

      .manual-input-wrap input::-webkit-inner-spin-button,
      .manual-input-wrap input::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .manual-input-wrap span {
        color: #e74b56;
        font-size: 13px;
        font-weight: 900;
      }

      .manual-credit-result {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        margin-top: 14px;
        border-radius: 10px;
        background: rgba(35, 145, 90, .09);
        border: 1px solid rgba(35, 145, 90, .25);
      }

      .manual-credit-result small,
      .manual-credit-result strong {
        display: block;
      }

      .manual-credit-result small {
        color: #aaa;
        font-size: 10px;
        margin-bottom: 6px;
      }

      .manual-credit-result strong {
        color: #4cdb91;
        font-size: 23px;
        font-weight: 950;
      }

      .manual-credit-result > span {
        color: #4cdb91;
        font-size: 10px;
        font-weight: 900;
      }

      .manual-section-title {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        margin-bottom: 18px;
      }

      .manual-section-title > span {
        width: 30px;
        height: 30px;
        flex: 0 0 30px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 9px;
        background: rgba(220, 45, 58, .15);
        color: #f04450;
        font-weight: 950;
      }

      .manual-section-title h3 {
        margin: 2px 0 5px;
        font-size: 13px;
        font-weight: 950;
      }

      .manual-section-title p {
        margin: 0;
        color: #929292;
        font-size: 11px;
      }

      .manual-phone-box {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        padding: 15px;
        border: 1px dashed rgba(230, 55, 65, .45);
        border-radius: 11px;
        background: rgba(160, 20, 30, .08);
      }

      .manual-phone-box small,
      .manual-phone-box strong {
        display: block;
      }

      .manual-phone-box small {
        color: #999;
        font-size: 9px;
        margin-bottom: 7px;
      }

      .manual-phone-box strong {
        font-size: 23px;
        letter-spacing: 2px;
      }

      .manual-phone-box button {
        padding: 10px 13px;
        border: 1px solid #853039;
        border-radius: 8px;
        background: #321317;
        color: #ff6670;
        font-size: 10px;
        font-weight: 900;
        cursor: pointer;
      }

      .manual-notice {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px;
        margin-top: 13px;
        border-radius: 9px;
        background: rgba(255, 190, 70, .06);
        border: 1px solid rgba(255, 190, 70, .13);
      }

      .manual-notice > span {
        color: #f0bd5e;
        font-weight: 950;
      }

      .manual-notice p {
        margin: 0;
        color: #b7a98c;
        font-size: 11px;
        line-height: 1.6;
      }

      .manual-upload {
        min-height: 170px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 10px;
        padding: 15px;
        overflow: hidden;
        border: 1px dashed #654047;
        border-radius: 12px;
        background: #0b0b0b;
        cursor: pointer;
        text-align: center;
      }

      .manual-upload img {
        display: block;
        width: 100%;
        max-height: 280px;
        object-fit: contain;
        border-radius: 8px;
      }

      .upload-icon {
        font-size: 34px;
      }

      .manual-upload strong {
        color: #f15a64;
        font-size: 12px;
      }

      .manual-upload small {
        color: #777;
        font-size: 9px;
      }

      .manual-file-input {
        display: none;
      }

      .manual-file-name {
        margin-top: 10px;
        color: #57d995;
        font-size: 11px;
        overflow-wrap: anywhere;
      }

      .manual-confirmation-label {
        display: block;
        margin-top: 20px;
        margin-bottom: 9px;
        color: #bbb;
        font-size: 10px;
        font-weight: 900;
      }

      .manual-confirmation-input {
        box-sizing: border-box;
        width: 100%;
        padding: 13px;
        border: 1px solid #343434;
        border-radius: 9px;
        outline: none;
        background: #090909;
        color: #fff;
        font-size: 13px;
      }

      .manual-confirmation-input:focus {
        border-color: #e13a45;
      }

      .manual-summary {
        padding: 18px;
        margin-bottom: 16px;
        border: 1px solid #292929;
        border-radius: 13px;
        background: #111;
      }

      .manual-summary h3 {
        margin: 0 0 17px;
        font-size: 12px;
        font-weight: 950;
      }

      .manual-summary > div {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-top: 13px;
        color: #aaa;
        font-size: 12px;
      }

      .manual-summary strong {
        color: #fff;
      }

      .manual-summary .summary-total {
        padding-top: 15px;
        border-top: 1px solid #333;
        color: #eee;
        font-weight: 900;
      }

      .manual-summary .summary-total strong {
        color: #4cdb91;
        font-size: 19px;
      }

      .manual-error-message {
        padding: 13px;
        margin-bottom: 14px;
        border: 1px solid rgba(240, 60, 70, .35);
        border-radius: 9px;
        background: rgba(180, 20, 30, .12);
        color: #ff737c;
        font-size: 12px;
        line-height: 1.5;
      }

      .manual-submit {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 12px;
        padding: 17px;
        border: 1px solid #ff5965;
        border-radius: 11px;
        background: linear-gradient(135deg, #d52b39, #94151f);
        box-shadow: 0 10px 28px rgba(200, 25, 40, .2);
        color: white;
        font-size: 12px;
        font-weight: 950;
        letter-spacing: .5px;
        cursor: pointer;
      }

      .manual-submit:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      .manual-submit span {
        font-size: 19px;
      }

      .manual-security {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        margin-top: 17px;
        padding: 13px;
        border-radius: 9px;
        background: rgba(255,255,255,.035);
      }

      .manual-security p {
        margin: 0;
        color: #999;
        font-size: 10px;
        line-height: 1.6;
      }

      .manual-cancel {
        display: block;
        margin: 18px auto 0;
        padding: 10px;
        border: none;
        background: transparent;
        color: #888;
        font-size: 10px;
        font-weight: 900;
        cursor: pointer;
      }

      .manual-cancel:disabled {
        opacity: .4;
      }

      .manual-loading,
      .manual-error {
        position: relative;
        z-index: 1;
        min-height: 75vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 15px;
        text-align: center;
        padding: 20px;
      }

      .manual-loading p {
        color: #e94a55;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 2px;
      }

      .manual-spinner {
        width: 38px;
        height: 38px;
        border: 3px solid #333;
        border-top-color: #e13a45;
        border-radius: 50%;
        animation: manual-spin .8s linear infinite;
      }

      @keyframes manual-spin {
        to { transform: rotate(360deg); }
      }

      .manual-success {
        position: relative;
        z-index: 1;
        width: min(100% - 30px, 480px);
        margin: 70px auto;
        padding: 25px;
        border: 1px solid #303030;
        border-radius: 17px;
        background: linear-gradient(145deg, #181818, #090909);
        text-align: center;
      }

      .success-icon {
        width: 65px;
        height: 65px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 0 auto 20px;
        border-radius: 50%;
        background: rgba(60, 200, 120, .13);
        border: 1px solid #3b9d68;
        color: #53dc91;
        font-size: 35px;
      }

      .manual-success > small {
        color: #e54b56;
        font-weight: 900;
        letter-spacing: 2px;
      }

      .manual-success h1 {
        font-size: 22px;
        font-weight: 950;
      }

      .manual-success h1 span {
        color: #e84b57;
      }

      .manual-success > p {
        color: #aaa;
        font-size: 12px;
        line-height: 1.7;
      }

      .success-details {
        padding: 15px;
        margin: 20px 0;
        border-radius: 11px;
        background: #0b0b0b;
        text-align: left;
      }

      .success-details > div {
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 10px 0;
        border-bottom: 1px solid #292929;
      }

      .success-details > div:last-child {
        border: none;
      }

      .success-details span {
        color: #888;
        font-size: 9px;
        font-weight: 900;
      }

      .success-details strong {
        color: #fff;
        font-size: 14px;
      }

      .success-details .pending-label {
        color: #e8b65c;
        font-size: 11px;
      }

      .success-details .order-reference {
        overflow-wrap: anywhere;
        font-size: 10px;
      }

      .manual-success .success-warning {
        color: #e6bb69;
        font-size: 11px;
      }

      /* BOTÓN PARA VER EL PEDIDO */
      .manual-success > .success-orders-button {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 16px 18px;
        margin-top: 20px;
        border: 1px solid #ff5965;
        border-radius: 10px;
        background: linear-gradient(135deg, #d52b39, #94151f);
        color: #fff;
        font-size: 12px;
        font-weight: 950;
        cursor: pointer;
        box-shadow: 0 8px 25px rgba(200, 25, 40, .2);
      }

      .manual-success > .success-orders-button span:last-child {
        font-size: 21px;
      }

      /* BOTÓN PARA VOLVER A LA BILLETERA */
      .manual-success > .success-balance-button {
        width: 100%;
        padding: 14px;
        margin-top: 10px;
        border: 1px solid #383838;
        border-radius: 10px;
        background: #171717;
        color: #ccc;
        font-size: 11px;
        font-weight: 900;
        cursor: pointer;
      }

      .manual-error h2 {
        color: #ef515d;
      }

      .manual-error p {
        color: #aaa;
      }

      .manual-error button {
        width: 100%;
        padding: 15px;
        margin-top: 12px;
        border: 0;
        border-radius: 9px;
        background: linear-gradient(135deg, #d52b39, #94151f);
        color: #fff;
        font-size: 11px;
        font-weight: 950;
        cursor: pointer;
      }

      @media (max-width: 400px) {
        .manual-content {
          width: calc(100% - 22px);
        }

        .manual-card {
          padding: 14px;
        }

        .manual-rate-card strong {
          font-size: 14px;
        }

        .manual-phone-box strong {
          font-size: 20px;
        }
      }
    `}</style>
  );
}
