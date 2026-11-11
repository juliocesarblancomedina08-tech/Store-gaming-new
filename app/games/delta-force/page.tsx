
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

import {
  DELTA_FORCE_OFFERS,
  type DeltaForceOffer,
} from "../../../lib/games/delta-force";

const VIP_MARKUP = 0.08;

export default function DeltaForcePage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] =
    useState<DeltaForceOffer | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [processing, setProcessing] = useState(false);
  const [vipActive, setVipActive] = useState(false);

  /*
   * COMPROBAR MEMBRESÍA VIP
   */

  useEffect(() => {
    let cancelled = false;

    async function checkVip() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          if (!cancelled) setVipActive(false);
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("vip_expires_at")
            .eq("id", session.user.id)
            .maybeSingle();

        if (profileError) {
          console.error("Error comprobando VIP:", profileError);
          if (!cancelled) setVipActive(false);
          return;
        }

        const expiresAt = profile?.vip_expires_at
          ? new Date(profile.vip_expires_at).getTime()
          : 0;

        if (!cancelled) {
          setVipActive(
            Number.isFinite(expiresAt) &&
              expiresAt > Date.now()
          );
        }
      } catch (err) {
        console.error("Error cargando membresía VIP:", err);
        if (!cancelled) setVipActive(false);
      }
    }

    void checkVip();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * CALCULAR PRECIOS
   */

  function getOfferPrice(offer: DeltaForceOffer) {
    if (vipActive) {
      return Number(
        (
          Number(offer.supplierPrice) + VIP_MARKUP
        ).toFixed(4)
      );
    }

    return Number(offer.price);
  }

  function formatOfferPrice(offer: DeltaForceOffer) {
    return `${getOfferPrice(offer).toFixed(
      vipActive ? 4 : 2
    )}$`;
  }

  function selectOffer(offer: DeltaForceOffer) {
    setSelectedOffer(offer);
    setPlayerId("");
    setError("");
    setOrderCreated(false);
    setOrderNumber("");
    setSupplierOrderId("");
    setOrderStatus("");

    setTimeout(() => {
      document
        .getElementById("delta-force-order-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  async function createOrder() {
    if (!selectedOffer || processing) return;

    setError("");
    setProcessing(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setError("Su sesión ha expirado. Inicie sesión nuevamente.");
        router.replace("/");
        return;
      }

      const cleanPlayerId = playerId.trim().replace(/\s+/g, "");

      if (!cleanPlayerId) {
        setError("Ponga el ID de su cuenta.");
        return;
      }

      if (!/^[0-9]+$/.test(cleanPlayerId)) {
        setError("El ID debe contener solamente números.");
        return;
      }

      if (cleanPlayerId.length < 4 || cleanPlayerId.length > 20) {
        setError("El ID parece no tener un formato válido.");
        return;
      }

      const idempotencyKey = crypto.randomUUID();

      const response = await fetch("/api/topups/delta-force", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          playerId: cleanPlayerId,
          idempotencyKey,
        }),
      });

      let result: any = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok || !result.ok) {
        setError(result.error || "No se pudo crear la orden.");
        return;
      }

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

      setOrderCreated(true);

      setTimeout(() => {
        document.getElementById("success-section")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (err) {
      console.error("ERROR CREANDO TOPUP DELTA FORCE:", err);
      setError(
        "No se pudo conectar con el servidor. Si la compra fue enviada, no vuelva a intentarla hasta revisar el estado de la orden."
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

  function goToStore() {
    router.push("/top-up");
  }

  function goToOrders() {
    router.push("/orders");
  }

  function goToVip() {
    router.push("/vip");
  }

  return (
    <main className="delta-force-page">
      <header className="delta-force-header">
        <button
          type="button"
          className="delta-force-back-button"
          onClick={goToStore}
          aria-label="Volver a la tienda"
        >
          ←
        </button>

        <h1>DELTA FORCE</h1>

        <div className="delta-force-header-actions">
          {vipActive ? (
            <div className="delta-force-vip-active">
              ★ VIP ACTIVO
            </div>
          ) : (
            <button
              type="button"
              className="delta-force-vip-button"
              onClick={goToVip}
            >
              ★ COMPRAR VIP
            </button>
          )}

          <button
            type="button"
            className="delta-force-orders-button"
            onClick={goToOrders}
            aria-label="Mis pedidos"
          >
            📦
          </button>
        </div>
      </header>

      <section className="delta-force-banner">
        <img
          src="/images/delta-force.jpg"
          alt="Delta Force"
        />

        <div className="delta-force-banner-overlay">
          <div className="delta-force-banner-text">
            <strong>DELTA FORCE</strong>
            <span>Recargas rápidas y seguras</span>
          </div>
        </div>
      </section>

      <section className="delta-force-content">
        <div className="delta-force-note">
          <strong>🎮 Servicio Delta Force</strong>
          <p>
            Recarga Delta Coins y pases de Delta Force.
            Selecciona una oferta e introduce el ID numérico
            de la cuenta donde deseas recibir la compra.
            Comprueba que el ID sea correcto antes de finalizar.
          </p>
        </div>

        <button
          type="button"
          className={`delta-force-offers-toggle ${
            showOffers ? "open" : ""
          }`}
          onClick={() => {
            setShowOffers((value) => !value);
            setError("");
          }}
        >
          <span>
            {showOffers
              ? "OCULTAR OFERTAS"
              : "VER OFERTAS DISPONIBLES"}
          </span>

          <span className="delta-force-offers-arrow">
            ▼
          </span>
        </button>

        {showOffers && (
          <section className="delta-force-offers-section">
            <div className="delta-force-offers-list">
              {DELTA_FORCE_OFFERS.map((offer) => {
                const selected = selectedOffer?.id === offer.id;

                return (
                  <button
                    key={offer.id}
                    type="button"
                    className={`delta-force-offer ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() => selectOffer(offer)}
                  >
                    <div className="delta-force-offer-left">
                      <span className="delta-force-offer-icon">
                        {offer.name.toLowerCase().includes("season pass")
                          ? "🎟️"
                          : "🪙"}
                      </span>

                      <div className="delta-force-offer-details">
                        <strong>{offer.name}</strong>
                        <small>
                          {offer.name.toLowerCase().includes("season pass")
                            ? "Pase de temporada"
                            : "Delta Coins"}
                        </small>
                      </div>
                    </div>

                    <div className="delta-force-offer-price">
                      {formatOfferPrice(offer)}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {selectedOffer && !orderCreated && (
          <section
            id="delta-force-order-form"
            className="delta-force-order-section"
          >
            <div className="delta-force-selected-offer">
              <span>
                {selectedOffer.name.toLowerCase().includes("season pass")
                  ? "🎟️"
                  : "🪙"}
              </span>

              <div className="delta-force-selected-details">
                <strong>{selectedOffer.name}</strong>
                <span>{formatOfferPrice(selectedOffer)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="delta-force-player-id">
                ID DEL JUGADOR
              </label>

              <input
                id="delta-force-player-id"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Introduzca su ID"
                value={playerId}
                onChange={(event) =>
                  setPlayerId(
                    event.target.value.replace(/[^0-9]/g, "")
                  )
                }
                maxLength={20}
                disabled={processing}
              />

              {error && (
                <div className="delta-force-form-error" role="alert">
                  {error}
                </div>
              )}

              <div className="delta-force-total">
                <span>Total</span>
                <strong>{formatOfferPrice(selectedOffer)}</strong>
              </div>

              <button
                type="submit"
                className="delta-force-create-order-button"
                disabled={processing}
              >
                {processing
                  ? "FINALIZANDO ORDEN..."
                  : "FINALIZAR ORDEN"}
              </button>
            </form>
          </section>
        )}

        {orderCreated && (
          <section
            id="success-section"
            className="delta-force-success-section"
          >
            <div className="delta-force-success-icon">✓</div>

            <h2>Orden creada</h2>

            <p>
              Tu pedido de Delta Force fue creado correctamente.
              Consulta el estado de la orden antes de realizar otra compra.
            </p>

            {orderNumber && (
              <div className="delta-force-order-number">
                <span>NÚMERO DE ORDEN</span>
                <strong>{orderNumber}</strong>
              </div>
            )}

            {supplierOrderId && (
              <div className="delta-force-order-number">
                <span>ID DE ORDEN DEL PROVEEDOR</span>
                <strong>{supplierOrderId}</strong>
              </div>
            )}

            {orderStatus && (
              <div className="delta-force-order-number">
                <span>ESTADO</span>
                <strong>{orderStatus}</strong>
              </div>
            )}

            <button
              type="button"
              className="delta-force-review-button"
              onClick={goToOrders}
            >
              REVISAR ORDEN
            </button>

            <button
              type="button"
              className="delta-force-store-button"
              onClick={goToStore}
            >
              VOLVER A LA TIENDA
            </button>
          </section>
        )}
      </section>

      <footer className="delta-force-footer">
        🛒 STORE GAMING 🎮
      </footer>

      <style jsx>{`
        .delta-force-page {
          min-height: 100vh;
          width: 100%;
          color: #fff;
          background:
            linear-gradient(
              rgba(0, 0, 0, 0.78),
              rgba(0, 0, 0, 0.88)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover fixed;
          overflow-x: hidden;
          padding-bottom: 20px;
        }

        .delta-force-header {
          position: sticky;
          top: 0;
          z-index: 20;
          width: 100%;
          min-height: 62px;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          box-sizing: border-box;
          background: rgba(8, 8, 8, 0.97);
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
          backdrop-filter: blur(12px);
        }

        .delta-force-back-button,
        .delta-force-orders-button {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 11px;
          background: #151515;
          color: #fff;
          font-size: 21px;
          font-weight: 900;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .delta-force-header h1 {
          min-width: 0;
          margin: 0;
          text-align: center;
          color: #fff;
          font-size: 16px;
          font-weight: 950;
          letter-spacing: 0.6px;
          white-space: nowrap;
        }

        .delta-force-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
        }

        .delta-force-vip-button,
        .delta-force-vip-active {
          min-height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 9px;
          border-radius: 9px;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 950;
        }

        .delta-force-vip-button {
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: #191919;
          color: #fff;
          cursor: pointer;
        }

        .delta-force-vip-active {
          border: 1px solid rgba(224, 178, 72, 0.5);
          background: rgba(140, 98, 20, 0.16);
          color: #f2c66d;
        }

        .delta-force-orders-button {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          font-size: 17px;
        }

        .delta-force-banner {
          position: relative;
          width: 100%;
          height: 205px;
          overflow: hidden;
          background: #080808;
          border-bottom: 1px solid rgba(220, 45, 45, 0.25);
        }

        .delta-force-banner img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .delta-force-banner-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          padding: 18px;
          box-sizing: border-box;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.9),
            rgba(0, 0, 0, 0.1) 65%,
            transparent
          );
        }

        .delta-force-banner-text {
          display: flex;
          flex-direction: column;
        }

        .delta-force-banner-text strong {
          font-size: 25px;
          font-weight: 1000;
          letter-spacing: 1px;
        }

        .delta-force-banner-text span {
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 13px;
          font-weight: 700;
        }

        .delta-force-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
          padding: 18px 14px 30px;
          box-sizing: border-box;
        }

        .delta-force-note {
          margin-bottom: 16px;
          padding: 14px;
          border-radius: 12px;
          background: rgba(18, 18, 18, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .delta-force-note strong {
          color: #fff;
          font-size: 14px;
          font-weight: 900;
        }

        .delta-force-note p {
          margin: 7px 0 0;
          color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
          font-weight: 600;
          line-height: 1.5;
        }

        .delta-force-offers-toggle {
          width: 100%;
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          border: 1px solid rgba(210, 45, 45, 0.4);
          border-radius: 12px;
          background: #171111;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.3px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .delta-force-offers-toggle.open {
          border-color: rgba(220, 55, 55, 0.7);
          background: #201111;
        }

        .delta-force-offers-arrow {
          font-size: 17px;
          transition: transform 0.2s ease;
        }

        .delta-force-offers-toggle.open
          .delta-force-offers-arrow {
          transform: rotate(180deg);
        }

        .delta-force-offers-section {
          margin-top: 12px;
        }

        .delta-force-offers-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .delta-force-offer {
          width: 100%;
          min-height: 66px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          background: rgba(15, 15, 15, 0.97);
          color: #fff;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          text-align: left;
        }

        .delta-force-offer:active {
          transform: scale(0.985);
        }

        .delta-force-offer:hover,
        .delta-force-offer.selected {
          border-color: rgba(220, 55, 55, 0.55);
          background: #1b1414;
        }

        .delta-force-offer-left {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .delta-force-offer-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(220, 45, 45, 0.12);
          border: 1px solid rgba(220, 45, 45, 0.2);
          font-size: 21px;
        }

        .delta-force-offer-details {
          min-width: 0;
        }

        .delta-force-offer-details strong {
          display: block;
          color: #fff;
          font-size: 14px;
          font-weight: 850;
          line-height: 1.25;
        }

        .delta-force-offer-details small {
          display: block;
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 11px;
          font-weight: 600;
        }

        .delta-force-offer-price {
          flex-shrink: 0;
          color: #ff7777;
          font-size: 16px;
          font-weight: 950;
          white-space: nowrap;
        }

        .delta-force-order-section {
          margin-top: 18px;
          padding: 16px;
          border-radius: 14px;
          background: rgba(14, 14, 14, 0.97);
          border: 1px solid rgba(220, 45, 45, 0.3);
          scroll-margin-top: 80px;
        }

        .delta-force-selected-offer {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 15px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.045);
        }

        .delta-force-selected-offer > span {
          font-size: 25px;
        }

        .delta-force-selected-details {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .delta-force-selected-details strong {
          color: #fff;
          font-size: 14px;
        }

        .delta-force-selected-details span {
          color: #ff7777;
          font-weight: 900;
          white-space: nowrap;
        }

        .delta-force-order-section form {
          display: flex;
          flex-direction: column;
        }

        .delta-force-order-section label {
          margin-bottom: 8px;
          color: rgba(255, 255, 255, 0.82);
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.3px;
        }

        .delta-force-order-section input {
          width: 100%;
          height: 50px;
          box-sizing: border-box;
          padding: 0 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 10px;
          outline: none;
          background: #090909;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
        }

        .delta-force-order-section input:focus {
          border-color: rgba(220, 55, 55, 0.75);
        }

        .delta-force-order-section input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .delta-force-form-error {
          margin-top: 10px;
          padding: 11px 12px;
          border-radius: 10px;
          background: rgba(120, 0, 0, 0.25);
          border: 1px solid rgba(255, 70, 70, 0.3);
          color: #ffaaaa;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.4;
        }

        .delta-force-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0 12px;
          color: #fff;
          font-size: 15px;
          font-weight: 850;
        }

        .delta-force-total strong {
          color: #ff7777;
          font-size: 19px;
          font-weight: 950;
        }

        .delta-force-create-order-button {
          width: 100%;
          min-height: 52px;
          border: 1px solid #d52c2c;
          border-radius: 11px;
          background: #c92323;
          color: #fff;
          font-size: 14px;
          font-weight: 950;
          letter-spacing: 0.4px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }

        .delta-force-create-order-button:active {
          transform: scale(0.985);
        }

        .delta-force-create-order-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .delta-force-success-section {
          margin-top: 18px;
          padding: 20px 14px;
          border-radius: 14px;
          background: rgba(13, 13, 13, 0.97);
          border: 1px solid rgba(255, 255, 255, 0.12);
          text-align: center;
          scroll-margin-top: 80px;
        }

        .delta-force-success-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #168b50;
          color: #fff;
          font-size: 28px;
          font-weight: 1000;
        }

        .delta-force-success-section h2 {
          margin: 0;
          color: #fff;
          font-size: 20px;
          font-weight: 950;
        }

        .delta-force-success-section p {
          margin: 8px 0;
          color: rgba(255, 255, 255, 0.65);
          font-size: 12px;
          line-height: 1.45;
        }

        .delta-force-order-number {
          margin-top: 13px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          overflow-wrap: anywhere;
        }

        .delta-force-order-number span {
          display: block;
          color: rgba(255, 255, 255, 0.55);
          font-size: 11px;
          font-weight: 700;
        }

        .delta-force-order-number strong {
          display: block;
          margin-top: 4px;
          color: #fff;
          font-size: 15px;
          font-weight: 900;
        }

        .delta-force-review-button,
        .delta-force-store-button {
          width: 100%;
          min-height: 49px;
          margin-top: 10px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .delta-force-review-button {
          border: 0;
          background: #c92323;
          color: #fff;
        }

        .delta-force-store-button {
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: #171717;
          color: #fff;
        }

        .delta-force-footer {
          position: relative;
          z-index: 2;
          padding: 18px 12px 25px;
          text-align: center;
          color: rgba(255, 255, 255, 0.48);
          font-size: 12px;
          font-weight: 800;
        }

        @media (max-width: 420px) {
          .delta-force-header {
            gap: 7px;
            padding-left: 9px;
            padding-right: 9px;
          }

          .delta-force-header h1 {
            font-size: 13px;
          }

          .delta-force-vip-button,
          .delta-force-vip-active {
            padding: 0 7px;
            font-size: 9px;
          }

          .delta-force-orders-button {
            width: 32px;
            height: 32px;
            flex-basis: 32px;
          }

          .delta-force-banner-text strong {
            font-size: 22px;
          }

          .delta-force-content {
            padding-left: 11px;
            padding-right: 11px;
          }

          .delta-force-offer {
            padding: 9px 10px;
          }

          .delta-force-offer-price {
            font-size: 14px;
          }

          .delta-force-selected-details {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  );
}
