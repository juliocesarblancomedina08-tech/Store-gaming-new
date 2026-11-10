
"use client";

import {
  FormEvent,
  Suspense,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Offer = {
  id: string;
  name: string;
  diamonds: string;
  price: number;
  type: string;
};

const offers: Offer[] = [
  {
    id: "hok-16",
    name: "16 FICHAS",
    diamonds: "16 ⚔️",
    price: 0.27,
    type: "tokens",
  },
  {
    id: "hok-luck",
    name: "BOLSA DE LA SUERTE CON DOBLE FICHA",
    diamonds: "BOLSA DE LA SUERTE 🎁",
    price: 0.36,
    type: "pack",
  },
  {
    id: "hok-honor",
    name: "PAQUETE DE VALOR DE PUNTOS DE HONOR",
    diamonds: "PUNTOS DE HONOR ⚔️",
    price: 0.36,
    type: "pack",
  },
  {
    id: "hok-standard",
    name: "PAQUETE DE REEMBOLSO POR COMPRA ESTÁNDAR",
    diamonds: "COMPRA ESTÁNDAR 🎁",
    price: 0.43,
    type: "pack",
  },
  {
    id: "hok-80",
    name: "80 FICHAS",
    diamonds: "80 ⚔️",
    price: 0.95,
    type: "tokens",
  },
  {
    id: "hok-weekly",
    name: "TARJETA SEMANAL",
    diamonds: "TARJETA SEMANAL 🎟️",
    price: 1.07,
    type: "pass",
  },
  {
    id: "hok-premium",
    name: "PAQUETE DE REEMBOLSO POR COMPRA PREMIUM",
    diamonds: "COMPRA PREMIUM 🎁",
    price: 1.29,
    type: "pack",
  },
  {
    id: "hok-240",
    name: "240 FICHAS",
    diamonds: "240 ⚔️",
    price: 2.63,
    type: "tokens",
  },
  {
    id: "hok-weekly-plus",
    name: "TARJETA SEMANAL PLUS",
    diamonds: "TARJETA SEMANAL PLUS 🎟️",
    price: 2.95,
    type: "pass",
  },
  {
    id: "hok-400",
    name: "400 FICHAS",
    diamonds: "400 ⚔️",
    price: 4.32,
    type: "tokens",
  },
  {
    id: "hok-560",
    name: "560 FICHAS",
    diamonds: "560 ⚔️",
    price: 6.01,
    type: "tokens",
  },
  {
    id: "hok-830",
    name: "830 FICHAS",
    diamonds: "830 ⚔️",
    price: 8.54,
    type: "tokens",
  },
  {
    id: "hok-1245",
    name: "1245 FICHAS",
    diamonds: "1245 ⚔️",
    price: 12.76,
    type: "tokens",
  },
  {
    id: "hok-2508",
    name: "2508 TOKENS",
    diamonds: "2508 🪙",
    price: 25.44,
    type: "tokens",
  },
  {
    id: "hok-4180",
    name: "4180 TOKENS",
    diamonds: "4180 🪙",
    price: 42.33,
    type: "tokens",
  },
  {
    id: "hok-8360",
    name: "8360 TOKENS",
    diamonds: "8360 🪙",
    price: 84.57,
    type: "tokens",
  },
];

function HonorOfKingsSelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");

  const offerParam = searchParams.get("offer");

  let offer: Offer = offers[0];

  if (offerParam) {
    try {
      const decoded = JSON.parse(
        decodeURIComponent(offerParam)
      );

      if (
        decoded &&
        typeof decoded.name === "string" &&
        typeof decoded.price === "number"
      ) {
        offer = {
          ...offers[0],
          ...decoded,
        };
      }
    } catch {
      // Mantener oferta predeterminada.
    }
  }

  function handleContinue(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanId = playerId.trim();

    if (!cleanId) {
      setError("Ponga el ID de su cuenta.");
      return;
    }

    if (cleanId.length < 4) {
      setError("El ID parece demasiado corto.");
      return;
    }

    const orderData = {
      game: "HONOR OF KINGS",
      gameSlug: "honor-of-kings",
      offerId: offer.id,
      product: offer.name,
      displayProduct: offer.diamonds,
      price: offer.price,
      playerId: cleanId,
      quantity: 1,
    };

    sessionStorage.setItem(
      "storeGamingPendingOrder",
      JSON.stringify(orderData)
    );

    router.push(
      "/games/honor-of-kings/confirm"
    );
  }

  return (
    <main className="select-page">

      <header className="select-header">

        <button
          type="button"
          className="select-back"
          onClick={() =>
            router.push("/games/honor-of-kings")
          }
          aria-label="Volver"
        >
          ←
        </button>

        <div className="select-header-title">
          <span>HONOR OF KINGS</span>
          <strong>REALIZAR ORDEN</strong>
        </div>

        <button
          type="button"
          className="select-cart"
          onClick={() =>
            router.push("/cart")
          }
          aria-label="Carrito"
        >
          🛒
        </button>

      </header>


      <section className="select-content">

        <div className="select-game-image">

          <img
            src="/images/honor-of-kings.jpg"
            alt="Honor of Kings"
          />

          <div className="select-image-overlay" />

          <div className="select-image-text">
            <span>TOP UP</span>
            <strong>HONOR OF KINGS</strong>
          </div>

        </div>


        <div className="selected-offer">

          <span className="selected-label">
            OFERTA SELECCIONADA
          </span>

          <div className="selected-diamonds">

            {offer.type === "pass"
              ? "🎟️"
              : offer.type === "pack"
              ? "🎁"
              : "⚔️"}{" "}

            {offer.diamonds}

          </div>

          <div className="selected-product">
            {offer.name}
          </div>

          <div className="selected-price">
            {offer.price.toFixed(2)}$
          </div>

        </div>


        <form
          onSubmit={handleContinue}
          className="order-form"
        >

          <label
            htmlFor="player-id"
            className="player-id-label"
          >
            PONGA SU ID
          </label>

          <p className="player-id-description">
            Escriba el ID de jugador de Honor of Kings
            donde desea recibir la recarga.
          </p>


          <div className="player-id-input-wrapper">

            <span>🆔</span>

            <input
              id="player-id"
              type="text"
              inputMode="numeric"
              value={playerId}
              onChange={(event) =>
                setPlayerId(
                  event.target.value.replace(
                    /[^0-9]/g,
                    ""
                  )
                )
              }
              placeholder="Ejemplo: 123456789"
              autoComplete="off"
              maxLength={20}
            />

          </div>


          {error && (
            <div className="order-error">
              {error}
            </div>
          )}


          <div className="order-total-preview">

            <span>
              TOTAL A PAGAR
            </span>

            <strong>
              {offer.price.toFixed(2)}$
            </strong>

          </div>


          <button
            type="submit"
            className="finish-order-button"
          >
            <span>
              FINALIZAR ORDEN
            </span>

            <b>
              →
            </b>

          </button>

        </form>


        <button
          type="button"
          className="continue-shopping"
          onClick={() =>
            router.push("/games/honor-of-kings")
          }
        >
          ← CAMBIAR OFERTA
        </button>


        <div className="select-security">

          <div>

            <span>
              🔒
            </span>

            <p>

              <strong>
                COMPRA SEGURA
              </strong>

              <small>
                Revisa los datos antes de crear
                tu orden.
              </small>

            </p>

          </div>


          <div>

            <span>
              🎮
            </span>

            <p>

              <strong>
                TOP UP DIRECTO
              </strong>

              <small>
                La recarga será enviada al ID
                indicado.
              </small>

            </p>

          </div>

        </div>

      </section>

    </main>
  );
}


export default function HonorOfKingsSelectPage() {
  return (
    <Suspense
      fallback={
        <main className="select-page">

          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 800,
            }}
          >
            CARGANDO...
          </div>

        </main>
      }
    >
      <HonorOfKingsSelectContent />
    </Suspense>
  );
}
