
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

import {
  FREE_FIRE_LATAM,
  type FreeFireLatamOffer,
} from "../../../lib/games/free-fire-latam";

const VIP_MARKUP = 0.08;

export default function FreeFireLatamPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] =
    useState<FreeFireLatamOffer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [processing, setProcessing] = useState(false);
  const [vipActive, setVipActive] = useState(false);

  // Consultar el VIP del usuario autenticado.
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

        if (cancelled) return;

        if (profileError) {
          console.error("ERROR CONSULTANDO VIP:", profileError);
          setVipActive(false);
          return;
        }

        const expiration = profile?.vip_expires_at
          ? new Date(profile.vip_expires_at).getTime()
          : 0;

        setVipActive(
          Number.isFinite(expiration) &&
            expiration > Date.now()
        );
      } catch (err) {
        console.error("ERROR VERIFICANDO VIP:", err);
        if (!cancelled) setVipActive(false);
      }
    }

    void checkVip();

    return () => {
      cancelled = true;
    };
  }, []);

  // Calcular el precio correspondiente.
  function getOfferPrice(offer: FreeFireLatamOffer) {
    if (!vipActive) {
      return offer.price;
    }

    return Number(
      (offer.supplierPrice + VIP_MARKUP).toFixed(4)
    );
  }

  function formatOfferPrice(offer: FreeFireLatamOffer) {
    return vipActive
      ? `${getOfferPrice(offer).toFixed(4)}$`
      : `${getOfferPrice(offer).toFixed(2)}$`;
  }

  function selectOffer(offer: FreeFireLatamOffer) {
    setSelectedOffer(offer);
    setPlayerId("");
    setError("");
    setOrderCreated(false);
    setOrderNumber("");
    setSupplierOrderId("");
    setOrderStatus("");
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
        setError(
          "Su sesión ha expirado. Inicie sesión nuevamente."
        );

        router.replace("/");
        return;
      }

      const cleanPlayerId = playerId.trim().replace(/\s+/g, "");

      // ------------------------------------------------------
      // VALIDACIÓN DEL ID DE FREE FIRE
      // ------------------------------------------------------

      if (!cleanPlayerId) {
        setError("Ponga el ID de su cuenta.");
        return;
      }

      if (!/^[0-9]+$/.test(cleanPlayerId)) {
        setError("El ID debe contener solamente números.");
        return;
      }

      if (
        cleanPlayerId.length < 4 ||
        cleanPlayerId.length > 20
      ) {
        setError("El ID parece no tener un formato válido.");
        return;
      }

      // RECHAZAR IDs COMO 000000
      if (/^0+$/.test(cleanPlayerId)) {
        setError(
          "El ID no puede estar compuesto únicamente por ceros. Introduce tu ID real de Free Fire."
        );
        return;
      }

      // ------------------------------------------------------
      // CREAR CLAVE DE IDEMPOTENCIA
      // ------------------------------------------------------

      const idempotencyKey = crypto.randomUUID();

      // ------------------------------------------------------
      // ENVIAR PEDIDO A LA API
      // ------------------------------------------------------

      const response = await fetch("/api/topups/free-fire", {
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
        setError(
          result.error || "No se pudo crear la orden."
        );
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
        document
          .getElementById("success-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (err) {
      console.error("ERROR CREANDO TOPUP:", err);

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

  return (
    <main className="free-fire-page">
      <header className="free-fire-header">
        <button
          type="button"
          className="free-fire-back-button"
          onClick={() => router.push("/top-up")}
          aria-label="Volver"
        >
          <span>←</span>
        </button>

        <h1>FREE FIRE</h1>

        {vipActive ? (
          <div className="vip-status">
            <span className="vip-crown">♛</span>
            <span>VIP ACTIVO</span>
          </div>
        ) : (
          <button
            type="button"
            className="vip-buy-button"
            onClick={() => router.push("/vip")}
          >
            <span>♛</span>
            COMPRAR VIP
          </button>
        )}
      </header>

      <section className="free-fire-content">
        <div className="free-fire-banner">
          <img
            src="/images/free-fire-latam.jpg"
            alt="Free Fire LATAM"
          />
          <div className="banner-overlay">
            <span className="banner-label">
              STORE GAMING
            </span>
            <h2>FREE FIRE</h2>
            <p>RECARGAS LATAM</p>
          </div>
        </div>

        <div className="free-fire-region">
          <div className="region-icon">🌎</div>
          <div>
            <strong>Región LATAM</strong>
            <p>
              Selecciona tu oferta e introduce el ID de la
              cuenta donde deseas recibir tu recarga.
            </p>
          </div>
        </div>

        <div className="section-heading">
          <div>
            <span className="section-eyebrow">RECARGAS</span>
            <h2>Diamantes disponibles</h2>
          </div>
        </div>

        <button
          type="button"
          className="free-fire-offers-toggle"
          onClick={() => {
            setShowOffers((value) => !value);
            setError("");
          }}
        >
          <span>
            <span className="toggle-icon">💎</span>
            {showOffers ? "OCULTAR OFERTAS" : "VER OFERTAS"}
          </span>

          <span className="toggle-arrow">
            {showOffers ? "▲" : "▼"}
          </span>
        </button>

        {showOffers && (
          <section className="free-fire-offers-section">
            <div className="offers-heading">
              <span>SELECCIONA TU RECARGA</span>
              {vipActive && (
                <span className="vip-price-label">
                  PRECIO VIP
                </span>
              )}
            </div>

            <div className="free-fire-offers-list">
              {FREE_FIRE_LATAM.offers.map((offer) => {
                const selected =
                  selectedOffer?.id === offer.id;

                return (
                  <button
                    key={offer.id}
                    type="button"
                    className={`free-fire-offer ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() => selectOffer(offer)}
                  >
                    <div className="offer-left">
                      <span className="offer-icon">
                        {offer.icon}
                      </span>

                      <div className="offer-details">
                        <strong>{offer.display}</strong>
                        <small>{offer.name}</small>
                      </div>
                    </div>

                    <div className="offer-right">
                      <strong>
                        {formatOfferPrice(offer)}
                      </strong>
                      <span>
                        {selected ? "SELECCIONADO ✓" : "ELEGIR →"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {selectedOffer && !orderCreated && (
          <section
            id="free-fire-order-form"
            className="free-fire-order-section"
          >
            <div className="order-section-heading">
              <span className="section-eyebrow">
                CONFIRMAR COMPRA
              </span>
              <h2>Datos de tu cuenta</h2>
            </div>

            <div className="free-fire-selected-offer">
              <span className="selected-icon">
                {selectedOffer.icon}
              </span>

              <div className="selected-details">
                <small>OFERTA SELECCIONADA</small>
                <strong>{selectedOffer.name}</strong>
              </div>

              <strong className="selected-price">
                {formatOfferPrice(selectedOffer)}
              </strong>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="free-fire-player-id">
                ID DEL JUGADOR
              </label>

              <input
                id="free-fire-player-id"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Introduce tu ID de Free Fire"
                value={playerId}
                onChange={(event) => {
                  setPlayerId(
                    event.target.value.replace(/[^0-9]/g, "")
                  );
                  setError("");
                }}
                maxLength={20}
                disabled={processing}
              />

              <p className="input-help">
                Verifica que el ID sea correcto antes de
                finalizar tu pedido.
              </p>

              {error && (
                <div className="free-fire-form-error">
                  <span>!</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="free-fire-create-order-button"
                disabled={processing}
              >
                {processing
                  ? "PROCESANDO ORDEN..."
                  : "FINALIZAR ORDEN"}
              </button>
            </form>
          </section>
        )}

        {orderCreated && (
          <section
            id="success-section"
            className="free-fire-success-section"
          >
            <div className="success-icon">✓</div>

            <span className="success-eyebrow">
              STORE GAMING
            </span>

            <h2>Orden creada</h2>

            <p>
              Tu pedido de Free Fire LATAM fue creado
              correctamente.
            </p>

            {orderNumber && (
              <div className="free-fire-order-number">
                <span>NÚMERO DE ORDEN</span>
                <strong>{orderNumber}</strong>
              </div>
            )}

            {supplierOrderId && (
              <div className="free-fire-order-number">
                <span>ID DE ORDEN DEL PROVEEDOR</span>
                <strong>{supplierOrderId}</strong>
              </div>
            )}

            {orderStatus && (
              <div className="free-fire-order-number">
                <span>ESTADO</span>
                <strong>{orderStatus}</strong>
              </div>
            )}

            <button
              type="button"
              className="free-fire-review-button"
              onClick={() => router.push("/orders")}
            >
              REVISAR ORDEN
            </button>

            <button
              type="button"
              className="free-fire-store-button"
              onClick={() => router.push("/top-up")}
            >
              VOLVER A LA TIENDA
            </button>
          </section>
        )}

        <div className="free-fire-security-note">
          <span>🔒</span>
          <p>
            Compra procesada mediante STORE GAMING.
            Comprueba siempre los datos de tu cuenta.
          </p>
        </div>
      </section>

      <footer className="free-fire-footer">
        <strong>STORE GAMING</strong>
        <span>RECARGAS DIGITALES</span>
      </footer>

      <style jsx>{`
        .free-fire-page {
          min-height: 100vh;
          color: #f5f5f5;
          background:
            linear-gradient(
              180deg,
              rgba(8, 8, 10, 0.94),
              rgba(10, 10, 12, 0.98)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover fixed;
          padding-bottom: 25px;
        }

        .free-fire-header {
          position: sticky;
          top: 0;
          z-index: 20;
          min-height: 62px;
          padding: 9px 12px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 8px;
          background: rgba(12, 12, 14, 0.96);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(14px);
        }

        .free-fire-header h1 {
          margin: 0;
          color: #fff;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 1px;
          text-align: center;
          white-space: nowrap;
        }

        .free-fire-back-button {
          justify-self: start;
          width: 39px;
          height: 39px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          background: #1b1b1f;
          color: #fff;
          font-size: 25px;
          cursor: pointer;
        }

        .vip-buy-button,
        .vip-status {
          justify-self: end;
          min-height: 34px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          border-radius: 9px;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 900;
        }

        .vip-buy-button {
          border: 1px solid rgba(230, 175, 70, 0.45);
          background: rgba(230, 175, 70, 0.1);
          color: #f2c66d;
          cursor: pointer;
        }

        .vip-status {
          border: 1px solid rgba(230, 175, 70, 0.35);
          background: rgba(230, 175, 70, 0.12);
          color: #f2c66d;
        }

        .vip-crown {
          font-size: 16px;
        }

        .free-fire-content {
          width: min(100%, 680px);
          margin: 0 auto;
          padding: 0 14px 25px;
        }

        .free-fire-banner {
          position: relative;
          width: calc(100% + 28px);
          height: 215px;
          margin-left: -14px;
          overflow: hidden;
          background: #181818;
        }

        .free-fire-banner img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .banner-overlay {
          position: absolute;
          inset: 0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          background: linear-gradient(
            90deg,
            rgba(0, 0, 0, 0.78),
            rgba(0, 0, 0, 0.05)
          ),
          linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.72),
            transparent 75%
          );
        }

        .banner-label {
          color: #ff7777;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .banner-overlay h2 {
          margin: 5px 0 0;
          color: #fff;
          font-size: 28px;
          font-weight: 1000;
          letter-spacing: 1px;
        }

        .banner-overlay p {
          margin: 3px 0 0;
          color: #ddd;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .free-fire-region {
          margin-top: 16px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 13px;
          background: #151518;
        }

        .region-icon {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #242428;
          font-size: 21px;
        }

        .free-fire-region strong {
          font-size: 14px;
        }

        .free-fire-region p {
          margin: 4px 0 0;
          color: #a5a5aa;
          font-size: 12px;
          line-height: 1.5;
        }

        .section-heading {
          margin: 25px 0 12px;
        }

        .section-eyebrow {
          color: #ed5555;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .section-heading h2,
        .order-section-heading h2 {
          margin: 4px 0 0;
          color: #fff;
          font-size: 19px;
          font-weight: 900;
        }

        .free-fire-offers-toggle {
          width: 100%;
          min-height: 51px;
          padding: 0 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid rgba(220, 45, 45, 0.35);
          border-radius: 11px;
          background: #1a1719;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .free-fire-offers-toggle > span:first-child {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .toggle-icon {
          font-size: 18px;
        }

        .toggle-arrow {
          color: #ef6262;
          font-size: 11px;
        }

        .free-fire-offers-section {
          margin-top: 12px;
        }

        .offers-heading {
          margin-bottom: 9px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          color: #999;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .vip-price-label {
          color: #f2c66d;
        }

        .free-fire-offers-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .free-fire-offer {
          width: 100%;
          min-height: 67px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          background: #17171a;
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s ease,
            background 0.15s ease;
        }

        .free-fire-offer.selected {
          border-color: #d93636;
          background: #251719;
        }

        .offer-left {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .offer-icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #242428;
          font-size: 21px;
        }

        .offer-details strong {
          display: block;
          font-size: 14px;
        }

        .offer-details small {
          display: block;
          margin-top: 4px;
          color: #929298;
          font-size: 11px;
        }

        .offer-right {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
        }

        .offer-right strong {
          color: #fff;
          font-size: 15px;
          font-weight: 900;
        }

        .offer-right span {
          color: #999;
          font-size: 9px;
          font-weight: 800;
        }

        .free-fire-offer.selected .offer-right span {
          color: #ff7777;
        }

        .free-fire-order-section {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 14px;
          background: #151518;
        }

        .order-section-heading {
          margin-bottom: 15px;
        }

        .free-fire-selected-offer {
          margin-bottom: 17px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 11px;
          background: #202024;
        }

        .selected-icon {
          font-size: 24px;
        }

        .selected-details {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .selected-details small {
          color: #999;
          font-size: 9px;
          font-weight: 800;
        }

        .selected-details strong {
          font-size: 13px;
        }

        .selected-price {
          color: #fff;
          font-size: 14px;
          white-space: nowrap;
        }

        .free-fire-order-section form {
          display: flex;
          flex-direction: column;
        }

        .free-fire-order-section label {
          margin-bottom: 8px;
          color: #eee;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.7px;
        }

        .free-fire-order-section input {
          width: 100%;
          box-sizing: border-box;
          padding: 14px;
          border: 1px solid #38383e;
          border-radius: 10px;
          outline: none;
          background: #202024;
          color: #fff;
          font-size: 14px;
        }

        .free-fire-order-section input:focus {
          border-color: #d93636;
        }

        .free-fire-order-section input::placeholder {
          color: #77777e;
        }

        .input-help {
          margin: 7px 0 0;
          color: #898990;
          font-size: 11px;
          line-height: 1.5;
        }

        .free-fire-form-error {
          margin-top: 11px;
          padding: 11px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(255, 80, 80, 0.2);
          border-radius: 9px;
          background: rgba(150, 0, 0, 0.13);
          color: #ffaaaa;
          font-size: 12px;
          line-height: 1.5;
        }

        .free-fire-form-error span {
          width: 19px;
          height: 19px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #a92727;
          color: #fff;
          font-weight: 900;
        }

        .free-fire-create-order-button {
          width: 100%;
          min-height: 47px;
          margin-top: 15px;
          border: 0;
          border-radius: 10px;
          background: #d6252c;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.5px;
          cursor: pointer;
        }

        .free-fire-create-order-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .free-fire-success-section {
          margin-top: 18px;
          padding: 23px 16px;
          border: 1px solid rgba(50, 190, 100, 0.2);
          border-radius: 15px;
          background: #151a17;
          text-align: center;
        }

        .success-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #168e4a;
          color: #fff;
          font-size: 30px;
          font-weight: 900;
        }

        .success-eyebrow {
          color: #63d995;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .free-fire-success-section h2 {
          margin: 6px 0;
          font-size: 22px;
        }

        .free-fire-success-section p {
          margin: 8px 0 15px;
          color: #b9c4bd;
          font-size: 13px;
          line-height: 1.5;
        }

        .free-fire-order-number {
          margin-top: 10px;
          padding: 12px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.06);
        }

        .free-fire-order-number span {
          display: block;
          color: #999;
          font-size: 10px;
          font-weight: 800;
        }

        .free-fire-order-number strong {
          display: block;
          margin-top: 5px;
          font-size: 15px;
          overflow-wrap: anywhere;
        }

        .free-fire-review-button,
        .free-fire-store-button {
          width: 100%;
          min-height: 45px;
          margin-top: 12px;
          border: 0;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .free-fire-review-button {
          background: #168e4a;
          color: #fff;
        }

        .free-fire-store-button {
          background: #29292e;
          color: #fff;
        }

        .free-fire-security-note {
          margin-top: 17px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.025);
        }

        .free-fire-security-note span {
          font-size: 19px;
        }

        .free-fire-security-note p {
          margin: 0;
          color: #929298;
          font-size: 11px;
          line-height: 1.5;
        }

        .free-fire-footer {
          padding: 22px 12px 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }

        .free-fire-footer strong {
          color: #ddd;
          font-size: 12px;
          letter-spacing: 1.5px;
        }

        .free-fire-footer span {
          color: #777;
          font-size: 9px;
          letter-spacing: 1.5px;
        }

        @media (max-width: 380px) {
          .free-fire-header {
            padding-left: 8px;
            padding-right: 8px;
            gap: 5px;
          }

          .free-fire-header h1 {
            font-size: 14px;
          }

          .vip-buy-button,
          .vip-status {
            padding: 0 7px;
            font-size: 9px;
          }

          .free-fire-banner {
            height: 185px;
          }
        }
      `}</style>
    </main>
  );
}
