"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: string;
  name: string;
  price: number;
  supplierPrice: number;
  stock: number;
  maxOrderQuantity: number;
};

type SupplierOffer = {
  card_id: string;
  name: string;
  price_usd: string | number;
  stock: number;
  min_order_quantity?: number;
  max_order_quantity?: number;
};

type CatalogResponse = {
  ok: boolean;
  error?: string;
  data?: {
    name?: string;
    offers?: SupplierOffer[];
  };
};

const API_URL = "/api/fazercards/giftcards?category_id=roblox_ru";
const PROFIT_PER_UNIT = 0.25;

const productNote =
  "Tarjetas digitales Roblox RU. Consulta los paquetes, precios actualizados y unidades disponibles. Comprueba que tu cuenta sea compatible con la región rusa antes de canjear un código.";

function money(value: number) {
  return `$${value.toFixed(2)} USD`;
}

function mapSupplierOffer(
  item: SupplierOffer
): GiftCardOffer | null {
  const supplierPrice = Number(item.price_usd);
  const stock = Math.max(0, Number(item.stock) || 0);
  const maxOrderQuantity = Math.max(
    0,
    Number(item.max_order_quantity) || 0
  );

  if (
    !item.card_id ||
    !item.name ||
    !Number.isFinite(supplierPrice) ||
    supplierPrice <= 0
  ) {
    return null;
  }

  return {
    id: String(item.card_id),
    name: item.name,
    supplierPrice,
    price:
      Math.round(
        (supplierPrice + PROFIT_PER_UNIT) * 100
      ) / 100,
    stock,
    maxOrderQuantity,
  };
}

