"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { FREE_FIRE_ID } from "../../../lib/games/free-fire-id";

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const VIP_MARKUP = 0.08;

type Offer = {
id: string;
supplierOfferId: string;
name: string;
display: string;
price: number;
supplierPrice: number;
icon: string;
};

export default function FreeFireIdPage() {
const router = useRouter();

const [offers, setOffers] = useState<Offer[]>([]);
const [loading, setLoading] = useState(true);
const [offersOpen, setOffersOpen] = useState(true);
const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
const [playerId, setPlayerId] = useState("");
const [processing, setProcessing] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");
const [orderNumber, setOrderNumber] = useState("");
const [vipActive, setVipActive] = useState(false);

useEffect(() => {
try {
const catalogOffers: Offer[] = FREE_FIRE_ID.offers
.map((offer) => ({
id: offer.id,
supplierOfferId: offer.id,
name: offer.name,
display: offer.displayName,
price: Number(offer.price),
supplierPrice: Number(offer.supplierPrice),
icon: offer.icon,
}))
.filter(
(offer) =>
Boolean(offer.id) &&
Boolean(offer.name) &&
Number.isFinite(offer.price) &&
offer.price > 0 &&
Number.isFinite(offer.supplierPrice) &&
offer.supplierPrice > 0
);

  if (catalogOffers.length === 0) {
    throw new Error("El catálogo no contiene ofertas válidas.");
  }

  setOffers(catalogOffers);
} catch (err) {
  console.error("Error cargando Free Fire ID:", err);
  setError(
    err instanceof Error
      ? err.message
      : "No se pudo cargar el catálogo."
  );
} finally {
  setLoading(false);
}

}, []);

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("vip_expires_at")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "ERROR CONSULTANDO VIP FREE FIRE ID:",
        profileError
      );
    }

    const expiresAt = profile?.vip_expires_at
      ? new Date(profile.vip_expires_at).getTime()
      : 0;

    if (mounted) {
      setVipActive(
        Number.isFinite(expiresAt) && expiresAt > Date.now()
      );
    }
  } catch (err) {
    console.error("ERROR CARGANDO ESTADO VIP:", err);
    if (mounted) setVipActive(false);
  }
}

loadVipStatus();

return () => {
  mounted = false;
};

}, []);

function getOfferPrice(offer: Offer) {
return vipActive
? Number((offer.supplierPrice + VIP_MARKUP).toFixed(4))
: offer.price;
}

function formatOfferPrice(offer: Offer) {
return getOfferPrice(offer).toFixed(4);
}

function selectOffer(offer: Offer) {
setSelectedOffer(offer);
setPlayerId("");
setError("");
setSuccess("");
setOrderNumber("");
}

async function createOrder(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
setError("");
setSuccess("");

if (!selectedOffer) {
  setError("Selecciona una oferta.");
  return;
}

const cleanPlayerId = playerId.trim();

if (!/^[0-9]{4,20}$/.test(cleanPlayerId)) {
  setError("Introduce un ID de jugador válido, de 4 a 20 números.");
  return;
}

setProcessing(true);

try {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    router.push("/login");
    return;
  }

  const response = await fetch("/api/topups/free-fire-id", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      offerId: selectedOffer.supplierOfferId,
      offerName: selectedOffer.name,
      playerId: cleanPlayerId,
      retailPrice: getOfferPrice(selectedOffer),
      idempotencyKey: crypto.randomUUID(),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || "No se pudo crear el pedido."
    );
  }

  const number =
    data.orderNumber ??
    data.order_number ??
    data.order?.order_number ??
    data.order?.id ??
    data.id ??
    "";

  setOrderNumber(String(number));
  setSuccess("Tu pedido fue creado correctamente.");
  setSelectedOffer(null);
  setPlayerId("");
} catch (err) {
  console.error("Error creando pedido:", err);
  setError(
    err instanceof Error
      ? err.message
      : "Ocurrió un error al crear el pedido."
  );
} finally {
  setProcessing(false);
}

}

