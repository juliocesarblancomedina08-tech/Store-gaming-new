
"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  SAUSAGE_MAN,
  SausageManOffer,
} from "../../../lib/games/sausage-man";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SausageManPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] =
    useState(true);

  const [selectedOffer, setSelectedOffer] =
    useState<SausageManOffer | null>(null);

  const [characterId, setCharacterId] =
    useState("");

  const [error, setError] =
    useState("");

  const [orderCreated, setOrderCreated] =
    useState(false);

  const [orderNumber, setOrderNumber] =
    useState("");

  const [supplierOrderId, setSupplierOrderId] =
    useState("");

  const [orderStatus, setOrderStatus] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  // Estado VIP
  const [vipActive, setVipActive] =
    useState(false);

  const [vipLoading, setVipLoading] =
    useState(true);

  // Consultar estado VIP
  useEffect(() => {
    let mounted = true;

    async function loadVipStatus() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("vip_expires_at")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        const expiration = data?.vip_expires_at
          ? new Date(data.vip_expires_at).getTime()
          : 0;

        if (mounted) {
          setVipActive(
            Number.isFinite(expiration) &&
            expiration > Date.now()
          );
        }
      } catch (error) {
        console.error(
          "Error consultando VIP:",
          error
        );
      } finally {
        if (mounted) {
          setVipLoading(false);
        }
      }
    }

    loadVipStatus();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (orderCreated) {
      setTimeout(() => {
        document
          .getElementById("success-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    }
  }, [orderCreated]);

  function handleSelectOffer(
    offer: SausageManOffer
  ) {
    setSelectedOffer(offer);
    setError("");
    setOrderCreated(false);

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
      setError(
        "Seleccione una oferta antes de continuar."
      );
      return;
    }

    const cleanCharacterId =
      characterId.trim();

    if (
      !/^\d{4,20}$/.test(
        cleanCharacterId
      )
    ) {
      setError(
        "El Character ID debe contener entre 4 y 20 números."
      );
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(
          "Debes iniciar sesión para realizar una compra."
        );
        return;
      }

      const idempotencyKey =
        crypto.randomUUID();

      const response =
        await fetch(
          "/api/topups/sausage-man",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({
              offerId:
                selectedOffer.id,

              offerName:
                selectedOffer.name,

              characterId:
                cleanCharacterId,

              retailPrice:
                selectedOffer.price,

              idempotencyKey,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        const provider =
          data?.providerResponse;

        const providerMessage =
          provider?.error ||
          provider?.message ||
          provider?.detail;

        throw new Error(
          providerMessage ||
            data?.error ||
            "No se pudo realizar la orden."
        );
      }

      setOrderNumber(
        String(
          data.orderNumber ||
            "Pendiente"
        )
      );

      setSupplierOrderId(
        String(
          data.supplierOrderId ||
            ""
        )
      );

      setOrderStatus(
        String(
          data.orderStatus ||
            "SUPPLIER_PENDING"
        )
      );

      setOrderCreated(true);

      localStorage.setItem(
        "last_sausage_man_order",
        JSON.stringify({
          orderNumber:
            data.orderNumber || "",

          supplierOrderId:
            data.supplierOrderId || "",

          status:
            data.orderStatus ||
            "SUPPLIER_PENDING",
        })
      );

      setSelectedOffer(null);
      setCharacterId("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo realizar la orden."
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

  function goToTopUp() {
    router.push("/top-up");
  }

  function goToVip() {
    router.push("/vip");
  }

  return (
    <main className="sausage-man-page">

      <div className="sausage-man-background" />

      {/* HEADER */}
      <header className="sausage-man-header">

        <button
          type="button"
          className="sausage-man-back"
          onClick={() => router.back()}
        >
          ← Volver
        </button>

        <div className="sausage-man-header-title">
          SAUSAGE MAN
        </div>

        <div className="sausage-man-header-actions">

          {!vipLoading && (
            vipActive ? (
              <div className="sausage-man-vip-active">
                ⭐ VIP ACTIVO
              </div>
            ) : (
              <button
                type="button"
                className="sausage-man-vip-button"
                onClick={goToVip}
              >
                ⭐ COMPRAR VIP
              </button>
            )
          )}

          <button
            type="button"
            className="sausage-man-cart"
            onClick={goToOrders}
            aria-label="Pedidos"
          >
            🛍️
          </button>

        </div>

      </header>

      <section className="sausage-man-container">

        <div className="sausage-man-banner">
          <img
            src={SAUSAGE_MAN.image}
            alt="Sausage Man"
          />

          <div className="sausage-man-banner-overlay">
            <div className="sausage-man-banner-small">
              RECARGA
            </div>

            <h1>
              SAUSAGE MAN
            </h1>

            <p>
              CANDIES
            </p>
          </div>
        </div>

        <div className="sausage-man-note">
          <span>🎮</span>

          <p>
            {SAUSAGE_MAN.note}
          </p>
        </div>

        <button
          type="button"
          className="sausage-man-offers-toggle"
          onClick={() =>
            setShowOffers(!showOffers)
          }
        >
          <span>
            ✏️ Presione para ver ofertas
          </span>

          <span
            className={
              showOffers
                ? "sausage-man-arrow open"
                : "sausage-man-arrow"
            }
          >
            ▼
          </span>
        </button>

        {showOffers && (
          <section className="sausage-man-offers">

            {SAUSAGE_MAN.offers.map(
              (offer) => (
                <button
                  type="button"
                  key={offer.id}
                  className={
                    selectedOffer?.id === offer.id
                      ? "sausage-man-offer selected"
                      : "sausage-man-offer"
                  }
                  onClick={() =>
                    handleSelectOffer(offer)
                  }
                >
                  <div className="sausage-man-offer-left">

                    <div className="sausage-man-offer-icon">
                      {offer.icon}
                    </div>

                    <div className="sausage-man-offer-text">
                      <strong>
                        {offer.name}
                      </strong>

                      <span>
                        Recarga directa
                      </span>
                    </div>

                  </div>

                  <div className="sausage-man-offer-price">
                    $
                    {Number(
                      offer.price
                    ).toFixed(4)}
                  </div>
                </button>
              )
            )}

          </section>
        )}

        {selectedOffer && !orderCreated && (
          <section
            id="order-section"
            className="sausage-man-order"
          >

            <div className="sausage-man-order-title">
              <div>
                <span>
                  Oferta seleccionada
                </span>

                <strong>
                  {selectedOffer.name}
                </strong>
              </div>

              <div className="sausage-man-selected-price">
                $
                {Number(
                  selectedOffer.price
                ).toFixed(4)}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="sausage-man-form"
            >

              <label>
                Character ID
              </label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ingrese su Character ID"
                value={characterId}
                onChange={(event) =>
                  setCharacterId(
                    event.target.value.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
                maxLength={20}
              />

              <p className="sausage-man-input-help">
                Introduce el ID de tu personaje
                de Sausage Man.
              </p>

              {error && (
                <div className="sausage-man-error">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                className="sausage-man-buy"
                disabled={processing}
              >
                {processing
                  ? "PROCESANDO..."
                  : `COMPRAR POR $${Number(
                      selectedOffer.price
                    ).toFixed(4)}`}
              </button>

            </form>

          </section>
        )}

        {orderCreated && (
          <section
            id="success-section"
            className="sausage-man-success"
          >

            <div className="sausage-man-success-icon">
              ✓
            </div>

            <h2>
              ORDEN CREADA
            </h2>

            <p>
              Tu pedido fue enviado
              correctamente.
            </p>

            <div className="sausage-man-order-info">

              <div>
                <span>
                  Número de orden
                </span>

                <strong>
                  {orderNumber}
                </strong>
              </div>

              {supplierOrderId && (
                <div>
                  <span>
                    ID del proveedor
                  </span>

                  <strong>
                    {supplierOrderId}
                  </strong>
                </div>
              )}

              <div>
                <span>
                  Estado
                </span>

                <strong>
                  {orderStatus}
                </strong>
              </div>

            </div>

            <div className="sausage-man-success-buttons">

              <button
                type="button"
                onClick={goToOrders}
              >
                REVISAR ORDEN
              </button>

              <button
                type="button"
                onClick={goToTopUp}
              >
                VOLVER A LA TIENDA
              </button>

            </div>

          </section>
        )}

        <section className="sausage-man-service">

          <h2>
            ⚡ Servicio automático
          </h2>

          <p>
            Tu recarga será procesada
            automáticamente después de
            confirmar el pedido.
          </p>

          <div className="sausage-man-service-grid">

            <div>
              <span>⚡</span>
              <strong>
                ENTREGA RÁPIDA
              </strong>
            </div>

            <div>
              <span>🔒</span>
              <strong>
                PAGO SEGURO
              </strong>
            </div>

            <div>
              <span>🎮</span>
              <strong>
                ENTREGA DIRECTA
              </strong>
            </div>

          </div>

        </section>

      </section>

      <footer className="sausage-man-footer">
        <div>
          🛒 STORE GAMING 🎮
        </div>

        <div>
          Recargas digitales
          automáticas y seguras.
        </div>
      </footer>

      <style jsx>{`

        .sausage-man-page {
          position: relative;
          min-height: 100vh;
          background: #050505;
          color: #fff;
          overflow-x: hidden;
        }

        .sausage-man-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          background-image:
            linear-gradient(
              rgba(0, 0, 0, 0.78),
              rgba(0, 0, 0, 0.9)
            ),
            url("/images/battle-royale-bg.jpg");
          background-size: cover;
          background-position: center;
          pointer-events: none;
        }

        /* HEADER */

        .sausage-man-header {
          position: sticky;
          top: 0;
          z-index: 20;
          min-height: 62px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          background: rgba(5, 5, 5, 0.97);
          border-bottom:
            1px solid
            rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
        }

        .sausage-man-header-title {
          grid-column: 2;
          text-align: center;
          font-size: 14px;
          font-weight: 1000;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .sausage-man-back {
          justify-self: start;
          border: 0;
          background: transparent;
          color: #fff;
          cursor: pointer;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
        }

        .sausage-man-header-actions {
          grid-column: 3;
          justify-self: end;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          min-width: 0;
        }

        .sausage-man-vip-button {
          min-height: 32px;
          padding: 0 9px;
          border: 1px solid #e8ad32;
          border-radius: 7px;
          background:
            linear-gradient(
              135deg,
              #4a3108,
              #a66b0b
            );
          color: #ffe6a0;
          font-size: 9px;
          font-weight: 1000;
          white-space: nowrap;
          cursor: pointer;
        }

        .sausage-man-vip-button:active {
          transform: scale(0.96);
        }

        .sausage-man-vip-active {
          padding: 8px 9px;
          border: 1px solid
            rgba(255, 205, 75, 0.45);
          border-radius: 7px;
          background:
            rgba(190, 130, 20, 0.15);
          color: #ffd76a;
          font-size: 9px;
          font-weight: 1000;
          white-space: nowrap;
        }

        .sausage-man-cart {
          border: 0;
          background: transparent;
          color: #fff;
          cursor: pointer;
          font-size: 20px;
          flex-shrink: 0;
        }

        .sausage-man-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 620px;
          margin: 0 auto;
          padding: 0 12px 30px;
        }

        .sausage-man-banner {
          position: relative;
          width: 100%;
          height: 235px;
          overflow: hidden;
          border-radius: 0 0 16px 16px;
          background: #111;
        }

        .sausage-man-banner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .sausage-man-banner::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to top,
              rgba(0, 0, 0, 0.9),
              rgba(0, 0, 0, 0.08)
            );
        }

        .sausage-man-banner-overlay {
          position: absolute;
          z-index: 2;
          left: 18px;
          right: 18px;
          bottom: 18px;
        }

        .sausage-man-banner-small {
          color: #ff3333;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .sausage-man-banner-overlay h1 {
          margin: 3px 0 0;
          font-size: 29px;
          line-height: 1;
          font-weight: 1000;
          text-shadow:
            0 2px 8px
            rgba(0, 0, 0, 0.8);
        }

        .sausage-man-banner-overlay p {
          margin: 7px 0 0;
          color: #ddd;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .sausage-man-note {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-top: 12px;
          padding: 13px;
          border-radius: 11px;
          background:
            rgba(255, 255, 255, 0.045);
          border:
            1px solid
            rgba(255, 255, 255, 0.07);
        }

        .sausage-man-note span {
          font-size: 18px;
        }

        .sausage-man-note p {
          margin: 0;
          color: #aaa;
          font-size: 12px;
          line-height: 1.5;
          white-space: pre-line;
        }

        .sausage-man-offers-toggle {
          width: 100%;
          margin-top: 12px;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 11px;
          background:
            rgba(15, 15, 15, 0.95);
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .sausage-man-arrow {
          transition: transform 0.2s ease;
          color: #ff2b2b;
        }

        .sausage-man-arrow.open {
          transform: rotate(180deg);
        }

        .sausage-man-offers {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
        }

        .sausage-man-offer {
          width: 100%;
          min-height: 66px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border:
            1px solid
            rgba(255, 255, 255, 0.07);
          border-radius: 11px;
          background:
            rgba(13, 13, 13, 0.95);
          color: #fff;
          cursor: pointer;
          text-align: left;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease;
        }

        .sausage-man-offer:active {
          transform: scale(0.985);
        }

        .sausage-man-offer.selected {
          border-color: #e50909;
          background:
            rgba(229, 9, 9, 0.09);
        }

        .sausage-man-offer-left {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sausage-man-offer-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background:
            rgba(255, 255, 255, 0.07);
          font-size: 22px;
        }

        .sausage-man-offer-text {
          min-width: 0;
        }

        .sausage-man-offer-text strong {
          display: block;
          color: #fff;
          font-size: 13px;
          font-weight: 900;
        }

        .sausage-man-offer-text span {
          display: block;
          margin-top: 3px;
          color: #777;
          font-size: 10px;
        }

        .sausage-man-offer-price {
          flex-shrink: 0;
          color: #fff;
          font-size: 14px;
          font-weight: 1000;
        }

        .sausage-man-order {
          margin-top: 12px;
          padding: 15px;
          border-radius: 13px;
          background:
            rgba(10, 10, 10, 0.97);
          border:
            1px solid
            rgba(255, 255, 255, 0.08);
        }

        .sausage-man-order-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 16px;
        }

        .sausage-man-order-title span {
          display: block;
          color: #777;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

        .sausage-man-order-title strong {
          display: block;
          margin-top: 4px;
          font-size: 15px;
        }

        .sausage-man-selected-price {
          color: #ff3333;
          font-size: 17px;
          font-weight: 1000;
          white-space: nowrap;
        }

        .sausage-man-form {
          display: flex;
          flex-direction: column;
        }

        .sausage-man-form label {
          margin-bottom: 7px;
          color: #ddd;
          font-size: 12px;
          font-weight: 800;
        }

        .sausage-man-form input {
          width: 100%;
          box-sizing: border-box;
          min-height: 47px;
          padding: 0 13px;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          border-radius: 9px;
          outline: none;
          background: #151515;
          color: #fff;
          font-size: 14px;
        }

        .sausage-man-form input:focus {
          border-color: #e50909;
          box-shadow:
            0 0 0 2px
            rgba(229, 9, 9, 0.1);
        }

        .sausage-man-form input::placeholder {
          color: #666;
        }

        .sausage-man-input-help {
          margin: 7px 0 0;
          color: #777;
          font-size: 10px;
          line-height: 1.4;
        }

        .sausage-man-error {
          margin-top: 12px;
          padding: 11px;
          border-radius: 8px;
          background:
            rgba(220, 0, 0, 0.12);
          border:
            1px solid
            rgba(255, 50, 50, 0.3);
          color: #ff4d4d;
          font-size: 12px;
          line-height: 1.4;
        }

        .sausage-man-buy {
          width: 100%;
          min-height: 48px;
          margin-top: 14px;
          border: 0;
          border-radius: 9px;
          background: #e50909;
          color: #fff;
          font-size: 13px;
          font-weight: 1000;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }

        .sausage-man-buy:active {
          transform: scale(0.985);
        }

        .sausage-man-buy:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .sausage-man-success {
          margin-top: 12px;
          padding: 20px 15px;
          border-radius: 13px;
          background:
            rgba(10, 10, 10, 0.97);
          border:
            1px solid
            rgba(50, 220, 100, 0.2);
          text-align: center;
        }

        .sausage-man-success-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #19a94b;
          color: #fff;
          font-size: 32px;
          font-weight: 900;
        }

        .sausage-man-success h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 1000;
        }

        .sausage-man-success p {
          margin: 8px 0 0;
          color: #aaa;
          font-size: 13px;
        }

        .sausage-man-order-info {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .sausage-man-order-info div {
          padding: 12px;
          border-radius: 9px;
          background:
            rgba(255, 255, 255, 0.05);
          text-align: left;
        }

        .sausage-man-order-info span {
          display: block;
          color: #888;
          font-size: 11px;
        }

        .sausage-man-order-info strong {
          display: block;
          margin-top: 4px;
          color: #fff;
          font-size: 13px;
          word-break: break-word;
        }

        .sausage-man-success-buttons {
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin-top: 18px;
        }

        .sausage-man-success-buttons button {
          width: 100%;
          min-height: 45px;
          padding: 13px;
          border: 0;
          border-radius: 10px;
          background: #e50909;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .sausage-man-success-buttons button:active {
          transform: scale(0.985);
        }

        .sausage-man-success-buttons button:last-child {
          background: #222;
        }

        .sausage-man-service {
          margin-top: 12px;
          padding: 18px;
          border-radius: 14px;
          background:
            rgba(15, 15, 15, 0.94);
          border:
            1px solid
            rgba(255, 255, 255, 0.07);
        }

        .sausage-man-service h2 {
          margin: 0;
          color: #fff;
          font-size: 17px;
          font-weight: 900;
        }

        .sausage-man-service p {
          margin: 8px 0 0;
          color: #999;
          font-size: 12px;
          line-height: 1.5;
        }

        .sausage-man-service-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 14px;
        }

        .sausage-man-service-grid div {
          padding: 12px 7px;
          text-align: center;
          border-radius: 10px;
          background:
            rgba(255, 255, 255, 0.04);
        }

        .sausage-man-service-grid span {
          display: block;
          font-size: 20px;
        }

        .sausage-man-service-grid strong {
          display: block;
          margin-top: 5px;
          color: #ccc;
          font-size: 9px;
        }

        .sausage-man-footer {
          position: relative;
          z-index: 2;
          padding: 25px 15px;
          text-align: center;
          color: #777;
          font-size: 11px;
          line-height: 1.6;
          border-top:
            1px solid
            rgba(255, 255, 255, 0.06);
        }

        /* ADAPTACIÓN PARA MÓVILES */

        @media (max-width: 480px) {
          .sausage-man-header {
            min-height: 60px;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 5px;
            padding: 0 8px;
          }

          .sausage-man-header-title {
            font-size: 12px;
          }

          .sausage-man-back {
            font-size: 11px;
          }

          .sausage-man-header-actions {
            gap: 5px;
          }

          .sausage-man-vip-button {
            min-height: 30px;
            padding: 0 6px;
            font-size: 8px;
          }

          .sausage-man-vip-active {
            padding: 7px 6px;
            font-size: 8px;
          }

          .sausage-man-cart {
            font-size: 18px;
          }

          .sausage-man-banner {
            height: 215px;
          }

          .sausage-man-banner-overlay h1 {
            font-size: 25px;
          }

          .sausage-man-service-grid {
            grid-template-columns: 1fr;
          }

          .sausage-man-order-title {
            align-items: flex-start;
          }

          .sausage-man-selected-price {
            font-size: 15px;
          }
        }

        @media (max-width: 350px) {
          .sausage-man-header {
            padding: 0 5px;
            gap: 3px;
          }

          .sausage-man-header-title {
            font-size: 10px;
          }

          .sausage-man-back {
            font-size: 10px;
          }

          .sausage-man-vip-button {
            font-size: 7px;
            padding: 0 5px;
          }

          .sausage-man-vip-active {
            font-size: 7px;
            padding: 7px 5px;
          }

          .sausage-man-cart {
            font-size: 16px;
          }
        }

      `}</style>
    </main>
  );
}
