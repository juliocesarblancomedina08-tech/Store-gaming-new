
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
    id: "lol-575",
    name: "575 RP",
    diamonds: "575 RP 🪙",
    price: 3.30,
    type: "rp",
  },
  {
    id: "lol-1380",
    name: "1380 RP",
    diamonds: "1380 RP 🪙",
    price: 7.57,
    type: "rp",
  },
  {
    id: "lol-2800",
    name: "2800 RP",
    diamonds: "2800 RP 🪙",
    price: 15.03,
    type: "rp",
  },
  {
    id: "lol-4500",
    name: "4500 RP",
    diamonds: "4500 RP 🪙",
    price: 23.56,
    type: "rp",
  },
  {
    id: "lol-6500",
    name: "6500 RP",
    diamonds: "6500 RP 🪙",
    price: 33.17,
    type: "rp",
  },
  {
    id: "lol-13500",
    name: "13500 RP",
    diamonds: "13500 RP 🪙",
    price: 64.10,
    type: "rp",
  },
];

function LeagueOfLegendsSelectContent() {
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
      setError("Ponga su Riot ID.");
      return;
    }

    if (!cleanId.includes("#")) {
      setError(
        "Escriba su Riot ID en formato Nombre#ETIQUETA."
      );
      return;
    }

    const parts = cleanId.split("#");

    if (
      parts.length !== 2 ||
      !parts[0].trim() ||
      !parts[1].trim()
    ) {
      setError(
        "El Riot ID debe tener el formato Nombre#ETIQUETA."
      );
      return;
    }

    const orderData = {
      game: "LEAGUE OF LEGENDS (ID)",
      gameSlug: "league-of-legends-id",
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
      "/games/league-of-legends-id/confirm"
    );
  }

  return (
    <main className="select-page">

      <header className="select-header">

        <button
          type="button"
          className="select-back"
          onClick={() =>
            router.push(
              "/games/league-of-legends-id"
            )
          }
          aria-label="Volver"
        >
          ←
        </button>

        <div className="select-header-title">
          <span>LEAGUE OF LEGENDS (ID)</span>
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
            src="/images/league-of-legends.jpg"
            alt="League of Legends Indonesia"
          />

          <div className="select-image-overlay" />

          <div className="select-image-text">
            <span>TOP UP</span>
            <strong>LEAGUE OF LEGENDS</strong>
          </div>

        </div>


        <div className="selected-offer">

          <span className="selected-label">
            OFERTA SELECCIONADA
          </span>

          <div className="selected-diamonds">
            🪙 {offer.diamonds}
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
            PONGA SU RIOT ID
          </label>

          <p className="player-id-description">
            Escriba el Riot ID de la cuenta donde
            desea recibir la recarga.
            <br />
            Formato: Nombre#ETIQUETA
          </p>


          <div className="player-id-input-wrapper">

            <span>🆔</span>

            <input
              id="player-id"
              type="text"
              value={playerId}
              onChange={(event) =>
                setPlayerId(
                  event.target.value
                )
              }
              placeholder="Ejemplo: Jugador#1234"
              autoComplete="off"
              maxLength={50}
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
            router.push(
              "/games/league-of-legends-id"
            )
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
                La recarga será enviada al Riot ID
                indicado.
              </small>

            </p>

          </div>

        </div>

      </section>

    </main>
  );
}


export default function LeagueOfLegendsSelectPage() {
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
      <LeagueOfLegendsSelectContent />
    </Suspense>
  );
}
