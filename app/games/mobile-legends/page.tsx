
"use client";

import type { FormEvent } from "react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Offer = {
  id: string;
  name: string;
  price: number;
};

type OrderResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  orderNumber?: string;
  supplierOrderId?: string | null;
  status?: string;
  retailPrice?: number;
  reused?: boolean;
};

const API_URL = "/api/topups/mobile-legends";

export default function MobileLegendsPage() {
  const router = useRouter();

  const idempotencyKeyRef = useRef<string | null>(null);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [vipActive, setVipActive] = useState(false);
  const [vipLoading, setVipLoading] = useState(true);

  const [showOffers, setShowOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] =
    useState<Offer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [serverId, setServerId] = useState("");

  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  const [processing, setProcessing] = useState(false);

  /*
   * CARGAR CATÁLOGO Y ESTADO VIP DESDE EL BACKEND
   */

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        setVipLoading(true);
        setCatalogError("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          if (active) {
            setCatalogError(
              "Inicia sesión para consultar las ofertas."
            );
          }
          return;
        }

        const response = await fetch(API_URL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data?.ok) {
          throw new Error(
            data?.error || "No se pudo cargar el catálogo."
          );
        }

        if (!Array.isArray(data.offers)) {
          throw new Error(
            "El catálogo recibido no tiene un formato válido."
          );
        }

        const loadedOffers: Offer[] = data.offers.map(
          (offer: any) => ({
            id: String(offer.offer_id ?? ""),
            name: String(offer.name ?? ""),
            price: Number(offer.retail_price),
          })
        );

        const validOffers = loadedOffers.filter(
          (offer) =>
            offer.id.length > 0 &&
            offer.name.length > 0 &&
            Number.isFinite(offer.price) &&
            offer.price > 0
        );

        if (validOffers.length === 0) {
          throw new Error(
            "No hay ofertas disponibles en este momento."
          );
        }

        if (active) {
          setOffers(validOffers);
          setVipActive(Boolean(data.vip_active));
        }
      } catch (err) {
        console.error(
          "ERROR CARGANDO MOBILE LEGENDS:",
          err
        );

        if (active) {
          setCatalogError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el catálogo."
          );
        }
      } finally {
        if (active) {
          setVipLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  /*
   * FORMATEAR PRECIOS
   *
   * El backend calcula el precio normal o VIP.
   * El navegador solamente muestra el precio recibido.
   */

  function formatPrice(offer: Offer): string {
    return `$${offer.price.toFixed(4)}`;
  }

  /*
   * SELECCIONAR OFERTA
   */

  function selectOffer(offer: Offer) {
    if (processing) return;

    setSelectedOffer(offer);

    setError("");
    setShowConfirmation(false);
    setOrderCreated(false);

    setOrderNumber("");
    setSupplierOrderId("");
    setOrderStatus("");

    idempotencyKeyRef.current = null;

    setTimeout(() => {
      document
        .getElementById("order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  /*
   * VALIDAR DATOS DEL JUGADOR
   */

  function handleFinishPurchase(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanPlayerId = playerId.trim();
    const cleanServerId = serverId.trim();

    if (!selectedOffer) {
      setError("Seleccione una oferta.");
      return;
    }

    if (!cleanPlayerId) {
      setError("Introduzca el ID del jugador.");
      return;
    }

    if (!/^[0-9]{3,20}$/.test(cleanPlayerId)) {
      setError(
        "El ID del jugador debe contener entre 3 y 20 números."
      );
      return;
    }

    if (!cleanServerId) {
      setError("Introduzca el ID del servidor.");
      return;
    }

    if (!/^[0-9]{1,20}$/.test(cleanServerId)) {
      setError("El ID del servidor no es válido.");
      return;
    }

    setPlayerId(cleanPlayerId);
    setServerId(cleanServerId);

    setShowConfirmation(true);
  }

  /*
   * CREAR PEDIDO
   */

  async function createOrder() {
    if (!selectedOffer) {
      setError("Seleccione una oferta.");
      return;
    }

    if (processing) return;

    setProcessing(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Su sesión ha expirado. Inicie sesión nuevamente."
        );
      }

      /*
       * La misma clave se conserva si hay un error
       * de conexión para evitar pedidos duplicados.
       */

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          crypto.randomUUID();
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          offerId: selectedOffer.id,
          playerId: playerId.trim(),
          serverId: serverId.trim(),
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });

      let data: OrderResult;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "No se pudo interpretar la respuesta del servidor. Reintente con el mismo pedido."
        );
      }

      /*
       * Si el backend devuelve un número de orden
       * y un estado, mostramos el resultado.
       */

      if (data?.orderNumber && data?.status) {
        setOrderNumber(data.orderNumber);

        setSupplierOrderId(
          data.supplierOrderId || ""
        );

        setOrderStatus(data.status);

        setOrderCreated(true);
        setShowConfirmation(false);

        setTimeout(() => {
          document
            .getElementById("success-section")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
        }, 100);

        /*
         * Solo se libera la clave cuando el pedido
         * llega a un estado final.
         */

        if (
          data.status === "COMPLETED" ||
          data.status === "REFUNDED" ||
          data.status === "FAILED"
        ) {
          idempotencyKeyRef.current = null;
        }

        if (!response.ok && data.status === "FAILED") {
          setError(
            data.error || "El pedido no pudo completarse."
          );
        }

        return;
      }

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error || "No se pudo crear el pedido."
        );
      }

      throw new Error(
        "El servidor no devolvió un número de pedido. Comprueba el estado antes de volver a intentarlo."
      );
    } catch (err) {
      console.error(
        "ERROR CREANDO ORDEN MOBILE LEGENDS:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la orden."
      );
    } finally {
      setProcessing(false);
    }
  }

  /*
   * INFORMACIÓN DEL ESTADO
   */

  function getStatusTitle(): string {
    switch (orderStatus.toUpperCase()) {
      case "COMPLETED":
        return "Compra completada";

      case "SUPPLIER_PENDING":
      case "PENDING":
      case "RESERVED":
        return "Pedido pendiente";

      case "REFUNDED":
        return "Saldo devuelto";

      case "FAILED":
      case "REJECTED":
        return "Pedido no completado";

      default:
        return "Estado del pedido";
    }
  }

  function getStatusMessage(): string {
    switch (orderStatus.toUpperCase()) {
      case "COMPLETED":
        return "El pedido aparece como completado.";

      case "SUPPLIER_PENDING":
      case "PENDING":
      case "RESERVED":
        return "El proveedor todavía no ha confirmado la entrega. Tu pedido permanece pendiente de verificación. No realices otra compra para los mismos datos.";

      case "REFUNDED":
        return "El proveedor rechazó el pedido y el saldo ha sido devuelto.";

      case "FAILED":
      case "REJECTED":
        return "El pedido no pudo completarse. Comprueba el estado de tu saldo.";

      default:
        return "Consulta el estado actualizado de tu pedido.";
    }
  }

  function getStatusIcon(): string {
    switch (orderStatus.toUpperCase()) {
      case "COMPLETED":
        return "✓";

      case "REFUNDED":
        return "↩";

      case "FAILED":
      case "REJECTED":
        return "!";

      default:
        return "⌛";
    }
  }

  function goToOrders() {
    router.push("/orders");
  }

  /*
   * VOLVER A LA TIENDA
   */

  function goToStore() {
    router.push("/top-up");
  }

  /*
   * INTERFAZ
   */

  return (
    <main className="mobile-legends-page">
      <header className="mobile-legends-header">
        <button
          type="button"
          className="mobile-legends-back-button"
          onClick={goToStore}
        >
          ←
        </button>

        <div className="mobile-legends-header-title">
          <span>Mobile Legends</span>
          <small>United States</small>
        </div>

        <button
          type="button"
          className="mobile-legends-orders-button"
          onClick={goToOrders}
          aria-label="Ver pedidos"
        >
          📋
        </button>
      </header>

      <section className="mobile-legends-content">
        <div className="mobile-legends-banner">
          <img
            src="/images/mobile-legends.jpg"
            alt="Mobile Legends"
          />

          <div className="mobile-legends-banner-overlay">
            <div className="mobile-legends-banner-text">
              <strong>MOBILE LEGENDS</strong>
              <span>United States</span>
            </div>
          </div>
        </div>

        <div className="mobile-legends-note">
          <span>ℹ️</span>
          <p>
            Introduzca correctamente su ID de jugador y su ID
            de servidor antes de realizar la compra.
          </p>
        </div>

        {vipActive && (
          <div className="mobile-legends-vip-notice">
            ⭐ PRECIO VIP ACTIVADO
          </div>
        )}

        <button
          type="button"
          className="mobile-legends-offers-toggle"
          onClick={() => setShowOffers((value) => !value)}
        >
          <span>
            {showOffers
              ? "Ocultar ofertas"
              : "Presione para ver ofertas"}
          </span>

          <span className="mobile-legends-offers-arrow">
            {showOffers ? "▲" : "▼"}
          </span>
        </button>

        {catalogError && (
          <div className="mobile-legends-warning">
            ⚠️ {catalogError}

            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              VOLVER A INTENTAR
            </button>
          </div>
        )}

        {showOffers && (
          <section className="mobile-legends-offers-section">
            {vipLoading ? (
              <div className="mobile-legends-loading">
                CARGANDO OFERTAS...
              </div>
            ) : (
              <div className="mobile-legends-offers-list">
                {offers.map((offer) => (
                  <button
                    type="button"
                    key={offer.id}
                    disabled={processing}
                    className={`mobile-legends-offer ${
                      selectedOffer?.id === offer.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => selectOffer(offer)}
                  >
                    <div className="mobile-legends-offer-left">
                      <div className="mobile-legends-offer-icon">
                        💎
                      </div>

                      <div>
                        <strong>{offer.name}</strong>
                        <span>Mobile Legends</span>
                      </div>
                    </div>

                    <div className="mobile-legends-offer-price">
                      {formatPrice(offer)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedOffer && (
          <section
            id="order-section"
            className="mobile-legends-order-section"
          >
            <div className="mobile-legends-selected-offer">
              <span>Oferta seleccionada</span>

              <strong>{selectedOffer.name}</strong>

              <b>{formatPrice(selectedOffer)}</b>
            </div>

            {error && (
              <div className="mobile-legends-warning">
                ⚠️ {error}
              </div>
            )}

            {!showConfirmation && !orderCreated && (
              <form
                className="mobile-legends-order-form"
                onSubmit={handleFinishPurchase}
              >
                <label>ID del jugador</label>

                <div className="mobile-legends-input-wrapper">
                  <span>👤</span>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={playerId}
                    onChange={(event) => {
                      setPlayerId(
                        event.target.value.replace(
                          /[^0-9]/g,
                          ""
                        )
                      );

                      idempotencyKeyRef.current = null;
                    }}
                    placeholder="Ej: 123456789"
                    maxLength={20}
                    disabled={processing}
                  />
                </div>

                <label>ID del servidor</label>

                <div className="mobile-legends-input-wrapper">
                  <span>🌐</span>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={serverId}
                    onChange={(event) => {
                      setServerId(
                        event.target.value.replace(
                          /[^0-9]/g,
                          ""
                        )
                      );

                      idempotencyKeyRef.current = null;
                    }}
                    placeholder="Ej: 1234"
                    maxLength={20}
                    disabled={processing}
                  />
                </div>

                <button
                  type="submit"
                  className="mobile-legends-create-order-button"
                  disabled={vipLoading || processing}
                >
                  CONTINUAR
                </button>
              </form>
            )}

            {showConfirmation && !orderCreated && (
              <section className="mobile-legends-confirmation-section">
                <div className="mobile-legends-confirmation-card">
                  <h3>Confirmar pedido</h3>

                  <div className="mobile-legends-confirmation-row">
                    <span>Oferta</span>
                    <strong>{selectedOffer.name}</strong>
                  </div>

                  <div className="mobile-legends-confirmation-row">
                    <span>ID del jugador</span>
                    <strong>{playerId}</strong>
                  </div>

                  <div className="mobile-legends-confirmation-row">
                    <span>ID del servidor</span>
                    <strong>{serverId}</strong>
                  </div>

                  <div className="mobile-legends-confirmation-total">
                    <span>Total</span>
                    <strong>
                      {formatPrice(selectedOffer)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="mobile-legends-confirm-button"
                    onClick={createOrder}
                    disabled={processing || vipLoading}
                  >
                    {processing
                      ? "PROCESANDO PEDIDO..."
                      : "CONFIRMAR PEDIDO"}
                  </button>

                  <button
                    type="button"
                    className="mobile-legends-cancel-button"
                    onClick={() =>
                      setShowConfirmation(false)
                    }
                    disabled={processing}
                  >
                    CANCELAR
                  </button>
                </div>
              </section>
            )}

            {orderCreated && (
              <section
                id="success-section"
                className="mobile-legends-success-section"
              >
                <div
                  className={`mobile-legends-success-icon ${
                    orderStatus.toUpperCase() !== "COMPLETED"
                      ? "pending"
                      : ""
                  }`}
                >
                  {getStatusIcon()}
                </div>

                <h2>{getStatusTitle()}</h2>

                <p>{getStatusMessage()}</p>

                <div className="mobile-legends-order-number">
                  <span>Número de orden</span>
                  <strong>{orderNumber}</strong>
                </div>

                {supplierOrderId && (
                  <div className="mobile-legends-order-number">
                    <span>Orden del proveedor</span>
                    <strong>{supplierOrderId}</strong>
                  </div>
                )}

                <div className="mobile-legends-order-number">
                  <span>Estado</span>
                  <strong>{orderStatus}</strong>
                </div>

                <button
                  type="button"
                  className="mobile-legends-review-button"
                  onClick={goToOrders}
                >
                  REVISAR ORDEN
                </button>

                <button
                  type="button"
                  className="mobile-legends-store-button"
                  onClick={goToStore}
                >
                  VOLVER A LA TIENDA
                </button>
              </section>
            )}
          </section>
        )}

        <section className="mobile-legends-service-info">
          <h3>Información del servicio</h3>

          <p>
            La recarga se realiza utilizando el ID del jugador
            y el ID del servidor proporcionados.
          </p>

          <p>
            Verifique cuidadosamente ambos datos antes de
            confirmar el pedido.
          </p>
        </section>
      </section>

      <footer className="mobile-legends-footer">
        STORE GAMING
      </footer>

      <style jsx>{`
        .mobile-legends-page {
          min-height: 100vh;
          background:
            linear-gradient(
              rgba(0, 0, 0, 0.78),
              rgba(0, 0, 0, 0.9)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover fixed;
          color: #fff;
          padding-bottom: 30px;
        }

        .mobile-legends-header {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 64px;
          display: grid;
          grid-template-columns: 48px 1fr 48px;
          align-items: center;
          padding: 0 10px;
          background: rgba(0, 0, 0, 0.92);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
        }

        .mobile-legends-back-button,
        .mobile-legends-orders-button {
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 21px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .mobile-legends-header-title {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .mobile-legends-header-title span {
          font-size: 17px;
          font-weight: 900;
        }

        .mobile-legends-header-title small {
          margin-top: 2px;
          color: #aaa;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .mobile-legends-content {
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
          padding: 0 12px;
        }

        .mobile-legends-banner {
          position: relative;
          width: calc(100% + 24px);
          margin-left: -12px;
          overflow: hidden;
        }

        .mobile-legends-banner img {
          display: block;
          width: 100%;
          height: 230px;
          object-fit: cover;
        }

        .mobile-legends-banner-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          padding: 20px;
          background: linear-gradient(
            transparent 30%,
            rgba(0, 0, 0, 0.85)
          );
        }

        .mobile-legends-banner-text strong {
          font-size: 25px;
          font-weight: 1000;
          letter-spacing: 1px;
        }

        .mobile-legends-banner-text span {
          display: block;
          margin-top: 3px;
          color: #ddd;
          font-size: 12px;
        }

        .mobile-legends-note {
          display: flex;
          gap: 10px;
          margin-top: 14px;
          padding: 13px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .mobile-legends-note span {
          font-size: 18px;
        }

        .mobile-legends-note p {
          margin: 0;
          color: #ccc;
          font-size: 12px;
          line-height: 1.5;
        }

        .mobile-legends-vip-notice {
          margin-top: 12px;
          padding: 12px;
          border: 1px solid rgba(255, 190, 50, 0.4);
          border-radius: 11px;
          background: rgba(255, 180, 30, 0.1);
          color: #ffd36a;
          font-size: 12px;
          font-weight: 900;
          text-align: center;
        }

        .mobile-legends-offers-toggle {
          width: 100%;
          margin-top: 14px;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 13px;
          background: rgba(0, 0, 0, 0.75);
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .mobile-legends-offers-arrow {
          font-size: 12px;
          color: #d71920;
        }

        .mobile-legends-offers-section {
          margin-top: 10px;
        }

        .mobile-legends-offers-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mobile-legends-loading {
          padding: 20px;
          text-align: center;
          color: #aaa;
          font-size: 12px;
        }

        .mobile-legends-offer {
          width: 100%;
          min-height: 67px;
          padding: 11px 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 13px;
          background: rgba(0, 0, 0, 0.82);
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }

        .mobile-legends-offer:hover {
          transform: translateY(-1px);
          border-color: rgba(215, 25, 32, 0.7);
        }

        .mobile-legends-offer.selected {
          border-color: #d71920;
          box-shadow: 0 0 0 1px rgba(215, 25, 32, 0.25);
        }

        .mobile-legends-offer:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .mobile-legends-offer-left {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .mobile-legends-offer-icon {
          width: 43px;
          height: 43px;
          flex: 0 0 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 21px;
        }

        .mobile-legends-offer-left strong {
          display: block;
          font-size: 14px;
        }

        .mobile-legends-offer-left span {
          display: block;
          margin-top: 3px;
          color: #888;
          font-size: 10px;
        }

        .mobile-legends-offer-price {
          flex: 0 0 auto;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
        }

        .mobile-legends-order-section {
          margin-top: 15px;
        }

        .mobile-legends-selected-offer {
          padding: 15px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.84);
          border: 1px solid rgba(215, 25, 32, 0.45);
        }

        .mobile-legends-selected-offer span {
          display: block;
          color: #888;
          font-size: 10px;
          text-transform: uppercase;
        }

        .mobile-legends-selected-offer strong {
          display: block;
          margin-top: 5px;
          font-size: 16px;
        }

        .mobile-legends-selected-offer b {
          display: block;
          margin-top: 6px;
          color: #ff3038;
          font-size: 20px;
        }

        .mobile-legends-warning {
          margin-top: 10px;
          padding: 11px;
          border-radius: 10px;
          background: rgba(215, 25, 32, 0.12);
          border: 1px solid rgba(215, 25, 32, 0.35);
          color: #ffb0b3;
          font-size: 12px;
        }

        .mobile-legends-warning button {
          display: block;
          margin-top: 10px;
          padding: 8px 12px;
          border: 0;
          border-radius: 8px;
          background: #d71920;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
        }

        .mobile-legends-order-form {
          margin-top: 10px;
          padding: 16px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.84);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .mobile-legends-order-form label {
          display: block;
          margin: 0 0 7px;
          color: #ccc;
          font-size: 12px;
          font-weight: 700;
        }

        .mobile-legends-input-wrapper {
          display: flex;
          align-items: center;
          gap: 9px;
          height: 48px;
          margin-bottom: 13px;
          padding: 0 13px;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .mobile-legends-input-wrapper span {
          font-size: 16px;
        }

        .mobile-legends-input-wrapper input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #fff;
          font-size: 14px;
        }

        .mobile-legends-input-wrapper input::placeholder {
          color: #666;
        }

        .mobile-legends-create-order-button,
        .mobile-legends-confirm-button,
        .mobile-legends-review-button,
        .mobile-legends-store-button,
        .mobile-legends-cancel-button {
          width: 100%;
          min-height: 48px;
          border: 0;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .mobile-legends-create-order-button,
        .mobile-legends-confirm-button {
          background: #d71920;
          color: #fff;
        }

        .mobile-legends-confirmation-section {
          margin-top: 10px;
        }

        .mobile-legends-confirmation-card {
          padding: 17px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .mobile-legends-confirmation-card h3 {
          margin: 0 0 15px;
          font-size: 18px;
        }

        .mobile-legends-confirmation-row {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .mobile-legends-confirmation-row span {
          color: #888;
          font-size: 11px;
        }

        .mobile-legends-confirmation-row strong {
          max-width: 60%;
          text-align: right;
          font-size: 12px;
        }

        .mobile-legends-confirmation-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 14px 0;
        }

        .mobile-legends-confirmation-total span {
          color: #aaa;
          font-size: 12px;
        }

        .mobile-legends-confirmation-total strong {
          color: #ff3038;
          font-size: 21px;
        }

        .mobile-legends-cancel-button {
          margin-top: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .mobile-legends-confirm-button:disabled,
        .mobile-legends-create-order-button:disabled,
        .mobile-legends-cancel-button:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .mobile-legends-success-section {
          margin-top: 12px;
          padding: 22px 16px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.86);
          border: 1px solid rgba(50, 255, 100, 0.2);
          text-align: center;
        }

        .mobile-legends-success-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #19a957;
          color: #fff;
          font-size: 31px;
          font-weight: 900;
        }

        .mobile-legends-success-icon.pending {
          background: #b7791f;
        }

        .mobile-legends-success-section h2 {
          margin: 0;
          font-size: 21px;
        }

        .mobile-legends-success-section p {
          margin: 8px 0;
          color: #cfcfcf;
          font-size: 13px;
          line-height: 1.5;
        }

        .mobile-legends-order-number {
          margin-top: 10px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
        }

        .mobile-legends-order-number span {
          display: block;
          color: #999;
          font-size: 11px;
        }

        .mobile-legends-order-number strong {
          display: block;
          margin-top: 4px;
          font-size: 15px;
          word-break: break-word;
        }

        .mobile-legends-review-button {
          margin-top: 13px;
          background: #19a957;
          color: #fff;
        }

        .mobile-legends-store-button {
          margin-top: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .mobile-legends-service-info {
          margin-top: 18px;
          padding: 16px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .mobile-legends-service-info h3 {
          margin: 0 0 8px;
          font-size: 14px;
        }

        .mobile-legends-service-info p {
          margin: 6px 0;
          color: #999;
          font-size: 11px;
          line-height: 1.5;
        }

        .mobile-legends-footer {
          padding: 25px 12px 5px;
          color: #777;
          font-size: 11px;
          text-align: center;
        }

        @media (max-width: 480px) {
          .mobile-legends-banner img {
            height: 185px;
          }

          .mobile-legends-offer {
            min-height: 64px;
          }

          .mobile-legends-banner-text strong {
            font-size: 22px;
          }
        }
      `}</style>
    </main>
  );
}
