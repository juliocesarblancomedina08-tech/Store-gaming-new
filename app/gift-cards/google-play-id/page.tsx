
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: string;
  amount: number;
  price: number;
};

const offers: GiftCardOffer[] = [
  { id: "google-play-id-5000", amount: 5000, price: 0.43 },
  { id: "google-play-id-10000", amount: 10000, price: 0.67 },
  { id: "google-play-id-16000", amount: 16000, price: 1.11 },
  { id: "google-play-id-20000", amount: 20000, price: 1.28 },
  { id: "google-play-id-35000", amount: 35000, price: 2.23 },
  { id: "google-play-id-50000", amount: 50000, price: 2.76 },
  { id: "google-play-id-49000", amount: 49000, price: 3.07 },
  { id: "google-play-id-65000", amount: 65000, price: 4.02 },
  { id: "google-play-id-79000", amount: 79000, price: 4.85 },
  { id: "google-play-id-100000", amount: 100000, price: 5.36 },
  { id: "google-play-id-129000", amount: 129000, price: 7.83 },
  { id: "google-play-id-150000", amount: 150000, price: 8.6 },
  { id: "google-play-id-159000", amount: 159000, price: 9.6 },
  { id: "google-play-id-249000", amount: 249000, price: 14.96 },
  { id: "google-play-id-300000", amount: 300000, price: 15.94 },
  { id: "google-play-id-329000", amount: 329000, price: 19.67 },
  { id: "google-play-id-399000", amount: 399000, price: 23.88 },
  { id: "google-play-id-500000", amount: 500000, price: 28.34 },
  { id: "google-play-id-649000", amount: 649000, price: 38.75 },
  { id: "google-play-id-799000", amount: 799000, price: 47.68 },
  { id: "google-play-id-1299000", amount: 1299000, price: 73.93 },
  { id: "google-play-id-1599000", amount: 1599000, price: 94.99 },
];

const note =
  "Región: Tarjetas de regalo de Google Play (ID). Los códigos se pueden guardar de forma segura y canjear posteriormente";

export default function GooglePlayIDGiftCardPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(true);

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
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
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
      game: "GOOGLE PLAY (ID)",
      product: `${selectedOffer.amount} IDR`,
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
        localStorage.getItem(
          "storeGamingOrders"
        ) || "[]"
      );

      const updatedOrders = [
        newOrder,
        ...existingOrders,
      ];

      localStorage.setItem(
        "storeGamingOrders",
        JSON.stringify(updatedOrders)
      );

      localStorage.setItem(
        "storeGamingLastOrder",
        JSON.stringify(newOrder)
      );
    } catch (error) {
      console.error(
        "Error guardando el pedido:",
        error
      );
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
      {/* HEADER */}
      <header className="game-service-header">
        <button
          type="button"
          className="game-back-button"
          onClick={() =>
            router.push("/gift-cards")
          }
        >
          ←
        </button>

        <h1 className="game-header-title">
          GOOGLE PLAY (ID)
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
        {/* IMAGEN PRINCIPAL */}
        <div className="free-fire-main-image">
          <img
            src="/images/gift-cards/gift-google-play-id.jpg"
            alt="Google Play ID"
          />
        </div>

        {/* BOTÓN OFERTAS */}
        <button
          type="button"
          className="offers-toggle"
          onClick={() =>
            setShowOffers((current) => !current)
          }
        >
          <span>🎁</span>

          <span>
            {showOffers
              ? "OCULTAR OFERTAS"
              : "VER OFERTAS"}
          </span>

          <span>
            {showOffers ? "▲" : "▼"}
          </span>
        </button>

        {/* OFERTAS */}
        {showOffers && (
          <section className="offers-section">
            <div className="offers-list">
              {offers.map((offer) => (
                <button
                  type="button"
                  key={offer.id}
                  className={`offer-card ${
                    selectedOffer?.id === offer.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    selectOffer(offer)
                  }
                >
                  <div className="offer-info">
                    <span className="diamond-icon">
                      🎁
                    </span>

                    <div>
                      <strong>
                        {offer.amount.toLocaleString(
                          "en-US"
                        )}{" "}
                        IDR
                      </strong>
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
        )}

        {/* NOTA */}
        <div className="game-note">
          <div className="game-note-icon">
            !
          </div>

          <div className="game-note-content">
            {note}
          </div>
        </div>

        {/* PEDIDO */}
        {selectedOffer && !orderCreated && (
          <section
            id="gift-card-order-section"
            className="order-section"
          >
            <div className="game-note game-note-order">
              <div className="game-note-icon">
                !
              </div>

              <div className="game-note-content">
                {note}
              </div>
            </div>

            <div className="selected-order-card">
              <div className="selected-order-header">
                <h2>
                  TARJETA SELECCIONADA
                </h2>
              </div>

              <div className="selected-order-product">
                <div className="offer-info">
                  <span className="diamond-icon">
                    🎁
                  </span>

                  <div>
                    <strong>
                      {selectedOffer.amount.toLocaleString(
                        "en-US"
                      )}{" "}
                      IDR
                    </strong>

                    <span>
                      Google Play (ID)
                    </span>
                  </div>
                </div>

                <div className="offer-right">
                  <strong>
                    ${selectedOffer.price.toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* CANTIDAD */}
              <div className="quantity-control">
                <span>
                  CANTIDAD
                </span>

                <div className="quantity-buttons">
                  <button
                    type="button"
                    onClick={decreaseQuantity}
                    aria-label="Disminuir cantidad"
                  >
                    −
                  </button>

                  <strong>
                    {quantity}
                  </strong>

                  <button
                    type="button"
                    onClick={increaseQuantity}
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* TOTAL */}
              <div className="order-total">
                <span>
                  TOTAL
                </span>

                <strong>
                  ${total.toFixed(2)}
                </strong>
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

        {/* CONFIRMACIÓN */}
        {showConfirmation &&
          selectedOffer &&
          !orderCreated && (
            <section
              id="confirmation-section"
              className="confirmation-section"
            >
              <div className="confirmation-card">
                <h2>
                  CONFIRMAR PEDIDO
                </h2>

                <div className="confirmation-row">
                  <span>
                    Producto
                  </span>

                  <strong>
                    {selectedOffer.amount.toLocaleString(
                      "en-US"
                    )}{" "}
                    IDR
                  </strong>
                </div>

                <div className="confirmation-row">
                  <span>
                    Precio unitario
                  </span>

                  <strong>
                    ${selectedOffer.price.toFixed(2)}
                  </strong>
                </div>

                <div className="confirmation-row">
                  <span>
                    Cantidad
                  </span>

                  <strong>
                    {quantity}
                  </strong>
                </div>

                <div className="confirmation-row">
                  <span>
                    Total
                  </span>

                  <strong>
                    ${total.toFixed(2)}
                  </strong>
                </div>

                <div className="confirmation-row">
                  <span>
                    Región
                  </span>

                  <strong>
                    ID
                  </strong>
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
                  onClick={() =>
                    setShowConfirmation(false)
                  }
                >
                  VOLVER
                </button>
              </div>
            </section>
          )}

        {/* PEDIDO CREADO */}
        {orderCreated && (
          <section
            id="order-success-section"
            className="order-success-section"
          >
            <div className="success-icon">
              ✓
            </div>

            <h2>
              ¡PEDIDO CREADO!
            </h2>

            <div className="success-order-number">
              {orderNumber}
            </div>

            <div className="success-order-details">
              <p>
                <strong>
                  Producto:
                </strong>{" "}
                Google Play (ID)
              </p>

              <p>
                <strong>
                  Tarjeta:
                </strong>{" "}
                {selectedOffer?.amount.toLocaleString(
                  "en-US"
                )}{" "}
                IDR
              </p>

              <p>
                <strong>
                  Cantidad:
                </strong>{" "}
                {quantity}
              </p>

              <p>
                <strong>
                  Total:
                </strong>{" "}
                ${total.toFixed(2)}
              </p>

              <p>
                <strong>
                  Región:
                </strong>{" "}
                ID
              </p>

              <p>
                <strong>
                  Estado:
                </strong>{" "}
                PENDIENTE
              </p>
            </div>

            <button
              type="button"
              className="finish-order-button"
              onClick={() =>
                router.push("/orders")
              }
            >
              VER MIS PEDIDOS
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                router.push("/gift-cards")
              }
            >
              VOLVER A TARJETAS DE REGALO
            </button>
          </section>
        )}
      </section>

      {/* FOOTER */}
      <footer className="game-service-footer">
        <p>
          🛒 STORE GAMING 🎮
        </p>

        <span>
          Tarjetas de regalo Google Play ID
        </span>
      </footer>
    </main>
  );
}
