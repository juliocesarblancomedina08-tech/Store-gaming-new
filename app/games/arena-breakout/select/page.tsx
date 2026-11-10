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
  display: string;
  price: number;
  type: string;
};

const offers: Offer[] = [
  {
    id: "arena-60",
    name: "60 BONOS",
    display: "60 🎮",
    price: 0.82,
    type: "currency",
  },
  {
    id: "arena-monthly",
    name: "PASE MENSUAL",
    display: "PASE MENSUAL 🎟️",
    price: 1.00,
    type: "pass",
  },
  {
    id: "arena-monthly-premium",
    name: "PASE MENSUAL PREMIUM",
    display: "PASE MENSUAL PREMIUM 🎟️",
    price: 3.65,
    type: "pass",
  },
  {
    id: "arena-335",
    name: "335 BONOS",
    display: "335 🎮",
    price: 4.10,
    type: "currency",
  },
  {
    id: "arena-675",
    name: "675 BONOS",
    display: "675 🎮",
    price: 8.08,
    type: "currency",
  },
  {
    id: "arena-1690",
    name: "1690 BONOS",
    display: "1690 🎮",
    price: 20.05,
    type: "currency",
  },
  {
    id: "arena-3400",
    name: "3400 BONOS",
    display: "3400 🎮",
    price: 40.05,
    type: "currency",
  },
  {
    id: "arena-6820",
    name: "6820 BONOS",
    display: "6820 🎮",
    price: 79.97,
    type: "currency",
  },
];

function ArenaBreakoutSelectContent() {
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
        offer = decoded;
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
      game: "ARENA BREAKOUT",
      gameSlug: "arena-breakout",
      offerId: offer.id,
      product: offer.name,
      displayProduct: offer.display,
      price: offer.price,
      playerId: cleanId,
      quantity: 1,
    };

    sessionStorage.setItem(
      "storeGamingPendingOrder",
      JSON.stringify(orderData)
    );

    router.push(
      "/games/arena-breakout/confirm"
    );
  }

  return (
    <main className="select-page">

      <header className="select-header">

        <button
          type="button"
          className="select-back"
          onClick={() =>
            router.push("/games/arena-breakout")
          }
        >
          ←
        </button>

        <div className="select-header-title">
          <span>ARENA BREAKOUT</span>
          <strong>REALIZAR ORDEN</strong>
        </div>

        <button
          type="button"
          className="select-cart"
          onClick={() => router.push("/cart")}
        >
          🛒
        </button>

      </header>

      <section className="select-content">

        <div className="select-game-image">

          <img
            src="/images/arena-breakout.jpg"
            alt="Arena Breakout"
          />

          <div className="select-image-overlay" />

          <div className="select-image-text">
            <span>TOP UP</span>
            <strong>ARENA BREAKOUT</strong>
          </div>

        </div>

        <div className="selected-offer">

          <span className="selected-label">
            OFERTA SELECCIONADA
          </span>

          <div className="selected-diamonds">
            {offer.type === "pass"
              ? "🎟️"
              : "🎮"}{" "}
            {offer.display}
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
            Escriba el ID de la cuenta de Arena
            Breakout donde desea recibir la recarga.
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
            <span>FINALIZAR ORDEN</span>
            <b>→</b>
          </button>

        </form>

        <button
          type="button"
          className="continue-shopping"
          onClick={() =>
            router.push("/games/arena-breakout")
          }
        >
          ← CAMBIAR OFERTA
        </button>

        <div className="select-security">

          <div>
            <span>🔒</span>

            <p>
              <strong>COMPRA SEGURA</strong>

              <small>
                Revisa los datos antes de crear
                tu orden.
              </small>
            </p>
          </div>

          <div>
            <span>🎮</span>

            <p>
              <strong>TOP UP DIRECTO</strong>

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

export default function ArenaBreakoutSelectPage() {
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
      <ArenaBreakoutSelectContent />
    </Suspense>
  );
}
