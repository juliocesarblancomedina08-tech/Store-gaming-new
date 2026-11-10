
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: string;
  diamonds: number;
  price: number;
  stock?: number;
};

const offers: GiftCardOffer[] = [
  {
    id: "ff-global-1",
    diamonds: 110,
    price: 1.0,
    stock: 100,
  },
  {
    id: "ff-global-2",
    diamonds: 231,
    price: 2.0,
  },
  {
    id: "ff-global-5",
    diamonds: 583,
    price: 5.0,
  },
  {
    id: "ff-global-10",
    diamonds: 1188,
    price: 10.0,
  },
  {
    id: "ff-global-20",
    diamonds: 2420,
    price: 20.0,
  },
];

export default function GarenaFreeFireGlobalGiftCardPage() {
  const router = useRouter();

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
      id: newOrderNumber,
      orderNumber: newOrderNumber,
      type: "GIFT CARD",
      game: "GARENA FREE FIRE GLOBAL",
      product: `${selectedOffer.diamonds} DIAMANTES`,
      amount: selectedOffer.diamonds,
      currency: "USD",
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
          <span>💎</span>
          <div>
            <strong>FREE FIRE</strong>
            <small>GLOBAL</small>
          </div>
        </div>

        <button
          type="button"
          className="game-cart-button"
          onClick={() => router.push("/cart")}
          aria-label="Ver carrito"
        >
          🛒
        </button>
      </header>

      <section className="game-service-content">
        <div className="free-fire-main-image">
          <img
            src="/images/gift-cards/gift-garena-free-fire-global.jpg"
            alt="Garena Free Fire Global"
          />
        </div>

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
                  <div className="diamond-icon">💎</div>

                  <div>
                    <strong>
                      {offer.diamonds} DIAMANTES
                    </strong>

                    {offer.stock && (
                      <small>
                        Stock indicado: {offer.stock}
                      </small>
                    )}
                  </div>
                </div>

                <div className="offer-right">
                  <strong>
                    ${offer.price.toFixed(2)}
                  </strong>
                </div>
              </button>
            ))}
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
                  <strong>
                    {selectedOffer.diamonds} DIAMANTES
                  </strong>
                  <span>FREE FIRE GLOBAL</span>
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
                <div className="confirmation-section">
                  <div className="confirmation-card">
                    <h3>CONFIRMAR PEDIDO</h3>

                    <div className="confirmation-row">
                      <span>Producto</span>
                      <strong>
                        {selectedOffer.diamonds} diamantes
                      </strong>
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
                </div>
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
              Tu pedido de Free Fire Global fue registrado.
            </p>

            <div className="success-order-number">
              <span>NÚMERO DE PEDIDO</span>
              <strong>{orderNumber}</strong>
            </div>

            <div className="success-order-details">
              <div>
                <span>PRODUCTO</span>
                <strong>
                  {selectedOffer?.diamonds} diamantes
                </strong>
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
        <small>Garena Free Fire Global</small>
      </footer>
    </main>
  );
}
