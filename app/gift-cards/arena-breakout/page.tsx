
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: number;
  cp: number;
  price: number;
};

const offers: GiftCardOffer[] = [
  { id: 1, cp: 60, price: 1.00 },
  { id: 2, cp: 310, price: 4.38 },
  { id: 3, cp: 630, price: 8.60 },
  { id: 4, cp: 1580, price: 21.27 },
  { id: 5, cp: 3200, price: 42.38 },
  { id: 6, cp: 6500, price: 84.62 },
];

const productNote =
  "Región: Global Arena. Tarjetas de regalo Breakout para Midasbuy.com. Los códigos se pueden guardar de forma segura y canjear posteriormente.";

export default function ArenaBreakoutGiftCardPage() {
  const router = useRouter();

  const [selectedOffer, setSelectedOffer] =
    useState<GiftCardOffer | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [showConfirmation, setShowConfirmation] =
    useState(false);
  const [orderCreated, setOrderCreated] =
    useState(false);
  const [orderNumber, setOrderNumber] =
    useState("");

  const selectOffer = (offer: GiftCardOffer) => {
    setSelectedOffer(offer);
    setQuantity(1);
    setShowConfirmation(false);

    setTimeout(() => {
      document
        .getElementById("gift-card-order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 100);
  };

  const increaseQuantity = () => {
    setQuantity((current) => current + 1);
  };

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const total = selectedOffer
    ? selectedOffer.price * quantity
    : 0;

  const createOrder = () => {
    if (!selectedOffer) return;

    const newOrderNumber = `GC-${Date.now()
      .toString()
      .slice(-8)}`;

    const newOrder = {
      id: Date.now(),
      orderNumber: newOrderNumber,
      type: "GIFT CARD",
      game: "ARENA BREAKOUT",
      product: `${selectedOffer.cp} CP`,
      amount: selectedOffer.cp,
      currency: "USD",
      price: selectedOffer.price,
      quantity,
      total,
      status: "PENDIENTE",
      date: new Date().toISOString(),
    };

    try {
      const existingOrders = JSON.parse(
        localStorage.getItem("storeGamingOrders") || "[]"
      );

      existingOrders.unshift(newOrder);

      localStorage.setItem(
        "storeGamingOrders",
        JSON.stringify(existingOrders)
      );

      localStorage.setItem(
        "storeGamingLastOrder",
        JSON.stringify(newOrder)
      );
    } catch (error) {
      console.error("Error guardando el pedido:", error);
    }

    setOrderNumber(newOrderNumber);
    setShowConfirmation(false);
    setOrderCreated(true);

    setTimeout(() => {
      document
        .getElementById("order-success-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 100);
  };

  return (
    <main className="game-service-page">
      <header className="game-service-header">
        <button
          className="game-back-button"
          type="button"
          onClick={() => router.push("/gift-cards")}
          aria-label="Volver"
        >
          ←
        </button>

        <h1 className="game-header-title">
          ARENA BREAKOUT
        </h1>

        <button
          className="game-cart-button"
          type="button"
          onClick={() => router.push("/cart")}
          aria-label="Carrito"
        >
          🛒
        </button>
      </header>

      <section className="game-service-content">
        <img
          src="/images/gift-cards/gift-arena-breakout.jpg"
          alt="Arena Breakout"
          className="free-fire-main-image"
        />

        <section className="offers-section">
          <h2 className="offers-title">
            TARJETAS DISPONIBLES
          </h2>

          <div className="offers-list">
            {offers.map((offer) => (
              <button
                key={offer.id}
                type="button"
                className="offer-card"
                onClick={() => selectOffer(offer)}
              >
                <div className="offer-info">
                  <span className="diamond-icon">🎮</span>
                  <span>{offer.cp} CP</span>
                </div>

                <div className="offer-right">
                  <strong>
                    ${offer.price.toFixed(2)}
                  </strong>
                  <span>→</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="game-note">
          <div className="game-note-icon">ℹ️</div>

          <div className="game-note-content">
            <strong>INFORMACIÓN</strong>
            <p>{productNote}</p>

            <div className="game-note-order">
              <span>✓</span>
              <span>
                El código se entrega después de confirmar el
                pedido.
              </span>
            </div>
          </div>
        </section>

        {selectedOffer && !orderCreated && (
          <section
            id="gift-card-order-section"
            className="order-section"
          >
            <div className="selected-order-card">
              <div className="selected-order-header">
                <span>PRODUCTO SELECCIONADO</span>
              </div>

              <div className="selected-order-product">
                <div>
                  <strong>Arena Breakout</strong>
                  <span>{selectedOffer.cp} CP</span>
                </div>

                <strong>
                  ${selectedOffer.price.toFixed(2)}
                </strong>
              </div>

              <div className="quantity-control">
                <span>CANTIDAD</span>

                <div className="quantity-buttons">
                  <button
                    type="button"
                    onClick={decreaseQuantity}
                  >
                    −
                  </button>

                  <strong>{quantity}</strong>

                  <button
                    type="button"
                    onClick={increaseQuantity}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="order-total">
                <span>TOTAL</span>
                <strong>${total.toFixed(2)}</strong>
              </div>

              <button
                className="finish-order-button"
                type="button"
                onClick={() => setShowConfirmation(true)}
              >
                CONTINUAR CON EL PEDIDO
              </button>
            </div>
          </section>
        )}

        {showConfirmation && selectedOffer && (
          <section className="confirmation-section">
            <div className="confirmation-card">
              <h2>CONFIRMAR PEDIDO</h2>

              <p>
                Revisa los datos antes de crear tu pedido.
              </p>

              <div className="confirmation-row">
                <span>Producto</span>
                <strong>Arena Breakout</strong>
              </div>

              <div className="confirmation-row">
                <span>CP</span>
                <strong>{selectedOffer.cp}</strong>
              </div>

              <div className="confirmation-row">
                <span>Cantidad</span>
                <strong>{quantity}</strong>
              </div>

              <div className="confirmation-row">
                <span>Total</span>
                <strong>${total.toFixed(2)}</strong>
              </div>

              <button
                className="confirm-final-button"
                type="button"
                onClick={createOrder}
              >
                CONFIRMAR PEDIDO
              </button>
            </div>
          </section>
        )}

        {orderCreated && (
          <section
            id="order-success-section"
            className="order-success-section"
          >
            <div className="success-icon">✓</div>

            <h2>PEDIDO CREADO</h2>

            <div className="success-order-number">
              {orderNumber}
            </div>

            <div className="success-order-details">
              <p>
                Tu pedido de Arena Breakout ha sido creado.
              </p>

              <p>
                Guarda el número de pedido para consultar su
                estado.
              </p>
            </div>

            <button
              className="finish-order-button"
              type="button"
              onClick={() => router.push("/orders")}
            >
              VER MIS PEDIDOS
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={() => router.push("/gift-cards")}
            >
              VOLVER A TARJETAS DE REGALO
            </button>
          </section>
        )}
      </section>

      <footer className="game-service-footer gift-card-footer">
        <p>STORE GAMING</p>
        <span>Tarjetas de regalo Arena Breakout</span>
      </footer>
    </main>
  );
}
