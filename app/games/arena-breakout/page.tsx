"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STORE_MARGIN = 0.2;
const VIP_MARKUP = 0.08;

type SupplierOffer = {
id: string;
name: string;
displayName?: string;
supplierPrice: string | number;
price: string | number;
};

type ArenaOffer = {
id: string;
supplierOfferId: string;
name: string;
display: string;
price: number;
supplierPrice: number;
icon: string;
};

function getIcon(name: string) {
const lower = name.toLowerCase();

if (
lower.includes("pass") ||
lower.includes("pase") ||
lower.includes("case") ||
lower.includes("caja") ||
lower.includes("privileges") ||
lower.includes("privilegios") ||
lower.includes("select")
) {
return "🎟️";
}

return "🪙";
}

function getDisplay(name: string) {
const lower = name.toLowerCase();

if (lower.includes("66 bonds")) {
return "66🪙";
}

if (lower.includes("335 bonds")) {
return "335🪙";
}

if (lower.includes("675 bonds")) {
return "675🪙";
}

if (lower.includes("1690 bonds")) {
return "1690🪙";
}

if (lower.includes("3400 bonds")) {
return "3400🪙";
}

if (lower.includes("6820 bonds")) {
return "6820🪙";
}

if (lower.includes("beginner select")) {
return "BEGINNER SELECT";
}

if (
lower.includes(
"monthly advanced battle pass activation pass"
)
) {
return "PASE AVANZADO MENSUAL 🎟️";
}

if (lower.includes("bulletproof case privileges")) {
return "PRIVILEGIOS CAJA A PRUEBA DE BALAS 🎟️";
}

if (lower.includes("bulletproof case 30d")) {
return "CAJA A PRUEBA DE BALAS 30D 🎟️";
}

if (
lower.includes(
"monthly premium battle pass activation pass"
)
) {
return "PASE PREMIUM MENSUAL 🎟️";
}

if (lower.includes("composite case privileges")) {
return "PRIVILEGIOS CAJA COMPUESTA 🎟️";
}

if (lower.includes("composition case 30d")) {
return "CAJA COMPUESTA 30D 🎟️";
}

if (
lower.includes(
"quarterly premium battle pass bundle activation pass bundle"
)
) {
return "PASE PREMIUM TRIMESTRAL 🎟️";
}

return name;
}

export default function ArenaBreakoutPage() {
const router = useRouter();

const [offers, setOffers] = useState<ArenaOffer[]>([]);
const [loadingOffers, setLoadingOffers] = useState(true);
const [offersOpen, setOffersOpen] = useState(false);

const [selectedOffer, setSelectedOffer] =
useState<ArenaOffer | null>(null);

const [playerId, setPlayerId] = useState("");
const [processing, setProcessing] = useState(false);
const [error, setError] = useState("");

const [orderCreated, setOrderCreated] = useState(false);
const [orderNumber, setOrderNumber] = useState("");
const [vipActive, setVipActive] = useState(false);

useEffect(() => {
let mounted = true;

async function loadVipStatus() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      if (mounted) setVipActive(false);
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("vip_expires_at")
        .eq("id", session.user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "ERROR CONSULTANDO VIP ARENA BREAKOUT:",
        profileError
      );
    }

    const expiresAt = profile?.vip_expires_at
      ? new Date(profile.vip_expires_at).getTime()
      : 0;

    if (mounted) {
      setVipActive(
        Number.isFinite(expiresAt) &&
          expiresAt > Date.now()
      );
    }
  } catch (err) {
    console.error(
      "ERROR CARGANDO ESTADO VIP ARENA BREAKOUT:",
      err
    );

    if (mounted) setVipActive(false);
  }
}

loadVipStatus();

return () => {
  mounted = false;
};

}, []);

function getOfferPrice(offer: ArenaOffer) {
if (vipActive) {
return Number(
(offer.supplierPrice + VIP_MARKUP).toFixed(4)
);
}

return offer.price;

}

function formatOfferPrice(offer: ArenaOffer) {
return getOfferPrice(offer).toFixed(4);
}

