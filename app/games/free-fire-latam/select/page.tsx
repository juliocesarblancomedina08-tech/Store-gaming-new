
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

function FreeFireSelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");

  const offerParam = searchParams.get("offer");

  let offer: Offer = {
    id: "ff-110",
    name: "110 Diamonds",
    diamonds: "110💎",
    price: 0.78,
    type: "diamonds",
  };

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
      game: "FREE FIRE LATAM",
      gameSlug: "free-fire-latam",
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
      "/games/free-fire-latam/confirm"
    );
  }

  return (
    <main className="select-page">
      <header className="select-header">
        <button
          type="button"
          className="select-back"
          onClick={() =>
            router.push("/games/free-fire-latam")
          }
        >
          ←
        </button>

        <div className="select-header-title">
          <span>FREE FIRE LATAM</span>
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
            src="/images/free-fire-latam.jpg"
            alt="Free Fire LATAM"
          />

          <div className="select-image-overlay" />

          <div className="select-image-text">
            <span>TOP UP</span>
            <strong>FREE FIRE</strong>
          </div>
        </div>

        <div className="selected-offer">
          <span className="selected-label">
            OFERTA SELECCIONADA
          </span>

          <div className="selected-diamonds">
            {offer.type === "diamonds"
              ? "💎"
              : offer.type === "pass"
              ? "🎟️"
              : "⭐"}{" "}
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
            Escriba el ID de la cuenta de Free Fire
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
            <span>TOTAL A PAGAR</span>

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
            router.push("/games/free-fire-latam")
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

export default function FreeFireSelectPage() {
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
      <FreeFireSelectContent />
    </Suspense>
  );
}
