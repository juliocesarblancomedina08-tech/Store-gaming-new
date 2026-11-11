
"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  LEAGUE_OF_LEGENDS_ID,
  LeagueOfLegendsIdOffer,
} from "../../../lib/games/league-of-legends-id";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LeagueOfLegendsIdPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<LeagueOfLegendsIdOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] =
    useState<LeagueOfLegendsIdOffer | null>(null);
  const [gameId, setGameId] = useState("");
  const [serverId, setServerId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [vipActive, setVipActive] = useState(false);

  // Consultar estado VIP
  useEffect(() => {
    let active = true;

    async function checkVipStatus() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (active) setVipActive(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("vip_expires_at")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        const expiration = data?.vip_expires_at
          ? new Date(data.vip_expires_at).getTime()
          : 0;

        if (active) {
          setVipActive(expiration > Date.now());
        }
      } catch (err) {
        console.error("Error consultando VIP:", err);

        if (active) setVipActive(false);
      }
    }

    checkVipStatus();

    return () => {
      active = false;
    };
  }, []);

  // Cargar ofertas
  useEffect(() => {
    let active = true;

    async function loadOffers() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/topups/league-of-legends-id",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "No se pudieron cargar las ofertas."
          );
        }

        if (active) {
          setOffers(
            Array.isArray(result.offers) ? result.offers : []
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar las ofertas."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOffers();

    return () => {
      active = false;
    };
  }, []);

  async function handlePurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedOffer) {
      setError("Selecciona una oferta.");
      return;
    }

    if (!gameId.trim() || !serverId.trim()) {
      setError("Completa tu ID de jugador y el servidor.");
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        "/api/topups/league-of-legends-id",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            offerId: selectedOffer.id,
            gameId: gameId.trim(),
            serverId: serverId.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "No se pudo procesar el pedido."
        );
      }

      setSuccess(
        result.message || "Pedido enviado correctamente."
      );

      setSelectedOffer(null);
      setGameId("");
      setServerId("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al procesar el pedido."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="lol-page">
      <div className="lol-container">

        {/* HEADER */}
        <header className="lol-top-header">
          <button
            type="button"
            className="lol-back"
            onClick={() => router.back()}
          >
            ← Volver
          </button>

          <h1>LEAGUE OF LEGENDS</h1>

          <div className="lol-vip-container">
            {vipActive ? (
              <div className="lol-vip-active">
                ⭐ VIP ACTIVO
              </div>
            ) : (
              <button
                type="button"
                className="lol-vip-button"
                onClick={() => router.push("/vip")}
              >
                ⭐ COMPRAR VIP
              </button>
            )}
          </div>
        </header>

        {/* PRESENTACIÓN */}
        <header className="lol-header">
          <div className="lol-icon">⚔️</div>

          <div>
            <p className="lol-eyebrow">STORE GAMING</p>

            <h2>League of Legends</h2>

            <p className="lol-subtitle">
              Recarga tu cuenta de forma sencilla.
            </p>
          </div>
        </header>

        {error && (
          <div className="lol-alert lol-error">
            {error}
          </div>
        )}

        {success && (
          <div className="lol-alert lol-success">
            {success}
          </div>
        )}

        {/* OFERTAS */}
        <section className="lol-section">
          <div className="lol-section-heading">
            <h2>Selecciona tu oferta</h2>
            <span>{offers.length} ofertas</span>
          </div>

          {loading ? (
            <div className="lol-loading">
              CARGANDO OFERTAS...
            </div>
          ) : offers.length === 0 ? (
            <div className="lol-empty">
              No hay ofertas disponibles en este momento.
            </div>
          ) : (
            <div className="lol-offers">
              {offers.map((offer) => (
                <button
                  type="button"
                  key={offer.id}
                  className={`lol-offer ${
                    selectedOffer?.id === offer.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedOffer(offer);
                    setError("");
                  }}
                >
                  <span className="lol-offer-name">
                    {offer.name}
                  </span>

                  {offer.description && (
                    <span className="lol-offer-description">
                      {offer.description}
                    </span>
                  )}

                  <span className="lol-offer-price">
                    {offer.price}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* FORMULARIO */}
        <section className="lol-section lol-form-section">
          <h2>Datos de tu cuenta</h2>

          <form onSubmit={handlePurchase}>
            <label htmlFor="lol-game-id">
              ID de jugador
            </label>

            <input
              id="lol-game-id"
              type="text"
              value={gameId}
              onChange={(event) => setGameId(event.target.value)}
              placeholder="Introduce tu ID"
              required
            />

            <label htmlFor="lol-server-id">
              Servidor
            </label>

            <input
              id="lol-server-id"
              type="text"
              value={serverId}
              onChange={(event) => setServerId(event.target.value)}
              placeholder="Introduce tu servidor"
              required
            />

            <button
              type="submit"
              className="lol-buy-button"
              disabled={
                processing ||
                loading ||
                !selectedOffer
              }
            >
              {processing
                ? "PROCESANDO..."
                : selectedOffer
                  ? `COMPRAR ${selectedOffer.name}`
                  : "SELECCIONA UNA OFERTA"}
            </button>
          </form>
        </section>

        <p className="lol-notice">
          Comprueba que los datos de tu cuenta sean correctos
          antes de enviar el pedido.
        </p>
      </div>

      <style jsx>{`
        .lol-page {
          min-height: 100vh;
          padding: 20px 16px 60px;
          color: #fff;
          background:
            radial-gradient(
              circle at top right,
              rgba(104, 65, 220, 0.2),
              transparent 38%
            ),
            #090b14;
        }

        .lol-container {
          width: 100%;
          max-width: 950px;
          margin: 0 auto;
        }

        /* HEADER SUPERIOR */
        .lol-top-header {
          width: 100%;
          min-height: 54px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 8px;
          margin-bottom: 30px;
        }

        .lol-top-header h1 {
          margin: 0;
          color: #fff;
          text-align: center;
          font-size: clamp(13px, 2.5vw, 19px);
          font-weight: 900;
          white-space: nowrap;
        }

        .lol-back {
          justify-self: start;
          border: 1px solid #303448;
          border-radius: 10px;
          padding: 10px 15px;
          color: #fff;
          background: #151827;
          cursor: pointer;
          white-space: nowrap;
        }

        .lol-vip-container {
          justify-self: end;
          display: flex;
          justify-content: flex-end;
        }

        .lol-vip-button,
        .lol-vip-active {
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
          text-align: center;
        }

        .lol-vip-button {
          border: 1px solid #b88b35;
          color: #ffe3a0;
          background: linear-gradient(
            135deg,
            #49300c,
            #79551a
          );
          cursor: pointer;
        }

        .lol-vip-active {
          border: 1px solid #b88b35;
          color: #ffe6a8;
          background: linear-gradient(
            135deg,
            #49300c,
            #79551a
          );
        }

        /* PRESENTACIÓN */
        .lol-header {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 30px;
        }

        .lol-icon {
          width: 70px;
          height: 70px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 18px;
          background: linear-gradient(135deg, #6841dc, #282b65);
          font-size: 32px;
        }

        .lol-eyebrow {
          color: #a18aff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
          margin: 0 0 5px;
        }

        .lol-header h2 {
          margin: 0;
          font-size: clamp(25px, 5vw, 38px);
          font-weight: 900;
        }

        .lol-subtitle {
          color: #a4a9bb;
          margin: 7px 0 0;
        }

        /* SECCIONES */
        .lol-section {
          padding: 22px;
          margin-bottom: 22px;
          border: 1px solid #292d40;
          border-radius: 18px;
          background: rgba(20, 23, 38, 0.94);
        }

        .lol-section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .lol-section h2 {
          font-size: 19px;
          margin: 0 0 18px;
        }

        .lol-section-heading h2 {
          margin: 0;
        }

        .lol-section-heading span {
          color: #a18aff;
          font-size: 13px;
        }

        /* OFERTAS */
        .lol-offers {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(190px, 1fr)
          );
          gap: 13px;
        }

        .lol-offer {
          display: flex;
          flex-direction: column;
          gap: 10px;
          text-align: left;
          padding: 17px;
          border: 1px solid #343950;
          border-radius: 13px;
          color: #fff;
          background: #111525;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .lol-offer:hover {
          border-color: #8c70ff;
          transform: translateY(-2px);
        }

        .lol-offer.selected {
          border-color: #9a7dff;
          background: rgba(104, 65, 220, 0.18);
          box-shadow: 0 0 0 1px #9a7dff;
        }

        .lol-offer-name {
          font-size: 16px;
          font-weight: 800;
        }

        .lol-offer-description {
          color: #a4a9bb;
          font-size: 12px;
        }

        .lol-offer-price {
          color: #a991ff;
          font-size: 19px;
          font-weight: 900;
        }

        /* FORMULARIO */
        .lol-form-section form {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .lol-form-section label {
          color: #d9dced;
          font-size: 13px;
          font-weight: 700;
          margin-top: 8px;
        }

        .lol-form-section input {
          width: 100%;
          padding: 14px;
          border: 1px solid #343950;
          border-radius: 10px;
          outline: none;
          color: #fff;
          background: #0c1020;
          font-size: 14px;
        }

        .lol-form-section input:focus {
          border-color: #987aff;
        }

        .lol-buy-button {
          width: 100%;
          padding: 15px;
          margin-top: 12px;
          border: 0;
          border-radius: 11px;
          color: #fff;
          background: linear-gradient(100deg, #6841dc, #925eff);
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .lol-buy-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* MENSAJES */
        .lol-alert {
          padding: 14px 16px;
          border-radius: 11px;
          margin-bottom: 18px;
          font-size: 13px;
        }

        .lol-error {
          color: #ffb7b7;
          border: 1px solid #753a48;
          background: #351b27;
        }

        .lol-success {
          color: #a5f3c5;
          border: 1px solid #286b4b;
          background: #123526;
        }

        .lol-loading,
        .lol-empty {
          padding: 35px 12px;
          color: #a4a9bb;
          text-align: center;
        }

        .lol-notice {
          color: #858ba1;
          font-size: 12px;
          line-height: 1.6;
          text-align: center;
        }

        /* MÓVILES */
        @media (max-width: 600px) {
          .lol-page {
            padding: 15px 12px 40px;
          }

          .lol-top-header {
            gap: 5px;
            margin-bottom: 25px;
          }

          .lol-top-header h1 {
            font-size: 12px;
          }

          .lol-back {
            padding: 9px 10px;
            font-size: 12px;
          }

          .lol-vip-button,
          .lol-vip-active {
            padding: 9px 7px;
            font-size: 9px;
          }

          .lol-section {
            padding: 17px;
          }

          .lol-header {
            align-items: flex-start;
          }

          .lol-icon {
            width: 55px;
            height: 55px;
            font-size: 25px;
          }

          .lol-offers {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 360px) {
          .lol-top-header h1 {
            font-size: 10px;
          }

          .lol-back {
            padding: 8px 7px;
            font-size: 11px;
          }

          .lol-vip-button,
          .lol-vip-active {
            font-size: 8px;
            padding: 8px 5px;
          }
        }
      `}</style>
    </main>
  );
}
