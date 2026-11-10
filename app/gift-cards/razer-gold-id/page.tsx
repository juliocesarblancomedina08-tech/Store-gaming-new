
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: number;
  amount: string;
  price: number;
};

const offers: GiftCardOffer[] = [
  { id: 1, amount: "10.000 IDR", price: 0.69 },
  { id: 2, amount: "20.000 IDR", price: 1.25 },
  { id: 3, amount: "50.000 IDR", price: 2.89 },
  { id: 4, amount: "100.000 IDR", price: 5.64 },
  { id: 5, amount: "200.000 IDR", price: 11.12 },
  { id: 6, amount: "500.000 IDR", price: 27.58 },
  { id: 7, amount: "1.000.000 IDR", price: 56.47 },
];

const note =
  "Región: Tarjetas de regalo Razer Gold. Los códigos se pueden guardar de forma segura y canjear posteriormente.";

export default function RazerGoldID() {
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
      game: "RAZER GOLD (ID)",
      product: "Razer Gold",
      amount: selectedOffer.amount,
      currency: "IDR",
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
          RAZER GOLD (ID)
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
          src="/images/gift-cards/gift-razer-gold-id.jpg"
          alt="Razer Gold ID"
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
                    <span className="diamond-icon">💳</span>
                    <span>{offer.amount}</span>
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
                El código se entrega después de confirmar
                el pedido.
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
                  <strong>Razer Gold</strong>
                  <span>RAZER GOLD (ID)</span>
                </div>

                <strong>
                  {selectedOffer.amount}
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
                <strong>Razer Gold (ID)</strong>
              </div>

              <div className="confirmation-row">
                <span>Valor</span>
                <strong>{selectedOffer.amount}</strong>
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
                Tu pedido de Razer Gold ha sido creado
                correctamente.
              </p>

              <p>
                Guarda tu número de pedido para consultar
                su estado.
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

      <footer className="game-service-footer">
        <p>STORE GAMING</p>
        <span>Razer Gold • ID</span>
      </footer>
    </main>
  );
}
