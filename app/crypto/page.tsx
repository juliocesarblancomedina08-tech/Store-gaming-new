
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Direction = "buy" | "sell";
type PaymentMethod = "cup" | "mobile";
type BuyStep = "method" | "amount" | "payment" | "proof";

type CryptoSettings = {
  buy_cup_rate: number;
  buy_mobile_rate: number;
  sell_cup_rate: number;
  sell_mobile_rate: number;
  bep20_wallet: string;
  payment_instructions: string;
};

type CryptoOrder = {
  id: string;
  direction: Direction;
  payment_method: PaymentMethod;
  amount_usdt: number;
  rate: number;
  fiat_amount: number;
  wallet_address: string;
  contact: string;
  payment_reference: string;
  status: string;
  admin_note: string;
  created_at: string;
};

const MOBILE_NUMBER = "58617939";
const CUP_CARD = "9238-9598-7208-5651";
const PROOF_BUCKET = "crypto-proofs";
const MAX_PROOF_SIZE = 5 * 1024 * 1024;

const initialSettings: CryptoSettings = {
  buy_cup_rate: 0,
  buy_mobile_rate: 0,
  sell_cup_rate: 0,
  sell_mobile_rate: 0,
  bep20_wallet: "",
  payment_instructions: "",
};

const statusLabels: Record<string, string> = {
  pending: "PENDIENTE",
  payment_review: "REVISANDO PAGO",
  approved: "APROBADA",
  completed: "COMPLETADA",
  rejected: "RECHAZADA",
};

