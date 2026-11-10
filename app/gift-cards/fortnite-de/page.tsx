
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: string;
  amount: number;
  price: number;
  stock?: number;
};

const offers: GiftCardOffer[] = [
  { id: "10-eur", amount: 10, price: 11.52, stock: 100 },
  { id: "15-eur", amount: 15, price: 17.2 },
  { id: "20-eur", amount: 20, price: 22.89 },
  { id: "25-eur", amount: 25, price: 28.57 },
  { id: "30-eur", amount: 30, price: 34.25 },
  { id: "40-eur", amount: 40, price: 45.62 },
  { id: "50-eur", amount: 50, price: 56.99 },
  { id: "75-eur", amount: 75, price: 85.41 },
  { id: "100-eur", amount: 100, price: 113.83 },
  { id: "125-eur", amount: 125, price: 142.24 },
  { id: "150-eur", amount: 150, price: 170.66 },
];

const note =
  "Región: DE. Tarjetas de regalo de Fortnite (códigos de V-Bucks). Los códigos se pueden guardar de forma segura y canjear posteriormente.";

export default function FortniteDEGiftCardPage() {
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
    if (
      selectedOffer?.stock &&
      quantity >= selectedOffer.stock
    ) {
      return;
    }

    setQuantity((current) => current + 1);
  };

  const decreaseQuantity = () => {
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
  };

  const total = selectedOffer
    ? Number(
        (selectedOffer.price * quantity).toFixed(2)
      )
    : 0;

  const createOrder = () => {
    if (!selectedOffer) return;

    const newOrderNumber = `GC-${Date.now()
      .toString()
      .slice(-8)}`;

    const newOrder = {
      id: newOrderNumber,
      orderNumber: newOrderNumber,
      type: "GIFT CARD",
      game: "FORTNITE (DE)",
      product: `${selectedOffer.amount} EUR`,
      amount: selectedOffer.amount,
      currency: "EUR",
      quantity,
      unitPrice: selectedOffer.price,
      total,
      status: "PENDIENTE",
      date: new Date().toISOString(),
    };

    try {
      const existingOrders = JSON.parse(
        localStorage.getItem("storeGamingOrders") || "[]"
      );

      localStorage.setItem(
        "storeGamingOrders",
        JSON.stringify([...existingOrders, newOrder])
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
        .getElementById("gift-card-success-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const goToCart = () => {
    router.push("/cart");
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

        <div className="game-header-title">
          <span>🎁</span>
          <div>
            <strong>FORTNITE</strong>
            <small>DE</small>
          </div>
        </div>

        <button
          type="button"
          className="game-cart-button"
          onClick={goToCart}
          aria-label="Ver carrito"
        >
          🛒
        </button>
      </header>

      <section className="game-service-content">
        <div className="free-fire-main-image">
          <img
            src="/images/gift-cards/gift-fortnite-de.jpg"
            alt="Fortnite DE"
          />
        </div>

        <div className="offers-toggle">
          <button
            type="button"
            onClick={() =>
              setShowOffers((current) => !current)
            }
          >
            <span>🎁</span>
            <span>TARJETAS DISPONIBLES</span>
            <span>{showOffers ? "⌃" : "⌄"}</span>
          </button>
        </div>

        {showOffers && (
          <section className="offers-section">
            <div className="offers-list">
              {offers.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  className={`offer-card ${
                    selectedOffer?.id === offer.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => selectOffer(offer)}
                >
                  <div className="offer-info">
                    <div className="diamond-icon">🎁</div>
                    <div>
                      <strong>{offer.amount} EUR</strong>
                      <span>FORTNITE V-BUCKS</span>
                      {offer.stock && (
                        <small>
                          {offer.stock} unidades en stock
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="offer-right">
                    <strong>${offer.price.toFixed(2)}</strong>
                    <span>USD</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="game-note">
              <div className="game-note-icon">!</div>
              <div className="game-note-content">
                <p>{note}</p>
              </div>
            </div>
          </section>
        )}

        {selectedOffer && !orderCreated && (
          <section
            id="gift-card-order-section"
            className="order-section"
          >
            <div className="game-note game-note-order">
              <div className="game-note-icon">!</div>
              <div className="game-note-content">
                <p>{note}</p>
              </div>
            </div>

            <div className="selected-order-card">
              <div className="selected-order-header">
                <span>PRODUCTO SELECCIONADO</span>
              </div>

              <div className="selected-order-product">
                <div>
                  <strong>{selectedOffer.amount} EUR</strong>
                  <span>FORTNITE (DE)</span>
                </div>
                <strong>${selectedOffer.price.toFixed(2)}</strong>
              </div>

              <div className="quantity-control">
                <span>CANTIDAD</span>

                <div className="quantity-buttons">
                  <button
                    type="button"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                  >
                    −
                  </button>

                  <strong>{quantity}</strong>

                  <button
                    type="button"
                    onClick={increaseQuantity}
                    disabled={
                      !!selectedOffer.stock &&
                      quantity >= selectedOffer.stock
                    }
                  >
                    +
                  </button>
                </div>

                {selectedOffer.stock && (
                  <small>
                    Máximo disponible: {selectedOffer.stock}
                  </small>
                )}
              </div>

              <div className="order-total">
                <span>TOTAL</span>
                <strong>${total.toFixed(2)}</strong>
              </div>

              {!showConfirmation ? (
                <button
                  type="button"
                  className="finish-order-button"
                  onClick={() => setShowConfirmation(true)}
                >
                  CONTINUAR
                </button>
              ) : (
                <section className="confirmation-section">
                  <div className="confirmation-card">
                    <h3>¿CONFIRMAR PEDIDO?</h3>

                    <div className="confirmation-row">
                      <span>Producto</span>
                      <strong>{selectedOffer.amount} EUR</strong>
                    </div>

                    <div className="confirmation-row">
                      <span>Cantidad</span>
                      <strong>{quantity}</strong>
                    </div>

                    <div className="confirmation-row">
                      <span>Total</span>
                      <strong>${total.toFixed(2)}</strong>
                    </div>

                    <p>
                      Al confirmar, tu pedido será creado y
                      quedará disponible en la sección de pedidos.
                    </p>

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
            </div>
          </section>
        )}

        {orderCreated && (
          <section
            id="gift-card-success-section"
            className="order-success-section"
          >
            <div className="success-icon">✓</div>

            <h2>¡PEDIDO CREADO!</h2>

            <p>
              Tu pedido de tarjeta de regalo de Fortnite fue
              creado correctamente.
            </p>

            <div className="success-order-number">
              <span>NÚMERO DE PEDIDO</span>
              <strong>{orderNumber}</strong>
            </div>

            <div className="success-order-details">
              <div>
                <span>PRODUCTO</span>
                <strong>{selectedOffer?.amount} EUR</strong>
              </div>

              <div>
                <span>CANTIDAD</span>
                <strong>{quantity}</strong>
              </div>

              <div>
                <span>TOTAL</span>
                <strong>${total.toFixed(2)}</strong>
              </div>
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
        <span>STORE GAMING</span>
        <small>Tarjetas de regalo digitales</small>
      </footer>
    </main>
  );
}
