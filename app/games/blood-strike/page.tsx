
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  BLOOD_STRIKE,
  type BloodStrikeOffer,
} from "../../../lib/games/blood-strike";

const VIP_MARKUP = 0.08;

export default function BloodStrikePage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] =
    useState<BloodStrikeOffer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");

  const [processing, setProcessing] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);

  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  const [vipActive, setVipActive] = useState(false);

  /*
   * COMPROBAR VIP
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
      } catch (error) {
        console.error("Error cargando membresía VIP:", error);
        if (!cancelled) setVipActive(false);
      }
    }

    void checkVip();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * PRECIO SEGÚN MEMBRESÍA
   */

  function getOfferPrice(offer: BloodStrikeOffer) {
    if (vipActive) {
      return Number(
        (
          Number(offer.supplierPrice) + VIP_MARKUP
        ).toFixed(4)
      );
    }

    return Number(offer.price);
  }

  function formatOfferPrice(offer: BloodStrikeOffer) {
    return `$${getOfferPrice(offer).toFixed(
      vipActive ? 4 : 2
    )}`;
  }

  function selectOffer(offer: BloodStrikeOffer) {
    setSelectedOffer(offer);
    setPlayerId("");
    setError("");
    setOrderCreated(false);
    setOrderNumber("");
    setSupplierOrderId("");
    setOrderStatus("");

    setTimeout(() => {
      document
        .getElementById("order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  async function createOrder() {
    if (!selectedOffer) {
      setError("Seleccione una oferta.");
      return;
    }

    const cleanPlayerId = playerId.trim();

    if (!/^[A-Za-z0-9_-]{4,32}$/.test(cleanPlayerId)) {
      setError(
        "Introduzca un ID de jugador válido. Solo se permiten letras, números, guion y guion bajo."
      );
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(
          "Su sesión ha expirado. Inicie sesión nuevamente."
        );
        return;
      }

      const idempotencyKey = crypto.randomUUID();

      const response = await fetch(
        "/api/topups/blood-strike",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            offerId: selectedOffer.id,
            playerId: cleanPlayerId,
            idempotencyKey,
            retailPrice: getOfferPrice(selectedOffer),
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "No se pudo crear la orden."
        );
      }

      setOrderNumber(
        data?.orderNumber ||
          data?.order?.orderNumber ||
          data?.order?.id ||
          ""
      );

      setSupplierOrderId(
        data?.supplierOrderId ||
          data?.order?.supplierOrderId ||
          ""
      );

      setOrderStatus(
        data?.status ||
          data?.order?.status ||
          "PENDING"
      );

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
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la orden."
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    void createOrder();
  }

  function goToOrders() {
    router.push("/orders");
  }

  function goToStore() {
    router.push("/top-up");
  }

  function goToVip() {
    router.push("/vip");
  }

  return (
    <main className="blood-strike-page">
      <header className="blood-strike-header">
        <button
          type="button"
          className="blood-strike-back-button"
          onClick={goToStore}
          aria-label="Volver a la tienda"
        >
          ←
        </button>

        <div className="blood-strike-header-title">
          BLOOD STRIKE
        </div>

        <div className="blood-strike-header-actions">
          {vipActive ? (
            <div className="blood-strike-vip-active">
              ★ VIP ACTIVO
            </div>
          ) : (
            <button
              type="button"
              className="blood-strike-vip-button"
              onClick={goToVip}
            >
              ★ COMPRAR VIP
            </button>
          )}

          <button
            type="button"
            className="blood-strike-orders-button"
            onClick={goToOrders}
            aria-label="Mis pedidos"
          >
            📦
          </button>
        </div>
      </header>

      <section className="blood-strike-banner">
        <img
          src={BLOOD_STRIKE.image}
          alt="Blood Strike"
        />

        <div className="blood-strike-banner-overlay">
          <div className="blood-strike-banner-text">
            <strong>BLOOD STRIKE</strong>
            <span>Recarga rápida y segura</span>
          </div>
        </div>
      </section>

      <div className="blood-strike-content">
        <div className="blood-strike-note">
          Introduce correctamente tu ID de jugador antes
          de crear la orden.
        </div>

        <button
          type="button"
          className={`blood-strike-offers-toggle ${
            showOffers ? "open" : ""
          }`}
          onClick={() =>
            setShowOffers((value) => !value)
          }
        >
          <span>
            {showOffers
              ? "OCULTAR OFERTAS"
              : "VER OFERTAS DISPONIBLES"}
          </span>

          <span className="blood-strike-offers-arrow">
            ▼
          </span>
        </button>

        {showOffers && (
          <section className="blood-strike-offers-section">
            <div className="blood-strike-offers-list">
              {BLOOD_STRIKE.offers.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  className="blood-strike-offer"
                  onClick={() => selectOffer(offer)}
                >
                  <div className="blood-strike-offer-left">
                    <div className="blood-strike-offer-icon">
                      🎁
                    </div>

                    <div>
                      <div className="blood-strike-offer-name">
                        {offer.name}
                      </div>

                      <div className="blood-strike-offer-description">
                        {offer.displayName}
                      </div>
                    </div>
                  </div>

                  <div className="blood-strike-offer-price">
                    {formatOfferPrice(offer)}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {selectedOffer && (
          <section
            id="order-section"
            className="blood-strike-order-section"
          >
            <div className="blood-strike-selected-offer">
              <div className="blood-strike-selected-title">
                OFERTA SELECCIONADA
              </div>

              <div className="blood-strike-selected-name">
                {selectedOffer.name}
              </div>

              <div className="blood-strike-order-note">
                Introduce el ID de jugador de tu cuenta de
                Blood Strike para recibir la recarga.
              </div>

              <form
                className="blood-strike-order-form"
                onSubmit={handleSubmit}
              >
                <div className="blood-strike-input-description">
                  ID DE JUGADOR
                </div>

                <div className="blood-strike-input-wrapper">
                  <input
                    className="blood-strike-input"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    placeholder="Ej: 123456789"
                    value={playerId}
                    onChange={(event) =>
                      setPlayerId(event.target.value)
                    }
                    maxLength={32}
                  />
                </div>

                {error && (
                  <div className="blood-strike-error">
                    {error}
                  </div>
                )}

                <div className="blood-strike-total">
                  <span>Total</span>

                  <strong>
                    {formatOfferPrice(selectedOffer)}
                  </strong>
                </div>

                <button
                  type="submit"
                  className="blood-strike-create-order-button"
                  disabled={processing}
                >
                  {processing
                    ? "CREANDO ORDEN..."
                    : "CREAR ORDEN"}
                </button>
              </form>
            </div>
          </section>
        )}

        {orderCreated && (
          <section
            id="success-section"
            className="blood-strike-success-section"
          >
            <div className="blood-strike-success-icon">
              ✓
            </div>

            <div className="blood-strike-success-title">
              Orden creada
            </div>

            <div className="blood-strike-success-text">
              Tu orden fue creada correctamente.
              Puedes revisar su estado desde el historial
              de pedidos.
            </div>

            {orderNumber && (
              <div className="blood-strike-order-number">
                Orden: {orderNumber}
              </div>
            )}

            {supplierOrderId && (
              <div className="blood-strike-order-number">
                ID proveedor: {supplierOrderId}
              </div>
            )}

            {orderStatus && (
              <div className="blood-strike-order-number">
                Estado: {orderStatus}
              </div>
            )}

            <button
              type="button"
              className="blood-strike-review-button"
              onClick={goToOrders}
            >
              REVISAR ORDEN
            </button>

            <button
              type="button"
              className="blood-strike-store-button"
              onClick={goToStore}
            >
              VOLVER A LA TIENDA
            </button>
          </section>
        )}

        <section className="blood-strike-service-info">
          <div className="blood-strike-service-info-title">
            🩸 Servicio Blood Strike
          </div>

          <div className="blood-strike-service-info-text">
            Las recargas son procesadas automáticamente.
            Comprueba cuidadosamente tu ID antes de crear
            la orden.
          </div>
        </section>
      </div>

      <footer className="blood-strike-footer">
        🛒 STORE GAMING 🎮
      </footer>

      <style jsx>{`
        .blood-strike-page {
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

        .blood-strike-header {
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

        .blood-strike-back-button,
        .blood-strike-orders-button {
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

        .blood-strike-header-title {
          min-width: 0;
          text-align: center;
          color: #fff;
          font-size: 16px;
          font-weight: 950;
          letter-spacing: 0.6px;
          white-space: nowrap;
        }

        .blood-strike-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
        }

        .blood-strike-vip-button,
        .blood-strike-vip-active {
          min-height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 9px;
          border-radius: 9px;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.2px;
        }

        .blood-strike-vip-button {
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: #191919;
          color: #fff;
          cursor: pointer;
        }

        .blood-strike-vip-active {
          border: 1px solid rgba(224, 178, 72, 0.5);
          background: rgba(140, 98, 20, 0.16);
          color: #f2c66d;
        }

        .blood-strike-orders-button {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          font-size: 17px;
        }

        .blood-strike-banner {
          position: relative;
          width: 100%;
          height: 205px;
          overflow: hidden;
          background: #080808;
          border-bottom: 1px solid rgba(220, 45, 45, 0.25);
        }

        .blood-strike-banner img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .blood-strike-banner-overlay {
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

        .blood-strike-banner-text {
          display: flex;
          flex-direction: column;
        }

        .blood-strike-banner-text strong {
          font-size: 25px;
          font-weight: 1000;
          letter-spacing: 1px;
        }

        .blood-strike-banner-text span {
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 13px;
          font-weight: 700;
        }

        .blood-strike-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
          padding: 18px 14px 30px;
          box-sizing: border-box;
        }

        .blood-strike-note {
          margin: 0 0 16px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(18, 18, 18, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.85);
          text-align: center;
          font-size: 13px;
          font-weight: 650;
          line-height: 1.45;
        }

        .blood-strike-offers-toggle {
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

        .blood-strike-offers-toggle.open {
          border-color: rgba(220, 55, 55, 0.7);
          background: #201111;
        }

        .blood-strike-offers-arrow {
          font-size: 17px;
          transition: transform 0.2s ease;
        }

        .blood-strike-offers-toggle.open
          .blood-strike-offers-arrow {
          transform: rotate(180deg);
        }

        .blood-strike-offers-section {
          margin-top: 12px;
        }

        .blood-strike-offers-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .blood-strike-offer {
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

        .blood-strike-offer:active {
          transform: scale(0.985);
        }

        .blood-strike-offer:hover {
          border-color: rgba(220, 55, 55, 0.55);
          background: #1b1414;
        }

        .blood-strike-offer-left {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .blood-strike-offer-icon {
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

        .blood-strike-offer-name {
          color: #fff;
          font-size: 14px;
          font-weight: 850;
          line-height: 1.25;
        }

        .blood-strike-offer-description {
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 11px;
          font-weight: 600;
        }

        .blood-strike-offer-price {
          flex-shrink: 0;
          color: #ff7777;
          font-size: 16px;
          font-weight: 950;
          white-space: nowrap;
        }

        .blood-strike-order-section {
          margin-top: 18px;
          scroll-margin-top: 80px;
        }

        .blood-strike-selected-offer {
          padding: 16px;
          border-radius: 14px;
          background: rgba(14, 14, 14, 0.97);
          border: 1px solid rgba(220, 45, 45, 0.3);
        }

        .blood-strike-selected-title {
          color: rgba(255, 255, 255, 0.58);
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

        .blood-strike-selected-name {
          margin-top: 5px;
          color: #fff;
          font-size: 18px;
          font-weight: 950;
        }

        .blood-strike-order-note {
          margin-top: 14px;
          padding: 11px 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.045);
          color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
          font-weight: 650;
          line-height: 1.45;
        }

        .blood-strike-order-form {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .blood-strike-input-description {
          color: rgba(255, 255, 255, 0.82);
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.3px;
        }

        .blood-strike-input-wrapper {
          width: 100%;
        }

        .blood-strike-input {
          width: 100%;
          height: 50px;
          padding: 0 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 10px;
          outline: none;
          background: #090909;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          box-sizing: border-box;
        }

        .blood-strike-input:focus {
          border-color: rgba(220, 55, 55, 0.75);
        }

        .blood-strike-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .blood-strike-error {
          padding: 11px 12px;
          border-radius: 10px;
          background: rgba(120, 0, 0, 0.25);
          border: 1px solid rgba(255, 70, 70, 0.3);
          color: #ffaaaa;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.4;
        }

        .blood-strike-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0 2px;
          color: #fff;
          font-size: 15px;
          font-weight: 850;
        }

        .blood-strike-total strong {
          color: #ff7777;
          font-size: 19px;
          font-weight: 950;
        }

        .blood-strike-create-order-button {
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

        .blood-strike-create-order-button:active {
          transform: scale(0.985);
        }

        .blood-strike-create-order-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .blood-strike-success-section {
          margin-top: 18px;
          padding: 20px 14px;
          border-radius: 14px;
          background: rgba(13, 13, 13, 0.97);
          border: 1px solid rgba(255, 255, 255, 0.12);
          text-align: center;
          scroll-margin-top: 80px;
        }

        .blood-strike-success-icon {
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

        .blood-strike-success-title {
          color: #fff;
          font-size: 20px;
          font-weight: 950;
        }

        .blood-strike-success-text {
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.65);
          font-size: 12px;
          line-height: 1.45;
        }

        .blood-strike-order-number {
          margin-top: 13px;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .blood-strike-review-button,
        .blood-strike-store-button {
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

        .blood-strike-review-button {
          border: 0;
          background: #c92323;
          color: #fff;
        }

        .blood-strike-store-button {
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: #171717;
          color: #fff;
        }

        .blood-strike-service-info {
          margin-top: 20px;
          padding: 14px;
          border-radius: 12px;
          background: rgba(13, 13, 13, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .blood-strike-service-info-title {
          color: #fff;
          font-size: 14px;
          font-weight: 900;
        }

        .blood-strike-service-info-text {
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.62);
          font-size: 12px;
          line-height: 1.5;
        }

        .blood-strike-footer {
          position: relative;
          z-index: 2;
          padding: 18px 12px 25px;
          text-align: center;
          color: rgba(255, 255, 255, 0.48);
          font-size: 12px;
          font-weight: 800;
        }

        @media (max-width: 420px) {
          .blood-strike-header {
            gap: 7px;
            padding-left: 9px;
            padding-right: 9px;
          }

          .blood-strike-header-title {
            font-size: 13px;
          }

          .blood-strike-vip-button,
          .blood-strike-vip-active {
            padding: 0 7px;
            font-size: 9px;
          }

          .blood-strike-orders-button {
            width: 32px;
            height: 32px;
            flex-basis: 32px;
          }

          .blood-strike-banner-text strong {
            font-size: 22px;
          }

          .blood-strike-content {
            padding-left: 11px;
            padding-right: 11px;
          }

          .blood-strike-offer {
            padding: 9px 10px;
          }

          .blood-strike-offer-price {
            font-size: 15px;
          }
        }
      `}</style>
    </main>
  );
}
