"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  FC_MOBILE_ID,
  FcMobileIdOffer,
} from "../../../lib/games/fc-mobile-id";

export default function FcMobileIdPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(true);
  const [selectedOffer, setSelectedOffer] =
    useState<FcMobileIdOffer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  const [processing, setProcessing] = useState(false);

  function selectOffer(offer: FcMobileIdOffer) {
    setSelectedOffer(offer);
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

    if (!/^\d{4,20}$/.test(cleanPlayerId)) {
      setError(
        "Ingrese un Player ID válido de entre 4 y 20 dígitos."
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
        "/api/topups/fc-mobile-id",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            offerId: selectedOffer.id,
            offerName: selectedOffer.name,
            playerId: cleanPlayerId,
            retailPrice: selectedOffer.price,
            quantity: 1,
            idempotencyKey,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "No se pudo crear la orden."
        );
      }

      const order = result?.order || {};

      setOrderNumber(
        order?.order_number ||
          result?.orderNumber ||
          result?.id ||
          ""
      );

      setSupplierOrderId(
        order?.supplier_order_id ||
          result?.supplierOrderId ||
          ""
      );

      setOrderStatus(
        order?.status ||
          result?.status ||
          "SUPPLIER_PENDING"
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

  return (
    <main className="fc-mobile-id-page">
      <style jsx>{`
        .fc-mobile-id-page {
          min-height: 100vh;
          padding: 0 0 40px;
          color: #fff;
          background:
            linear-gradient(
              rgba(0, 0, 0, 0.72),
              rgba(0, 0, 0, 0.86)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover fixed;
          font-family: Arial, Helvetica, sans-serif;
        }

        .fc-mobile-id-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 16px;
          background: rgba(5, 5, 5, 0.94);
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
        }

        .fc-mobile-id-title {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.3px;
        }

        .fc-mobile-id-back {
          border: 0;
          border-radius: 10px;
          padding: 9px 12px;
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .fc-mobile-id-container {
          width: min(720px, 100%);
          margin: 0 auto;
          padding: 18px 14px 0;
        }

        .fc-mobile-id-banner {
          position: relative;
          width: 100%;
          height: 210px;
          overflow: hidden;
          border-radius: 18px;
          background: #111;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          box-shadow:
            0 12px 35px rgba(0, 0, 0, 0.5);
        }

        .fc-mobile-id-banner img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .fc-mobile-id-banner-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          padding: 18px;
          background:
            linear-gradient(
              transparent 30%,
              rgba(0, 0, 0, 0.82)
            );
        }

        .fc-mobile-id-banner-text span {
          display: block;
          color: #ff3b3b;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .fc-mobile-id-banner-text strong {
          display: block;
          margin-top: 3px;
          font-size: 21px;
          font-weight: 900;
        }

        .fc-mobile-id-note {
          margin-top: 14px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.78);
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          color: #ddd;
          font-size: 13px;
          line-height: 1.55;
        }

        .fc-mobile-id-note strong {
          color: #fff;
        }

        .fc-mobile-id-note-warning {
          margin-top: 9px;
          color: #ff6b6b;
          font-weight: 800;
        }

        .fc-mobile-id-offers-toggle {
          width: 100%;
          margin-top: 16px;
          padding: 15px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          background: rgba(10, 10, 10, 0.9);
          color: #fff;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }

        .fc-mobile-id-offers-toggle span:last-child {
          color: #ff3030;
          font-size: 20px;
        }

        .fc-mobile-id-offers-section {
          margin-top: 10px;
        }

        .fc-mobile-id-offers-heading {
          margin: 0 0 10px;
          padding: 0 3px;
          font-size: 17px;
          font-weight: 900;
        }

        .fc-mobile-id-offers-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .fc-mobile-id-offer {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px;
          border: 1px solid
            rgba(255, 255, 255, 0.09);
          border-radius: 13px;
          background: rgba(5, 5, 5, 0.88);
          color: #fff;
          cursor: pointer;
          text-align: left;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease;
        }

        .fc-mobile-id-offer:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 48, 48, 0.65);
        }

        .fc-mobile-id-offer.selected {
          border-color: #ff3030;
          background: rgba(90, 0, 0, 0.42);
          box-shadow:
            0 0 0 1px rgba(255, 48, 48, 0.2);
        }

        .fc-mobile-id-offer-left {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .fc-mobile-id-offer-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 48, 48, 0.25),
              rgba(255, 255, 255, 0.06)
            );
          border: 1px solid
            rgba(255, 48, 48, 0.18);
          font-size: 19px;
        }

        .fc-mobile-id-offer-name {
          font-size: 14px;
          font-weight: 900;
          line-height: 1.25;
        }

        .fc-mobile-id-offer-description {
          margin-top: 3px;
          color: #aaa;
          font-size: 11px;
          line-height: 1.3;
        }

        .fc-mobile-id-offer-price {
          flex-shrink: 0;
          color: #fff;
          font-size: 15px;
          font-weight: 900;
        }

        .fc-mobile-id-order-section {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          background: rgba(0, 0, 0, 0.82);
          border: 1px solid
            rgba(255, 255, 255, 0.1);
        }

        .fc-mobile-id-section-title {
          margin: 0 0 12px;
          font-size: 17px;
          font-weight: 900;
        }

        .fc-mobile-id-selected {
          margin-bottom: 14px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .fc-mobile-id-selected-label {
          color: #999;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .fc-mobile-id-selected-row {
          margin-top: 5px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .fc-mobile-id-selected-name {
          font-weight: 900;
          font-size: 14px;
        }

        .fc-mobile-id-selected-price {
          font-weight: 900;
          color: #ff4b4b;
        }

        .fc-mobile-id-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .fc-mobile-id-label {
          font-size: 12px;
          color: #bbb;
          font-weight: 800;
        }

        .fc-mobile-id-input {
          width: 100%;
          box-sizing: border-box;
          margin-top: 6px;
          padding: 13px 14px;
          border-radius: 11px;
          border: 1px solid
            rgba(255, 255, 255, 0.12);
          outline: none;
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-size: 15px;
        }

        .fc-mobile-id-input:focus {
          border-color: #ff3030;
          box-shadow:
            0 0 0 2px rgba(255, 48, 48, 0.12);
        }

        .fc-mobile-id-input::placeholder {
          color: #777;
        }

        .fc-mobile-id-error {
          padding: 11px 12px;
          border-radius: 10px;
          border: 1px solid
            rgba(255, 50, 50, 0.35);
          background: rgba(110, 0, 0, 0.3);
          color: #ff6868;
          font-size: 13px;
          font-weight: 800;
        }

        .fc-mobile-id-create-button {
          width: 100%;
          padding: 14px;
          border: 0;
          border-radius: 12px;
          background: #e52525;
          color: #fff;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }

        .fc-mobile-id-create-button:hover {
          transform: translateY(-1px);
        }

        .fc-mobile-id-create-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .fc-mobile-id-success {
          margin-top: 16px;
          padding: 18px 16px;
          border-radius: 15px;
          background: rgba(0, 45, 20, 0.82);
          border: 1px solid
            rgba(57, 255, 130, 0.25);
          text-align: center;
        }

        .fc-mobile-id-success-icon {
          width: 54px;
          height: 54px;
          margin: 0 auto 10px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #18a957;
          color: #fff;
          font-size: 27px;
          font-weight: 900;
        }

        .fc-mobile-id-success-title {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
        }

        .fc-mobile-id-success-text {
          margin: 8px 0 0;
          color: #c9e8d5;
          font-size: 13px;
          line-height: 1.5;
        }

        .fc-mobile-id-order-number {
          margin-top: 10px;
          padding: 11px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.35);
          font-weight: 900;
          word-break: break-word;
        }

        .fc-mobile-id-success-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-top: 13px;
        }

        .fc-mobile-id-success-button {
          padding: 12px 10px;
          border: 0;
          border-radius: 10px;
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .fc-mobile-id-success-button:hover {
          background: rgba(255, 255, 255, 0.16);
        }

        .fc-mobile-id-service {
          margin-top: 16px;
          padding: 15px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.72);
          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .fc-mobile-id-service-title {
          margin: 0 0 9px;
          font-size: 14px;
          font-weight: 900;
        }

        .fc-mobile-id-service-list {
          margin: 0;
          padding-left: 18px;
          color: #bbb;
          font-size: 12px;
          line-height: 1.7;
        }

        .fc-mobile-id-footer {
          padding: 24px 14px 0;
          text-align: center;
          color: #777;
          font-size: 11px;
        }

        @media (max-width: 480px) {
          .fc-mobile-id-header {
            padding: 12px;
          }

          .fc-mobile-id-title {
            font-size: 17px;
          }

          .fc-mobile-id-container {
            padding: 12px 10px 0;
          }

          .fc-mobile-id-banner {
            height: 175px;
            border-radius: 15px;
          }

          .fc-mobile-id-banner-text strong {
            font-size: 18px;
          }

          .fc-mobile-id-offer {
            padding: 11px;
          }

          .fc-mobile-id-offer-name {
            font-size: 13px;
          }

          .fc-mobile-id-offer-description {
            font-size: 10px;
          }

          .fc-mobile-id-offer-price {
            font-size: 14px;
          }

          .fc-mobile-id-success-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="fc-mobile-id-header">
        <button
          type="button"
          className="fc-mobile-id-back"
          onClick={() => router.push("/top-up")}
          aria-label="Volver"
        >
          ← Volver
        </button>

        <h1 className="fc-mobile-id-title">
          EAFC Mobile 🇮🇩
        </h1>

        <button
          type="button"
          className="fc-mobile-id-back"
          onClick={() => router.push("/orders")}
          aria-label="Pedidos"
        >
          🛒
        </button>
      </header>

      <div className="fc-mobile-id-container">
        <section className="fc-mobile-id-banner">
          <img
            src="/images/fc-mobile.jpg"
            alt="EAFC Mobile"
          />

          <div className="fc-mobile-id-banner-overlay">
            <div className="fc-mobile-id-banner-text">
              <span>RECARGA</span>
              <strong>EA SPORTS FC MOBILE</strong>
            </div>
          </div>
        </section>

        <section className="fc-mobile-id-note">
          <strong>📌 Información del servicio</strong>
          <br />
          Región: Indonesia.
          <br />
          Recarga de EA Sports FC Mobile.
          <br />
          Introduce tu Player ID antes de realizar el
          pedido.
          <br />
          El producto seleccionado se entrega
          directamente a tu cuenta después de realizar
          el pedido.

          <div className="fc-mobile-id-note-warning">
            ⚠️ Asegúrate de que tu cuenta EA esté
            registrada en la región de Indonesia.
          </div>
        </section>

        <button
          type="button"
          className="fc-mobile-id-offers-toggle"
          onClick={() => setShowOffers((value) => !value)}
        >
          <span>
            ✏️ PRESIONE PARA VER OFERTAS
          </span>

          <span>
            {showOffers ? "⌃" : "⌄"}
          </span>
        </button>

        {showOffers && (
          <section className="fc-mobile-id-offers-section">
            <h2 className="fc-mobile-id-offers-heading">
              SELECCIONA TU RECARGA
            </h2>

            <div className="fc-mobile-id-offers-list">
              {FC_MOBILE_ID.offers.map(
                (offer: FcMobileIdOffer) => {
                  const isSelected =
                    selectedOffer?.id === offer.id;

                  return (
                    <button
                      type="button"
                      key={offer.id}
                      className={`fc-mobile-id-offer ${
                        isSelected ? "selected" : ""
                      }`}
                      onClick={() => selectOffer(offer)}
                    >
                      <div className="fc-mobile-id-offer-left">
                        <div className="fc-mobile-id-offer-icon">
                          ⚽
                        </div>

                        <div>
                          <div className="fc-mobile-id-offer-name">
                            {offer.name}
                          </div>

                          <div className="fc-mobile-id-offer-description">
                            EAFC Mobile Indonesia
                          </div>
                        </div>
                      </div>

                      <div className="fc-mobile-id-offer-price">
                        ${Number(offer.price).toFixed(2)}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </section>
        )}

        {selectedOffer && !orderCreated && (
  <section
    id="order-section"
    className="fc-mobile-id-order-section"
  >
    <h2 className="fc-mobile-id-section-title">
      COMPLETA TU PEDIDO
    </h2>

    <div className="fc-mobile-id-selected">
      <div className="fc-mobile-id-selected-label">
        Oferta seleccionada
      </div>

      <div className="fc-mobile-id-selected-row">
        <div className="fc-mobile-id-selected-name">
          {selectedOffer.name}
        </div>

        <div className="fc-mobile-id-selected-price">
          ${Number(selectedOffer.price).toFixed(2)}
        </div>
      </div>
    </div>

    <form
      className="fc-mobile-id-form"
      onSubmit={handleSubmit}
    >
      <label className="fc-mobile-id-label">
        PLAYER ID

        <input
          className="fc-mobile-id-input"
          type="text"
          inputMode="numeric"
          value={playerId}
          onChange={(event) => {
            setPlayerId(
              event.target.value.replace(/\D/g, "")
            );
            setError("");
          }}
          placeholder="Ingrese su Player ID"
          maxLength={20}
          autoComplete="off"
          disabled={processing}
        />
      </label>

      <div className="fc-mobile-id-note">
        Introduce únicamente el Player ID numérico
        de tu cuenta de EAFC Mobile Indonesia.
      </div>

      {error && (
        <div className="fc-mobile-id-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="fc-mobile-id-create-button"
        disabled={processing}
      >
        {processing
          ? "PROCESANDO PEDIDO..."
          : "CREAR PEDIDO"}
      </button>
    </form>
  </section>
)}

{orderCreated && (
  <section
    id="success-section"
    className="fc-mobile-id-success"
  >
    <div className="fc-mobile-id-success-icon">
      ✓
    </div>

    <h2 className="fc-mobile-id-success-title">
      ¡ORDEN CREADA!
    </h2>

    <p className="fc-mobile-id-success-text">
      Tu pedido fue registrado correctamente.
      El proveedor procesará la recarga.
    </p>

    {orderNumber && (
      <div className="fc-mobile-id-order-number">
        🧾 Orden: {orderNumber}
      </div>
    )}

    {supplierOrderId && (
      <div className="fc-mobile-id-order-number">
        Proveedor: {supplierOrderId}
      </div>
    )}

    {orderStatus && (
      <div className="fc-mobile-id-order-number">
        Estado: {orderStatus}
      </div>
    )}

    <div className="fc-mobile-id-success-actions">
      <button
        type="button"
        className="fc-mobile-id-success-button"
        onClick={() => router.push("/orders")}
      >
        📋 Revisar orden
      </button>

      <button
        type="button"
        className="fc-mobile-id-success-button"
        onClick={() => router.push("/top-up")}
      >
        🛒 Volver a la tienda
      </button>
    </div>
  </section>
)}

<section className="fc-mobile-id-service">
  <h3 className="fc-mobile-id-service-title">
    ⚡ SERVICIO DE RECARGA
  </h3>

  <ul className="fc-mobile-id-service-list">
    <li>Entrega directa a la cuenta.</li>
    <li>Región: Indonesia.</li>
    <li>Necesitas introducir tu Player ID.</li>
    <li>
      Los productos están bloqueados por región.
    </li>
  </ul>
</section>

<footer className="fc-mobile-id-footer">
  <strong>🛒STORE GAMING🎮</strong>
  <br />
  EAFC Mobile (ID)
</footer>
      </div>
    </main>
  );
}
