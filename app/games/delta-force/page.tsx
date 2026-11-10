
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
   * ============================================================
   * COMPROBAR MEMBRESÍA VIP
   * ============================================================
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
   * ============================================================
   * CALCULAR PRECIOS
   * ============================================================
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

  return (
    <main className="free-fire-page">
      <header className="free-fire-header">
        <button
          type="button"
          className="free-fire-back-button"
          onClick={() => router.push("/top-up")}
          aria-label="Volver a recargas"
        >
          ←
        </button>

        <h1>Delta Force</h1>

        <div className="free-fire-header-space" />
      </header>

      <section className="free-fire-content">
        <div className="free-fire-banner">
          <img
            src="/images/delta-force.jpg"
            alt="Delta Force"
          />
        </div>

        <div className="free-fire-note">
          <strong>🎮 Delta Force</strong>
          <p>
            Recarga Delta Coins y pases de Delta Force.
            Selecciona una oferta e introduce el ID numérico
            de la cuenta donde deseas recibir la compra.
            Comprueba que el ID sea correcto antes de finalizar.
          </p>
        </div>

        {vipActive && (
          <div className="free-fire-vip-notice">
            ★ PRECIO VIP ACTIVO · PRECIO ESPECIAL
          </div>
        )}

        <button
          type="button"
          className="free-fire-offers-toggle"
          onClick={() => {
            setShowOffers((value) => !value);
            setError("");
          }}
        >
          <span>✏️ Presione para ver ofertas</span>
          <span className="free-fire-offers-arrow">
            {showOffers ? "▲" : "▼"}
          </span>
        </button>

        {showOffers && (
          <section className="free-fire-offers-section">
            <div className="free-fire-offers-list">
              {DELTA_FORCE_OFFERS.map((offer) => {
                const selected = selectedOffer?.id === offer.id;

                return (
                  <button
                    key={offer.id}
                    type="button"
                    className={`free-fire-offer ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() => selectOffer(offer)}
                  >
                    <div className="free-fire-offer-left">
                      <span className="free-fire-offer-icon">
                        {offer.name.toLowerCase().includes("season pass")
                          ? "🎟️"
                          : "🪙"}
                      </span>

                      <div>
                        <strong>{offer.name}</strong>
                        <small>
                          {offer.name.toLowerCase().includes("season pass")
                            ? "Pase de temporada"
                            : "Delta Coins"}
                        </small>
                      </div>
                    </div>

                    <div className="free-fire-offer-price">
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
            className="free-fire-order-section"
          >
            <div className="free-fire-selected-offer">
              <span>
                {selectedOffer.name.toLowerCase().includes("season pass")
                  ? "🎟️"
                  : "🪙"}
              </span>

              <div>
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
                <div className="free-fire-form-error" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="free-fire-create-order-button"
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
            className="free-fire-success-section"
          >
            <div className="free-fire-success-icon">✓</div>

            <h2>Orden creada</h2>

            <p>
              Tu pedido de Delta Force fue creado correctamente.
              Consulta el estado de la orden antes de realizar otra compra.
            </p>

            {orderNumber && (
              <div className="free-fire-order-number">
                <span>Número de orden</span>
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
              Revisar orden
            </button>

            <button
              type="button"
              className="free-fire-store-button"
              onClick={() => router.push("/top-up")}
            >
              Volver a la tienda
            </button>
          </section>
        )}
      </section>

      <footer className="free-fire-footer">
        🛒 STORE GAMING 🎮
      </footer>

      <style jsx>{`
        .free-fire-page {
          min-height: 100vh;
          color: #fff;
          background:
            linear-gradient(
              rgba(0, 0, 0, 0.72),
              rgba(0, 0, 0, 0.86)
            ),
            url("/images/battle-royale-bg.jpg") center / cover fixed;
          padding-bottom: 30px;
        }

        .free-fire-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 58px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.88);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .free-fire-header h1 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          text-align: center;
        }

        .free-fire-back-button {
          width: 40px;
          height: 40px;
          border: 0;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 25px;
          cursor: pointer;
        }

        .free-fire-header-space {
          width: 40px;
        }

        .free-fire-content {
          width: min(100%, 680px);
          margin: 0 auto;
          padding: 0 12px 30px;
        }

        .free-fire-banner {
          width: calc(100% + 24px);
          margin-left: -12px;
          overflow: hidden;
        }

        .free-fire-banner img {
          display: block;
          width: 100%;
          height: 210px;
          object-fit: cover;
        }

        .free-fire-note {
          margin-top: 14px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.68);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .free-fire-note strong {
          color: #fff;
          font-size: 15px;
        }

        .free-fire-note p {
          margin: 7px 0 0;
          color: #d8d8d8;
          font-size: 13px;
          line-height: 1.5;
        }

        .free-fire-vip-notice {
          margin-top: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 65, 65, 0.4);
          border-radius: 11px;
          background: rgba(125, 0, 0, 0.22);
          color: #ffb1b1;
          text-align: center;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.4px;
        }

        .free-fire-offers-toggle {
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

        .free-fire-offers-arrow {
          font-size: 12px;
        }

        .free-fire-offers-section {
          margin-top: 10px;
        }

        .free-fire-offers-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .free-fire-offer {
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

        .free-fire-offer:active {
          transform: scale(0.98);
        }

        .free-fire-offer.selected {
          border-color: rgba(255, 50, 50, 0.8);
          background: rgba(120, 0, 0, 0.3);
        }

        .free-fire-offer-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .free-fire-offer-icon {
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

        .free-fire-offer-left strong {
          display: block;
          font-size: 14px;
        }

        .free-fire-offer-left small {
          display: block;
          margin-top: 3px;
          color: #aaa;
          font-size: 11px;
        }

        .free-fire-offer-price {
          flex-shrink: 0;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
        }

        .free-fire-order-section {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          background: rgba(0, 0, 0, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .free-fire-selected-offer {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 15px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
        }

        .free-fire-selected-offer > span {
          font-size: 25px;
        }

        .free-fire-selected-offer div {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .free-fire-selected-offer strong {
          font-size: 14px;
        }

        .free-fire-selected-offer div span {
          font-weight: 900;
          white-space: nowrap;
        }

        .free-fire-order-section form {
          display: flex;
          flex-direction: column;
        }

        .free-fire-order-section label {
          margin-bottom: 7px;
          font-size: 13px;
          font-weight: 800;
        }

        .free-fire-order-section input {
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

        .free-fire-order-section input::placeholder {
          color: #888;
        }

        .free-fire-form-error {
          margin-top: 8px;
          padding: 9px;
          border-radius: 9px;
          background: rgba(150, 0, 0, 0.25);
          color: #ff9b9b;
          font-size: 12px;
        }

        .free-fire-create-order-button {
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

        .free-fire-create-order-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .free-fire-success-section {
          margin-top: 18px;
          padding: 22px 16px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.84);
          border: 1px solid rgba(50, 255, 100, 0.2);
          text-align: center;
        }

        .free-fire-success-icon {
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

        .free-fire-success-section h2 {
          margin: 0;
          font-size: 21px;
        }

        .free-fire-success-section p {
          margin: 8px 0;
          color: #cfcfcf;
          font-size: 13px;
        }

        .free-fire-order-number {
          margin-top: 13px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          overflow-wrap: anywhere;
        }

        .free-fire-order-number span {
          display: block;
          color: #999;
          font-size: 11px;
        }

        .free-fire-order-number strong {
          display: block;
          margin-top: 4px;
          font-size: 16px;
        }

        .free-fire-review-button,
        .free-fire-store-button {
          width: 100%;
          margin-top: 12px;
          padding: 13px;
          border: 0;
          border-radius: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .free-fire-review-button {
          background: #19a957;
          color: #fff;
        }

        .free-fire-store-button {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .free-fire-footer {
          padding: 25px 12px 5px;
          color: #888;
          font-size: 12px;
          text-align: center;
        }

        @media (max-width: 480px) {
          .free-fire-banner img {
            height: 185px;
          }

          .free-fire-selected-offer div {
            flex-direction: column;
            align-items: flex-start;
          }

          .free-fire-offer-price {
            font-size: 13px;
          }
        }
      `}</style>
    </main>
  );
}
