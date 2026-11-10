
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: string;
  amount: number;
  price: number;
};

const offers: GiftCardOffer[] = [
  { id: "google-play-ae-30", amount: 30, price: 8.18 },
  { id: "google-play-ae-50", amount: 50, price: 13.53 },
  { id: "google-play-ae-100", amount: 100, price: 26.9 },
  { id: "google-play-ae-300", amount: 300, price: 80.42 },
  { id: "google-play-ae-500", amount: 500, price: 133.93 },
];

const note =
  "Región: AE. Tarjetas de regalo de Google Play. Los códigos se pueden guardar de forma segura y canjear posteriormente.";

export default function GooglePlayAEGiftCardPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(true);
  const [selectedOffer, setSelectedOffer] =
    useState<GiftCardOffer | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showConfirmation, setShowConfirmation] =
    useState(false);
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
          block: "start",
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
        .getElementById("confirmation-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const createOrder = () => {
    if (!selectedOffer) return;

    const generatedOrderNumber = `GC-${Date.now()
      .toString()
      .slice(-8)}`;

    const newOrder = {
      id: generatedOrderNumber,
      orderNumber: generatedOrderNumber,
      type: "GIFT CARD",
      game: "GOOGLE PLAY (AE)",
      product: `${selectedOffer.amount} AED`,
      amount: selectedOffer.amount,
      currency: "AED",
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

      const updatedOrders = [newOrder, ...existingOrders];

      localStorage.setItem(
        "storeGamingOrders",
        JSON.stringify(updatedOrders)
      );

      localStorage.setItem(
        "storeGamingLastOrder",
        JSON.stringify(newOrder)
      );
    } catch (error) {
      console.error("Error guardando el pedido:", error);
    }

    setOrderNumber(generatedOrderNumber);
    setShowConfirmation(false);
    setOrderCreated(true);

    setTimeout(() => {
      document
        .getElementById("order-success-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  return (
    <main className="game-service-page">
      <header className="game-service-header">
        <button
          type="button"
          className="game-back-button"
          onClick={() => router.push("/gift-cards")}
        >
          ←
        </button>

        <h1 className="game-header-title">
          GOOGLE PLAY (AE)
        </h1>

        <button
          type="button"
          className="game-cart-button"
          onClick={() => router.push("/cart")}
          aria-label="Carrito"
        >
          🛒
        </button>
      </header>

      <section className="game-service-content">
        <div className="free-fire-main-image">
          <img
            src="/images/gift-cards/gift-google-play-ae.jpg"
            alt="Google Play AE"
          />
        </div>

        <button
          type="button"
          className="offers-toggle"
          onClick={() => setShowOffers((current) => !current)}
        >
          <span>🎁</span>
          <span>
            {showOffers ? "OCULTAR OFERTAS" : "VER OFERTAS"}
          </span>
          <span>{showOffers ? "▲" : "▼"}</span>
        </button>

        {showOffers && (
          <section className="offers-section">
            <div className="offers-list">
              {offers.map((offer) => (
                <button
                  type="button"
                  key={offer.id}
                  className={`offer-card ${
                    selectedOffer?.id === offer.id ? "selected" : ""
                  }`}
                  onClick={() => selectOffer(offer)}
                >
                  <div className="offer-info">
                    <span className="diamond-icon">🎁</span>
                    <div>
                      <strong>{offer.amount} AED</strong>
                    </div>
                  </div>

                  <div className="offer-right">
                    <strong>${offer.price.toFixed(2)}</strong>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="game-note">
          <div className="game-note-icon">!</div>
          <div className="game-note-content">{note}</div>
        </div>

        {selectedOffer && !orderCreated && (
          <section
            id="gift-card-order-section"
            className="order-section"
          >
            <div className="game-note game-note-order">
              <div className="game-note-icon">!</div>
              <div className="game-note-content">{note}</div>
            </div>

            <div className="selected-order-card">
              <div className="selected-order-header">
                <h2>TARJETA SELECCIONADA</h2>
              </div>

              <div className="selected-order-product">
                <div className="offer-info">
                  <span className="diamond-icon">🎁</span>
                  <div>
                    <strong>{selectedOffer.amount} AED</strong>
                    <span>Google Play (AE)</span>
                  </div>
                </div>

                <div className="offer-right">
                  <strong>${selectedOffer.price.toFixed(2)}</strong>
                </div>
              </div>

              <div className="quantity-control">
                <span>CANTIDAD</span>

                <div className="quantity-buttons">
                  <button
                    type="button"
                    onClick={decreaseQuantity}
                    aria-label="Disminuir cantidad"
                  >
                    −
                  </button>

                  <strong>{quantity}</strong>

                  <button
                    type="button"
                    onClick={increaseQuantity}
                    aria-label="Aumentar cantidad"
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
                type="button"
                className="finish-order-button"
                onClick={finishOrder}
              >
                CONTINUAR CON EL PEDIDO
              </button>
            </div>
          </section>
        )}

        {showConfirmation && selectedOffer && !orderCreated && (
          <section
            id="confirmation-section"
            className="confirmation-section"
          >
            <div className="confirmation-card">
              <h2>CONFIRMAR PEDIDO</h2>

              <div className="confirmation-row">
                <span>Producto</span>
                <strong>{selectedOffer.amount} AED</strong>
              </div>

              <div className="confirmation-row">
                <span>Precio unitario</span>
                <strong>${selectedOffer.price.toFixed(2)}</strong>
              </div>

              <div className="confirmation-row">
                <span>Cantidad</span>
                <strong>{quantity}</strong>
              </div>

              <div className="confirmation-row">
                <span>Total</span>
                <strong>${total.toFixed(2)}</strong>
              </div>

              <div className="confirmation-row">
                <span>Región</span>
                <strong>AE</strong>
              </div>

              <button
                type="button"
                className="confirm-final-button"
                onClick={createOrder}
              >
                CONFIRMAR PEDIDO
              </button>

              <button
                type="button"
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
            <h2>¡PEDIDO CREADO!</h2>

            <div className="success-order-number">
              {orderNumber}
            </div>

            <div className="success-order-details">
              <p>
                <strong>Producto:</strong> Google Play (AE)
              </p>
              <p>
                <strong>Tarjeta:</strong> {selectedOffer?.amount} AED
              </p>
              <p>
                <strong>Cantidad:</strong> {quantity}
              </p>
              <p>
                <strong>Total:</strong> ${total.toFixed(2)}
              </p>
              <p>
                <strong>Estado:</strong> PENDIENTE
              </p>
            </div>

            <button
              type="button"
              className="finish-order-button"
              onClick={() => router.push("/orders")}
            >
              VER MIS PEDIDOS
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => router.push("/gift-cards")}
            >
              VOLVER A TARJETAS DE REGALO
            </button>
          </section>
        )}
      </section>

      <footer className="game-service-footer">
        <p>🛒 STORE GAMING 🎮</p>
        <span>Tarjetas de regalo Google Play AE</span>
      </footer>
    </main>
  );
}
