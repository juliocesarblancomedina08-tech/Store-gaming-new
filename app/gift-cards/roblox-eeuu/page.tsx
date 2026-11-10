
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: number;
  amount: number;
  price: number;
};

const offers: GiftCardOffer[] = [
  { id: 1, amount: 3, price: 3.18 },
  { id: 2, amount: 4, price: 4.19 },
  { id: 3, amount: 5, price: 5.19 },
  { id: 4, amount: 10, price: 10.29 },
  { id: 5, amount: 15, price: 15.39 },
  { id: 6, amount: 20, price: 20.49 },
  { id: 7, amount: 25, price: 25.59 },
  { id: 8, amount: 30, price: 30.69 },
  { id: 9, amount: 50, price: 50.99 },
  { id: 10, amount: 75, price: 76.49 },
  { id: 11, amount: 100, price: 101.99 },
  { id: 12, amount: 200, price: 203.99 },
];

const note =
  "Región: Estados Unidos. Tarjetas de regalo Roblox. Comprueba que tu cuenta y región sean compatibles antes de canjear el código.";

export default function RobloxUSAGiftCardPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(true);
  const [selectedOffer, setSelectedOffer] =
    useState<GiftCardOffer | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const selectOffer = (offer: GiftCardOffer) => {
    setSelectedOffer(offer);
    setQuantity(1);
    setShowConfirmation(false);
    setOrderCreated(false);

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

  const finishOrder = () => {
    if (!selectedOffer) return;
    setShowConfirmation(true);

    setTimeout(() => {
      document
        .getElementById("gift-card-confirmation-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 100);
  };

  const createOrder = () => {
    if (!selectedOffer) return;

    const newOrderNumber = `GC-${Date.now()
      .toString()
      .slice(-8)}`;

    const newOrder = {
      id: Date.now(),
      orderNumber: newOrderNumber,
      type: "GIFT CARD",
      game: "ROBLOX (EE.UU)",
      product: `ROBLOX ${selectedOffer.amount} USD`,
      amount: selectedOffer.amount,
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
          onClick={() => router.push("/gift-cards")}
          aria-label="Volver"
        >
          ←
        </button>

        <h1 className="game-header-title">
          ROBLOX (EE.UU)
        </h1>

        <button
          className="game-cart-button"
          onClick={() => router.push("/cart")}
          aria-label="Carrito"
        >
          🛒
        </button>
      </header>

      <section className="game-service-content">
        <img
          src="/images/gift-cards/gift-roblox-eeuu.jpg"
          alt="Tarjeta de regalo Roblox Estados Unidos"
          className="free-fire-main-image"
        />

        <button
          className="offers-toggle"
          onClick={() => setShowOffers((current) => !current)}
        >
          <span>VER TARJETAS DISPONIBLES</span>
          <span>{showOffers ? "▲" : "▼"}</span>
        </button>

        {showOffers && (
          <section className="offers-section">
            <div className="offers-list">
              {offers.map((offer) => (
                <button
                  key={offer.id}
                  className="offer-card"
                  onClick={() => selectOffer(offer)}
                >
                  <div className="offer-info">
                    <span className="diamond-icon">🎮</span>
                    <span>{offer.amount} USD</span>
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
        )}

        <section className="game-note">
          <div className="game-note-icon">ℹ️</div>

          <div className="game-note-content">
            <strong>INFORMACIÓN</strong>
            <p>{note}</p>

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
                  <strong>Roblox</strong>
                  <span>ROBLOX (EE.UU)</span>
                </div>

                <strong>{selectedOffer.amount} USD</strong>
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
                onClick={finishOrder}
              >
                CONTINUAR CON EL PEDIDO
              </button>
            </div>
          </section>
        )}

        {showConfirmation && selectedOffer && (
          <section
            id="gift-card-confirmation-section"
            className="confirmation-section"
          >
            <div className="confirmation-card">
              <h2>CONFIRMAR PEDIDO</h2>

              <p>
                Revisa los datos antes de crear tu pedido.
              </p>

              <div className="confirmation-row">
                <span>Producto</span>
                <strong>Roblox (EE.UU)</strong>
              </div>

              <div className="confirmation-row">
                <span>Valor</span>
                <strong>{selectedOffer.amount} USD</strong>
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
                onClick={createOrder}
              >
                CONFIRMAR Y CREAR PEDIDO
              </button>

              <button
                className="secondary-button"
                onClick={() => setShowConfirmation(false)}
              >
                VOLVER
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
                Tu pedido de Roblox ha sido creado.
              </p>

              <p>
                Guarda el número de pedido para consultar su
                estado.
              </p>
            </div>

            <button
              className="finish-order-button"
              onClick={() => router.push("/orders")}
            >
              VER MIS PEDIDOS
            </button>

            <button
              className="secondary-button"
              onClick={() => router.push("/gift-cards")}
            >
              VOLVER A TARJETAS DE REGALO
            </button>
          </section>
        )}
      </section>

      <footer className="game-service-footer gift-card-footer">
        <p>STORE GAMING</p>
        <span>
          Tarjetas de regalo Roblox (EE.UU)
        </span>
      </footer>
    </main>
  );
}