useEffect(() => {
let cancelled = false;

async function loadOffers() {
  try {
    setLoadingOffers(true);
    setError("");

    const response = await fetch(
      "/api/topups/arena-breakout",
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok || !data?.ok) {
      throw new Error(
        data?.error || "No se pudo cargar el catálogo."
      );
    }

    const supplierOffers: SupplierOffer[] =
      Array.isArray(data.offers)
        ? data.offers
        : [];

    const normalized: ArenaOffer[] =
      supplierOffers
        .map((offer) => {
          const supplierPrice = Number(
            offer.supplierPrice
          );

          const apiPrice = Number(offer.price);

          return {
            id: offer.id,
            supplierOfferId: offer.id,
            name: offer.name,
            display:
              typeof offer.displayName === "string" &&
              offer.displayName.trim()
                ? offer.displayName
                : getDisplay(offer.name),
            supplierPrice,
            price:
              Number.isFinite(apiPrice) &&
              apiPrice > 0
                ? apiPrice
                : Math.round(
                    (supplierPrice + STORE_MARGIN) *
                      10000
                  ) / 10000,
            icon: getIcon(offer.name),
          };
        })
        .filter(
          (offer) =>
            offer.id &&
            offer.name &&
            Number.isFinite(offer.supplierPrice) &&
            offer.supplierPrice > 0
        );

    if (!cancelled) {
      setOffers(normalized);
    }
  } catch (err) {
    console.error(err);

    if (!cancelled) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el catálogo."
      );
    }
  } finally {
    if (!cancelled) {
      setLoadingOffers(false);
    }
  }
}

loadOffers();

return () => {
  cancelled = true;
};

}, []);

function handleSelectOffer(offer: ArenaOffer) {
if (
!offer.supplierPrice ||
offer.supplierPrice <= 0
) {
setError(
"Esta oferta todavía no tiene un precio disponible."
);
return;
}

setSelectedOffer(offer);
setError("");
setOrderCreated(false);
setOrderNumber("");

}

async function createOrder() {
if (!selectedOffer) {
setError("Selecciona una oferta.");
return;
}

const cleanPlayerId = playerId.trim();

if (!cleanPlayerId) {
  setError("Introduce tu Player ID.");
  return;
}

if (!/^[0-9]+$/.test(cleanPlayerId)) {
  setError(
    "El Player ID solo puede contener números."
  );
  return;
}

if (cleanPlayerId.length < 4) {
  setError(
    "El Player ID debe tener al menos 4 números."
  );
  return;
}

if (cleanPlayerId.length > 32) {
  setError(
    "El Player ID no puede superar 32 números."
  );
  return;
}

if (
  !selectedOffer.supplierPrice ||
  selectedOffer.supplierPrice <= 0
) {
  setError(
    "Esta oferta todavía no tiene un precio disponible."
  );
  return;
}

try {
  setProcessing(true);
  setError("");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    router.push("/login");
    return;
  }

  const finalPrice = getOfferPrice(selectedOffer);

  const response = await fetch(
    "/api/topups/arena-breakout",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        offerId: selectedOffer.supplierOfferId,
        offerName: selectedOffer.name,
        playerId: cleanPlayerId,
        retailPrice: finalPrice,
        idempotencyKey: crypto.randomUUID(),
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        "No se pudo crear el pedido."
    );
  }

  const createdOrderNumber =
    data.orderNumber ||
    data.order_number ||
    data.order?.order_number ||
    data.order?.id ||
    "";

  setOrderNumber(
    String(createdOrderNumber)
  );

  setOrderCreated(true);
  setSelectedOffer(null);
  setPlayerId("");

  try {
    localStorage.setItem(
      "last_arena_breakout_order",
      JSON.stringify({
        orderNumber: createdOrderNumber,
        offerId:
          selectedOffer.supplierOfferId,
        offerName: selectedOffer.name,
        playerId: cleanPlayerId,
        retailPrice: finalPrice,
        createdAt: new Date().toISOString(),
      })
    );
  } catch {
    // No bloquear el pedido si localStorage no está disponible.
  }
} catch (err) {
  console.error(err);

  setError(
    err instanceof Error
      ? err.message
      : "No se pudo crear el pedido."
  );
} finally {
  setProcessing(false);
}

}

function handleSubmit(
event: FormEvent<HTMLFormElement>
) {
event.preventDefault();

void createOrder();

}

