"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Offer = {
  name: string;
  price: string;
};

const starsOffers: Offer[] = [
  {
    name: "50⭐",
    price: "0.80$",
  },
  {
    name: "100⭐",
    price: "1.57$",
  },
  {
    name: "200⭐",
    price: "3.10$",
  },
  {
    name: "250⭐",
    price: "3.88$",
  },
  {
    name: "500⭐",
    price: "7.74$",
  },
  {
    name: "750⭐",
    price: "11.57$",
  },
  {
    name: "1000⭐",
    price: "15.42$",
  },
  {
    name: "1500⭐",
    price: "23.12$",
  },
  {
    name: "2000⭐",
    price: "30.90$",
  },
  {
    name: "3000⭐",
    price: "46.20$",
  },
  {
    name: "5000⭐",
    price: "77.00$",
  },
  {
    name: "10000⭐",
    price: "154.00$",
  },
];

const premiumOffers: Offer[] = [
  {
    name: "3 MESES",
    price: "12.40$",
  },
  {
    name: "6 MESES",
    price: "16.60$",
  },
  {
    name: "1 AÑO",
    price: "30.00$",
  },
];

export default function TelegramStarsPage() {
  const router = useRouter();

  const [section, setSection] = useState<
    "stars" | "premium"
  >("stars");

  const [selectedOffer, setSelectedOffer] =
    useState<Offer | null>(null);

  const [telegramUsername, setTelegramUsername] =
    useState("");

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [orderCreated, setOrderCreated] =
    useState(false);

  const [orderNumber, setOrderNumber] =
    useState("");

  const offers =
    section === "stars"
      ? starsOffers
      : premiumOffers;

  /*
   * =========================
   * SELECCIONAR OFERTA
   * =========================
   */

  function selectOffer(offer: Offer) {
    setSelectedOffer(offer);
    setTelegramUsername("");
    setShowConfirmation(false);
    setOrderCreated(false);
    setOrderNumber("");

    setTimeout(() => {
      document
        .getElementById("telegram-order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  /*
   * =========================
   * VALIDAR USUARIO TELEGRAM
   * =========================
   */

  function isValidTelegramUsername(
    username: string
  ) {
    const clean = username.trim();

    if (!clean) {
      return false;
    }

    if (!clean.startsWith("@")) {
      return false;
    }

    const usernameWithoutAt =
      clean.substring(1);

    return /^[A-Za-z0-9_]{5,32}$/.test(
      usernameWithoutAt
    );
  }

  /*
   * =========================
   * CONTINUAR
   * =========================
   */

  function finishOrder() {
    const username =
      telegramUsername.trim();

    if (
      !isValidTelegramUsername(username)
    ) {
      alert(
        "Introduce un @usuario de Telegram válido. Ejemplo: @usuario"
      );

      return;
    }

    if (!selectedOffer) {
      return;
    }

    const normalizedUsername =
      username.startsWith("@")
        ? username
        : `@${username}`;

    setTelegramUsername(
      normalizedUsername
    );

    setShowConfirmation(true);

    setTimeout(() => {
      document
        .getElementById(
          "telegram-confirmation-section"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  /*
   * =========================
   * CREAR PEDIDO
   * =========================
   */

  function createOrder() {
    if (
      !selectedOffer ||
      !telegramUsername
    ) {
      return;
    }

    const orderId =
      `TG-${Date.now()
        .toString()
        .slice(-8)}`;

    const order = {
      id: orderId,
      orderNumber: orderId,
      type: "TELEGRAM_STARS",
      product:
        selectedOffer.name,
      offer:
        selectedOffer.name,
      price:
        selectedOffer.price,
      telegramUsername,
      status: "PENDIENTE",
      createdAt:
        new Date().toISOString(),
    };

    /*
     * Guardar el pedido manteniendo
     * el sistema actual de pedidos.
     */

    try {
      const existingOrders =
        JSON.parse(
          localStorage.getItem(
            "storeGamingOrders"
          ) || "[]"
        );

      const orders =
        Array.isArray(
          existingOrders
        )
          ? existingOrders
          : [];

      orders.unshift(order);

      localStorage.setItem(
        "storeGamingOrders",
        JSON.stringify(orders)
      );

      localStorage.setItem(
        "storeGamingLastOrder",
        JSON.stringify(order)
      );
    } catch (error) {
      console.error(
        "Error guardando pedido:",
        error
      );
    }

    setOrderNumber(orderId);

    setOrderCreated(true);
    setShowConfirmation(false);

    setTimeout(() => {
      document
        .getElementById(
          "telegram-success-section"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  /*
   * =========================
   * REINICIAR PEDIDO
   * =========================
   */

  function resetOrder() {
    setSelectedOffer(null);
    setTelegramUsername("");
    setShowConfirmation(false);
    setOrderCreated(false);
    setOrderNumber("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * =========================
   * RENDER
   * =========================
   */

  return (
    <main className="telegram-stars-page">

      {/* =========================
          HEADER
      ========================== */}

      <header className="telegram-stars-header">

        <button
          type="button"
          className="telegram-stars-back-button"
          onClick={() =>
            router.push("/home")
          }
          aria-label="Volver al inicio"
        >
          ←
        </button>

        <div className="telegram-stars-header-title">

          <span>
            STORE GAMING
          </span>

          <h1>
            ⭐ TELEGRAM STARS
          </h1>

        </div>

      </header>

      {/* =========================
          CONTENIDO
      ========================== */}

      <section className="telegram-stars-content">

        {/* =========================
            INTRO
        ========================== */}

        <div className="telegram-stars-intro">

          <span className="telegram-stars-icon">
            ⭐
          </span>

          <h2>
            TELEGRAM STARS
          </h2>

          <p>
            Compra Stars de Telegram
            de forma rápida y segura.
          </p>

        </div>

        {/* =========================
            SELECTOR
        ========================== */}

        <div className="telegram-stars-tabs">

          <button
            type="button"
            className={
              section === "stars"
                ? "telegram-stars-tab active"
                : "telegram-stars-tab"
            }
            onClick={() => {
              setSection("stars");
              setSelectedOffer(null);
              setShowConfirmation(false);
              setOrderCreated(false);
              setOrderNumber("");
            }}
          >
            ⭐ STARS
          </button>

          <button
            type="button"
            className={
              section === "premium"
                ? "telegram-stars-tab active"
                : "telegram-stars-tab"
            }
            onClick={() => {
              setSection("premium");
              setSelectedOffer(null);
              setShowConfirmation(false);
              setOrderCreated(false);
              setOrderNumber("");
            }}
          >
            ✈️ PREMIUM
          </button>

        </div>

        {/* =========================
            TÍTULO DE OFERTAS
        ========================== */}

        <div className="telegram-stars-section-title">

          <h2>
            {section === "stars"
              ? "ELIGE TUS STARS"
              : "TELEGRAM PREMIUM"}
          </h2>

          <span>
            {section === "stars"
              ? "Selecciona la cantidad que deseas."
              : "Selecciona la duración de tu Premium."}
          </span>

        </div>

        {/* =========================
            OFERTAS
            ESTILO TOP UP
        ========================== */}

        <div className="telegram-stars-offers-grid">

          {offers.map((offer) => {

            const isSelected =
              selectedOffer?.name ===
                offer.name;

            return (
              <button
                key={`${section}-${offer.name}`}
                type="button"
                className={
                  isSelected
                    ? "telegram-stars-offer-card offer-card selected"
                    : "telegram-stars-offer-card offer-card"
                }
                onClick={() =>
                  selectOffer(offer)
                }
              >

                <div className="offer-left">

                  <span className="diamond-icon">
                    {section === "stars"
                      ? "⭐"
                      : "✈️"}
                  </span>

                  <div className="offer-info">

                    <strong>
                      {offer.name}
                    </strong>

                    <span>
                      {section === "stars"
                        ? "TELEGRAM STARS"
                        : "TELEGRAM PREMIUM"}
                    </span>

                  </div>

                </div>

                <div className="offer-right">

                  <strong>
                    {offer.price}
                  </strong>

                  <span>
                    SELECCIONAR →
                  </span>

                </div>

              </button>
            );
          })}

        </div>

        {/* =========================
            PEDIDO
        ========================== */}

        {selectedOffer &&
          !showConfirmation &&
          !orderCreated && (

            <section
              id="telegram-order-section"
              className="telegram-order-section"
            >

              <div className="telegram-order-card">

                <div className="telegram-order-card-title">

                  <span>
                    {section === "stars"
                      ? "⭐"
                      : "✈️"}
                  </span>

                  <h2>
                    COMPLETAR PEDIDO
                  </h2>

                </div>

                <div className="telegram-selected-offer">

                  <span>
                    OFERTA SELECCIONADA
                  </span>

                  <strong>
                    {selectedOffer.name}
                  </strong>

                  <b>
                    {selectedOffer.price}
                  </b>

                </div>

                <label
                  htmlFor="telegram-username"
                >
                  USUARIO DE TELEGRAM
                </label>

                <input
                  id="telegram-username"
                  type="text"
                  value={telegramUsername}
                  onChange={(event) =>
                    setTelegramUsername(
                      event.target.value
                    )
                  }
                  placeholder="@usuario"
                  autoComplete="off"
                  inputMode="text"
                />

                <p className="telegram-input-help">
                  Introduce tu usuario
                  comenzando con @.
                </p>

                <button
                  type="button"
                  className="telegram-continue-button"
                  onClick={finishOrder}
                >
                  CONTINUAR →
                </button>

              </div>

            </section>
          )}

        {/* =========================
            CONFIRMACIÓN
        ========================== */}

        {showConfirmation &&
          selectedOffer && (

            <section
              id="telegram-confirmation-section"
              className="telegram-confirmation-section"
            >

              <div className="telegram-confirmation-card">

                <div className="telegram-confirmation-title">

                  <span>
                    🔎
                  </span>

                  <h2>
                    CONFIRMA TU PEDIDO
                  </h2>

                </div>

                <div className="telegram-confirmation-data">

                  <div>

                    <span>
                      SERVICIO
                    </span>

                    <strong>
                      {section === "stars"
                        ? "TELEGRAM STARS"
                        : "TELEGRAM PREMIUM"}
                    </strong>

                  </div>

                  <div>

                    <span>
                      OFERTA
                    </span>

                    <strong>
                      {selectedOffer.name}
                    </strong>

                  </div>

                  <div>

                    <span>
                      USUARIO
                    </span>

                    <strong>
                      {telegramUsername}
                    </strong>

                  </div>

                  <div>

                    <span>
                      TOTAL
                    </span>

                    <strong>
                      {selectedOffer.price}
                    </strong>

                  </div>

                </div>

                <button
                  type="button"
                  className="telegram-confirm-button"
                  onClick={createOrder}
                >
                  CONFIRMAR PEDIDO
                </button>

                <button
                  type="button"
                  className="telegram-cancel-button"
                  onClick={() =>
                    setShowConfirmation(false)
                  }
                >
                  ← VOLVER
                </button>

              </div>

            </section>
          )}

        {/* =========================
            PEDIDO CREADO
        ========================== */}

        {orderCreated && (

          <section
            id="telegram-success-section"
            className="telegram-success-section"
          >

            <div className="telegram-success-card">

              <div className="telegram-success-icon">
                ✓
              </div>

              <h2>
                PEDIDO CREADO
              </h2>

              <p>
                Tu pedido de Telegram
                ha sido registrado
                correctamente.
              </p>

              <div className="telegram-success-order">

                <span>
                  NÚMERO DE PEDIDO
                </span>

                <strong>
                  {orderNumber}
                </strong>

              </div>

              <div className="telegram-success-summary">

                <div>

                  <span>
                    OFERTA
                  </span>

                  <strong>
                    {selectedOffer?.name}
                  </strong>

                </div>

                <div>

                  <span>
                    USUARIO
                  </span>

                  <strong>
                    {telegramUsername}
                  </strong>

                </div>

                <div>

                  <span>
                    TOTAL
                  </span>

                  <strong>
                    {selectedOffer?.price}
                  </strong>

                </div>

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
                onClick={resetOrder}
              >
                HACER OTRO PEDIDO
              </button>

            </div>

          </section>
        )}

      </section>

      {/* =========================
          FOOTER
      ========================== */}

      <footer className="telegram-stars-footer">

        <strong>
          STORE GAMING
        </strong>

        <span>
          TELEGRAM STARS & PREMIUM
        </span>

      </footer>

    </main>
  );
 }