return (
<main className="page">
<header className="header">
<button
type="button"
className="back"
onClick={() => router.push("/top-up")}
aria-label="Volver"
>
←
</button>
<h1>Free Fire (ID)</h1>
<span className="header-space" />
</header>

  <div className="content">
    <img
      className="banner"
      src={FREE_FIRE_ID.image}
      alt="Free Fire Indonesia"
    />

    <section className="notice">
      <strong>🇮🇩 Región Indonesia</strong>
      <p>{FREE_FIRE_ID.note}</p>
    </section>

    {vipActive && (
      <div className="vip-notice">
        <strong>⭐ PRECIO VIP ACTIVADO</strong>
        <span>Disfrutas de precios especiales por ser miembro VIP.</span>
      </div>
    )}

    <button
      type="button"
      className="toggle"
      onClick={() => setOffersOpen((open) => !open)}
    >
      <span>💎 Ver ofertas disponibles</span>
      <span>{offersOpen ? "▲" : "▼"}</span>
    </button>

    {offersOpen && (
      <section className="offers">
        {loading ? (
          <p className="message">Cargando ofertas...</p>
        ) : offers.length === 0 ? (
          <p className="message">
            {error || "No hay ofertas disponibles."}
          </p>
        ) : (
          offers.map((offer) => (
            <button
              type="button"
              key={offer.id}
              className={`offer ${
                selectedOffer?.id === offer.id ? "selected" : ""
              }`}
              onClick={() => selectOffer(offer)}
            >
              <span className="offer-icon">{offer.icon}</span>
              <span className="offer-info">
                <strong>{offer.display}</strong>
                <small>{offer.name}</small>
              </span>
              <strong className="price">
                ${formatOfferPrice(offer)}
              </strong>
            </button>
          ))
        )}
      </section>
    )}

    {selectedOffer && (
      <section className="order">
        <h2>Confirmar selección</h2>

        <div className="selected-offer">
          <span>{selectedOffer.icon}</span>
          <div>
            <strong>{selectedOffer.name}</strong>
            <p>${formatOfferPrice(selectedOffer)}</p>
          </div>
        </div>

        <form onSubmit={createOrder}>
          <label htmlFor="playerId">ID de jugador</label>
          <input
            id="playerId"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Introduce tu ID de jugador"
            value={playerId}
            onChange={(event) => setPlayerId(event.target.value)}
            disabled={processing}
            required
          />

          <p className="help">
            Comprueba que tu cuenta pertenece a la región Indonesia.
          </p>

          {error && <p className="error">{error}</p>}

          <button
            className="submit"
            type="submit"
            disabled={processing}
          >
            {processing ? "Procesando pedido..." : "FINALIZAR ORDEN"}
          </button>
        </form>
      </section>
    )}

    {success && (
      <section className="success">
        <h2>✅ Pedido creado</h2>
        <p>{success}</p>
        {orderNumber && (
          <p>
            Número de orden: <strong>{orderNumber}</strong>
          </p>
        )}
        <button
          type="button"
          className="submit"
          onClick={() => router.push("/orders")}
        >
          Ver mis pedidos
        </button>
      </section>
    )}

    <section className="info">
      <article>
        <span>⚡</span>
        <div>
          <strong>ENTREGA AUTOMÁTICA</strong>
          <p>El producto se entrega directamente a tu cuenta.</p>
        </div>
      </article>
      <article>
        <span>🔒</span>
        <div>
          <strong>COMPRA SEGURA</strong>
          <p>Revisa los datos antes de confirmar tu pedido.</p>
        </div>
      </article>
      <article>
        <span>🇮🇩</span>
        <div>
          <strong>REGIÓN INDONESIA</strong>
          <p>Solo para cuentas registradas en esta región.</p>
        </div>
      </article>
    </section>

    <footer>
      🛒 STORE GAMING 🎮
      <small>FREE FIRE INDONESIA</small>
    </footer>
  </div>

  <style jsx>{`
    .page {
      min-height: 100vh;
      padding-bottom: 30px;
      color: #fff;
      background: #101014;
    }

    .header {
      position: sticky;
      top: 0;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #09090b;
      border-bottom: 1px solid #29292e;
    }

    .header h1 {
      margin: 0;
      font-size: 19px;
      font-weight: 800;
    }

    .back,
    .toggle,
    .offer,
    .submit {
      cursor: pointer;
    }

    .back {
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 10px;
      background: #222228;
      color: white;
      font-size: 25px;
    }

    .header-space {
      width: 40px;
    }

    .content {
      width: min(100% - 24px, 680px);
      margin: 0 auto;
    }

    .banner {
      display: block;
      width: calc(100% + 24px);
      height: 210px;
      margin-left: -12px;
      object-fit: cover;
    }

    .notice,
    .order,
    .success,
    .info article {
      margin-top: 14px;
      padding: 15px;
      border: 1px solid #2b2b32;
      border-radius: 13px;
      background: #19191f;
    }

    .notice p,
    .info p,
    .help {
      color: #b9b9c2;
      font-size: 13px;
      line-height: 1.5;
    }

    .notice p {
      margin-bottom: 0;
    }

    .vip-notice {
      display: grid;
      gap: 5px;
      margin-top: 12px;
      padding: 11px 13px;
      border: 1px solid #8c6825;
      border-radius: 11px;
      background: #292114;
    }

    .vip-notice strong {
      color: #ffd477;
      font-size: 12px;
    }

    .vip-notice span {
      color: #d4c5a5;
      font-size: 11px;
    }

    .toggle {
      display: flex;
      width: 100%;
      justify-content: space-between;
      margin-top: 14px;
      padding: 15px;
      border: 1px solid #303038;
      border-radius: 12px;
      background: #202027;
      color: white;
      font-weight: 800;
    }

    .offers {
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }

    .offer {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-height: 65px;
      padding: 10px;
      border: 1px solid #303038;
      border-radius: 12px;
      background: #19191f;
      color: white;
      text-align: left;
    }

    .offer.selected {
      border-color: #ff3047;
      background: #30171d;
    }

    .offer-icon {
      display: grid;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      place-items: center;
      border-radius: 10px;
      background: #292930;
      font-size: 22px;
    }

    .offer-info {
      display: grid;
      flex: 1;
      gap: 4px;
      min-width: 0;
    }

    .offer-info strong {
      font-size: 14px;
    }

    .offer-info small {
      color: #a2a2ad;
      font-size: 11px;
    }

    .price {
      white-space: nowrap;
      font-size: 13px;
    }

    .message {
      padding: 15px;
      border-radius: 10px;
      background: #19191f;
      color: #ddd;
    }

    .order h2,
    .success h2 {
      margin-top: 0;
      font-size: 18px;
    }

    .selected-offer {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 15px;
      padding: 12px;
      border-radius: 10px;
      background: #25252c;
    }

    .selected-offer > span {
      font-size: 25px;
    }

    .selected-offer p {
      margin-bottom: 0;
      color: #ff6979;
      font-weight: 800;
    }

    form {
      display: grid;
      gap: 9px;
    }

    label {
      font-size: 13px;
      font-weight: 800;
    }

    input {
      width: 100%;
      box-sizing: border-box;
      padding: 13px;
      border: 1px solid #3a3a43;
      border-radius: 10px;
      outline: none;
      background: #101014;
      color: white;
      font-size: 15px;
    }

    input:focus {
      border-color: #ff3047;
    }

    .help {
      margin: 0;
    }

    .error {
      padding: 10px;
      border-radius: 9px;
      background: #3a151b;
      color: #ff9ca7;
      font-size: 13px;
    }

    .submit {
      width: 100%;
      margin-top: 8px;
      padding: 14px;
      border: 0;
      border-radius: 10px;
      background: #e52239;
      color: white;
      font-weight: 900;
    }

    .submit:disabled {
      opacity: 0.6;
      cursor: wait;
    }

    .success {
      border-color: #276c42;
    }

    .info {
      margin-top: 16px;
    }

    .info article {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .info article > span {
      font-size: 22px;
    }

    .info p {
      margin-bottom: 0;
    }

    footer {
      padding: 24px 10px 5px;
      color: #c7c7ce;
      text-align: center;
      font-size: 13px;
      font-weight: 800;
    }

    footer small {
      display: block;
      margin-top: 5px;
      color: #777780;
      font-size: 10px;
      font-weight: 500;
    }

    @media (max-width: 480px) {
      .banner {
        height: 180px;
      }

      .header h1 {
        font-size: 17px;
      }

      .offer-info strong {
        font-size: 13px;
      }

      .price {
        font-size: 12px;
      }
    }
  `}</style>
</main>

);
}