export default function CryptoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [settings, setSettings] =
    useState<CryptoSettings>(initialSettings);
  const [orders, setOrders] = useState<CryptoOrder[]>([]);

  const [direction, setDirection] = useState<Direction | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cup");
  const [buyStep, setBuyStep] = useState<BuyStep>("method");

  const [amount, setAmount] = useState("10");
  const [walletAddress, setWalletAddress] = useState("");
  const [contact, setContact] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadOrders = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("crypto_orders")
      .select(
        "id,direction,payment_method,amount_usdt,rate,fiat_amount,wallet_address,contact,payment_reference,status,admin_note,created_at"
      )
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error cargando solicitudes:", error);
      return;
    }

    setOrders((data || []) as CryptoOrder[]);
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      router.replace("/");
      return;
    }

    setUserId(session.user.id);

    const { data, error } = await supabase
      .from("crypto_settings")
      .select(
        "buy_cup_rate,buy_mobile_rate,sell_cup_rate,sell_mobile_rate,bep20_wallet,payment_instructions"
      )
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error cargando tasas:", error);
      setErrorMessage(
        "No se pudieron cargar las tasas. Comprueba la configuración de Supabase."
      );
    } else if (data) {
      setSettings({
        buy_cup_rate: Number(data.buy_cup_rate),
        buy_mobile_rate: Number(data.buy_mobile_rate),
        sell_cup_rate: Number(data.sell_cup_rate),
        sell_mobile_rate: Number(data.sell_mobile_rate),
        bep20_wallet: data.bep20_wallet || "",
        payment_instructions: data.payment_instructions || "",
      });
    }

    await loadOrders(session.user.id);
    setLoading(false);
  }, [loadOrders, router]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const rate =
    direction === "buy"
      ? paymentMethod === "cup"
        ? settings.buy_cup_rate
        : settings.buy_mobile_rate
      : paymentMethod === "cup"
        ? settings.sell_cup_rate
        : settings.sell_mobile_rate;

  const parsedAmount = Number(amount);
  const validAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0;
  const total =
    validAmount && rate > 0 ? parsedAmount * rate : 0;

  function formatNumber(value: number) {
    return value.toLocaleString("es-ES", {
      maximumFractionDigits: 2,
    });
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setErrorMessage("");
      setSuccessMessage("Copiado correctamente.");
    } catch {
      setErrorMessage(
        "No se pudo copiar automáticamente. Mantén pulsado el dato para copiarlo."
      );
    }
  }

  function openDirection(value: Direction) {
    setDirection(value);
    setPaymentMethod("cup");
    setBuyStep("method");
    setAmount("10");
    setWalletAddress("");
    setContact("");
    setPaymentReference("");
    setProofFile(null);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function returnToCards() {
    setDirection(null);
    setErrorMessage("");
    setSuccessMessage("");
    setProofFile(null);
  }

  function continueFromAmount() {
    setErrorMessage("");

    if (!validAmount) {
      setErrorMessage("Introduce una cantidad de USDT válida.");
      return;
    }

    if (!Number.isFinite(rate) || rate <= 0) {
      setErrorMessage(
        "Esta tasa no está disponible. El administrador debe configurarla."
      );
      return;
    }

    setBuyStep("payment");
  }

  function selectProof(file: File | null) {
    setErrorMessage("");
    setProofFile(null);

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("El comprobante debe ser una imagen.");
      return;
    }

    if (file.size > MAX_PROOF_SIZE) {
      setErrorMessage("La imagen no puede superar los 5 MB.");
      return;
    }

    setProofFile(file);
  }

  async function submitOrder() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!userId || !direction) return;

    if (!validAmount) {
      setErrorMessage("Introduce una cantidad de USDT válida.");
      return;
    }

    if (!contact.trim()) {
      setErrorMessage(
        "Introduce el número de teléfono desde el que realizaste el pago."
      );
      return;
    }

    if (direction === "buy") {
      if (!walletAddress.trim()) {
        setErrorMessage(
          "Introduce tu dirección de recepción USDT BEP20."
        );
        return;
      }

      if (!proofFile) {
        setErrorMessage("Adjunta la foto del comprobante del pago.");
        return;
      }
    }

    if (direction === "sell" && !paymentReference.trim()) {
      setErrorMessage(
        "Introduce el TXID de la operación o una referencia para identificar el envío."
      );
      return;
    }

    if (direction === "sell" && !settings.bep20_wallet.trim()) {
      setErrorMessage(
        "La dirección BEP20 de recepción todavía no está configurada."
      );
      return;
    }

    setSaving(true);

    const { data: freshSettings, error: settingsError } =
      await supabase
        .from("crypto_settings")
        .select(
          "buy_cup_rate,buy_mobile_rate,sell_cup_rate,sell_mobile_rate,bep20_wallet"
        )
        .eq("id", 1)
        .single();

    if (settingsError || !freshSettings) {
      setSaving(false);
      setErrorMessage("No se pudieron verificar las tasas actuales.");
      return;
    }

    const currentRate = Number(
      direction === "buy"
        ? paymentMethod === "cup"
          ? freshSettings.buy_cup_rate
          : freshSettings.buy_mobile_rate
        : paymentMethod === "cup"
          ? freshSettings.sell_cup_rate
          : freshSettings.sell_mobile_rate
    );

    if (!Number.isFinite(currentRate) || currentRate <= 0) {
      setSaving(false);
      setErrorMessage("La tasa seleccionada no está disponible.");
      return;
    }

    const roundedTotal = Number(
      (parsedAmount * currentRate).toFixed(2)
    );

    let savedReference = paymentReference.trim();

    if (direction === "buy" && proofFile) {
      const safeName = proofFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const filePath =
        `${userId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(PROOF_BUCKET)
        .upload(filePath, proofFile, {
          contentType: proofFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Error subiendo comprobante:", uploadError);
        setSaving(false);
        setErrorMessage(
          "No se pudo subir el comprobante. Comprueba que el almacenamiento crypto-proofs esté creado y configurado."
        );
        return;
      }

      // Se guarda la ruta privada del archivo en la columna existente.
      savedReference = `PROOF: ${filePath}`;
    }

    const { data: created, error } = await supabase
      .from("crypto_orders")
      .insert({
        user_id: userId,
        direction,
        payment_method: paymentMethod,
        amount_usdt: parsedAmount,
        rate: currentRate,
        fiat_amount: roundedTotal,
        wallet_address:
          direction === "buy"
            ? walletAddress.trim()
            : freshSettings.bep20_wallet,
        contact: contact.trim(),
        payment_reference: savedReference,
        status: direction === "buy" ? "payment_review" : "pending",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !created) {
      console.error("Error creando solicitud:", error);
      setErrorMessage(
        "No se pudo registrar la solicitud. Comprueba los datos e inténtalo de nuevo."
      );
      return;
    }

    setSuccessMessage(
      `Tu solicitud ${created.id} fue enviada al sistema. Espera a que los administradores la revisen.`
    );

    setDirection(null);
    setProofFile(null);
    await loadOrders(userId);
  }

  if (loading) {
    return (
      <main className="crypto-page">
        <p className="crypto-muted">Cargando STORE GAMING...</p>
      </main>
    );
  }

  return (
    <main className="crypto-page">
      <header className="crypto-header">
        <button
          className="crypto-back"
          onClick={() => router.push("/home")}
          type="button"
        >
          ← Volver al Home
        </button>

        <div className="crypto-brand">🛒 STORE GAMING 🎮</div>
        <h1>COMPRA Y VENTA DE CRIPTO</h1>
        <p>USDT · Red BEP20 · Confirmación manual</p>
      </header>

      {successMessage && (
        <div className="crypto-confirmation" role="status">
          <div className="crypto-check">✓</div>
          <h2>¡Solicitud enviada!</h2>
          <p>{successMessage}</p>
          <p>
            Espera a que los administradores acepten tu solicitud.
            Si hay algún retraso, consulta con soporte.
          </p>
          <button
            className="crypto-submit"
            type="button"
            onClick={() => setSuccessMessage("")}
          >
            ENTENDIDO
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="crypto-error" role="alert">
          {errorMessage}
        </div>
      )}

      {!direction ? (
        <section className="crypto-cards">
          <button
            className="crypto-card crypto-buy"
            onClick={() => openDirection("buy")}
            type="button"
          >
            <span className="crypto-symbol">↓</span>
            <span className="crypto-tag">USDT BEP20</span>
            <strong>COMPRAR CRIPTO</strong>
            <span>
              Paga en CUP o saldo móvil y solicita tus USDT.
            </span>
            <b>CONTINUAR →</b>
          </button>

          <button
            className="crypto-card crypto-sell"
            onClick={() => openDirection("sell")}
            type="button"
          >
            <span className="crypto-symbol">↑</span>
            <span className="crypto-tag">USDT BEP20</span>
            <strong>VENDER CRIPTO</strong>
            <span>
              Solicita vender tus USDT y recibir tu pago.
            </span>
            <b>CONTINUAR →</b>
          </button>
        </section>
      ) : direction === "buy" ? (
        <section className="crypto-form">
          <button
            type="button"
            className="crypto-back"
            onClick={returnToCards}
          >
            ← Elegir otra operación
          </button>

          <div className="crypto-step-label">
            COMPRA DE USDT · RED BEP20
          </div>
          <h2>Bienvenido a la compra de cripto de STORE GAMING</h2>

          {buyStep === "method" && (
            <>
              <p className="crypto-muted">
                Seleccione con cuál método de pago desea realizar la compra.
              </p>

              <div className="crypto-methods">
                <button
                  type="button"
                  className={`crypto-method ${
                    paymentMethod === "mobile" ? "selected" : ""
                  }`}
                  onClick={() => {
                    setPaymentMethod("mobile");
                    setErrorMessage("");
                  }}
                >
                  <span className="method-icon">📱</span>
                  <strong>Saldo móvil</strong>
                  <small>Pago por teléfono</small>
                </button>

                <button
                  type="button"
                  className={`crypto-method ${
                    paymentMethod === "cup" ? "selected" : ""
                  }`}
                  onClick={() => {
                    setPaymentMethod("cup");
                    setErrorMessage("");
                  }}
                >
                  <span className="method-icon">💳</span>
                  <strong>Transferencia CUP</strong>
                  <small>Pago por tarjeta</small>
                </button>
              </div>

              <div className="crypto-total">
                <span>Método seleccionado</span>
                <strong>
                  {paymentMethod === "cup"
                    ? "Transferencia CUP"
                    : "Saldo móvil"}
                </strong>
                <span>Precio actual</span>
                <strong>
                  {rate > 0
                    ? `1 USDT = ${formatNumber(rate)} ${
                        paymentMethod === "cup" ? "CUP" : "saldo móvil"
                      }`
                    : "Tasa no disponible"}
                </strong>
              </div>

              <button
                className="crypto-submit"
                type="button"
                disabled={rate <= 0}
                onClick={() => {
                  setErrorMessage("");
                  setBuyStep("amount");
                }}
              >
                CONTINUAR →
              </button>
            </>
          )}

          {buyStep === "amount" && (
            <>
              <div className="crypto-total">
                <span>Método seleccionado</span>
                <strong>
                  {paymentMethod === "cup"
                    ? "Transferencia CUP"
                    : "Saldo móvil"}
                </strong>
                <span>Precio actual</span>
                <strong>
                  {rate > 0
                    ? `1 USDT = ${formatNumber(rate)} ${
                        paymentMethod === "cup" ? "CUP" : "saldo móvil"
                      }`
                    : "No disponible"}
                </strong>
              </div>

              <label htmlFor="buy-amount">Cantidad de USDT</label>
              <input
                id="buy-amount"
                type="number"
                min="0.00000001"
                step="any"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Ej.: 10"
              />

              <div className="crypto-total">
                <span>Importe que debes pagar</span>
                <strong className="crypto-big-total">
                  {total > 0
                    ? `${formatNumber(total)} ${
                        paymentMethod === "cup" ? "CUP" : "saldo móvil"
                      }`
                    : "—"}
                </strong>
              </div>

              <button
                className="crypto-submit"
                type="button"
                onClick={continueFromAmount}
              >
                CONTINUAR AL PAGO →
              </button>

              <button
                className="crypto-secondary"
                type="button"
                onClick={() => setBuyStep("method")}
              >
                ← Cambiar método de pago
              </button>
            </>
          )}

          {buyStep === "payment" && (
            <>
              <h3>Realiza el pago</h3>

              <div className="crypto-total">
                <span>Método seleccionado</span>
                <strong>
                  {paymentMethod === "cup"
                    ? "Transferencia CUP"
                    : "Saldo móvil"}
                </strong>
                <span>Precio por USDT</span>
                <strong>
                  1 USDT = {formatNumber(rate)}{" "}
                  {paymentMethod === "cup" ? "CUP" : "saldo móvil"}
                </strong>
                <span>Total a pagar</span>
                <strong className="crypto-big-total">
                  {formatNumber(total)}{" "}
                  {paymentMethod === "cup" ? "CUP" : "saldo móvil"}
                </strong>
              </div>

              {paymentMethod === "cup" ? (
                <div className="crypto-payment-card">
                  <h3>💳 Datos para transferencia CUP</h3>

                  <label>Número de tarjeta</label>
                  <div className="crypto-copy-row">
                    <code>{CUP_CARD}</code>
                    <button
                      type="button"
                      className="crypto-copy"
                      onClick={() => void copyText(CUP_CARD)}
                    >
                      COPIAR
                    </button>
                  </div>

                  <label>Número a confirmar</label>
                  <div className="crypto-copy-row">
                    <code>{MOBILE_NUMBER}</code>
                    <button
                      type="button"
                      className="crypto-copy"
                      onClick={() => void copyText(MOBILE_NUMBER)}
                    >
                      COPIAR
                    </button>
                  </div>

                  <div className="crypto-recipient-warning">
                    <strong>
                      ⚠️ Antes de realizar el pago, seleccione el espacio ✅️
                    </strong>
                    <p>El receptor recibe mi número de teléfono.</p>
                  </div>
                </div>
              ) : (
                <div className="crypto-payment-card">
                  <h3>📱 Pago por saldo móvil</h3>
                  <p>Envía el saldo móvil al siguiente número:</p>

                  <div className="crypto-copy-row">
                    <code>{MOBILE_NUMBER}</code>
                    <button
                      type="button"
                      className="crypto-copy"
                      onClick={() => void copyText(MOBILE_NUMBER)}
                    >
                      COPIAR
                    </button>
                  </div>

                  <div className="crypto-recipient-warning">
                    Comprueba el número y el importe antes de confirmar el envío.
                  </div>
                </div>
              )}

              {settings.payment_instructions && (
                <div className="crypto-instructions">
                  <strong>Instrucciones adicionales</strong>
                  <p>{settings.payment_instructions}</p>
                </div>
              )}

              <button
                className="crypto-submit"
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setBuyStep("proof");
                }}
              >
                YA REALICÉ EL PAGO →
              </button>

              <button
                className="crypto-secondary"
                type="button"
                onClick={() => setBuyStep("amount")}
              >
                ← Volver
              </button>
            </>
          )}

          {buyStep === "proof" && (
            <>
              <h3>Finalizar tu pedido</h3>

              <div className="crypto-proof-heading">
                <span>📷</span>
                <strong>
                  Suba la foto del comprobante del pago para terminar con su pedido
                </strong>
              </div>

              <label htmlFor="crypto-proof">Foto del comprobante</label>
              <input
                id="crypto-proof"
                className="crypto-file"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  selectProof(event.target.files?.[0] || null)
                }
              />
              <small className="crypto-muted">
                Formatos de imagen compatibles. Tamaño máximo: 5 MB.
              </small>

              {proofFile && (
                <div className="crypto-file-selected">
                  ✓ Imagen seleccionada: {proofFile.name}
                </div>
              )}

              <label htmlFor="crypto-wallet">
                Deje su dirección de billetera BEP20 a recibir
              </label>
              <input
                id="crypto-wallet"
                value={walletAddress}
                onChange={(event) => setWalletAddress(event.target.value)}
                placeholder="Tu dirección USDT BEP20"
                autoComplete="off"
              />

              <label htmlFor="crypto-contact">
                Número de teléfono desde el que realizó el pago
              </label>
              <input
                id="crypto-contact"
                type="tel"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="Introduce el número utilizado para pagar"
              />

              <div className="crypto-warning">
                Revisa que la dirección sea de la red BEP20. La solicitud
                quedará pendiente de revisión hasta que el administrador
                compruebe el pago.
              </div>

              <button
                className="crypto-submit"
                type="button"
                onClick={() => void submitOrder()}
                disabled={saving}
              >
                {saving ? "ENVIANDO SOLICITUD..." : "ENVIAR SOLICITUD"}
              </button>

              <button
                className="crypto-secondary"
                type="button"
                onClick={() => setBuyStep("payment")}
                disabled={saving}
              >
                ← Volver a los datos de pago
              </button>
            </>
          )}
        </section>
      ) : (
        <section className="crypto-form">
          <button
            type="button"
            className="crypto-back"
            onClick={returnToCards}
          >
            ← Elegir otra operación
          </button>

          <div className="crypto-step-label">VENTA DE USDT · RED BEP20</div>
          <h2>VENDER USDT</h2>
          <p className="crypto-muted">
            Envía tu solicitud para vender USDT y recibir el pago
            mediante el método seleccionado.
          </p>

          <label htmlFor="sell-method">Método para recibir el pago</label>
          <select
            id="sell-method"
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as PaymentMethod)
            }
          >
            <option value="cup">Transferencia CUP</option>
            <option value="mobile">Saldo móvil</option>
          </select>

          <label htmlFor="sell-amount">Cantidad de USDT</label>
          <input
            id="sell-amount"
            type="number"
            min="0.00000001"
            step="any"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Ej.: 10"
          />

          <div className="crypto-total">
            <span>Tasa actual de venta</span>
            <strong>
              {rate > 0
                ? `1 USDT = ${formatNumber(rate)} ${
                    paymentMethod === "cup" ? "CUP" : "saldo móvil"
                  }`
                : "No disponible"}
            </strong>
            <span>Importe calculado</span>
            <strong>
              {total > 0
                ? `${formatNumber(total)} ${
                    paymentMethod === "cup" ? "CUP" : "saldo móvil"
                  }`
                : "—"}
            </strong>
          </div>

          <div className="crypto-wallet-box">
            <strong>Dirección BEP20 para enviar los USDT</strong>
            <p>{settings.bep20_wallet || "Dirección no configurada."}</p>
            {settings.bep20_wallet && (
              <button
                className="crypto-copy"
                type="button"
                onClick={() => void copyText(settings.bep20_wallet)}
              >
                COPIAR DIRECCIÓN
              </button>
            )}
            <small>
              Verifica la red antes de enviar. No envíes fondos hasta
              confirmar los detalles de la operación.
            </small>
          </div>

          <label htmlFor="sell-reference">TXID o referencia del envío</label>
          <input
            id="sell-reference"
            value={paymentReference}
            onChange={(event) => setPaymentReference(event.target.value)}
            placeholder="Identificador de la transacción"
          />

          <label htmlFor="sell-contact">Número de contacto</label>
          <input
            id="sell-contact"
            type="tel"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="Teléfono para recibir el pago"
          />

          {settings.payment_instructions && (
            <div className="crypto-instructions">
              <strong>Instrucciones</strong>
              <p>{settings.payment_instructions}</p>
            </div>
          )}

          <div className="crypto-warning">
            La solicitud requiere revisión manual. No se confirma el pago
            hasta que el administrador compruebe la operación.
          </div>

          <button
            type="button"
            className="crypto-submit"
            onClick={() => void submitOrder()}
            disabled={saving || rate <= 0}
          >
            {saving ? "REGISTRANDO..." : "REGISTRAR SOLICITUD"}
          </button>
        </section>
      )}

      <section className="crypto-history">
        <h2>MIS SOLICITUDES</h2>

        {orders.length === 0 ? (
          <p className="crypto-muted">
            Todavía no tienes solicitudes de cripto.
          </p>
        ) : (
          orders.map((order) => (
            <article className="crypto-order" key={order.id}>
              <div className="crypto-order-heading">
                <strong>
                  {order.direction === "buy" ? "COMPRA" : "VENTA"} USDT
                </strong>
                <span className={`crypto-status status-${order.status}`}>
                  {statusLabels[order.status] || order.status}
                </span>
              </div>

              <p>
                Cantidad: {formatNumber(Number(order.amount_usdt))} USDT
              </p>
              <p>
                Total: {formatNumber(Number(order.fiat_amount))}{" "}
                {order.payment_method === "cup" ? "CUP" : "saldo móvil"}
              </p>
              <p>Referencia: {order.id}</p>
              <small>
                {new Date(order.created_at).toLocaleString("es-ES")}
              </small>

              {order.admin_note && (
                <p className="crypto-note">
                  Nota de administración: {order.admin_note}
                </p>
              )}
            </article>
          ))
        )}
      </section>

      <footer className="crypto-footer">
        STORE GAMING · Operaciones USDT BEP20
      </footer>

      <style jsx>{`
        .crypto-page {
          min-height: 100vh;
          padding: 24px 16px 50px;
          color: #f5f5f5;
          background:
            radial-gradient(ellipse at top, #321015 0, transparent 50%),
            #090909;
          font-family: Arial, sans-serif;
        }
        .crypto-header,
        .crypto-history {
          max-width: 760px;
          margin: 0 auto 28px;
        }
        .crypto-header {
          text-align: center;
        }
        .crypto-back {
          display: block;
          margin-bottom: 20px;
          border: 1px solid #393939;
          border-radius: 8px;
          padding: 10px 13px;
          background: #171717;
          color: white;
          cursor: pointer;
        }
        .crypto-brand {
          color: #ff3648;
          font-weight: 900;
          letter-spacing: 2px;
        }
        .crypto-header h1 {
          font-size: clamp(22px, 5vw, 34px);
        }
        .crypto-header p,
        .crypto-muted {
          color: #aaa;
          line-height: 1.6;
        }
        .crypto-cards {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          max-width: 760px;
          margin: 0 auto 40px;
        }
        .crypto-card {
          display: flex;
          min-height: 245px;
          flex-direction: column;
          align-items: flex-start;
          gap: 13px;
          padding: 22px;
          border: 1px solid #383838;
          border-radius: 16px;
          color: white;
          background: linear-gradient(145deg, #1d1d1d, #101010);
          text-align: left;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s;
        }
        .crypto-card:hover {
          transform: translateY(-3px);
        }
        .crypto-card strong {
          font-size: 19px;
        }
        .crypto-card > span:not(.crypto-symbol):not(.crypto-tag) {
          color: #c7c7c7;
          line-height: 1.5;
        }
        .crypto-buy {
          border-top: 3px solid #37c987;
        }
        .crypto-sell {
          border-top: 3px solid #f5bd42;
        }
        .crypto-symbol {
          font-size: 38px;
          font-weight: 900;
        }
        .crypto-tag {
          color: #f5c542;
          font-size: 11px;
        }
        .crypto-card b {
          margin-top: auto;
          color: #ff4858;
        }
        .crypto-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 560px;
          margin: 0 auto 40px;
          padding: 22px;
          border: 1px solid #333;
          border-radius: 16px;
          background: #141414;
          box-shadow: 0 15px 50px #0005;
        }
        .crypto-form h2 {
          margin: 0 0 8px;
          line-height: 1.35;
        }
        .crypto-form h3 {
          margin: 8px 0;
        }
        .crypto-step-label {
          color: #ff5968;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }
        .crypto-form label {
          margin-top: 6px;
          font-size: 13px;
          font-weight: 700;
        }
        .crypto-form input,
        .crypto-form select {
          width: 100%;
          box-sizing: border-box;
          padding: 13px;
          border: 1px solid #444;
          border-radius: 8px;
          color: white;
          background: #090909;
        }
        .crypto-form input:focus,
        .crypto-form select:focus {
          outline: 1px solid #ff3648;
          border-color: #ff3648;
        }
        .crypto-methods {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .crypto-method {
          display: flex;
          min-height: 135px;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 9px;
          padding: 15px;
          border: 1px solid #393939;
          border-radius: 12px;
          color: white;
          background: #0c0c0c;
          text-align: left;
          cursor: pointer;
        }
        .crypto-method.selected {
          border-color: #ff3648;
          background: #291316;
          box-shadow: inset 0 0 0 1px #ff3648;
        }
        .method-icon {
          font-size: 27px;
        }
        .crypto-method small {
          color: #aaa;
        }
        .crypto-total,
        .crypto-wallet-box,
        .crypto-instructions,
        .crypto-warning,
        .crypto-payment-card {
          padding: 15px;
          border: 1px solid #303030;
          border-radius: 10px;
          background: #202020;
          overflow-wrap: anywhere;
        }
        .crypto-total {
          display: grid;
          gap: 8px;
        }
        .crypto-total span,
        .crypto-wallet-box small {
          color: #aaa;
        }
        .crypto-big-total {
          color: #78e6ac;
          font-size: 21px;
        }
        .crypto-wallet-box p {
          overflow-wrap: anywhere;
          line-height: 1.6;
        }
        .crypto-wallet-box small {
          display: block;
          margin-top: 10px;
          line-height: 1.6;
        }
        .crypto-wallet-box label {
          display: block;
          margin-bottom: 8px;
        }
        .crypto-payment-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-color: #464646;
        }
        .crypto-payment-card h3 {
          margin: 0 0 4px;
        }
        .crypto-copy-row {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: space-between;
          padding: 10px;
          border: 1px solid #424242;
          border-radius: 8px;
          background: #0c0c0c;
        }
        .crypto-copy-row code {
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }
        .crypto-copy {
          flex-shrink: 0;
          padding: 9px 11px;
          border: 1px solid #ff3648;
          border-radius: 7px;
          color: #fff;
          background: #301115;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }
        .crypto-recipient-warning {
          padding: 13px;
          border: 1px solid #80631f;
          border-radius: 8px;
          color: #ffe6a3;
          background: #352b13;
          line-height: 1.6;
        }
        .crypto-recipient-warning p {
          margin-bottom: 0;
        }
        .crypto-proof-heading {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 15px;
          border-radius: 10px;
          color: #fff;
          background: #252525;
          line-height: 1.6;
        }
        .crypto-proof-heading span {
          font-size: 25px;
        }
        .crypto-file {
          padding: 10px !important;
        }
        .crypto-file-selected {
          padding: 10px;
          border-radius: 8px;
          color: #a7f3d0;
          background: #143b2b;
          overflow-wrap: anywhere;
        }
        .crypto-instructions p {
          white-space: pre-wrap;
          line-height: 1.6;
        }
        .crypto-warning {
          color: #f2cf85;
          font-size: 12px;
          line-height: 1.7;
        }
        .crypto-submit {
          width: 100%;
          padding: 15px;
          border: 0;
          border-radius: 9px;
          color: white;
          background: #e50914;
          font-weight: 900;
          cursor: pointer;
          transition: background 0.2s;
        }
        .crypto-submit:hover {
          background: #ff2634;
        }
        .crypto-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .crypto-secondary {
          padding: 12px;
          border: 1px solid #3b3b3b;
          border-radius: 8px;
          color: #ddd;
          background: #1b1b1b;
          cursor: pointer;
        }
        .crypto-secondary:disabled {
          opacity: 0.5;
        }
        .crypto-success,
        .crypto-error {
          max-width: 720px;
          margin: 0 auto 18px;
          padding: 13px;
          border-radius: 9px;
          overflow-wrap: anywhere;
        }
        .crypto-error {
          max-width: 720px;
          margin: 0 auto 18px;
          padding: 13px;
          border-radius: 9px;
          color: #fecaca;
          background: #45191d;
          line-height: 1.6;
        }
        .crypto-confirmation {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          max-width: 500px;
          margin: 0 auto 28px;
          padding: 28px 22px;
          border: 1px solid #256c48;
          border-radius: 18px;
          background: #10251b;
          text-align: center;
        }
        .crypto-confirmation h2 {
          margin: 0;
          color: #a7f3d0;
        }
        .crypto-confirmation p {
          margin: 0;
          color: #d1fae5;
          line-height: 1.7;
        }
        .crypto-check {
          display: grid;
          width: 76px;
          height: 76px;
          place-items: center;
          border-radius: 50%;
          color: #092c19;
          background: #4ade80;
          font-size: 43px;
          font-weight: 900;
          box-shadow: 0 0 28px #4ade8030;
        }
        .crypto-order {
          margin: 12px 0;
          padding: 16px;
          border: 1px solid #333;
          border-radius: 12px;
          background: #141414;
          overflow-wrap: anywhere;
        }
        .crypto-order p {
          margin: 8px 0;
        }
        .crypto-order-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .crypto-status {
          font-size: 10px;
          font-weight: 900;
        }
        .status-completed {
          color: #4ade80;
        }
        .status-rejected {
          color: #fb7185;
        }
        .status-pending,
        .status-payment_review {
          color: #fbbf24;
        }
        .crypto-order small {
          color: #aaa;
        }
        .crypto-note {
          color: #f5c542;
        }
        .crypto-footer {
          text-align: center;
          color: #777;
          font-size: 11px;
        }
        @media (max-width: 520px) {
          .crypto-cards {
            grid-template-columns: 1fr;
          }
          .crypto-card {
            min-height: 200px;
          }
          .crypto-form {
            padding: 16px;
          }
          .crypto-methods {
            grid-template-columns: 1fr;
          }
          .crypto-copy-row {
            align-items: stretch;
          }
          .crypto-copy-row code {
            align-self: center;
          }
        }
      `}</style>
    </main>
  );
}
