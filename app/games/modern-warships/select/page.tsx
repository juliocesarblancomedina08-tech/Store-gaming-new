
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
    id: "mw-premium-7",
    name: "CUENTA PREMIUM - 7 DÍAS",
    diamonds: "PREMIUM 7 DÍAS 🚢",
    price: 2.59,
    type: "premium",
  },
  {
    id: "mw-500k",
    name: "500.000 DÓLARES",
    diamonds: "500.000 💵",
    price: 2.71,
    type: "currency",
  },
  {
    id: "mw-gold-500",
    name: "500 DE ORO",
    diamonds: "500 🪙",
    price: 4.48,
    type: "gold",
  },
  {
    id: "mw-1-5m",
    name: "1.500.000 DÓLARES",
    diamonds: "1.500.000 💵",
    price: 4.48,
    type: "currency",
  },
  {
    id: "mw-artcoins",
    name: "140 ARTCOINS",
    diamonds: "140 🪙",
    price: 5.09,
    type: "artcoins",
  },
  {
    id: "mw-premium-30",
    name: "CUENTA PREMIUM - 30 DÍAS",
    diamonds: "PREMIUM 30 DÍAS 🚢",
    price: 8.51,
    type: "premium",
  },
  {
    id: "mw-gold-1200",
    name: "1200 DE ORO",
    diamonds: "1200 🪙",
    price: 8.93,
    type: "gold",
  },
];

function ModernWarshipsSelectContent() {
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
      game: "MODERN WARSHIPS NAVAL BATTLES",
      gameSlug: "modern-warships",
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
      "/games/modern-warships/confirm"
    );
  }

  function getOfferIcon() {
    if (offer.type === "premium") {
      return "🚢";
    }

    if (offer.type === "currency") {
      return "💵";
    }

    return "🪙";
  }

  return (
    <main className="select-page">

      <header className="select-header">

        <button
          type="button"
          className="select-back"
          onClick={() =>
            router.push("/games/modern-warships")
          }
          aria-label="Volver"
        >
          ←
        </button>

        <div className="select-header-title">
          <span>MODERN WARSHIPS</span>
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
            src="/images/modern-warships.jpg"
            alt="Modern Warships Naval Battles"
          />

          <div className="select-image-overlay" />

          <div className="select-image-text">
            <span>TOP UP</span>
            <strong>MODERN WARSHIPS</strong>
          </div>

        </div>


        <div className="selected-offer">

          <span className="selected-label">
            OFERTA SELECCIONADA
          </span>

          <div className="selected-diamonds">
            {getOfferIcon()} {offer.diamonds}
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
            Escriba el ID de jugador de Modern
            Warships donde desea recibir el producto.
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
            router.push("/games/modern-warships")
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
                El producto será enviado al ID
                indicado.
              </small>
            </p>
          </div>

        </div>

      </section>

    </main>
  );
}


export default function ModernWarshipsSelectPage() {
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
      <ModernWarshipsSelectContent />
    </Suspense>
  );
}