export default function RobloxRuGiftCardPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(true);
  const [offers, setOffers] = useState<GiftCardOffer[]>([]);
  const [selectedOffer, setSelectedOffer] =
    useState<GiftCardOffer | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showNotice, setShowNotice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setCatalogError("");

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        cache: "no-store",
      });

      const result: CatalogResponse = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "No se pudo consultar el catálogo."
        );
      }

      if (!Array.isArray(result.data?.offers)) {
        throw new Error(
          "FazerCards no devolvió una lista válida de ofertas."
        );
      }

      const mappedOffers = result.data.offers
        .map(mapSupplierOffer)
        .filter(
          (offer): offer is GiftCardOffer => offer !== null
        )
        .sort((a, b) => {
          const aNumber = Number(
            a.name.match(/[\d,.]+/)?.[0]?.replace(/[,.]/g, "") || 0
          );
          const bNumber = Number(
            b.name.match(/[\d,.]+/)?.[0]?.replace(/[,.]/g, "") || 0
          );

          return aNumber - bNumber;
        });

      setOffers(mappedOffers);
      setLastUpdated(new Date().toLocaleTimeString());

      setSelectedOffer((current) =>
        current
          ? mappedOffers.find(
              (offer) => offer.id === current.id
            ) ?? null
          : null
      );
    } catch (error) {
      console.error("Error cargando Roblox RU:", error);

      setCatalogError(
        error instanceof Error
          ? error.message
          : "Error al consultar FazerCards."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const maxQuantity = selectedOffer
    ? Math.min(
        selectedOffer.stock,
        selectedOffer.maxOrderQuantity
      )
    : 0;

  useEffect(() => {
    if (!selectedOffer) return;

    if (maxQuantity < 1) {
      setQuantity(1);
      setShowNotice(false);
      return;
    }

    setQuantity((current) =>
      Math.min(Math.max(1, current), maxQuantity)
    );
  }, [selectedOffer, maxQuantity]);

  const selectOffer = (offer: GiftCardOffer) => {
    if (
      loading ||
      offer.stock < 1 ||
      offer.maxOrderQuantity < 1
    ) {
      return;
    }

    setSelectedOffer(offer);
    setQuantity(1);
    setShowNotice(false);
    setCatalogError("");

    setTimeout(() => {
      document
        .getElementById("gift-card-order")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const total = selectedOffer
    ? Math.round(selectedOffer.price * quantity * 100) / 100
    : 0;

  const continueOrder = () => {
    if (!selectedOffer) return;

    if (
      selectedOffer.stock < quantity ||
      quantity < 1 ||
      quantity > selectedOffer.maxOrderQuantity
    ) {
      setCatalogError(
        "La disponibilidad ha cambiado. Actualiza el catálogo."
      );
      return;
    }

    // Solo muestra un aviso informativo.
    // No consulta la sesión, no crea pedidos y no descuenta saldo.
    setShowNotice(true);

    setTimeout(() => {
      document
        .getElementById("gift-card-purchase-disabled")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 100);
  };

  return (
    <main className="roblox-page">
      <header className="roblox-header">
        <button
          type="button"
          className="roblox-back-button"
          onClick={() => router.push("/gift-cards")}
          aria-label="Volver a tarjetas"
        >
          ←
        </button>

        <h1>ROBLOX RU</h1>
        <div className="roblox-header-space" />
      </header>

      <div className="roblox-content">
        <section className="roblox-hero">
          <div className="roblox-banner">
            <img
              src="/images/gift-cards/gift-roblox-ru.jpg"
              alt="Tarjetas de regalo Roblox RU"
            />
          </div>

          <div className="roblox-hero-heading">
            <span className="roblox-kicker">
              <span className="roblox-live-dot" />
              TARJETAS DIGITALES
            </span>

            <h2>ROBLOX (RU)</h2>

            <p>
              Selecciona tu paquete de Robux y consulta los
              precios y las unidades disponibles.
            </p>
          </div>
        </section>

        <section className="roblox-note">
          <div className="roblox-note-icon">!</div>

          <div className="roblox-note-content">
            <strong>INFORMACIÓN DEL PRODUCTO</strong>
            <p>{productNote}</p>

            <div className="roblox-region">
              <span>🌍 REGIÓN RUSIA</span>
              <span>•</span>
              <span>🎁 CÓDIGO DIGITAL</span>
            </div>
          </div>
        </section>

        <section className="roblox-note purchase-disabled-note">
          <div className="roblox-note-icon">🔒</div>

          <div className="roblox-note-content">
            <strong>COMPRAS TEMPORALMENTE DESHABILITADAS</strong>
            <p>
              Puedes consultar las ofertas y sus precios, pero
              todavía no se pueden realizar compras de Roblox RU.
            </p>
          </div>
        </section>

        {catalogError && (
          <section className="roblox-error" role="alert">
            <strong>NO SE PUDO CARGAR EL CATÁLOGO</strong>
            <p>{catalogError}</p>

            <button
              type="button"
              onClick={() => void loadCatalog()}
              disabled={loading}
            >
              ACTUALIZAR CATÁLOGO
            </button>
          </section>
        )}

        <section className="roblox-offers-section">
          <button
            type="button"
            className="roblox-offers-toggle"
            onClick={() => setShowOffers((value) => !value)}
            aria-expanded={showOffers}
          >
            <span className="roblox-toggle-left">
              <span className="roblox-toggle-icon">🎁</span>

              <span>
                <strong>SELECCIONA TU TARJETA</strong>
                <small>
                  {offers.length} ofertas en el catálogo
                </small>
              </span>
            </span>

            <span className="roblox-toggle-arrow">
              {showOffers ? "▲" : "▼"}
            </span>
          </button>

          {showOffers && (
            <>
              <div className="roblox-catalog-toolbar">
                <span>
                  {loading
                    ? "Actualizando ofertas..."
                    : "Precios y disponibilidad de FazerCards"}
                </span>

                <button
                  type="button"
                  onClick={() => void loadCatalog()}
                  disabled={loading}
                >
                  ↻ Actualizar
                </button>
              </div>

              {lastUpdated && !loading && (
                <p className="roblox-updated">
                  Última consulta: {lastUpdated}
                </p>
              )}

              {loading && offers.length === 0 && (
                <div className="roblox-loading">
                  <span className="roblox-spinner" />
                  <p>Cargando precios y cantidades...</p>
                </div>
              )}

              {!loading &&
                !catalogError &&
                offers.length === 0 && (
                  <div className="roblox-loading">
                    No se encontraron ofertas de Roblox RU.
                  </div>
                )}

              <div className="roblox-offers-list">
                {offers.map((offer) => {
                  const unavailable =
                    offer.stock < 1 ||
                    offer.maxOrderQuantity < 1;

                  const selected =
                    selectedOffer?.id === offer.id;

                  return (
                    <button
                      key={offer.id}
                      type="button"
                      className={`roblox-offer ${
                        selected ? "selected" : ""
                      } ${unavailable ? "unavailable" : ""}`}
                      onClick={() => selectOffer(offer)}
                      disabled={unavailable || loading}
                    >
                      <span className="roblox-offer-icon">
                        🪙
                      </span>

                      <span className="roblox-offer-info">
                        <strong>{offer.name.toUpperCase()}</strong>

                        <small
                          className={
                            unavailable
                              ? "availability-empty"
                              : "availability-positive"
                          }
                        >
                          {unavailable
                            ? "Agotado"
                            : `Disponibles: ${offer.stock.toLocaleString()}`}
                        </small>
                      </span>

                      <span className="roblox-offer-right">
                        <strong>{money(offer.price)}</strong>

                        <small>
                          {unavailable
                            ? "AGOTADO"
                            : selected
                              ? "✓ SELECCIONADO"
                              : "ELEGIR ›"}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {selectedOffer && (
          <section
            id="gift-card-order"
            className="roblox-order-section"
          >
            <div className="roblox-section-title">
              <span>01</span>

              <div>
                <h2>PAQUETE SELECCIONADO</h2>
                <p>Revisa los detalles de tu selección.</p>
              </div>
            </div>

            <div className="roblox-order-card">
              <div className="roblox-selected-heading">
                <span className="roblox-selected-icon">🪙</span>

                <div>
                  <span className="roblox-eyebrow">
                    ROBLOX RU
                  </span>

                  <h3>{selectedOffer.name.toUpperCase()}</h3>

                  <span className="roblox-availability">
                    <span />
                    {selectedOffer.stock.toLocaleString()} disponibles
                  </span>
                </div>
              </div>

              <div className="roblox-quantity-box">
                <span>CANTIDAD DE PAQUETES</span>

                <div className="roblox-quantity-control">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.max(1, q - 1))
                    }
                    disabled={quantity <= 1}
                    aria-label="Disminuir cantidad"
                  >
                    −
                  </button>

                  <strong>{quantity}</strong>

                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(maxQuantity, q + 1)
                      )
                    }
                    disabled={quantity >= maxQuantity}
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>

                <small>Máximo por pedido: {maxQuantity}</small>
              </div>

              <div className="roblox-price-breakdown">
                <div className="roblox-detail-row">
                  <span>Precio por paquete</span>

                  <strong className="roblox-price">
                    {money(selectedOffer.price)}
                  </strong>
                </div>

                <div className="roblox-detail-row">
                  <span>Cantidad</span>
                  <strong>× {quantity}</strong>
                </div>

                <div className="roblox-total-row">
                  <span>TOTAL</span>
                  <strong>{money(total)}</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="roblox-primary-button"
              onClick={continueOrder}
              disabled={maxQuantity < 1}
            >
              CONTINUAR →
            </button>
          </section>
        )}

        {showNotice && selectedOffer && (
          <section
            id="gift-card-purchase-disabled"
            className="roblox-confirmation-section"
            role="status"
          >
            <div className="roblox-section-title">
              <span>02</span>

              <div>
                <h2>COMPRAS NO DISPONIBLES</h2>
                <p>Tu selección no se ha comprado.</p>
              </div>
            </div>

            <div className="roblox-note purchase-disabled-note">
              <div className="roblox-note-icon">🔒</div>

              <div className="roblox-note-content">
                <strong>
                  ESTAMOS PREPARANDO ESTE SERVICIO
                </strong>

                <p>
                  Roblox RU está disponible para consultar ofertas,
                  pero la compra todavía no está habilitada. No se
                  ha descontado dinero de tu balance ni se ha enviado
                  una orden al proveedor. Estamos verificando primero
                  el proceso de compra de Roblox Global.
                </p>
              </div>
            </div>

            <div className="roblox-order-card">
              <span className="roblox-eyebrow">
                RESUMEN INFORMATIVO
              </span>

              <div className="roblox-detail-row">
                <span>Producto</span>
                <strong>ROBLOX RU</strong>
              </div>

              <div className="roblox-detail-row">
                <span>Paquete</span>
                <strong>{selectedOffer.name}</strong>
              </div>

              <div className="roblox-detail-row">
                <span>Cantidad</span>
                <strong>{quantity}</strong>
              </div>

              <div className="roblox-total-row">
                <span>TOTAL INFORMATIVO</span>
                <strong>{money(total)}</strong>
              </div>
            </div>

            <button
              type="button"
              className="roblox-secondary-button"
              onClick={() => setShowNotice(false)}
            >
              ← VOLVER A LAS OFERTAS
            </button>
          </section>
        )}
      </div>

      <footer className="roblox-footer">
        <strong>STORE GAMING</strong>
        <span>Tarjetas digitales · Roblox RU</span>
      </footer>

      <RobloxStyles />
    </main>
  );
}

function RobloxStyles() {
  return (
    <style jsx global>{`
      .roblox-page {
        --roblox-red: #d71920;
        --roblox-bright-red: #ff2638;
        --roblox-green: #32d997;
        min-height: 100vh;
        padding-bottom: 30px;
        color: #fff;
        background:
          linear-gradient(rgba(0, 0, 0, 0.76), rgba(0, 0, 0, 0.91)),
          url("/images/battle-royale-bg.jpg") center / cover fixed;
      }

      .roblox-page *,
      .roblox-page *::before,
      .roblox-page *::after {
        box-sizing: border-box;
      }

      .roblox-header {
        position: sticky;
        top: 0;
        z-index: 30;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-height: 58px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.9);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(12px);
      }

      .roblox-header h1 {
        flex: 1;
        margin: 0;
        font-size: 17px;
        font-weight: 900;
        letter-spacing: 0.5px;
        text-align: center;
      }

      .roblox-back-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 11px;
        background: rgba(255, 255, 255, 0.07);
        color: #fff;
        font-size: 23px;
        cursor: pointer;
      }

      .roblox-header-space {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
      }

      .roblox-content {
        width: min(100%, 680px);
        margin: 0 auto;
        padding: 0 12px 24px;
      }

      .roblox-hero {
        margin: 0 -12px 15px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.5);
      }

      .roblox-banner {
        width: 100%;
        overflow: hidden;
        background: #151515;
      }

      .roblox-banner img {
        display: block;
        width: 100%;
        height: 210px;
        object-fit: cover;
        object-position: center;
      }

      .roblox-hero-heading {
        padding: 17px 14px 18px;
        text-align: center;
      }

      .roblox-kicker {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: #b7b7b7;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1px;
      }

      .roblox-live-dot {
        width: 8px;
        height: 8px;
        flex: 0 0 8px;
        border-radius: 50%;
        background: #32d997;
        box-shadow: 0 0 9px rgba(50, 217, 151, 0.5);
      }

      .roblox-hero-heading h2 {
        margin: 9px 0 7px;
        color: #ff2638;
        font-size: clamp(22px, 5vw, 30px);
        font-weight: 900;
        letter-spacing: 0.5px;
        text-shadow: 0 0 18px rgba(255, 25, 45, 0.2);
      }

      .roblox-hero-heading > p {
        max-width: 430px;
        margin: 0 auto;
        color: #c9c9c9;
        font-size: 13px;
        line-height: 1.55;
      }

      .roblox-note {
        position: relative;
        display: flex;
        gap: 12px;
        margin-top: 14px;
        padding: 15px;
        overflow: hidden;
        border: 1px solid rgba(255, 38, 56, 0.32);
        border-radius: 14px;
        background: linear-gradient(
          120deg,
          rgba(255, 32, 45, 0.11),
          rgba(12, 12, 16, 0.95) 65%
        );
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.16);
      }

      .roblox-note::before {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 3px;
        background: linear-gradient(#ff4655, #b90018);
      }

      .roblox-note-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 31px;
        height: 31px;
        flex: 0 0 31px;
        border-radius: 9px;
        background: #d71920;
        color: #fff;
        font-size: 18px;
        font-weight: 900;
      }

      .roblox-note-content {
        min-width: 0;
      }

      .roblox-note-content > strong {
        display: block;
        color: #ff4655;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.7px;
      }

      .roblox-note-content p {
        margin: 7px 0 0;
        color: #d5d5d5;
        font-size: 12px;
        line-height: 1.65;
      }

      .roblox-region {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 7px;
        margin-top: 12px;
        color: #ff6976;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.3px;
      }

      .purchase-disabled-note {
        border-color: rgba(255, 193, 7, 0.35);
        background: linear-gradient(
          120deg,
          rgba(255, 193, 7, 0.09),
          rgba(12, 12, 16, 0.95) 65%
        );
      }

      .purchase-disabled-note::before {
        background: linear-gradient(#ffd45b, #a86d00);
      }

      .purchase-disabled-note .roblox-note-icon {
        background: #8b6100;
      }

      .purchase-disabled-note .roblox-note-content > strong {
        color: #ffd45b;
      }

      .roblox-offers-section {
        margin-top: 15px;
      }

      .roblox-offers-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        padding: 13px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 13px;
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        text-align: left;
        cursor: pointer;
      }

      .roblox-toggle-left {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
      }

      .roblox-toggle-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 39px;
        height: 39px;
        flex: 0 0 39px;
        border-radius: 10px;
        background: rgba(255, 38, 56, 0.12);
        font-size: 20px;
      }

      .roblox-toggle-left strong,
      .roblox-toggle-left small {
        display: block;
      }

      .roblox-toggle-left strong {
        font-size: 12px;
        font-weight: 900;
      }

      .roblox-toggle-left small {
        margin-top: 4px;
        color: #999;
        font-size: 10px;
      }

      .roblox-toggle-arrow {
        color: #ff4655;
        font-size: 12px;
      }

      .roblox-catalog-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 9px;
        margin: 12px 0 4px;
        color: #aaa;
        font-size: 11px;
      }

      .roblox-catalog-toolbar button,
      .roblox-error button {
        padding: 8px 11px;
        border: 1px solid rgba(255, 38, 56, 0.48);
        border-radius: 9px;
        background: rgba(255, 38, 56, 0.08);
        color: #ff4655;
        font-size: 11px;
        font-weight: 900;
        cursor: pointer;
      }

      .roblox-catalog-toolbar button:disabled,
      .roblox-error button:disabled {
        opacity: 0.5;
        cursor: wait;
      }

      .roblox-updated {
        margin: 4px 0 11px;
        color: #777;
        font-size: 10px;
      }

      .roblox-offers-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 10px;
      }

      .roblox-offer {
        display: flex;
        align-items: center;
        gap: 11px;
        width: 100%;
        min-height: 70px;
        padding: 11px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 13px;
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        text-align: left;
        cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease;
      }

      .roblox-offer.selected {
        border-color: rgba(255, 38, 56, 0.9);
        background: rgba(105, 0, 12, 0.32);
        box-shadow: 0 0 0 1px rgba(255, 38, 56, 0.13);
      }

      .roblox-offer.unavailable {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .roblox-offer-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 11px;
        background: rgba(255, 255, 255, 0.07);
        font-size: 21px;
      }

      .roblox-offer-info {
        flex: 1;
        min-width: 0;
      }

      .roblox-offer-info > strong {
        display: block;
        font-size: 13px;
        font-weight: 900;
      }

      .roblox-offer-info small {
        display: block;
        margin-top: 5px;
        font-size: 10px;
      }

      .roblox-page .availability-positive {
        color: #32d997 !important;
        font-weight: 800;
      }

      .roblox-page .availability-empty {
        color: #ff4655 !important;
        font-weight: 800;
      }

      .roblox-offer-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 5px;
        flex-shrink: 0;
        text-align: right;
      }

      .roblox-offer-right > strong {
        color: #ff2638;
        font-size: 13px;
        font-weight: 900;
        white-space: nowrap;
      }

      .roblox-offer-right > small {
        color: #aaa;
        font-size: 9px;
        font-weight: 800;
      }

      .roblox-order-section,
      .roblox-confirmation-section {
        margin-top: 22px;
        scroll-margin-top: 75px;
      }

      .roblox-section-title {
        display: flex;
        align-items: center;
        gap: 11px;
        margin-bottom: 12px;
      }

      .roblox-section-title > span {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 37px;
        height: 37px;
        flex: 0 0 37px;
        border: 1px solid rgba(255, 38, 56, 0.4);
        border-radius: 10px;
        background: rgba(255, 38, 56, 0.1);
        color: #ff4655;
        font-size: 13px;
        font-weight: 900;
      }

      .roblox-section-title h2 {
        margin: 0;
        font-size: 13px;
        font-weight: 900;
      }

      .roblox-section-title p {
        margin: 4px 0 0;
        color: #999;
        font-size: 11px;
      }

      .roblox-order-card {
        margin-top: 12px;
        padding: 16px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 15px;
        background: rgba(0, 0, 0, 0.83);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      }

      .roblox-selected-heading {
        display: flex;
        align-items: center;
        gap: 12px;
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .roblox-selected-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        flex: 0 0 48px;
        border-radius: 12px;
        background: rgba(255, 38, 56, 0.1);
        font-size: 25px;
      }

      .roblox-eyebrow {
        display: block;
        color: #999;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.7px;
      }

      .roblox-selected-heading h3,
      .roblox-order-card > h3 {
        margin: 5px 0;
        color: #fff;
        font-size: 18px;
        font-weight: 900;
      }

      .roblox-availability {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 3px;
        color: #32d997;
        font-size: 10px;
        font-weight: 800;
      }

      .roblox-availability > span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #32d997;
      }

      .roblox-quantity-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 16px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .roblox-quantity-box > span {
        color: #b8b8b8;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.5px;
      }

      .roblox-quantity-control {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
      }

      .roblox-quantity-control button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border: 1px solid rgba(255, 38, 56, 0.45);
        border-radius: 10px;
        background: rgba(255, 38, 56, 0.1);
        color: #ff4655;
        font-size: 23px;
        cursor: pointer;
      }

      .roblox-quantity-control button:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }

      .roblox-quantity-control > strong {
        min-width: 25px;
        color: #fff;
        font-size: 19px;
        text-align: center;
      }

      .roblox-quantity-box > small {
        color: #777;
        font-size: 10px;
      }

      .roblox-price-breakdown {
        padding-top: 12px;
      }

      .roblox-detail-row,
      .roblox-total-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 9px 0;
      }

      .roblox-detail-row > span,
      .roblox-total-row > span {
        color: #aaa;
        font-size: 12px;
      }

      .roblox-detail-row > strong {
        color: #eee;
        font-size: 12px;
        text-align: right;
        overflow-wrap: anywhere;
      }

      .roblox-page .roblox-price,
      .roblox-page .roblox-total-row > strong {
        color: #ff2638 !important;
        font-weight: 900;
      }

      .roblox-total-row {
        margin-top: 7px;
        padding-top: 14px;
        border-top: 1px solid rgba(255, 38, 56, 0.28);
      }

      .roblox-total-row > span {
        color: #fff;
        font-size: 13px;
        font-weight: 900;
      }

      .roblox-total-row > strong {
        font-size: 19px;
        text-align: right;
      }

      .roblox-primary-button,
      .roblox-secondary-button {
        display: block;
        width: 100%;
        margin-top: 12px;
        padding: 14px;
        border: 0;
        border-radius: 11px;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.5px;
        cursor: pointer;
      }

      .roblox-primary-button {
        background: #d71920;
        color: #fff;
        box-shadow: 0 5px 17px rgba(215, 25, 32, 0.18);
      }

      .roblox-primary-button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .roblox-secondary-button {
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.07);
        color: #eee;
      }

      .roblox-loading {
        padding: 25px 12px;
        color: #aaa;
        font-size: 12px;
        text-align: center;
      }

      .roblox-spinner {
        display: inline-block;
        width: 25px;
        height: 25px;
        border: 3px solid rgba(255, 38, 56, 0.18);
        border-top-color: #ff2638;
        border-radius: 50%;
        animation: roblox-spin 0.8s linear infinite;
      }

      .roblox-loading p {
        margin: 9px 0 0;
      }

      .roblox-error {
        margin-top: 13px;
        padding: 14px;
        border: 1px solid rgba(255, 38, 56, 0.4);
        border-radius: 13px;
        background: rgba(100, 0, 10, 0.2);
      }

      .roblox-error > strong {
        color: #ff4655;
        font-size: 12px;
      }

      .roblox-error p {
        color: #ddd;
        font-size: 12px;
        line-height: 1.5;
      }

      .roblox-error button {
        width: 100%;
        padding: 11px;
      }

      .roblox-footer {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        padding: 26px 12px 5px;
        color: #888;
        font-size: 11px;
        text-align: center;
      }

      .roblox-footer strong {
        color: #ccc;
        font-size: 12px;
        letter-spacing: 1px;
      }

      .roblox-footer span {
        font-size: 10px;
      }

      @keyframes roblox-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 480px) {
        .roblox-banner img {
          height: 185px;
        }

        .roblox-header h1 {
          font-size: 15px;
        }

        .roblox-offer {
          gap: 8px;
          padding: 10px;
        }

        .roblox-offer-icon {
          width: 36px;
          height: 36px;
          flex-basis: 36px;
          font-size: 19px;
        }

        .roblox-offer-info > strong {
          font-size: 12px;
        }

        .roblox-offer-right > strong {
          font-size: 12px;
        }

        .roblox-offer-right > small {
          font-size: 8px;
        }

        .roblox-note {
          padding: 13px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .roblox-spinner {
          animation: none;
        }

        .roblox-offer {
          transition: none;
        }
      }
    `}</style>
  );
}