return (
<main className="arena-breakout-page">
<header className="arena-breakout-header">
<button
type="button"
className="arena-back-button"
onClick={() => router.push("/top-up")}
>
←
</button>

    <h1>Arena Breakout</h1>

    <div className="arena-header-space" />
  </header>

  <section className="arena-breakout-content">
    <div className="arena-breakout-banner">
      <img
        src="/images/arena-breakout.jpg"
        alt="Arena Breakout"
      />
    </div>

    <div className="arena-breakout-note">
      <strong>🌎 Región Global</strong>

      <p>
        Recarga de Arena Breakout. La moneda se
        entrega directamente a tu cuenta después de
        realizar el pedido.
      </p>
    </div>

    {vipActive && (
      <div className="arena-vip-notice">
        <strong>⭐ PRECIO VIP ACTIVADO</strong>
        <span>
          Disfrutas de precios especiales por ser miembro VIP.
        </span>
      </div>
    )}

    <button
      type="button"
      className="arena-offers-toggle"
      onClick={() => {
        setOffersOpen((value) => !value);
        setError("");
      }}
    >
      <span>
        ✏️ Presione para ver ofertas
      </span>

      <span className="arena-offers-arrow">
        {offersOpen ? "▲" : "▼"}
      </span>
    </button>

    {offersOpen && (
      <section className="arena-offers-section">
        {loadingOffers ? (
          <div className="arena-loading">
            Cargando ofertas...
          </div>
        ) : error && offers.length === 0 ? (
          <div className="arena-error">
            {error}
          </div>
        ) : offers.length === 0 ? (
          <div className="arena-error">
            No hay ofertas disponibles.
          </div>
        ) : (
          <div className="arena-offers-list">
            {offers.map((offer) => {
              const unavailable =
                !offer.supplierPrice ||
                offer.supplierPrice <= 0;

              const selected =
                selectedOffer?.supplierOfferId ===
                offer.supplierOfferId;

              return (
                <button
                  key={offer.supplierOfferId}
                  type="button"
                  className={`arena-offer ${
                    selected ? "selected" : ""
                  } ${
                    unavailable
                      ? "unavailable"
                      : ""
                  }`}
                  disabled={unavailable}
                  onClick={() =>
                    handleSelectOffer(offer)
                  }
                >
                  <div className="arena-offer-left">
                    <span className="arena-offer-icon">
                      {offer.icon}
                    </span>

                    <div>
                      <strong>
                        {offer.display}
                      </strong>

                      <small>
                        {offer.name}
                      </small>
                    </div>
                  </div>

                  <div className="arena-offer-price">
                    {unavailable
                      ? "NO DISPONIBLE"
                      : `${formatOfferPrice(offer)}$`}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    )}

    {selectedOffer && !orderCreated && (
      <section
        id="arena-order-form"
        className="arena-order-section"
      >
        <div className="arena-selected-offer">
          <span>
            {selectedOffer.icon}
          </span>

          <div>
            <strong>
              {selectedOffer.name}
            </strong>

            <span>
              {formatOfferPrice(selectedOffer)}$
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="arena-player-id">
            ID del jugador
          </label>

          <input
            id="arena-player-id"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Introduzca su Player ID"
            value={playerId}
            onChange={(event) =>
              setPlayerId(event.target.value)
            }
            disabled={processing}
          />

          {error && (
            <div className="arena-form-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="arena-create-order-button"
            disabled={processing}
          >
            {processing
              ? "FINALIZANDO ORDEN..."
              : "FINALIZAR ORDEN"}
          </button>
        </form>
      </section>
    )}

    {orderCreated && (
      <section className="arena-success-section">
        <div className="arena-success-icon">
          ✓
        </div>

        <h2>Orden creada</h2>

        <p>
          Tu pedido de Arena Breakout fue creado
          correctamente.
        </p>

        {orderNumber && (
          <div className="arena-order-number">
            <span>Número de orden</span>

            <strong>
              {orderNumber}
            </strong>
          </div>
        )}

        <button
          type="button"
          className="arena-review-button"
          onClick={() =>
            router.push("/orders")
          }
        >
          Revisar orden
        </button>

        <button
          type="button"
          className="arena-store-button"
          onClick={() =>
            router.push("/top-up")
          }
        >
          Volver a la tienda
        </button>
      </section>
    )}
  </section>

  <footer className="arena-breakout-footer">
    🛒 STORE GAMING 🎮
  </footer>

  <style jsx>{`
    .arena-breakout-page {
      min-height: 100vh;
      color: #fff;
      background:
        linear-gradient(
          rgba(0, 0, 0, 0.72),
          rgba(0, 0, 0, 0.86)
        ),
        url("/images/battle-royale-bg.jpg")
          center / cover fixed;
      padding-bottom: 30px;
    }

    .arena-breakout-header {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 58px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.88);
      border-bottom: 1px solid
        rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }

    .arena-breakout-header h1 {
      margin: 0;
      font-size: 19px;
      font-weight: 800;
      text-align: center;
    }

    .arena-back-button {
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      font-size: 25px;
      cursor: pointer;
    }

    .arena-header-space {
      width: 40px;
    }

    .arena-breakout-content {
      width: min(100%, 680px);
      margin: 0 auto;
      padding: 0 12px 30px;
    }

    .arena-breakout-banner {
      width: calc(100% + 24px);
      margin-left: -12px;
      overflow: hidden;
    }

    .arena-breakout-banner img {
      display: block;
      width: 100%;
      height: 210px;
      object-fit: cover;
    }

    .arena-breakout-note {
      margin-top: 14px;
      padding: 14px;
      border-radius: 14px;
      background: rgba(0, 0, 0, 0.68);
      border: 1px solid
        rgba(255, 255, 255, 0.1);
    }

    .arena-breakout-note strong {
      color: #fff;
      font-size: 15px;
    }

    .arena-breakout-note p {
      margin: 7px 0 0;
      color: #d8d8d8;
      font-size: 13px;
      line-height: 1.5;
    }

    .arena-vip-notice {
      display: grid;
      gap: 5px;
      margin-top: 12px;
      padding: 11px 13px;
      border: 1px solid #8c6825;
      border-radius: 11px;
      background: #292114;
    }

    .arena-vip-notice strong {
      color: #ffd477;
      font-size: 12px;
    }

    .arena-vip-notice span {
      color: #d4c5a5;
      font-size: 11px;
    }

    .arena-offers-toggle {
      width: 100%;
      margin-top: 14px;
      padding: 15px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid
        rgba(255, 255, 255, 0.12);
      border-radius: 13px;
      background: rgba(0, 0, 0, 0.78);
      color: #fff;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
    }

    .arena-offers-arrow {
      font-size: 12px;
    }

    .arena-offers-section {
      margin-top: 10px;
    }

    .arena-offers-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .arena-offer {
      width: 100%;
      min-height: 65px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border: 1px solid
        rgba(255, 255, 255, 0.1);
      border-radius: 13px;
      background: rgba(0, 0, 0, 0.78);
      color: #fff;
      text-align: left;
      cursor: pointer;
      transition: 0.15s ease;
    }

    .arena-offer:active {
      transform: scale(0.98);
    }

    .arena-offer.selected {
      border-color: rgba(
        229,
        9,
        20,
        0.7
      );
      background:
        linear-gradient(
          135deg,
          rgba(120, 0, 0, 0.38),
          rgba(0, 0, 0, 0.82)
        );
      box-shadow:
        0 0 0 1px
          rgba(229, 9, 20, 0.25),
        0 8px 25px
          rgba(0, 0, 0, 0.25);
    }

    .arena-offer.unavailable {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .arena-offer-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .arena-offer-icon {
      width: 38px;
      height: 38px;
      flex: 0 0 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: rgba(
        255,
        255,
        255,
        0.08
      );
      font-size: 21px;
    }

    .arena-offer-left strong {
      display: block;
      font-size: 14px;
    }

    .arena-offer-left small {
      display: block;
      margin-top: 3px;
      color: #aaa;
      font-size: 11px;
      line-height: 1.35;
    }

    .arena-offer-price {
      flex-shrink: 0;
      color: #fff;
      font-size: 14px;
      font-weight: 900;
    }

    .arena-loading,
    .arena-error {
      padding: 18px;
      border-radius: 13px;
      background: rgba(0, 0, 0, 0.78);
      text-align: center;
      font-size: 14px;
    }

    .arena-error {
      color: #ff8e8e;
      border: 1px solid
        rgba(255, 70, 70, 0.35);
    }

    .arena-order-section {
      margin-top: 16px;
      padding: 16px;
      border-radius: 15px;
      background: rgba(0, 0, 0, 0.82);
      border: 1px solid
        rgba(255, 255, 255, 0.1);
    }

    .arena-selected-offer {
      display: flex;
      align-items: center;
      gap: 11px;
      margin-bottom: 15px;
      padding: 12px;
      border-radius: 12px;
      background: rgba(
        255,
        255,
        255,
        0.06
      );
    }

    .arena-selected-offer > span {
      font-size: 25px;
    }

    .arena-selected-offer div {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .arena-selected-offer strong {
      font-size: 14px;
    }

    .arena-selected-offer div span {
      font-weight: 900;
      white-space: nowrap;
    }

    .arena-order-section form {
      display: flex;
      flex-direction: column;
    }

    .arena-order-section label {
      margin-bottom: 7px;
      font-size: 13px;
      font-weight: 800;
    }

    .arena-order-section input {
      width: 100%;
      box-sizing: border-box;
      padding: 13px;
      border: 1px solid
        rgba(255, 255, 255, 0.16);
      border-radius: 11px;
      outline: none;
      background: rgba(
        255,
        255,
        255,
        0.07
      );
      color: #fff;
      font-size: 15px;
    }

    .arena-order-section input::placeholder {
      color: #888;
    }

    .arena-form-error {
      margin-top: 8px;
      padding: 9px;
      border-radius: 9px;
      background: rgba(150, 0, 0, 0.25);
      color: #ff9b9b;
      font-size: 12px;
    }

    .arena-create-order-button,
    .arena-review-button,
    .arena-store-button {
      width: 100%;
      margin-top: 12px;
      padding: 13px;
      border: 0;
      border-radius: 11px;
      font-weight: 900;
      cursor: pointer;
    }

    .arena-create-order-button {
      background: #d71920;
      color: #fff;
    }

    .arena-create-order-button:disabled {
      opacity: 0.6;
      cursor: wait;
    }

    .arena-success-section {
      margin-top: 16px;
      padding: 22px 16px;
      border-radius: 15px;
      background: rgba(0, 0, 0, 0.86);
      border: 1px solid
        rgba(60, 220, 120, 0.3);
      text-align: center;
    }

    .arena-success-icon {
      width: 62px;
      height: 62px;
      margin: 0 auto 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #22c55e;
      color: #fff;
      font-size: 34px;
      font-weight: 900;
      box-shadow: 0 0 25px
        rgba(34, 197, 94, 0.35);
    }

    .arena-success-section h2 {
      margin: 0;
      font-size: 21px;
    }

    .arena-success-section p {
      margin: 8px 0 0;
      color: #cfcfcf;
      font-size: 13px;
      line-height: 1.5;
    }

    .arena-order-number {
      margin-top: 15px;
      padding: 12px;
      border-radius: 11px;
      background: rgba(
        255,
        255,
        255,
        0.06
      );
    }

    .arena-order-number span {
      display: block;
      color: #999;
      font-size: 11px;
    }

    .arena-order-number strong {
      display: block;
      margin-top: 4px;
      font-size: 16px;
      word-break: break-all;
    }

    .arena-review-button {
      background: #fff;
      color: #111;
    }

    .arena-store-button {
      background: rgba(
        255,
        255,
        255,
        0.08
      );
      color: #fff;
      border: 1px solid
        rgba(255, 255, 255, 0.12);
    }

    .arena-breakout-footer {
      padding: 20px 12px 5px;
      color: #888;
      font-size: 12px;
      text-align: center;
    }

    @media (max-width: 480px) {
      .arena-breakout-header h1 {
        font-size: 17px;
      }

      .arena-breakout-banner img {
        height: 190px;
      }

      .arena-offer {
        min-height: 62px;
        padding: 9px 10px;
      }

      .arena-offer-left strong {
        font-size: 13px;
      }

      .arena-offer-left small {
        font-size: 10px;
      }

      .arena-offer-price {
        font-size: 13px;
      }
    }
  `}</style>
</main>

);
}
