
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type LordsMobileOffer = {
  offer_id: string;
  name: string;
  price_usd: string | number;
  original_price_usd?: string | number;
};

type OrderResult = {
  ok?: boolean;
  error?: string;
  orderNumber?: string;
  supplierOrderId?: string;
  status?: string;
  id?: string;
  order?: {
    id?: string;
    order_number?: string;
    supplier_order_id?: string;
    status?: string;
    supplier_status?: string;
  };
};

export default function LordsMobilePage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(false);
  const [offers, setOffers] = useState<LordsMobileOffer[]>([]);
  const [selectedOffer, setSelectedOffer] =
    useState<LordsMobileOffer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");
  const [loadingOffers, setLoadingOffers] = useState(true);

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [processing, setProcessing] = useState(false);

  const [vipActive, setVipActive] = useState(false);

  // CONSULTAR ESTADO VIP
  useEffect(() => {
    let active = true;

    async function checkVipStatus() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (active) setVipActive(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("vip_expires_at")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        const expiration = data?.vip_expires_at
          ? new Date(data.vip_expires_at).getTime()
          : 0;

        if (active) {
          setVipActive(expiration > Date.now());
        }
      } catch (err) {
        console.error("ERROR CONSULTANDO VIP:", err);

        if (active) setVipActive(false);
      }
    }

    void checkVipStatus();

    return () => {
      active = false;
    };
  }, []);

  // CARGAR OFERTAS
  useEffect(() => {
    let active = true;

    async function loadOffers() {
      setLoadingOffers(true);
      setError("");

      try {
        const response = await fetch(
          "/api/fazercards/topups?category_id=lords_mobile",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error || "No se pudieron cargar las ofertas."
          );
        }

        const catalog = result.catalog;
        const receivedOffers = catalog?.offers;

        if (!Array.isArray(receivedOffers)) {
          throw new Error(
            "La respuesta del proveedor no contiene una lista de ofertas válida."
          );
        }

        if (active) {
          setOffers(receivedOffers);
        }
      } catch (err) {
        console.error("ERROR CARGANDO LORDS MOBILE:", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar las ofertas."
          );
        }
      } finally {
        if (active) {
          setLoadingOffers(false);
        }
      }
    }

    void loadOffers();

    return () => {
      active = false;
    };
  }, []);

  /*
   * Los precios se muestran con un incremento de $0.20.
   * Si la API ya devuelve original_price_usd, se entiende
   * que price_usd ya incluye el incremento.
   */
  function getDisplayPrice(offer: LordsMobileOffer): number {
    const price = Number(offer.price_usd);

    if (!Number.isFinite(price) || price < 0) {
      return 0;
    }

    if (offer.original_price_usd !== undefined) {
      return price;
    }

    return Math.round((price + 0.20) * 10000) / 10000;
  }

  function formatPrice(offer: LordsMobileOffer): string {
    return getDisplayPrice(offer).toFixed(2);
  }

  function getOfferIcon(offer: LordsMobileOffer): string {
    const name = offer.name.toLowerCase();

    if (name.includes("weekly")) return "🎟️";
    if (name.includes("monthly")) return "💎";
    if (name.includes("diamond")) return "💎";

    return "🎮";
  }

  function selectOffer(offer: LordsMobileOffer) {
    setSelectedOffer(offer);
    setPlayerId("");
    setError("");
    setOrderCreated(false);
    setOrderNumber("");
    setSupplierOrderId("");
    setOrderStatus("");
  }

  async function createOrder() {
    if (!selectedOffer || processing) {
      return;
    }

    setError("");
    setProcessing(true);

    try {
      /*
       * 1. COMPROBAR SESIÓN
       */

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setError(
          "Su sesión ha expirado. Inicie sesión nuevamente."
        );

        router.replace("/");
        return;
      }

      /*
       * 2. VALIDAR PLAYER ID
       */

      const cleanPlayerId = playerId.trim();

      if (!cleanPlayerId) {
        setError("Introduzca su Player ID de Lords Mobile.");
        return;
      }

      if (cleanPlayerId.length < 1 || cleanPlayerId.length > 100) {
        setError("El Player ID no tiene un formato válido.");
        return;
      }

      /*
       * 3. CLAVE DE IDEMPOTENCIA
       */

      const idempotencyKey = crypto.randomUUID();

      /*
       * 4. ENVIAR ORDEN
       */

      const response = await fetch(
        "/api/topups/lords-mobile",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            offerId: selectedOffer.offer_id,
            playerId: cleanPlayerId,
            idempotencyKey,
          }),
        }
      );

      /*
       * 5. LEER RESPUESTA
       */

      let result: OrderResult = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      /*
       * 6. ERRORES
       */

      if (!response.ok || !result.ok) {
        setError(
          result.error ||
            "No se pudo crear la orden de Lords Mobile."
        );
        return;
      }

      /*
       * 7. DATOS DE LA ORDEN
       */

      const order = result.order || {};

      setOrderNumber(
        result.orderNumber ||
          order.order_number ||
          order.id ||
          result.id ||
          ""
      );

      setSupplierOrderId(
        result.supplierOrderId ||
          order.supplier_order_id ||
          ""
      );

      setOrderStatus(
        result.status ||
          order.status ||
          order.supplier_status ||
          "processing"
      );

      /*
       * 8. CONFIRMACIÓN
       */

      setOrderCreated(true);

      setTimeout(() => {
        document
          .getElementById("success-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (err) {
      console.error("ERROR CREANDO LORDS MOBILE:", err);

      setError(
        "No se pudo conectar con el servidor. Compruebe el estado de la orden antes de intentar realizar otra compra."
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (processing) return;

    void createOrder();
  }

  return (
    <main className="lords-mobile-page">

      {/* HEADER SUPERIOR */}

      <header className="lords-mobile-header">
        <button
          type="button"
          className="lords-mobile-back-button"
          onClick={() => router.push("/top-up")}
          aria-label="Volver a las recargas"
        >
          ← Volver
        </button>

        <h1>LORDS MOBILE</h1>

        <div className="lords-mobile-vip-container">
          {vipActive ? (
            <div className="lords-mobile-vip-active">
              ⭐ VIP ACTIVO
            </div>
          ) : (
            <button
              type="button"
              className="lords-mobile-vip-button"
              onClick={() => router.push("/vip")}
            >
              ⭐ COMPRAR VIP
            </button>
          )}
        </div>
      </header>

      {/* CONTENIDO */}

      <section className="lords-mobile-content">

        {/* BANNER */}

        <div className="lords-mobile-banner">
          <img
            src="/images/lords-mobile.jpg"
            alt="Lords Mobile"
          />
        </div>

        {/* INFORMACIÓN */}

        <div className="lords-mobile-note">
          <strong>💎 Lords Mobile</strong>

          <p>
            Recarga diamantes y adquiere pases para Lords Mobile.
            Selecciona tu oferta e introduce el Player ID de la
            cuenta donde deseas recibir la compra.
          </p>

          <small>
            Comprueba que tu Player ID sea correcto antes de
            confirmar el pedido.
          </small>
        </div>

        {/* BOTÓN DE OFERTAS */}

        <button
          type="button"
          className="lords-mobile-offers-toggle"
          onClick={() => {
            setShowOffers((value) => !value);
            setError("");
          }}
        >
          <span>💎 Presione para ver ofertas</span>

          <span>
            {showOffers ? "▲" : "▼"}
          </span>
        </button>

        {/* LISTA DE OFERTAS */}

        {showOffers && (
          <section className="lords-mobile-offers-section">
            {loadingOffers ? (
              <div className="lords-mobile-message">
                Cargando ofertas...
              </div>
            ) : offers.length > 0 ? (
              <div className="lords-mobile-offers-list">
                {offers.map((offer) => {
                  const selected =
                    selectedOffer?.offer_id === offer.offer_id;

                  return (
                    <button
                      key={offer.offer_id}
                      type="button"
                      className={`lords-mobile-offer ${
                        selected ? "selected" : ""
                      }`}
                      onClick={() => selectOffer(offer)}
                    >
                      <div className="lords-mobile-offer-left">
                        <span className="lords-mobile-offer-icon">
                          {getOfferIcon(offer)}
                        </span>

                        <div>
                          <strong>{offer.name}</strong>

                          <small>
                            Lords Mobile
                          </small>
                        </div>
                      </div>

                      <div className="lords-mobile-offer-price">
                        ${formatPrice(offer)}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="lords-mobile-message">
                No hay ofertas disponibles en este momento.
              </div>
            )}
          </section>
        )}

        {/* FORMULARIO */}

        {selectedOffer && !orderCreated && (
          <section
            id="lords-mobile-order-form"
            className="lords-mobile-order-section"
          >
            <div className="lords-mobile-selected-offer">
              <span>{getOfferIcon(selectedOffer)}</span>

              <div>
                <strong>{selectedOffer.name}</strong>

                <span>${formatPrice(selectedOffer)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="lords-mobile-player-id">
                PLAYER ID
              </label>

              <input
                id="lords-mobile-player-id"
                type="text"
                autoComplete="off"
                placeholder="Introduzca su Player ID"
                value={playerId}
                onChange={(event) =>
                  setPlayerId(event.target.value)
                }
                maxLength={100}
                disabled={processing}
              />

              {error && (
                <div className="lords-mobile-form-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="lords-mobile-create-order-button"
                disabled={processing}
              >
                {processing
                  ? "FINALIZANDO ORDEN..."
                  : "FINALIZAR ORDEN"}
              </button>
            </form>
          </section>
        )}

        {/* ORDEN CREADA */}

        {orderCreated && (
          <section
            id="success-section"
            className="lords-mobile-success-section"
          >
            <div className="lords-mobile-success-icon">
              ✓
            </div>

            <h2>Orden creada</h2>

            <p>
              Tu pedido de Lords Mobile fue creado correctamente.
            </p>

            {orderNumber && (
              <div className="lords-mobile-order-number">
                <span>NÚMERO DE ORDEN</span>
                <strong>{orderNumber}</strong>
              </div>
            )}

            {supplierOrderId && (
              <div className="lords-mobile-order-number">
                <span>ID DE ORDEN DEL PROVEEDOR</span>
                <strong>{supplierOrderId}</strong>
              </div>
            )}

            {orderStatus && (
              <div className="lords-mobile-order-number">
                <span>ESTADO</span>
                <strong>{orderStatus}</strong>
              </div>
            )}

            <button
              type="button"
              className="lords-mobile-review-button"
              onClick={() => router.push("/orders")}
            >
              Revisar orden
            </button>

            <button
              type="button"
              className="lords-mobile-store-button"
              onClick={() => router.push("/top-up")}
            >
              Volver a la tienda
            </button>
          </section>
        )}
      </section>

      {/* FOOTER */}

      <footer className="lords-mobile-footer">
        🛒 STORE GAMING 🎮
      </footer>

      {/* ESTILOS */}

      <style jsx>{`
        .lords-mobile-page {
          min-height: 100vh;
          color: #fff;
          background:
            linear-gradient(
              rgba(0, 0, 0, 0.72),
              rgba(0, 0, 0, 0.86)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover fixed;
          padding-bottom: 30px;
        }

        /* HEADER */

        .lords-mobile-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 8px;
          min-height: 58px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.92);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .lords-mobile-header h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(13px, 2.5vw, 19px);
          font-weight: 900;
          text-align: center;
          white-space: nowrap;
        }

        .lords-mobile-back-button {
          justify-self: start;
          min-height: 40px;
          padding: 9px 12px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
        }

        .lords-mobile-vip-container {
          justify-self: end;
          display: flex;
          justify-content: flex-end;
        }

        .lords-mobile-vip-button,
        .lords-mobile-vip-active {
          padding: 10px 11px;
          border: 1px solid #b88b35;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            #49300c,
            #79551a
          );
          color: #ffe6a8;
          font-size: 10px;
          font-weight: 900;
          text-align: center;
          white-space: nowrap;
        }

        .lords-mobile-vip-button {
          cursor: pointer;
        }

        /* CONTENIDO */

        .lords-mobile-content {
          width: min(100%, 680px);
          margin: 0 auto;
          padding: 0 12px 30px;
        }

        .lords-mobile-banner {
          width: calc(100% + 24px);
          margin-left: -12px;
          overflow: hidden;
        }

        .lords-mobile-banner img {
          display: block;
          width: 100%;
          height: 210px;
          object-fit: cover;
        }

        .lords-mobile-note {
          margin-top: 14px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.68);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .lords-mobile-note strong {
          color: #fff;
          font-size: 15px;
        }

        .lords-mobile-note p {
          margin: 7px 0 0;
          color: #d8d8d8;
          font-size: 13px;
          line-height: 1.5;
        }

        .lords-mobile-note small {
          display: block;
          margin-top: 8px;
          color: #bdbdbd;
          font-size: 11px;
          line-height: 1.5;
        }

        /* BOTÓN OFERTAS */

        .lords-mobile-offers-toggle {
          width: 100%;
          margin-top: 14px;
          padding: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 13px;
          background: rgba(0, 0, 0, 0.78);
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .lords-mobile-offers-section {
          margin-top: 10px;
        }

        .lords-mobile-offers-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* TARJETAS DE OFERTAS */

        .lords-mobile-offer {
          width: 100%;
          min-height: 65px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 13px;
          background: rgba(0, 0, 0, 0.78);
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .lords-mobile-offer:active {
          transform: scale(0.98);
        }

        .lords-mobile-offer.selected {
          border-color: rgba(255, 190, 40, 0.85);
          background: rgba(120, 75, 0, 0.25);
        }

        .lords-mobile-offer-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .lords-mobile-offer-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 21px;
        }

        .lords-mobile-offer-left strong {
          display: block;
          font-size: 14px;
        }

        .lords-mobile-offer-left small {
          display: block;
          margin-top: 3px;
          color: #aaa;
          font-size: 11px;
        }

        .lords-mobile-offer-price {
          flex-shrink: 0;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
        }

        .lords-mobile-message {
          padding: 15px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.78);
          color: #ddd;
          font-size: 13px;
          line-height: 1.5;
        }

        /* FORMULARIO */

        .lords-mobile-order-section {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          background: rgba(0, 0, 0, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .lords-mobile-selected-offer {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 15px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
        }

        .lords-mobile-selected-offer > span {
          font-size: 25px;
        }

        .lords-mobile-selected-offer div {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .lords-mobile-selected-offer strong {
          font-size: 14px;
        }

        .lords-mobile-selected-offer div span {
          font-weight: 900;
          white-space: nowrap;
        }

        .lords-mobile-order-section form {
          display: flex;
          flex-direction: column;
        }

        .lords-mobile-order-section label {
          margin-bottom: 7px;
          font-size: 13px;
          font-weight: 800;
        }

        .lords-mobile-order-section input {
          width: 100%;
          box-sizing: border-box;
          padding: 13px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 11px;
          outline: none;
          background: rgba(255, 255, 255, 0.07);
          color: #fff;
          font-size: 15px;
        }

        .lords-mobile-order-section input::placeholder {
          color: #888;
        }

        .lords-mobile-form-error {
          margin-top: 8px;
          padding: 9px;
          border-radius: 9px;
          background: rgba(150, 0, 0, 0.25);
          color: #ff9b9b;
          font-size: 12px;
          line-height: 1.5;
        }

        .lords-mobile-create-order-button {
          width: 100%;
          margin-top: 12px;
          padding: 13px;
          border: 0;
          border-radius: 11px;
          background: #d71920;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }

        .lords-mobile-create-order-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        /* ORDEN CREADA */

        .lords-mobile-success-section {
          margin-top: 18px;
          padding: 22px 16px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.84);
          border: 1px solid rgba(50, 255, 100, 0.2);
          text-align: center;
        }

        .lords-mobile-success-icon {
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

        .lords-mobile-success-section h2 {
          margin: 0;
          font-size: 21px;
        }

        .lords-mobile-success-section p {
          margin: 8px 0;
          color: #cfcfcf;
          font-size: 13px;
        }

        .lords-mobile-order-number {
          margin-top: 13px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          overflow-wrap: anywhere;
        }

        .lords-mobile-order-number span {
          display: block;
          color: #999;
          font-size: 11px;
        }

        .lords-mobile-order-number strong {
          display: block;
          margin-top: 4px;
          font-size: 16px;
        }

        .lords-mobile-review-button,
        .lords-mobile-store-button {
          width: 100%;
          margin-top: 12px;
          padding: 13px;
          border: 0;
          border-radius: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .lords-mobile-review-button {
          background: #19a957;
          color: #fff;
        }

        .lords-mobile-store-button {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        /* FOOTER */

        .lords-mobile-footer {
          padding: 25px 12px 5px;
          color: #888;
          font-size: 12px;
          text-align: center;
        }

        /* RESPONSIVE */

        @media (max-width: 480px) {
          .lords-mobile-banner img {
            height: 185px;
          }

          .lords-mobile-selected-offer div {
            flex-direction: column;
            align-items: flex-start;
          }

          .lords-mobile-offer-price {
            font-size: 13px;
          }

          .lords-mobile-header {
            gap: 5px;
            padding: 8px;
          }

          .lords-mobile-header h1 {
            font-size: 12px;
          }

          .lords-mobile-back-button {
            padding: 9px 8px;
            font-size: 11px;
          }

          .lords-mobile-vip-button,
          .lords-mobile-vip-active {
            padding: 9px 6px;
            font-size: 8px;
          }
        }

        @media (max-width: 360px) {
          .lords-mobile-header h1 {
            font-size: 10px;
          }

          .lords-mobile-back-button {
            font-size: 10px;
          }

          .lords-mobile-vip-button,
          .lords-mobile-vip-active {
            font-size: 7px;
          }
        }
      `}</style>
    </main>
  );
}
