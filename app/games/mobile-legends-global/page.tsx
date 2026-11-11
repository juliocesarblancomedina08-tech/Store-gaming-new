
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { MOBILE_LEGENDS_GLOBAL } from "../../../lib/mobile-legends-global";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Offer = {
  id: string;
  name: string;
  price: number;
  supplierPrice: number;
};

const OFFERS: Offer[] = MOBILE_LEGENDS_GLOBAL.offers.map((offer) => ({
  id: offer.id,
  name: offer.name,
  price: offer.price,
  supplierPrice: offer.supplierPrice,
}));

const VIP_MARKUP = 0.08;

function getOfferPrice(offer: Offer, isVip: boolean) {
  if (!isVip) {
    return offer.price;
  }

  return Number((offer.supplierPrice + VIP_MARKUP).toFixed(4));
}

function formatOfferPrice(offer: Offer, isVip: boolean) {
  return `$${getOfferPrice(offer, isVip).toFixed(isVip ? 4 : 2)}`;
}

export default function MobileLegendsGlobalPage() {
  const router = useRouter();

  const [vipActive, setVipActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkVipStatus() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          if (!cancelled) {
            setVipActive(false);
          }
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("vip_expires_at")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("ERROR CONSULTANDO VIP:", error);

          if (!cancelled) {
            setVipActive(false);
          }
          return;
        }

        const expiration = profile?.vip_expires_at
          ? new Date(profile.vip_expires_at).getTime()
          : 0;

        const active =
          Number.isFinite(expiration) &&
          expiration > Date.now();

        if (!cancelled) {
          setVipActive(active);
        }
      } catch (error) {
        console.error("ERROR COMPROBANDO VIP:", error);

        if (!cancelled) {
          setVipActive(false);
        }
      }
    }

    checkVipStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const [showOffers, setShowOffers] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [serverId, setServerId] = useState("");

  const [error, setError] = useState("");

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);

  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  const [processing, setProcessing] = useState(false);

  function selectOffer(offer: Offer) {
    setSelectedOffer(offer);
    setError("");
    setShowConfirmation(false);
    setOrderCreated(false);

    setTimeout(() => {
      document
        .getElementById("order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function handleFinishPurchase(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanPlayerId = playerId.trim();
    const cleanServerId = serverId.trim();

    if (!selectedOffer) {
      setError("Selecciona una oferta primero.");
      return;
    }

    if (!/^\d+$/.test(cleanPlayerId)) {
      setError(
        "El ID del jugador debe contener solamente números."
      );
      return;
    }

    if (
      cleanPlayerId.length < 3 ||
      cleanPlayerId.length > 20
    ) {
      setError(
        "El ID del jugador debe tener entre 3 y 20 números."
      );
      return;
    }

    if (!/^\d+$/.test(cleanServerId)) {
      setError(
        "El ID del servidor debe contener solamente números."
      );
      return;
    }

    if (
      cleanServerId.length < 1 ||
      cleanServerId.length > 20
    ) {
      setError("El ID del servidor no es válido.");
      return;
    }

    setPlayerId(cleanPlayerId);
    setServerId(cleanServerId);
    setShowConfirmation(true);
  }

  async function createOrder() {
    if (!selectedOffer || processing) return;

    setProcessing(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login");
        return;
      }

      const idempotencyKey =
        typeof crypto !== "undefined" &&
        "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`;

      const response = await fetch(
        "/api/topups/mobile-legends-global",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            offerId: selectedOffer.id,
            playerId,
            serverId,
            idempotencyKey,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "No se pudo crear la orden."
        );
      }

      setOrderNumber(data?.orderNumber || "");
      setSupplierOrderId(data?.supplierOrderId || "");
      setOrderStatus(
        data?.status || "SUPPLIER_PENDING"
      );

      setOrderCreated(true);
      setShowConfirmation(false);
    } catch (err) {
      console.error(
        "ERROR CREANDO ORDEN LEGENDS MOBILE GLOBAL:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error creando la orden."
      );
    } finally {
      setProcessing(false);
    }
  }

  function goToOrders() {
    router.push("/orders");
  }

  return (
    <main className="mobile-legends-page">
      <header className="mobile-legends-header">
        <button
          type="button"
          className="mobile-legends-back"
          onClick={() => router.push("/top-up")}
        >
          ←
        </button>

        <div className="mobile-legends-header-title">
          <strong>Legends Mobile</strong>
          <span>Global</span>
        </div>
      </header>

      <section className="mobile-legends-hero">
        <div className="mobile-legends-banner">
          <img
            src="/images/mobile-legends.jpg"
            alt="Legends Mobile Global"
          />

          <div className="mobile-legends-banner-overlay">
            <div>
              <span>RECARGA GLOBAL</span>
              <h1>LEGENDS MOBILE</h1>
              <p>Diamantes y paquetes Global</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mobile-legends-content">
        <div className="mobile-legends-info">
          <div className="mobile-legends-info-icon">
            🌎
          </div>

          <div>
            <h2>Legends Mobile Global</h2>

            <p>
              Selecciona el paquete que deseas comprar y
              coloca correctamente tu ID de jugador y
              servidor.
            </p>
          </div>
        </div>

        <div className="mobile-legends-note">
          <strong>⚠️ Importante</strong>

          <p>
            Servicio Global. No disponible para las
            regiones de Indonesia y Brasil.
          </p>

          <p>
            Algunos paquetes pueden no estar disponibles
            para MY / SG / PH / ID / RU.
          </p>

          <p>
            Para las ofertas de primera recarga, verifica
            que la cuenta sea elegible para recibir el bono.
          </p>
        </div>

        <div className="mobile-legends-section-header">
          <div>
            <h2>Selecciona tu oferta</h2>
            <p>Legends Mobile Global</p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowOffers((value) => !value)
            }
            className="mobile-legends-toggle"
          >
            {showOffers ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {showOffers && (
          <div className="mobile-legends-offers">
            {OFFERS.map((offer) => (
              <button
                key={offer.id}
                type="button"
                className={`mobile-legends-offer ${
                  selectedOffer?.id === offer.id
                    ? "selected"
                    : ""
                }`}
                onClick={() => selectOffer(offer)}
              >
                <div className="mobile-legends-offer-left">
                  <div className="mobile-legends-diamond">
                    💎
                  </div>

                  <div className="mobile-legends-offer-name">
                    <strong>{offer.name}</strong>

                    {offer.id.includes(
                      "first_top_up_bonus"
                    ) && (
                      <span className="mobile-legends-bonus">
                        PRIMERA RECARGA
                      </span>
                    )}

                    {offer.id === "weekly_pass" && (
                      <span className="mobile-legends-bonus">
                        PASE SEMANAL
                      </span>
                    )}

                    {offer.id === "twilight_pass" && (
                      <span className="mobile-legends-bonus">
                        PASE
                      </span>
                    )}
                  </div>
                </div>

                <div className="mobile-legends-price">
                  <span>
                    {formatOfferPrice(offer, vipActive)}
                  </span>

                  <small>USDT</small>
                </div>
              </button>
            ))}
          </div>
        )}

        <section
          id="order-section"
          className="mobile-legends-order"
        >
          {!selectedOffer && !orderCreated && (
            <div className="mobile-legends-empty">
              <div className="mobile-legends-empty-icon">
                💎
              </div>

              <h3>Selecciona una oferta</h3>

              <p>
                Elige uno de los paquetes disponibles para
                continuar con tu recarga.
              </p>
            </div>
          )}

          {selectedOffer && !orderCreated && (
            <>
              <div className="mobile-legends-selected">
                <div>
                  <span>Oferta seleccionada</span>

                  <strong>
                    {selectedOffer.name}
                  </strong>
                </div>

                <div className="mobile-legends-selected-price">
                  {formatOfferPrice(selectedOffer, vipActive)}

                  <small> USDT</small>
                </div>
              </div>

              <form
                onSubmit={handleFinishPurchase}
                className="mobile-legends-form"
              >
                <div className="mobile-legends-form-title">
                  <h2>Datos de la cuenta</h2>

                  <p>
                    Introduce los datos exactamente como
                    aparecen en tu cuenta.
                  </p>
                </div>

                <label>
                  <span>ID del jugador</span>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={playerId}
                    onChange={(event) =>
                      setPlayerId(
                        event.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                    placeholder="Ej: 123456789"
                    maxLength={20}
                    autoComplete="off"
                  />
                </label>

                <label>
                  <span>ID del servidor</span>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={serverId}
                    onChange={(event) =>
                      setServerId(
                        event.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                    placeholder="Ej: 1234"
                    maxLength={20}
                    autoComplete="off"
                  />
                </label>

                <div className="mobile-legends-help">
                  <span>💡</span>

                  <p>
                    Puedes encontrar tu ID de jugador y
                    servidor dentro de tu perfil de Legends
                    Mobile.
                  </p>
                </div>

                {error && (
                  <div className="mobile-legends-error">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="mobile-legends-submit"
                >
                  CONTINUAR
                </button>
              </form>
            </>
          )}

          {showConfirmation &&
            selectedOffer &&
            !orderCreated && (
              <div className="mobile-legends-confirmation">
                <div className="mobile-legends-confirmation-icon">
                  🛒
                </div>

                <h2>Confirmar compra</h2>

                <p>
                  Revisa los datos antes de crear tu orden.
                </p>

                <div className="mobile-legends-confirmation-card">
                  <div>
                    <span>Oferta</span>

                    <strong>
                      {selectedOffer.name}
                    </strong>
                  </div>

                  <div>
                    <span>ID jugador</span>
                    <strong>{playerId}</strong>
                  </div>

                  <div>
                    <span>ID servidor</span>
                    <strong>{serverId}</strong>
                  </div>

                  <div className="total">
                    <span>Total</span>

                    <strong>
                      {formatOfferPrice(selectedOffer, vipActive)}{" "}
                      USDT
                    </strong>
                  </div>
                </div>

                {error && (
                  <div className="mobile-legends-error">
                    ⚠️ {error}
                  </div>
                )}

                <div className="mobile-legends-confirmation-actions">
                  <button
                    type="button"
                    className="mobile-legends-cancel"
                    onClick={() =>
                      setShowConfirmation(false)
                    }
                    disabled={processing}
                  >
                    VOLVER
                  </button>

                  <button
                    type="button"
                    className="mobile-legends-confirm"
                    onClick={createOrder}
                    disabled={processing}
                  >
                    {processing
                      ? "PROCESANDO..."
                      : "CONFIRMAR COMPRA"}
                  </button>
                </div>
              </div>
            )}

          {orderCreated && (
            <div className="mobile-legends-success">
              <div className="mobile-legends-success-icon">
                ✓
              </div>

              <h2>Orden creada</h2>

              <p>
                Tu solicitud de recarga fue enviada
                correctamente.
              </p>

              <div className="mobile-legends-success-card">
                {orderNumber && (
                  <div>
                    <span>Número de orden</span>
                    <strong>{orderNumber}</strong>
                  </div>
                )}

                {supplierOrderId && (
                  <div>
                    <span>Orden del proveedor</span>

                    <strong>
                      {supplierOrderId}
                    </strong>
                  </div>
                )}

                <div>
                  <span>Estado</span>
                  <strong>{orderStatus}</strong>
                </div>

                <div>
                  <span>Oferta</span>

                  <strong>
                    {selectedOffer?.name}
                  </strong>
                </div>
              </div>

              <div className="mobile-legends-success-actions">
                <button
                  type="button"
                  onClick={goToOrders}
                  className="mobile-legends-orders-button"
                >
                  VER MIS ÓRDENES
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOrderCreated(false);
                    setSelectedOffer(null);
                    setPlayerId("");
                    setServerId("");
                    setOrderNumber("");
                    setSupplierOrderId("");
                    setOrderStatus("");
                    setShowConfirmation(false);
                    setError("");
                  }}
                  className="mobile-legends-new-button"
                >
                  HACER OTRA RECARGA
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mobile-legends-service">
          <h2>Información del servicio</h2>

          <div className="mobile-legends-service-grid">
            <div>
              <span>🌎</span>
              <strong>Región</strong>
              <p>Global</p>
            </div>

            <div>
              <span>⚡</span>
              <strong>Entrega</strong>
              <p>Automática</p>
            </div>

            <div>
              <span>🔒</span>
              <strong>Seguro</strong>
              <p>Pago protegido</p>
            </div>

            <div>
              <span>💎</span>
              <strong>Producto</strong>
              <p>Diamantes</p>
            </div>
          </div>
        </section>
      </section>

      <footer className="mobile-legends-footer">
        <p>STORE GAMING 🎮</p>
        <span>Legends Mobile Global</span>
      </footer>

      <style jsx>{`
        .mobile-legends-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top,
              rgba(255, 40, 40, 0.12),
              transparent 35%
            ),
            #090909;
          color: #fff;
          padding-bottom: 50px;
        }

        .mobile-legends-header {
          height: 70px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 20px;
          background: rgba(10, 10, 10, 0.96);
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.08);
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(12px);
        }

        .mobile-legends-back {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid
            rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-size: 24px;
          cursor: pointer;
        }

        .mobile-legends-header-title {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .mobile-legends-header-title strong {
          font-size: 18px;
        }

        .mobile-legends-header-title span {
          color: #aaa;
          font-size: 13px;
          margin-top: 4px;
        }

        .mobile-legends-hero {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 18px;
        }

        .mobile-legends-banner {
          position: relative;
          width: 100%;
          height: 310px;
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          background: #111;
        }

        .mobile-legends-banner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .mobile-legends-banner-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          padding: 20px;
          background:
            linear-gradient(
              transparent 30%,
              rgba(0, 0, 0, 0.85)
            );
        }

        .mobile-legends-banner-overlay span {
          display: inline-block;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #ff4747;
          margin-bottom: 5px;
        }

        .mobile-legends-banner-overlay h1 {
          margin: 0;
          font-size: clamp(28px, 5vw, 52px);
          font-weight: 900;
          line-height: 1;
          text-shadow: 0 4px 20px
            rgba(0, 0, 0, 0.7);
        }

        .mobile-legends-banner-overlay p {
          margin: 8px 0 0;
          color: #ddd;
          font-size: 15px;
        }

        .mobile-legends-content {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          padding: 0 18px;
        }

        .mobile-legends-info {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          padding: 18px;
          border-radius: 18px;
          background: #121212;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          margin-bottom: 15px;
        }

        .mobile-legends-info-icon {
          width: 45px;
          height: 45px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: rgba(255, 50, 50, 0.1);
          font-size: 22px;
          flex-shrink: 0;
        }

        .mobile-legends-info h2 {
          margin: 0;
          font-size: 18px;
        }

        .mobile-legends-info p {
          margin: 6px 0 0;
          color: #aaa;
          line-height: 1.5;
          font-size: 14px;
        }

        .mobile-legends-note {
          background: rgba(255, 170, 0, 0.06);
          border: 1px solid
            rgba(255, 170, 0, 0.16);
          border-radius: 17px;
          padding: 17px;
          margin-bottom: 28px;
        }

        .mobile-legends-note strong {
          color: #ffc44d;
        }

        .mobile-legends-note p {
          color: #bdbdbd;
          font-size: 13px;
          line-height: 1.5;
          margin: 7px 0 0;
        }

        .mobile-legends-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }

        .mobile-legends-section-header h2 {
          margin: 0;
          font-size: 23px;
        }

        .mobile-legends-section-header p {
          color: #888;
          margin: 5px 0 0;
          font-size: 13px;
        }

        .mobile-legends-toggle {
          border: 1px solid
            rgba(255, 255, 255, 0.12);
          background: #171717;
          color: #fff;
          padding: 10px 14px;
          border-radius: 11px;
          cursor: pointer;
        }

        .mobile-legends-offers {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 10px;
        }

        .mobile-legends-offer {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 15px;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          background: #121212;
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            transform 0.2s ease,
            background 0.2s ease;
        }

        .mobile-legends-offer:hover {
          transform: translateY(-2px);
          background: #171717;
          border-color: rgba(255, 70, 70, 0.35);
        }

        .mobile-legends-offer.selected {
          border-color: #ff3e3e;
          background: rgba(255, 50, 50, 0.08);
        }

        .mobile-legends-offer-left {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .mobile-legends-diamond {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: rgba(70, 150, 255, 0.1);
          font-size: 20px;
          flex-shrink: 0;
        }

        .mobile-legends-offer-name {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .mobile-legends-offer-name strong {
          font-size: 14px;
          line-height: 1.25;
        }

        .mobile-legends-bonus {
          width: fit-content;
          padding: 3px 6px;
          border-radius: 5px;
          background: rgba(255, 55, 55, 0.12);
          color: #ff6262;
          font-size: 9px;
          font-weight: 800;
        }

        .mobile-legends-price {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          flex-shrink: 0;
        }

        .mobile-legends-price span {
          color: #4cff9a;
          font-size: 16px;
          font-weight: 900;
        }

        .mobile-legends-price small {
          color: #777;
          font-size: 10px;
          margin-top: 2px;
        }

        .mobile-legends-order {
          margin-top: 25px;
        }

        .mobile-legends-empty,
        .mobile-legends-form,
        .mobile-legends-confirmation,
        .mobile-legends-success {
          background: #111;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px;
        }

        .mobile-legends-empty {
          text-align: center;
          padding: 45px 20px;
        }

        .mobile-legends-empty-icon {
          font-size: 42px;
          margin-bottom: 12px;
        }

        .mobile-legends-empty h3 {
          margin: 0;
          font-size: 20px;
        }

        .mobile-legends-empty p {
          color: #888;
          margin: 8px auto 0;
          max-width: 450px;
          line-height: 1.5;
        }

        .mobile-legends-selected {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 17px;
          margin-bottom: 12px;
          border-radius: 16px;
          background: rgba(255, 50, 50, 0.07);
          border: 1px solid
            rgba(255, 60, 60, 0.18);
        }

        .mobile-legends-selected > div:first-child {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .mobile-legends-selected span {
          color: #888;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .mobile-legends-selected strong {
          font-size: 14px;
        }

        .mobile-legends-selected-price {
          color: #4cff9a;
          font-size: 20px;
          font-weight: 900;
          white-space: nowrap;
        }

        .mobile-legends-selected-price small {
          color: #777;
          font-size: 10px;
        }

        .mobile-legends-form-title h2,
        .mobile-legends-confirmation h2,
        .mobile-legends-success h2 {
          margin: 0;
          font-size: 23px;
        }

        .mobile-legends-form-title p,
        .mobile-legends-confirmation > p,
        .mobile-legends-success > p {
          color: #888;
          font-size: 14px;
          line-height: 1.5;
          margin: 7px 0 20px;
        }

        .mobile-legends-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .mobile-legends-form label {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .mobile-legends-form label > span {
          font-size: 13px;
          font-weight: 700;
          color: #ddd;
        }

        .mobile-legends-form input {
          width: 100%;
          box-sizing: border-box;
          height: 50px;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          outline: none;
          background: #181818;
          color: #fff;
          padding: 0 15px;
          font-size: 16px;
        }

        .mobile-legends-form input:focus {
          border-color: #ff4141;
          box-shadow: 0 0 0 3px
            rgba(255, 65, 65, 0.08);
        }

        .mobile-legends-help {
          display: flex;
          gap: 9px;
          padding: 12px;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.035);
        }

        .mobile-legends-help p {
          margin: 0;
          color: #999;
          font-size: 12px;
          line-height: 1.5;
        }

        .mobile-legends-error {
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(255, 45, 45, 0.08);
          border: 1px solid
            rgba(255, 60, 60, 0.2);
          color: #ff7b7b;
          font-size: 13px;
        }

        .mobile-legends-submit,
        .mobile-legends-confirm,
        .mobile-legends-orders-button {
          height: 52px;
          border: 0;
          border-radius: 12px;
          background: #ff3838;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
          padding: 0 18px;
        }

        .mobile-legends-submit:hover,
        .mobile-legends-confirm:hover,
        .mobile-legends-orders-button:hover {
          background: #ff4f4f;
        }

        .mobile-legends-confirmation {
          margin-top: 12px;
          text-align: center;
        }

        .mobile-legends-confirmation-icon,
        .mobile-legends-success-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
          border-radius: 50%;
          font-size: 27px;
          background: rgba(255, 55, 55, 0.1);
        }

        .mobile-legends-confirmation-card,
        .mobile-legends-success-card {
          text-align: left;
          border-radius: 15px;
          background: #181818;
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          padding: 15px;
        }

        .mobile-legends-confirmation-card > div,
        .mobile-legends-success-card > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 11px 0;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.06);
        }

        .mobile-legends-confirmation-card > div:last-child,
        .mobile-legends-success-card > div:last-child {
          border-bottom: 0;
        }

        .mobile-legends-confirmation-card span,
        .mobile-legends-success-card span {
          color: #777;
          font-size: 11px;
        }

        .mobile-legends-confirmation-card strong,
        .mobile-legends-success-card strong {
          font-size: 14px;
          word-break: break-word;
        }

        .mobile-legends-confirmation-card .total {
          margin-top: 4px;
          padding-top: 15px;
        }

        .mobile-legends-confirmation-card .total strong {
          color: #4cff9a;
          font-size: 20px;
        }

        .mobile-legends-confirmation-actions,
        .mobile-legends-success-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 15px;
        }

        .mobile-legends-cancel,
        .mobile-legends-new-button {
          height: 52px;
          border: 1px solid
            rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          background: #181818;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .mobile-legends-confirm {
          background: #ff3838;
        }

        .mobile-legends-confirm:disabled,
        .mobile-legends-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .mobile-legends-success {
          text-align: center;
        }

        .mobile-legends-success-icon {
          background: rgba(60, 255, 145, 0.1);
          color: #4cff9a;
        }

        .mobile-legends-success-card {
          text-align: left;
        }

        .mobile-legends-success-actions {
          grid-template-columns: 1fr 1fr;
        }

        .mobile-legends-new-button {
          background: #181818;
        }

        .mobile-legends-service {
          margin-top: 30px;
          padding: 22px;
          border-radius: 20px;
          background: #111;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .mobile-legends-service h2 {
          margin: 0 0 15px;
          font-size: 19px;
        }

        .mobile-legends-service-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .mobile-legends-service-grid > div {
          padding: 15px;
          border-radius: 14px;
          background: #171717;
          text-align: center;
        }

        .mobile-legends-service-grid span {
          display: block;
          font-size: 22px;
          margin-bottom: 7px;
        }

        .mobile-legends-service-grid strong {
          display: block;
          font-size: 12px;
        }

        .mobile-legends-service-grid p {
          margin: 4px 0 0;
          color: #777;
          font-size: 11px;
        }

        .mobile-legends-footer {
          text-align: center;
          padding: 35px 20px 10px;
          color: #777;
        }

        .mobile-legends-footer p {
          margin: 0;
          font-weight: 800;
          color: #aaa;
        }

        .mobile-legends-footer span {
          display: block;
          margin-top: 5px;
          font-size: 12px;
        }

        @media (max-width: 760px) {
          .mobile-legends-banner {
            height: 250px;
          }

          .mobile-legends-offers {
            grid-template-columns: 1fr;
          }

          .mobile-legends-service-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 520px) {
          .mobile-legends-header {
            padding: 0 14px;
          }

          .mobile-legends-hero,
          .mobile-legends-content {
            padding-left: 12px;
            padding-right: 12px;
          }

          .mobile-legends-banner {
            height: 220px;
            border-radius: 17px;
          }

          .mobile-legends-banner-overlay {
            padding: 15px;
          }

          .mobile-legends-banner-overlay h1 {
            font-size: 30px;
          }

          .mobile-legends-info {
            padding: 14px;
          }

          .mobile-legends-offer {
            padding: 13px;
          }

          .mobile-legends-selected {
            align-items: flex-start;
            flex-direction: column;
          }

          .mobile-legends-selected-price {
            align-self: flex-end;
          }

          .mobile-legends-form,
          .mobile-legends-confirmation,
          .mobile-legends-success {
            padding: 18px;
          }

          .mobile-legends-confirmation-actions,
          .mobile-legends-success-actions {
            grid-template-columns: 1fr;
          }

          .mobile-legends-service {
            padding: 17px;
          }
        }
      `}</style>
    </main>
  );
}
