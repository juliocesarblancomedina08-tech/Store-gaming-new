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
  const [selectedOffer, setSelectedOffer] =
    useState<Offer | null>(null);
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
        throw new Error(
          "El catálogo no contiene ofertas válidas."
        );
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

        const { data: profile, error: profileError } =
          await supabase
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
            Number.isFinite(expiresAt) &&
              expiresAt > Date.now()
          );
        }
      } catch (err) {
        console.error("ERROR CARGANDO ESTADO VIP:", err);

        if (mounted) {
          setVipActive(false);
        }
      }
    }

    void loadVipStatus();

    return () => {
      mounted = false;
    };
  }, []);

  function getOfferPrice(offer: Offer) {
    return vipActive
      ? Number(
          (offer.supplierPrice + VIP_MARKUP).toFixed(4)
        )
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

    setTimeout(() => {
      document
        .getElementById("order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  async function createOrder(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (processing) return;

    setError("");
    setSuccess("");

    if (!selectedOffer) {
      setError("Selecciona una oferta.");
      return;
    }

    const cleanPlayerId = playerId.trim();

    if (!/^[0-9]{4,20}$/.test(cleanPlayerId)) {
      setError(
        "Introduce un ID de jugador válido, de 4 a 20 números."
      );
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

      const response = await fetch(
        "/api/topups/free-fire-id",
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
            retailPrice: getOfferPrice(selectedOffer),
            idempotencyKey: crypto.randomUUID(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "No se pudo crear el pedido."
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

      setTimeout(() => {
        document
          .getElementById("success-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
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
      <style jsx>{`
        .page {
          min-height: 100vh;
          padding-bottom: 35px;
          color: #fff;
          background:
            linear-gradient(
              rgba(0, 0, 0, 0.76),
              rgba(0, 0, 0, 0.9)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover fixed;
          font-family: Arial, Helvetica, sans-serif;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 8px;
          padding: 13px 14px;
          background: rgba(5, 5, 5, 0.96);
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
        }

        .header h1 {
          margin: 0;
          text-align: center;
          white-space: nowrap;
          font-size: 19px;
          font-weight: 900;
        }

        .back {
          justify-self: start;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 9px 12px;
          color: #fff;
          background: rgba(255, 255, 255, 0.07);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .vip-button {
          justify-self: end;
          border: 1px solid rgba(255, 190, 60, 0.35);
          border-radius: 10px;
          padding: 9px 10px;
          color: #ffd477;
          background: rgba(120, 75, 0, 0.2);
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
          cursor: pointer;
        }

        .vip-button.active {
          color: #ffe39a;
          background: rgba(160, 105, 0, 0.2);
          cursor: default;
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
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 13px;
          background: rgba(12, 12, 12, 0.9);
        }

        .notice strong {
          color: #fff;
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

        .toggle {
          display: flex;
          width: 100%;
          justify-content: space-between;
          margin-top: 14px;
          padding: 15px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          background: rgba(15, 15, 15, 0.95);
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .toggle span:last-child {
          color: #ff465b;
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
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 12px;
          background: rgba(10, 10, 10, 0.94);
          color: white;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s ease,
            background 0.15s ease;
        }

        .offer:hover {
          border-color: rgba(255, 48, 71, 0.65);
        }

        .offer.selected {
          border-color: #ff3047;
          background: rgba(70, 15, 23, 0.8);
        }

        .offer-icon {
          display: grid;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          place-items: center;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.07);
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
          flex-shrink: 0;
          color: #fff;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 900;
        }

        .message {
          padding: 15px;
          border-radius: 10px;
          background: rgba(15, 15, 15, 0.95);
          color: #ddd;
        }

        .order h2,
        .success h2 {
          margin-top: 0;
          font-size: 18px;
        }

        .order {
          scroll-margin-top: 85px;
        }

        .selected-offer {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 15px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
        }

        .selected-offer > span {
          font-size: 25px;
        }

        .selected-offer p {
          margin-bottom: 0;
          color: #ff6979;
          font-weight: 900;
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
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 10px;
          outline: none;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 15px;
        }

        input:focus {
          border-color: #ff3047;
        }

        input::placeholder {
          color: #777;
        }

        .help {
          margin: 0;
        }

        .error {
          padding: 10px;
          border: 1px solid rgba(255, 50, 50, 0.3);
          border-radius: 9px;
          background: rgba(90, 0, 0, 0.3);
          color: #ff9ca7;
          font-size: 13px;
        }

        .submit {
          width: 100%;
          margin-top: 8px;
          padding: 14px;
          border: 0;
          border-radius: 10px;
          background: #df2525;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .submit:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .success {
          border-color: rgba(57, 255, 130, 0.25);
          background: rgba(0, 40, 18, 0.88);
          scroll-margin-top: 85px;
        }

        .success p {
          color: #c9e8d5;
          font-size: 13px;
          line-height: 1.5;
          word-break: break-word;
        }

        .success strong {
          color: #fff;
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
          font-weight: 900;
        }

        footer small {
          display: block;
          margin-top: 5px;
          color: #777780;
          font-size: 10px;
          font-weight: 500;
        }

        @media (max-width: 480px) {
          .header {
            padding: 11px 9px;
            gap: 5px;
          }

          .header h1 {
            font-size: 15px;
          }

          .back {
            padding: 9px 8px;
            font-size: 11px;
          }

          .vip-button {
            padding: 9px 7px;
            font-size: 9px;
          }

          .banner {
            height: 180px;
          }

          .offer-info strong {
            font-size: 13px;
          }

          .price {
            font-size: 12px;
          }
        }
      `}</style>

      <header className="header">
        <button
          type="button"
          className="back"
          onClick={() => router.push("/top-up")}
          aria-label="Volver a la tienda"
        >
          ← Volver
        </button>

        <h1>FREE FIRE (ID)</h1>

        {vipActive ? (
          <div className="vip-button active">
            ⭐ VIP ACTIVO
          </div>
        ) : (
          <button
            type="button"
            className="vip-button"
            onClick={() => router.push("/vip")}
          >
            ⭐ COMPRAR VIP
          </button>
        )}
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
              <p className="message">
                Cargando ofertas...
              </p>
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
                    selectedOffer?.id === offer.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => selectOffer(offer)}
                >
                  <span className="offer-icon">
                    {offer.icon}
                  </span>

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
          <section
            className="order"
            id="order-section"
          >
            <h2>Confirmar selección</h2>

            <div className="selected-offer">
              <span>{selectedOffer.icon}</span>

              <div>
                <strong>{selectedOffer.name}</strong>
                <p>
                  ${formatOfferPrice(selectedOffer)}
                </p>
              </div>
            </div>

            <form onSubmit={createOrder}>
              <label htmlFor="playerId">
                ID DE JUGADOR
              </label>

              <input
                id="playerId"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Introduce tu ID de jugador"
                value={playerId}
                onChange={(event) => {
                  setPlayerId(
                    event.target.value.replace(/\D/g, "")
                  );
                  setError("");
                }}
                disabled={processing}
                maxLength={20}
                required
              />

              <p className="help">
                Comprueba que tu cuenta pertenece a la
                región Indonesia.
              </p>

              {error && (
                <p className="error">{error}</p>
              )}

              <button
                className="submit"
                type="submit"
                disabled={processing}
              >
                {processing
                  ? "PROCESANDO PEDIDO..."
                  : "FINALIZAR ORDEN"}
              </button>
            </form>
          </section>
        )}

        {success && (
          <section
            className="success"
            id="success-section"
          >
            <h2>✅ Pedido creado</h2>

            <p>{success}</p>

            {orderNumber && (
              <p>
                Número de orden:{" "}
                <strong>{orderNumber}</strong>
              </p>
            )}

            <button
              type="button"
              className="submit"
              onClick={() => router.push("/orders")}
            >
              📋 Ver mis pedidos
            </button>

            <button
              type="button"
              className="submit"
              onClick={() => router.push("/top-up")}
            >
              🛒 Volver a la tienda
            </button>
          </section>
        )}

        <section className="info">
          <article>
            <span>⚡</span>
            <div>
              <strong>ENTREGA AUTOMÁTICA</strong>
              <p>
                El producto se entrega directamente a
                tu cuenta.
              </p>
            </div>
          </article>

          <article>
            <span>🔒</span>
            <div>
              <strong>COMPRA SEGURA</strong>
              <p>
                Revisa los datos antes de confirmar tu
                pedido.
              </p>
            </div>
          </article>

          <article>
            <span>🇮🇩</span>
            <div>
              <strong>REGIÓN INDONESIA</strong>
              <p>
                Solo para cuentas registradas en esta
                región.
              </p>
            </div>
          </article>
        </section>

        <footer>
          🛒 STORE GAMING 🎮
          <small>FREE FIRE INDONESIA</small>
        </footer>
      </div>
    </main>
  );
}
