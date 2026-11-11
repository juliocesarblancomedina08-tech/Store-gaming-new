
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SupplierOffer = {
  offer_id: string;
  name: string;
  price_usd?: string | number;
  precio_usd?: string | number;
};

type HonorOfKingsOffer = {
  id: string;
  supplierOfferId: string;
  name: string;
  display: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

const STORE_MARGIN = 0.2;

function getIcon(name: string) {
  const lower = name.toLowerCase();

  if (
    lower.includes("weekly") ||
    lower.includes("card")
  ) {
    return "🎟️";
  }

  if (
    lower.includes("lucky") ||
    lower.includes("rebate") ||
    lower.includes("pack")
  ) {
    return "🎁";
  }

  if (lower.includes("honor")) {
    return "🏆";
  }

  return "🪙";
}

function getDisplay(name: string) {
  const lower = name.toLowerCase();

  if (lower === "double token lucky bag") {
    return "BOLSA DE LA SUERTE 🎁";
  }

  if (lower === "honor point value pack") {
    return "PAQUETE DE HONOR 🏆";
  }

  if (
    lower ===
    "standard purchase rebate paquete"
  ) {
    return "REEMBOLSO ESTÁNDAR 🎁";
  }

  if (
    lower === "premium purchase rebate pack"
  ) {
    return "REEMBOLSO PREMIUM 🎁";
  }

  if (lower === "weekly card") {
    return "TARJETA SEMANAL 🎟️";
  }

  if (lower === "weekly card plus") {
    return "TARJETA SEMANAL PLUS 🎟️";
  }

  const match = name.match(/^(\d+)\s+tokens/i);

  if (match) {
    return `${match[1]} 🪙`;
  }

  return name;
}

export default function HonorOfKingsPage() {
  const router = useRouter();

  const [offers, setOffers] =
    useState<HonorOfKingsOffer[]>([]);

  const [loadingOffers, setLoadingOffers] =
    useState(true);

  const [offersOpen, setOffersOpen] =
    useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<HonorOfKingsOffer | null>(null);

  const [playerId, setPlayerId] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [orderCreated, setOrderCreated] =
    useState(false);

  const [orderNumber, setOrderNumber] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOffers() {
      try {
        setLoadingOffers(true);
        setError("");

        const response = await fetch(
          "/api/fazercards/topups?category_id=honor_of_kings",
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data?.ok) {
          throw new Error(
            data?.error ||
              "No se pudo cargar el catálogo."
          );
        }

        // El proxy /api/fazercards/topups devuelve el catálogo
        // de FazerCards dentro de data.catalog, no en data.offers.
        // Se aceptan ambas formas para mantener compatibilidad.
        const catalog = data?.catalog;
        const candidateOffers =
          data?.offers ??
          catalog?.offers ??
          catalog?.data?.offers ??
          catalog?.catalog?.offers ??
          catalog?.results ??
          catalog?.data?.results ??
          [];

        const supplierOffers: SupplierOffer[] =
          Array.isArray(candidateOffers)
            ? candidateOffers
            : [];

        if (supplierOffers.length === 0) {
          console.error(
            "[Honor of Kings] No se encontraron ofertas en la respuesta del catálogo:",
            {
              topLevelKeys: Object.keys(data ?? {}),
              catalogKeys:
                catalog && typeof catalog === "object"
                  ? Object.keys(catalog)
                  : [],
            }
          );
        }

        const normalized: HonorOfKingsOffer[] =
          supplierOffers
            .map((offer) => {
              const supplierPrice = Number(
                offer.price_usd ??
                  offer.precio_usd ??
                  (offer as any).supplierPrice ??
                  (offer as any).supplier_price ??
                  (offer as any).price
              );
              const offerId = String(
                offer.offer_id ??
                  (offer as any).id ??
                  (offer as any).offerId ??
                  ""
              );
              const offerName = String(
                offer.name ??
                  (offer as any).displayName ??
                  (offer as any).display_name ??
                  ""
              );

              return {
                id: offerId,
                supplierOfferId: offerId,
                name: offerName,
                display: getDisplay(
                  offer.name
                ),
                supplierPrice,
                price:
                  Math.round(
                    (supplierPrice +
                      STORE_MARGIN) *
                      10000
                  ) / 10000,
                icon: getIcon(
                  offer.name
                ),
              };
            })
            .filter(
              (offer) =>
                offer.id &&
                offer.name &&
                Number.isFinite(
                  offer.supplierPrice
                ) && offer.supplierPrice > 0
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

    loadOffers();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectOffer(
    offer: HonorOfKingsOffer
  ) {
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
    setError("");
    setOrderCreated(false);
    setOrderNumber("");

    setTimeout(() => {
      document
        .getElementById(
          "hok-order-form"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  async function createOrder() {
    if (!selectedOffer) {
      setError(
        "Selecciona una oferta."
      );

      return;
    }

    const cleanPlayerId =
      playerId.trim();

    if (!cleanPlayerId) {
      setError(
        "Introduce tu Player ID."
      );

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

    if (cleanPlayerId.length > 20) {
      setError(
        "El Player ID no puede superar 20 números."
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

      const response = await fetch(
        "/api/topups/honor-of-kings",
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
              selectedOffer.supplierOfferId,

            offerName:
              selectedOffer.name,

            playerId:
              cleanPlayerId,

            retailPrice:
              selectedOffer.price,

            idempotencyKey:
              crypto.randomUUID(),
          }),
        }
      );

      const data =
        await response.json();

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

      setOrderNumber(
        String(createdOrderNumber)
      );

      setOrderCreated(true);

      setSelectedOffer(null);
      setPlayerId("");

      setTimeout(() => {
        document
          .getElementById(
            "hok-success"
          )
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

    void createOrder();
  }

  return (
    <main className="hok-page">
      <header className="hok-header">
        <button
          type="button"
          className="hok-back-button"
          onClick={() =>
            router.push("/top-up")
          }
        >
          ←
        </button>

        <h1>Honor of Kings</h1>

        <div className="hok-header-space" />
      </header>

      <section className="hok-content">
        <div className="hok-banner">
          <img
            src="/images/honor-of-kings.jpg"
            alt="Honor of Kings"
          />
        </div>

        <div className="hok-note">
          <strong>
            🌎 Región Global
          </strong>

          <p>
            Recarga de Honor of Kings.
            Introduce tu ID de jugador
            antes de realizar el pedido.
            El producto seleccionado se
            entrega directamente a tu cuenta
            después de realizar el pedido.
          </p>
        </div>

        <button
          type="button"
          className="hok-offers-toggle"
          onClick={() => {
            setOffersOpen(
              (value) => !value
            );

            setError("");
          }}
        >
          <span>
            ✏️ Presione para ver ofertas
          </span>

          <span className="hok-offers-arrow">
            {offersOpen
              ? "▲"
              : "▼"}
          </span>
        </button>

        {offersOpen && (
          <section className="hok-offers-section">
            {loadingOffers ? (
              <div className="hok-loading">
                Cargando ofertas...
              </div>
            ) : error &&
              offers.length === 0 ? (
              <div className="hok-error">
                {error}
              </div>
            ) : offers.length === 0 ? (
              <div className="hok-error">
                No hay ofertas disponibles.
              </div>
            ) : (
              <div className="hok-offers-list">
                {offers.map(
                  (offer) => {
                    const unavailable =
                      !offer.supplierPrice ||
                      offer.supplierPrice <=
                        0;

                    const selected =
                      selectedOffer?.supplierOfferId ===
                      offer.supplierOfferId;

                    return (
                      <button
                        key={
                          offer.supplierOfferId
                        }
                        type="button"
                        className={`hok-offer ${
                          selected
                            ? "selected"
                            : ""
                        } ${
                          unavailable
                            ? "unavailable"
                            : ""
                        }`}
                        disabled={
                          unavailable
                        }
                        onClick={() =>
                          handleSelectOffer(
                            offer
                          )
                        }
                      >
                        <div className="hok-offer-left">
                          <span className="hok-offer-icon">
                            {offer.icon}
                          </span>

                          <div>
                            <strong>
                              {offer.display}
                            </strong>

                            <small>
                              {offer.name}
                            </small>
                          </div>
                        </div>

                        <div className="hok-offer-price">
                          {unavailable
                            ? "NO DISPONIBLE"
                            : `${offer.price.toFixed(
                                4
                              )}$`}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </section>
        )}

        {selectedOffer &&
          !orderCreated && (
            <section
              id="hok-order-form"
              className="hok-order-section"
            >
              <div className="hok-selected-offer">
                <span>
                  {selectedOffer.icon}
                </span>

                <div>
                  <strong>
                    {selectedOffer.name}
                  </strong>

                  <span>
                    {selectedOffer.price.toFixed(
                      4
                    )}
                    $
                  </span>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
              >
                <label htmlFor="hok-player-id">
                  ID del jugador
                </label>

                <input
                  id="hok-player-id"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Introduzca su Player ID"
                  value={playerId}
                  onChange={(event) =>
                    setPlayerId(
                      event.target.value
                    )
                  }
                  disabled={processing}
                />

                {error && (
                  <div className="hok-form-error">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="hok-create-order-button"
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
            id="hok-success"
            className="hok-success-section"
          >
            <div className="hok-success-icon">
              ✓
            </div>

            <h2>
              Orden creada
            </h2>

            <p>
              Tu pedido de Honor of
              Kings fue creado
              correctamente.
            </p>

            {orderNumber && (
              <div className="hok-order-number">
                <span>
                  Número de orden
                </span>

                <strong>
                  {orderNumber}
                </strong>
              </div>
            )}

            <button
              type="button"
              className="hok-review-button"
              onClick={() =>
                router.push(
                  "/orders"
                )
              }
            >
              Revisar orden
            </button>

            <button
              type="button"
              className="hok-store-button"
              onClick={() =>
                router.push(
                  "/top-up"
                )
              }
            >
              Volver a la tienda
            </button>
          </section>
        )}
      </section>

      <footer className="hok-footer">
        🛒 STORE GAMING 🎮
      </footer>

      <style jsx>{`
        .hok-page {
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

        .hok-header {
          position: sticky;
          top: 0;
          z-index: 20;

          display: flex;
          align-items: center;
          justify-content: space-between;

          min-height: 58px;

          padding: 8px 12px;

          background:
            rgba(0, 0, 0, 0.88);

          border-bottom:
            1px solid
            rgba(255, 255, 255, 0.1);

          backdrop-filter: blur(10px);
        }

        .hok-header h1 {
          margin: 0;

          font-size: 19px;
          font-weight: 800;

          text-align: center;
        }

        .hok-back-button {
          width: 40px;
          height: 40px;

          border: 0;
          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.08);

          color: #fff;

          font-size: 25px;

          cursor: pointer;
        }

        .hok-header-space {
          width: 40px;
        }

        .hok-content {
          width: min(100%, 680px);

          margin: 0 auto;

          padding:
            0 12px 30px;
        }

        .hok-banner {
          width: calc(100% + 24px);

          margin-left: -12px;

          overflow: hidden;
        }

        .hok-banner img {
          display: block;

          width: 100%;
          height: 210px;

          object-fit: cover;
        }

        .hok-note {
          margin-top: 14px;

          padding: 14px;

          border-radius: 14px;

          background:
            rgba(0, 0, 0, 0.68);

          border:
            1px solid
            rgba(255, 255, 255, 0.1);
        }

        .hok-note strong {
          color: #fff;

          font-size: 15px;
        }

        .hok-note p {
          margin: 7px 0 0;

          color: #d8d8d8;

          font-size: 13px;

          line-height: 1.5;
        }

        .hok-offers-toggle {
          width: 100%;

          margin-top: 14px;

          padding: 15px;

          display: flex;

          align-items: center;
          justify-content: space-between;

          border:
            1px solid
            rgba(255, 255, 255, 0.12);

          border-radius: 13px;

          background:
            rgba(0, 0, 0, 0.78);

          color: #fff;

          font-size: 14px;
          font-weight: 800;

          cursor: pointer;
        }

        .hok-offers-arrow {
          font-size: 12px;
        }

        .hok-offers-section {
          margin-top: 10px;
        }

        .hok-offers-list {
          display: flex;

          flex-direction: column;

          gap: 8px;
        }

        .hok-offer {
          width: 100%;

          min-height: 65px;

          padding: 10px 12px;

          display: flex;

          align-items: center;
          justify-content: space-between;

          gap: 10px;

          border:
            1px solid
            rgba(255, 255, 255, 0.1);

          border-radius: 13px;

          background:
            rgba(0, 0, 0, 0.78);

          color: #fff;

          text-align: left;

          cursor: pointer;

          transition: 0.15s ease;
        }

        .hok-offer:active {
          transform: scale(0.98);
        }

        .hok-offer.selected {
          border-color:
            rgba(255, 50, 50, 0.8);

          background:
            rgba(120, 0, 0, 0.3);
        }

        .hok-offer.unavailable {
          opacity: 0.5;

          cursor: not-allowed;
        }

        .hok-offer-left {
          display: flex;

          align-items: center;

          gap: 10px;

          min-width: 0;
        }

        .hok-offer-icon {
          width: 38px;
          height: 38px;

          flex: 0 0 38px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.08);

          font-size: 21px;
        }

        .hok-offer-left strong {
          display: block;

          font-size: 14px;
        }

        .hok-offer-left small {
          display: block;

          margin-top: 3px;

          color: #aaa;

          font-size: 11px;
        }

        .hok-offer-price {
          flex-shrink: 0;

          color: #fff;

          font-size: 14px;

          font-weight: 900;
        }

                .hok-loading,
        .hok-error {
          padding: 18px;

          border-radius: 13px;

          background:
            rgba(0, 0, 0, 0.78);

          text-align: center;

          font-size: 14px;
        }

        .hok-error {
          color: #ff8e8e;

          border:
            1px solid
            rgba(255, 70, 70, 0.35);
        }

        .hok-order-section {
          margin-top: 16px;

          padding: 16px;

          border-radius: 15px;

          background:
            rgba(0, 0, 0, 0.82);

          border:
            1px solid
            rgba(255, 255, 255, 0.1);
        }

        .hok-selected-offer {
          display: flex;

          align-items: center;

          gap: 11px;

          margin-bottom: 15px;

          padding: 12px;

          border-radius: 12px;

          background:
            rgba(255, 255, 255, 0.06);
        }

        .hok-selected-offer > span {
          font-size: 25px;
        }

        .hok-selected-offer div {
          flex: 1;

          display: flex;

          align-items: center;
          justify-content: space-between;

          gap: 10px;
        }

        .hok-selected-offer strong {
          font-size: 14px;
        }

        .hok-selected-offer div span {
          font-weight: 900;

          white-space: nowrap;
        }

        .hok-order-section form {
          display: flex;

          flex-direction: column;
        }

        .hok-order-section label {
          margin-bottom: 7px;

          font-size: 13px;

          font-weight: 800;
        }

        .hok-order-section input {
          width: 100%;

          box-sizing: border-box;

          padding: 13px;

          border:
            1px solid
            rgba(255, 255, 255, 0.16);

          border-radius: 11px;

          outline: none;

          background:
            rgba(255, 255, 255, 0.07);

          color: #fff;

          font-size: 15px;
        }

        .hok-order-section input::placeholder {
          color: #888;
        }

        .hok-form-error {
          margin-top: 8px;

          padding: 9px;

          border-radius: 9px;

          background:
            rgba(150, 0, 0, 0.25);

          color: #ff9b9b;

          font-size: 12px;
        }

        .hok-create-order-button,
        .hok-review-button,
        .hok-store-button {
          width: 100%;

          margin-top: 12px;

          padding: 13px;

          border: 0;

          border-radius: 11px;

          font-weight: 900;

          cursor: pointer;
        }

        .hok-create-order-button {
          background: #d71920;

          color: #fff;
        }

        .hok-create-order-button:disabled {
          opacity: 0.6;

          cursor: wait;
        }

        .hok-success-section {
          margin-top: 16px;

          padding: 20px 16px;

          border-radius: 15px;

          background:
            rgba(0, 0, 0, 0.84);

          border:
            1px solid
            rgba(70, 255, 120, 0.25);

          text-align: center;
        }

        .hok-success-icon {
          width: 56px;
          height: 56px;

          margin: 0 auto 12px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #18a957;

          color: #fff;

          font-size: 30px;

          font-weight: 900;
        }

        .hok-success-section h2 {
          margin: 0;

          font-size: 21px;
        }

        .hok-success-section p {
          margin: 8px 0 0;

          color: #cfcfcf;

          font-size: 13px;

          line-height: 1.5;
        }

        .hok-order-number {
          margin-top: 14px;

          padding: 12px;

          display: flex;

          flex-direction: column;

          gap: 4px;

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.06);
        }

        .hok-order-number span {
          color: #999;

          font-size: 11px;
        }

        .hok-order-number strong {
          font-size: 14px;

          word-break: break-word;
        }

        .hok-review-button {
          background: #d71920;

          color: #fff;
        }

        .hok-store-button {
          background:
            rgba(255, 255, 255, 0.1);

          color: #fff;
        }

        .hok-footer {
          padding: 10px 15px;

          text-align: center;

          color: #777;

          font-size: 11px;
        }

        @media (max-width: 480px) {
          .hok-header h1 {
            font-size: 17px;
          }

          .hok-banner img {
            height: 175px;
          }

          .hok-offer {
            padding: 10px;
          }

          .hok-offer-left strong {
            font-size: 13px;
          }

          .hok-offer-price {
            font-size: 13px;
          }
        }
      `}</style>
    </main>
  );
}
