
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
    id: "ffid-5",
    name: "5 DIAMANTES",
    diamonds: "5💎",
    price: 0.15,
    type: "diamonds",
  },
  {
    id: "ffid-12",
    name: "12 DIAMANTES",
    diamonds: "12💎",
    price: 0.20,
    type: "diamonds",
  },
  {
    id: "ffid-10",
    name: "10 DIAMANTES",
    diamonds: "10💎",
    price: 0.21,
    type: "diamonds",
  },
  {
    id: "ffid-20",
    name: "20 DIAMANTES",
    diamonds: "20💎",
    price: 0.32,
    type: "diamonds",
  },
  {
    id: "ffid-25",
    name: "25 DIAMANTES",
    diamonds: "25💎",
    price: 0.37,
    type: "diamonds",
  },
  {
    id: "ffid-level-6",
    name: "PASE DE SUBIDA DE NIVEL - 6",
    diamonds: "PASE NIVEL 6 🎟️",
    price: 0.38,
    type: "pass",
  },
  {
    id: "ffid-30",
    name: "30 DIAMANTES",
    diamonds: "30💎",
    price: 0.43,
    type: "diamonds",
  },
  {
    id: "ffid-50",
    name: "50 DIAMANTES",
    diamonds: "50💎",
    price: 0.52,
    type: "diamonds",
  },
  {
    id: "ffid-level-20",
    name: "PASE DE SUBIDA DE NIVEL - 20",
    diamonds: "PASE NIVEL 20 🎟️",
    price: 0.57,
    type: "pass",
  },
  {
    id: "ffid-level-10",
    name: "PASE DE SUBIDA DE NIVEL - 10",
    diamonds: "PASE NIVEL 10 🎟️",
    price: 0.57,
    type: "pass",
  },
  {
    id: "ffid-level-15",
    name: "PASE DE SUBIDA DE NIVEL - 15",
    diamonds: "PASE NIVEL 15 🎟️",
    price: 0.57,
    type: "pass",
  },
  {
    id: "ffid-level-25",
    name: "PASE DE SUBIDA DE NIVEL - 25",
    diamonds: "PASE NIVEL 25 🎟️",
    price: 0.57,
    type: "pass",
  },
  {
    id: "ffid-55",
    name: "55 DIAMANTES",
    diamonds: "55💎",
    price: 0.58,
    type: "diamonds",
  },
  {
    id: "ffid-70",
    name: "70 DIAMANTES",
    diamonds: "70💎",
    price: 0.61,
    type: "diamonds",
  },
  {
    id: "ffid-80",
    name: "80 DIAMANTES",
    diamonds: "80💎",
    price: 0.75,
    type: "diamonds",
  },
  {
    id: "ffid-level-30",
    name: "PASE DE SUBIDA DE NIVEL - 30",
    diamonds: "PASE NIVEL 30 🎟️",
    price: 0.87,
    type: "pass",
  },
  {
    id: "ffid-100",
    name: "100 DIAMANTES",
    diamonds: "100💎",
    price: 0.96,
    type: "diamonds",
  },
  {
    id: "ffid-120",
    name: "120 DIAMANTES",
    diamonds: "120💎",
    price: 1.07,
    type: "diamonds",
  },
  {
    id: "ffid-140",
    name: "140 DIAMANTES",
    diamonds: "140💎",
    price: 1.12,
    type: "diamonds",
  },
  {
    id: "ffid-130",
    name: "130 DIAMANTES",
    diamonds: "130💎",
    price: 1.18,
    type: "diamonds",
  },
  {
    id: "ffid-145",
    name: "145 DIAMANTES",
    diamonds: "145💎",
    price: 1.23,
    type: "diamonds",
  },
  {
    id: "ffid-150",
    name: "150 DIAMANTES",
    diamonds: "150💎",
    price: 1.28,
    type: "diamonds",
  },
  {
    id: "ffid-190",
    name: "190 DIAMANTES",
    diamonds: "190💎",
    price: 1.61,
    type: "diamonds",
  },
  {
    id: "ffid-weekly",
    name: "MEMBRESÍA SEMANAL",
    diamonds: "MEMBRESÍA SEMANAL 🎟️",
    price: 1.69,
    type: "membership",
  },
  {
    id: "ffid-210",
    name: "210 DIAMANTES",
    diamonds: "210💎",
    price: 1.71,
    type: "diamonds",
  },
  {
    id: "ffid-200",
    name: "200 DIAMANTES",
    diamonds: "200💎",
    price: 1.71,
    type: "diamonds",
  },
  {
    id: "ffid-280",
    name: "280 DIAMANTES",
    diamonds: "280💎",
    price: 2.26,
    type: "diamonds",
  },
  {
    id: "ffid-bp",
    name: "TARJETA BP",
    diamonds: "TARJETA BP 🎟️",
    price: 2.49,
    type: "pass",
  },
  {
    id: "ffid-355",
    name: "355 DIAMANTES",
    diamonds: "355💎",
    price: 2.65,
    type: "diamonds",
  },
  {
    id: "ffid-420",
    name: "420 DIAMANTES",
    diamonds: "420💎",
    price: 3.33,
    type: "diamonds",
  },
  {
    id: "ffid-500",
    name: "500 DIAMANTES",
    diamonds: "500💎",
    price: 3.92,
    type: "diamonds",
  },
  {
    id: "ffid-510",
    name: "510 DIAMANTES",
    diamonds: "510💎",
    price: 4.04,
    type: "diamonds",
  },
  {
    id: "ffid-565",
    name: "565 DIAMANTES",
    diamonds: "565💎",
    price: 4.41,
    type: "diamonds",
  },
  {
    id: "ffid-monthly",
    name: "MEMBRESÍA MENSUAL",
    diamonds: "MEMBRESÍA MENSUAL 🎟️",
    price: 4.88,
    type: "membership",
  },
  {
    id: "ffid-635",
    name: "635 DIAMANTES",
    diamonds: "635💎",
    price: 4.94,
    type: "diamonds",
  },
  {
    id: "ffid-720",
    name: "720 DIAMANTES",
    diamonds: "720💎",
    price: 5.20,
    type: "diamonds",
  },
  {
    id: "ffid-800",
    name: "800 DIAMANTES",
    diamonds: "800💎",
    price: 6.12,
    type: "diamonds",
  },
  {
    id: "ffid-860",
    name: "860 DIAMANTES",
    diamonds: "860💎",
    price: 6.56,
    type: "diamonds",
  },
  {
    id: "ffid-930",
    name: "930 DIAMANTES",
    diamonds: "930💎",
    price: 7.10,
    type: "diamonds",
  },
  {
    id: "ffid-1000",
    name: "1000 DIAMANTES",
    diamonds: "1000💎",
    price: 7.63,
    type: "diamonds",
  },
  {
    id: "ffid-1050",
    name: "1050 DIAMANTES",
    diamonds: "1050💎",
    price: 8.06,
    type: "diamonds",
  },
  {
    id: "ffid-1075",
    name: "1075 DIAMANTES",
    diamonds: "1075💎",
    price: 8.18,
    type: "diamonds",
  },
  {
    id: "ffid-1080",
    name: "1080 DIAMANTES",
    diamonds: "1080💎",
    price: 8.23,
    type: "diamonds",
  },
  {
    id: "ffid-1450",
    name: "1450 DIAMANTES",
    diamonds: "1450💎",
    price: 10.33,
    type: "diamonds",
  },
  {
    id: "ffid-2180",
    name: "2180 DIAMANTES",
    diamonds: "2180💎",
    price: 15.42,
    type: "diamonds",
  },
  {
    id: "ffid-2200",
    name: "2200 DIAMANTES",
    diamonds: "2200💎",
    price: 16.68,
    type: "diamonds",
  },
  {
    id: "ffid-3640",
    name: "3640 DIAMANTES",
    diamonds: "3640💎",
    price: 25.62,
    type: "diamonds",
  },
  {
    id: "ffid-7290",
    name: "7290 DIAMANTES",
    diamonds: "7290💎",
    price: 50.60,
    type: "diamonds",
  },
  {
    id: "ffid-36500",
    name: "36500 DIAMANTES",
    diamonds: "36500💎",
    price: 274.89,
    type: "diamonds",
  },
  {
    id: "ffid-73100",
    name: "73100 DIAMANTES",
    diamonds: "73100💎",
    price: 549.66,
    type: "diamonds",
  },
];

function FreeFireIdSelectContent() {
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

    if (!/^[0-9]+$/.test(cleanId)) {
      setError("El ID debe contener solamente números.");
      return;
    }

    if (cleanId.length < 4) {
      setError("El ID parece demasiado corto.");
      return;
    }

    const orderData = {
      game: "GARENA FREE FIRE (ID)",
      gameSlug: "free-fire-id",
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
      "/games/free-fire-id/confirm"
    );
  }

  return (
    <main className="select-page">

      <header className="select-header">

        <button
          type="button"
          className="select-back"
          onClick={() =>
            router.push("/games/free-fire-id")
          }
          aria-label="Volver"
        >
          ←
        </button>

        <div className="select-header-title">
          <span>GARENA FREE FIRE (ID)</span>
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
            src="/images/free-fire-latam.jpg"
            alt="Garena Free Fire Indonesia"
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
              : "🎟️"}{" "}

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
            router.push("/games/free-fire-id")
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


export default function FreeFireIdSelectPage() {
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
      <FreeFireIdSelectContent />
    </Suspense>
  );
}
