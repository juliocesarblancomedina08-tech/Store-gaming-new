
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STORE_MARGIN = 0.2;
const VIP_MARKUP = 0.08;

type SupplierOffer = {
  id: string;
  name: string;
  displayName?: string;
  supplierPrice: string | number;
  price: string | number;
};

type ArenaOffer = {
  id: string;
  supplierOfferId: string;
  name: string;
  display: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

function getIcon(name: string) {
  const lower = name.toLowerCase();

  if (
    lower.includes("pass") ||
    lower.includes("pase") ||
    lower.includes("case") ||
    lower.includes("caja") ||
    lower.includes("privileges") ||
    lower.includes("privilegios") ||
    lower.includes("select")
  ) {
    return "🎟️";
  }

  return "🪙";
}

function getDisplay(name: string) {
  const lower = name.toLowerCase();

  if (lower.includes("66 bonds")) return "66🪙";
  if (lower.includes("335 bonds")) return "335🪙";
  if (lower.includes("675 bonds")) return "675🪙";
  if (lower.includes("1690 bonds")) return "1690🪙";
  if (lower.includes("3400 bonds")) return "3400🪙";
  if (lower.includes("6820 bonds")) return "6820🪙";

  if (lower.includes("beginner select")) {
    return "BEGINNER SELECT";
  }

  if (
    lower.includes(
      "monthly advanced battle pass activation pass"
    )
  ) {
    return "PASE AVANZADO MENSUAL 🎟️";
  }

  if (lower.includes("bulletproof case privileges")) {
    return "PRIVILEGIOS CAJA A PRUEBA DE BALAS 🎟️";
  }

  if (lower.includes("bulletproof case 30d")) {
    return "CAJA A PRUEBA DE BALAS 30D 🎟️";
  }

  if (
    lower.includes(
      "monthly premium battle pass activation pass"
    )
  ) {
    return "PASE PREMIUM MENSUAL 🎟️";
  }

  if (lower.includes("composite case privileges")) {
    return "PRIVILEGIOS CAJA COMPUESTA 🎟️";
  }

  if (lower.includes("composition case 30d")) {
    return "CAJA COMPUESTA 30D 🎟️";
  }

  if (
    lower.includes(
      "quarterly premium battle pass bundle activation pass bundle"
    )
  ) {
    return "PASE PREMIUM TRIMESTRAL 🎟️";
  }

  return name;
}

export default function ArenaBreakoutPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<ArenaOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [offersOpen, setOffersOpen] = useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<ArenaOffer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [vipActive, setVipActive] = useState(false);

  // Consultar estado VIP.
  useEffect(() => {
    let mounted = true;

    async function loadVipStatus() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          if (mounted) setVipActive(false);
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("vip_expires_at")
            .eq("id", session.user.id)
            .maybeSingle();

        if (profileError) {
          console.error(
            "ERROR CONSULTANDO VIP ARENA BREAKOUT:",
            profileError
          );
        }

        const expiresAt = profile?.vip_expires_at
          ? new Date(profile.vip_expires_at).getTime()
          : 0;

        if (mounted) {
          setVipActive(
            Number.isFinite(expiresAt) &&
              expiresAt > Date.now()
          );
        }
      } catch (err) {
        console.error(
          "ERROR CARGANDO ESTADO VIP ARENA BREAKOUT:",
          err
        );

        if (mounted) setVipActive(false);
      }
    }

    void loadVipStatus();

    return () => {
      mounted = false;
    };
  }, []);

  // Calcular precios.
  function getOfferPrice(offer: ArenaOffer) {
    if (vipActive) {
      return Number(
        (offer.supplierPrice + VIP_MARKUP).toFixed(4)
      );
    }

    return offer.price;
  }

  function formatOfferPrice(offer: ArenaOffer) {
    return vipActive
      ? getOfferPrice(offer).toFixed(4)
      : getOfferPrice(offer).toFixed(2);
  }

  // Cargar catálogo.
  useEffect(() => {
    let cancelled = false;

    async function loadOffers() {
      try {
        setLoadingOffers(true);
        setError("");

        const response = await fetch(
          "/api/topups/arena-breakout",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data?.ok) {
          throw new Error(
            data?.error || "No se pudo cargar el catálogo."
          );
        }

        const supplierOffers: SupplierOffer[] =
          Array.isArray(data.offers)
            ? data.offers
            : [];

        const normalized: ArenaOffer[] =
          supplierOffers
            .map((offer) => {
              const supplierPrice = Number(
                offer.supplierPrice
              );

              const apiPrice = Number(offer.price);

              return {
                id: offer.id,
                supplierOfferId: offer.id,
                name: offer.name,
                display:
                  typeof offer.displayName === "string" &&
                  offer.displayName.trim()
                    ? offer.displayName
                    : getDisplay(offer.name),
                supplierPrice,
                price:
                  Number.isFinite(apiPrice) &&
                  apiPrice > 0
                    ? apiPrice
                    : Math.round(
                        (supplierPrice + STORE_MARGIN) *
                          10000
                      ) / 10000,
                icon: getIcon(offer.name),
              };
            })
            .filter(
              (offer) =>
                offer.id &&
                offer.name &&
                Number.isFinite(offer.supplierPrice) &&
                offer.supplierPrice > 0
            );

        if (!cancelled) {
          setOffers(normalized);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el catálogo."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOffers(false);
        }
      }
    }

    void loadOffers();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectOffer(offer: ArenaOffer) {
    if (
      !offer.supplierPrice ||
      offer.supplierPrice <= 0
    ) {
      setError(
        "Esta oferta todavía no tiene un precio disponible."
      );
      return;
    }

    setSelectedOffer(offer);
    setPlayerId("");
    setError("");
    setOrderCreated(false);
    setOrderNumber("");
  }

  async function createOrder() {
    if (!selectedOffer || processing) {
      setError("Selecciona una oferta.");
      return;
    }

    const cleanPlayerId = playerId.trim();

    if (!cleanPlayerId) {
      setError("Introduce tu Player ID.");
      return;
    }

    if (!/^[0-9]+$/.test(cleanPlayerId)) {
      setError(
        "El Player ID solo puede contener números."
      );
      return;
    }

    if (cleanPlayerId.length < 4) {
      setError(
        "El Player ID debe tener al menos 4 números."
      );
      return;
    }

    if (cleanPlayerId.length > 32) {
      setError(
        "El Player ID no puede superar 32 números."
      );
      return;
    }

    if (
      !selectedOffer.supplierPrice ||
      selectedOffer.supplierPrice <= 0
    ) {
      setError(
        "Esta oferta todavía no tiene un precio disponible."
      );
      return;
    }

    try {
      setProcessing(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login");
        return;
      }

      const finalPrice = getOfferPrice(selectedOffer);

      const response = await fetch(
        "/api/topups/arena-breakout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            offerId: selectedOffer.supplierOfferId,
            offerName: selectedOffer.name,
            playerId: cleanPlayerId,
            retailPrice: finalPrice,
            idempotencyKey: crypto.randomUUID(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "No se pudo crear el pedido."
        );
      }

      const createdOrderNumber =
        data.orderNumber ||
        data.order_number ||
        data.order?.order_number ||
        data.order?.id ||
        "";

      setOrderNumber(String(createdOrderNumber));
      setOrderCreated(true);
      setSelectedOffer(null);
      setPlayerId("");

      try {
        localStorage.setItem(
          "last_arena_breakout_order",
          JSON.stringify({
            orderNumber: createdOrderNumber,
            offerId: selectedOffer.supplierOfferId,
            offerName: selectedOffer.name,
            playerId: cleanPlayerId,
            retailPrice: finalPrice,
            createdAt: new Date().toISOString(),
          })
        );
      } catch {
        // No bloquear el pedido si localStorage no está disponible.
      }

      setTimeout(() => {
        document
          .getElementById("arena-success-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el pedido."
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (processing) return;

    void createOrder();
  }

  return (
    <main className="arena-breakout-page">
      <header className="arena-breakout-header">
        <button
          type="button"
          className="arena-back-button"
          onClick={() => router.push("/top-up")}
          aria-label="Volver"
        >
          ←
        </button>

        <h1>ARENA BREAKOUT</h1>

        {vipActive ? (
          <div className="arena-vip-status">
            <span>♛</span>
            VIP ACTIVO
          </div>
        ) : (
          <button
            type="button"
            className="arena-vip-buy"
            onClick={() => router.push("/vip")}
          >
            <span>♛</span>
            COMPRAR VIP
          </button>
        )}
      </header>

      <section className="arena-breakout-content">
        <div className="arena-breakout-banner">
          <img
            src="/images/arena-breakout.jpg"
            alt="Arena Breakout"
          />

          <div className="arena-banner-overlay">
            <span>STORE GAMING</span>
            <h2>ARENA BREAKOUT</h2>
            <p>RECARGAS GLOBALES</p>
          </div>
        </div>

        <div className="arena-region">
          <div className="arena-region-icon">🌎</div>
          <div>
            <strong>Región Global</strong>
            <p>
              Recarga de Arena Breakout. La moneda se
              entrega directamente a tu cuenta después
              de realizar el pedido.
            </p>
          </div>
        </div>

        <div className="arena-section-heading">
          <div>
            <span>RECARGAS</span>
            <h2>Ofertas disponibles</h2>
          </div>
        </div>

        <button
          type="button"
          className="arena-offers-toggle"
          onClick={() => {
            setOffersOpen((value) => !value);
            setError("");
          }}
        >
          <span>
            <span className="arena-toggle-icon">🪙</span>
            {offersOpen ? "OCULTAR OFERTAS" : "VER OFERTAS"}
          </span>

          <span className="arena-toggle-arrow">
            {offersOpen ? "▲" : "▼"}
          </span>
        </button>

        {offersOpen && (
          <section className="arena-offers-section">
            {loadingOffers ? (
              <div className="arena-loading">
                Cargando ofertas...
              </div>
            ) : error && offers.length === 0 ? (
              <div className="arena-error">
                {error}
              </div>
            ) : offers.length === 0 ? (
              <div className="arena-error">
                No hay ofertas disponibles.
              </div>
            ) : (
              <>
                <div className="arena-offers-heading">
                  <span>SELECCIONA TU OFERTA</span>
                  {vipActive && (
                    <span className="arena-vip-label">
                      PRECIO VIP
                    </span>
                  )}
                </div>

                <div className="arena-offers-list">
                  {offers.map((offer) => {
                    const unavailable =
                      !offer.supplierPrice ||
                      offer.supplierPrice <= 0;

                    const selected =
                      selectedOffer?.supplierOfferId ===
                      offer.supplierOfferId;

                    return (
                      <button
                        key={offer.supplierOfferId}
                        type="button"
                        className={`arena-offer ${
                          selected ? "selected" : ""
                        } ${
                          unavailable ? "unavailable" : ""
                        }`}
                        disabled={unavailable}
                        onClick={() =>
                          handleSelectOffer(offer)
                        }
                      >
                        <div className="arena-offer-left">
                          <span className="arena-offer-icon">
                            {offer.icon}
                          </span>

                          <div className="arena-offer-details">
                            <strong>{offer.display}</strong>
                            <small>{offer.name}</small>
                          </div>
                        </div>

                        <div className="arena-offer-right">
                          <strong>
                            {unavailable
                              ? "NO DISPONIBLE"
                              : `${formatOfferPrice(offer)}$`}
                          </strong>

                          <span>
                            {selected
                              ? "SELECCIONADO ✓"
                              : "ELEGIR →"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}

        {selectedOffer && !orderCreated && (
          <section
            id="arena-order-form"
            className="arena-order-section"
          >
            <div className="arena-order-heading">
              <span>CONFIRMAR COMPRA</span>
              <h2>Datos de tu cuenta</h2>
            </div>

            <div className="arena-selected-offer">
              <span className="arena-selected-icon">
                {selectedOffer.icon}
              </span>

              <div className="arena-selected-details">
                <small>OFERTA SELECCIONADA</small>
                <strong>{selectedOffer.name}</strong>
              </div>

              <strong className="arena-selected-price">
                {formatOfferPrice(selectedOffer)}$
              </strong>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="arena-player-id">
                PLAYER ID
              </label>

              <input
                id="arena-player-id"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Introduce tu Player ID"
                value={playerId}
                onChange={(event) =>
                  setPlayerId(event.target.value)
                }
                disabled={processing}
              />

              <p className="arena-input-help">
                Comprueba que el ID sea correcto antes
                de finalizar tu pedido.
              </p>

              {error && (
                <div className="arena-form-error">
                  <span>!</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="arena-create-order-button"
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
            id="arena-success-section"
            className="arena-success-section"
          >
            <div className="arena-success-icon">✓</div>

            <span className="arena-success-eyebrow">
              STORE GAMING
            </span>

            <h2>Orden creada</h2>

            <p>
              Tu pedido de Arena Breakout fue creado
              correctamente.
            </p>

            {orderNumber && (
              <div className="arena-order-number">
                <span>NÚMERO DE ORDEN</span>
                <strong>{orderNumber}</strong>
              </div>
            )}

            <button
              type="button"
              className="arena-review-button"
              onClick={() => router.push("/orders")}
            >
              REVISAR ORDEN
            </button>

            <button
              type="button"
              className="arena-store-button"
              onClick={() => router.push("/top-up")}
            >
              VOLVER A LA TIENDA
            </button>
          </section>
        )}

        <div className="arena-security-note">
          <span>🔒</span>
          <p>
            Compra procesada mediante STORE GAMING.
            Comprueba siempre los datos de tu cuenta.
          </p>
        </div>
      </section>

      <footer className="arena-breakout-footer">
        <strong>STORE GAMING</strong>
        <span>RECARGAS DIGITALES</span>
      </footer>

      <style jsx>{`
        .arena-breakout-page {
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

        .arena-breakout-header {
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

        .arena-breakout-header h1 {
          margin: 0;
          color: #fff;
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-align: center;
          white-space: nowrap;
        }

        .arena-back-button {
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

        .arena-vip-buy,
        .arena-vip-status {
          justify-self: end;
          min-height: 34px;
          padding: 0 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          border-radius: 9px;
          white-space: nowrap;
          font-size: 9px;
          font-weight: 900;
        }

        .arena-vip-buy {
          border: 1px solid rgba(230, 175, 70, 0.45);
          background: rgba(230, 175, 70, 0.1);
          color: #f2c66d;
          cursor: pointer;
        }

        .arena-vip-status {
          border: 1px solid rgba(230, 175, 70, 0.35);
          background: rgba(230, 175, 70, 0.12);
          color: #f2c66d;
        }

        .arena-vip-buy span,
        .arena-vip-status span {
          font-size: 15px;
        }

        .arena-breakout-content {
          width: min(100%, 680px);
          margin: 0 auto;
          padding: 0 14px 25px;
        }

        .arena-breakout-banner {
          position: relative;
          width: calc(100% + 28px);
          height: 215px;
          margin-left: -14px;
          overflow: hidden;
          background: #181818;
        }

        .arena-breakout-banner img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .arena-banner-overlay {
          position: absolute;
          inset: 0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          background:
            linear-gradient(
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

        .arena-banner-overlay > span {
          color: #ff7777;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .arena-banner-overlay h2 {
          margin: 5px 0 0;
          color: #fff;
          font-size: 25px;
          font-weight: 1000;
          letter-spacing: 0.5px;
        }

        .arena-banner-overlay p {
          margin: 3px 0 0;
          color: #ddd;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .arena-region {
          margin-top: 16px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 13px;
          background: #151518;
        }

        .arena-region-icon {
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

        .arena-region strong {
          font-size: 14px;
        }

        .arena-region p {
          margin: 4px 0 0;
          color: #a5a5aa;
          font-size: 12px;
          line-height: 1.5;
        }

        .arena-section-heading {
          margin: 25px 0 12px;
        }

        .arena-section-heading > div > span,
        .arena-order-heading > span {
          color: #ed5555;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .arena-section-heading h2,
        .arena-order-heading h2 {
          margin: 4px 0 0;
          color: #fff;
          font-size: 19px;
          font-weight: 900;
        }

        .arena-offers-toggle {
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

        .arena-offers-toggle > span:first-child {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .arena-toggle-icon {
          font-size: 18px;
        }

        .arena-toggle-arrow {
          color: #ef6262;
          font-size: 11px;
        }

        .arena-offers-section {
          margin-top: 12px;
        }

        .arena-offers-heading {
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

        .arena-vip-label {
          color: #f2c66d;
        }

        .arena-offers-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .arena-offer {
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

        .arena-offer.selected {
          border-color: #d93636;
          background: #251719;
        }

        .arena-offer.unavailable {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .arena-offer-left {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .arena-offer-icon {
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

        .arena-offer-details strong {
          display: block;
          font-size: 14px;
        }

        .arena-offer-details small {
          display: block;
          margin-top: 4px;
          color: #929298;
          font-size: 11px;
          line-height: 1.35;
        }

        .arena-offer-right {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
        }

        .arena-offer-right strong {
          color: #fff;
          font-size: 14px;
          font-weight: 900;
        }

        .arena-offer-right span {
          color: #999;
          font-size: 9px;
          font-weight: 800;
        }

        .arena-offer.selected .arena-offer-right span {
          color: #ff7777;
        }

        .arena-loading,
        .arena-error {
          padding: 17px;
          border-radius: 11px;
          background: #17171a;
          text-align: center;
          font-size: 13px;
        }

        .arena-error {
          color: #ffaaaa;
          border: 1px solid rgba(255, 80, 80, 0.2);
        }

        .arena-order-section {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 14px;
          background: #151518;
        }

        .arena-order-heading {
          margin-bottom: 15px;
        }

        .arena-selected-offer {
          margin-bottom: 17px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 11px;
          background: #202024;
        }

        .arena-selected-icon {
          font-size: 24px;
        }

        .arena-selected-details {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .arena-selected-details small {
          color: #999;
          font-size: 9px;
          font-weight: 800;
        }

        .arena-selected-details strong {
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .arena-selected-price {
          color: #fff;
          font-size: 14px;
          white-space: nowrap;
        }

        .arena-order-section form {
          display: flex;
          flex-direction: column;
        }

        .arena-order-section label {
          margin-bottom: 8px;
          color: #eee;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.7px;
        }

        .arena-order-section input {
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

        .arena-order-section input:focus {
          border-color: #d93636;
        }

        .arena-order-section input::placeholder {
          color: #77777e;
        }

        .arena-input-help {
          margin: 7px 0 0;
          color: #898990;
          font-size: 11px;
          line-height: 1.5;
        }

        .arena-form-error {
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

        .arena-form-error span {
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

        .arena-create-order-button {
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

        .arena-create-order-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .arena-success-section {
          margin-top: 18px;
          padding: 23px 16px;
          border: 1px solid rgba(50, 190, 100, 0.2);
          border-radius: 15px;
          background: #151a17;
          text-align: center;
        }

        .arena-success-icon {
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

        .arena-success-eyebrow {
          color: #63d995;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .arena-success-section h2 {
          margin: 6px 0;
          font-size: 22px;
        }

        .arena-success-section p {
          margin: 8px 0 15px;
          color: #b9c4bd;
          font-size: 13px;
          line-height: 1.5;
        }

        .arena-order-number {
          margin-top: 10px;
          padding: 12px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.06);
        }

        .arena-order-number span {
          display: block;
          color: #999;
          font-size: 10px;
          font-weight: 800;
        }

        .arena-order-number strong {
          display: block;
          margin-top: 5px;
          font-size: 15px;
          overflow-wrap: anywhere;
        }

        .arena-review-button,
        .arena-store-button {
          width: 100%;
          min-height: 45px;
          margin-top: 12px;
          border: 0;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .arena-review-button {
          background: #168e4a;
          color: #fff;
        }

        .arena-store-button {
          background: #29292e;
          color: #fff;
        }

        .arena-security-note {
          margin-top: 17px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.025);
        }

        .arena-security-note span {
          font-size: 19px;
        }

        .arena-security-note p {
          margin: 0;
          color: #929298;
          font-size: 11px;
          line-height: 1.5;
        }

        .arena-breakout-footer {
          padding: 22px 12px 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }

        .arena-breakout-footer strong {
          color: #ddd;
          font-size: 12px;
          letter-spacing: 1.5px;
        }

        .arena-breakout-footer span {
          color: #777;
          font-size: 9px;
          letter-spacing: 1.5px;
        }

        @media (max-width: 380px) {
          .arena-breakout-header {
            padding-left: 8px;
            padding-right: 8px;
            gap: 5px;
          }

          .arena-breakout-header h1 {
            font-size: 12px;
          }

          .arena-vip-buy,
          .arena-vip-status {
            padding: 0 7px;
            font-size: 8px;
          }

          .arena-breakout-banner {
            height: 185px;
          }
        }
      `}</style>
    </main>
  );
}
