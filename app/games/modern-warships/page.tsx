
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Offer = {
  amount: string;
  price: number;
};

const offers: Offer[] = [
  { amount: "Cuenta Premium - 7 días", price: 2.59 },
  { amount: "500.000 dólares", price: 2.71 },
  { amount: "500 de oro", price: 4.48 },
  { amount: "1.500.000 dólares", price: 4.48 },
  { amount: "140 Artcoins", price: 5.09 },
  { amount: "Cuenta Premium - 30 días", price: 8.51 },
  { amount: "1200 de oro", price: 10.18 },
  { amount: "2.500.000 dólares", price: 10.18 },
  { amount: "300 Artcoins", price: 10.18 },
  { amount: "2500 de oro", price: 20.36 },
  { amount: "5.000.000 dólares", price: 20.36 },
  { amount: "650 Artcoins", price: 20.36 },
  { amount: "Cuenta Premium - 90 días", price: 21.27 },
  { amount: "6500 de oro", price: 40.72 },
  { amount: "15.000.000 dólares", price: 40.72 },
  { amount: "1400 Artcoins", price: 40.72 },
  { amount: "Cuenta Premium - 365 días", price: 76.36 },
];

export default function ModernWarshipsPage() {
  const router = useRouter();

  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [server, setServer] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const [vipActive, setVipActive] = useState(false);
  const [vipLoading, setVipLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        setUsername(
          data?.user?.user_metadata?.username ||
            data?.user?.email?.split("@")[0] ||
            ""
        );

        if (typeof data?.profile?.balance === "number") {
          setBalance(data.profile.balance);
        }

        const profile = data?.profile;

        const activeByFlag = profile?.vip_active === true;

        const vipExpiration = profile?.vip_expires_at
          ? new Date(profile.vip_expires_at).getTime()
          : 0;

        const activeByExpiration =
          Number.isFinite(vipExpiration) &&
          vipExpiration > Date.now();

        setVipActive(activeByFlag || activeByExpiration);
      } catch {
        // La información del usuario se puede cargar más tarde.
      } finally {
        setVipLoading(false);
      }
    };

    loadUser();
  }, []);

  const handlePurchase = async () => {
    setError("");

    if (!selectedOffer) {
      setError("Selecciona una oferta.");
      return;
    }

    if (!playerId.trim()) {
      setError("Introduce tu ID de jugador.");
      return;
    }

    if (!server.trim()) {
      setError("Selecciona tu servidor.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/topups/modern-warships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: playerId.trim(),
          server,
          amount: selectedOffer.amount,
          price: selectedOffer.price,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.error || "No se pudo procesar el pedido. Inténtalo nuevamente."
        );
        return;
      }

      alert("¡Pedido realizado correctamente!");

      router.push("/profile");
    } catch {
      setError("Error de conexión. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="game-service-page">
      <style jsx>{`
        .game-service-page {
          min-height: 100vh;
          padding: 0 16px 50px;
          color: #fff;
          background:
            linear-gradient(rgba(3, 7, 18, 0.88), rgba(3, 7, 18, 0.96)),
            url("/images/battle-royale-bg.jpg") center/cover fixed;
        }

        .game-service-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 10px;
          min-height: 65px;
          margin: 0 -16px 25px;
          padding: 0 12px;
          background: rgba(3, 7, 18, 0.96);
          border-bottom: 1px solid rgba(148, 163, 184, 0.15);
          backdrop-filter: blur(12px);
        }

        .game-service-header h1 {
          margin: 0;
          text-align: center;
          font-size: clamp(14px, 3.5vw, 20px);
          font-weight: 900;
          white-space: nowrap;
        }

        .back-button {
          justify-self: start;
          width: 40px;
          height: 40px;
          border: 1px solid #334155;
          border-radius: 11px;
          color: #fff;
          background: #111827;
          font-size: 21px;
          cursor: pointer;
        }

        .header-vip {
          justify-self: end;
          min-width: 0;
        }

        .vip-button,
        .vip-active,
        .vip-loading {
          min-height: 37px;
          padding: 0 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 900;
        }

        .vip-button {
          border: 1px solid rgba(255, 190, 50, 0.55);
          color: #fff;
          background: linear-gradient(135deg, #8d5b08, #d69b25);
          cursor: pointer;
        }

        .vip-active {
          border: 1px solid rgba(255, 205, 80, 0.5);
          color: #ffd66b;
          background: rgba(255, 190, 40, 0.13);
        }

        .vip-loading {
          color: #aaa;
          background: rgba(255, 255, 255, 0.06);
        }

        .game-service-container {
          max-width: 1050px;
          margin: 0 auto;
        }

        .game-service-card {
          padding: 25px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.9);
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.3);
        }

        .game-service-card h2 {
          margin: 0 0 18px;
          font-size: 21px;
        }

        .game-service-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 13px;
        }

        .offer {
          padding: 17px;
          border: 1px solid #334155;
          border-radius: 12px;
          background: #111827;
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: 0.2s;
        }

        .offer:hover,
        .offer.selected {
          border-color: #38bdf8;
          background: rgba(14, 116, 144, 0.25);
        }

        .offer strong {
          display: block;
          margin-bottom: 8px;
          font-size: 15px;
        }

        .offer span {
          color: #38bdf8;
          font-weight: 800;
        }

        .game-service-form {
          display: grid;
          gap: 15px;
          margin-top: 25px;
        }

        .game-service-form label {
          display: grid;
          gap: 8px;
          color: #cbd5e1;
          font-size: 14px;
          font-weight: 700;
        }

        .game-service-form input,
        .game-service-form select {
          width: 100%;
          padding: 13px;
          border: 1px solid #334155;
          border-radius: 10px;
          outline: none;
          color: #fff;
          background: #020617;
        }

        .game-service-form input:focus,
        .game-service-form select:focus {
          border-color: #38bdf8;
        }

        .purchase-button {
          width: 100%;
          padding: 15px;
          border: 0;
          border-radius: 11px;
          color: #00111c;
          background: #38bdf8;
          font-weight: 900;
          cursor: pointer;
        }

        .purchase-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .game-service-error {
          padding: 12px;
          border: 1px solid #ef4444;
          border-radius: 10px;
          color: #fecaca;
          background: rgba(127, 29, 29, 0.25);
        }

        .game-service-info {
          margin-top: 18px;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.6;
        }

        .game-service-footer {
          margin-top: 35px;
          color: #64748b;
          text-align: center;
          font-size: 13px;
        }

        @media (max-width: 600px) {
          .game-service-card {
            padding: 17px;
          }

          .game-service-header {
            gap: 5px;
          }

          .vip-button,
          .vip-active,
          .vip-loading {
            min-height: 34px;
            padding: 0 7px;
            font-size: 9px;
          }
        }

        @media (max-width: 360px) {
          .game-service-header h1 {
            font-size: 12px;
          }

          .vip-button,
          .vip-active {
            padding: 0 5px;
            font-size: 8px;
          }
        }
      `}</style>

      <div className="game-service-container">
        <header className="game-service-header">
          <button
            className="back-button"
            type="button"
            onClick={() => router.back()}
            aria-label="Volver"
          >
            ←
          </button>

          <h1>MODERN WARSHIPS</h1>

          <div className="header-vip">
            {vipLoading ? (
              <div className="vip-loading">VIP...</div>
            ) : vipActive ? (
              <div className="vip-active">⭐ VIP ACTIVO</div>
            ) : (
              <button
                type="button"
                className="vip-button"
                onClick={() => router.push("/vip")}
              >
                ⭐ COMPRAR VIP
              </button>
            )}
          </div>
        </header>

        <section className="game-service-card">
          <h2>Selecciona tu oferta</h2>

          <div className="game-service-grid">
            {offers.map((offer, index) => (
              <button
                key={index}
                type="button"
                className={`offer ${
                  selectedOffer === offer ? "selected" : ""
                }`}
                onClick={() => setSelectedOffer(offer)}
              >
                <strong>{offer.amount}</strong>
                <span>${offer.price.toFixed(2)} USD</span>
              </button>
            ))}
          </div>

          <div className="game-service-form">
            <label>
              ID de jugador
              <input
                type="text"
                value={playerId}
                onChange={(event) => setPlayerId(event.target.value)}
                placeholder="Introduce tu ID de jugador"
              />
            </label>

            <label>
              Servidor
              <select
                value={server}
                onChange={(event) => setServer(event.target.value)}
              >
                <option value="">Selecciona tu servidor</option>
                <option value="Europe">Europe</option>
                <option value="America">America</option>
                <option value="Asia">Asia</option>
              </select>
            </label>

            {selectedOffer && (
              <p>
                Oferta seleccionada: <strong>{selectedOffer.amount}</strong>
                {" — "}
                <strong>${selectedOffer.price.toFixed(2)} USD</strong>
              </p>
            )}

            {balance !== null && (
              <p>Saldo disponible: ${balance.toFixed(2)} USD</p>
            )}

            {error && <div className="game-service-error">{error}</div>}

            <button
              className="purchase-button"
              type="button"
              onClick={handlePurchase}
              disabled={loading || !selectedOffer}
            >
              {loading ? "PROCESANDO..." : "COMPRAR AHORA"}
            </button>
          </div>

          <p className="game-service-info">
            Asegúrate de introducir correctamente tu ID de jugador y servidor.
            Si tienes algún problema con tu pedido, puedes contactar con
            soporte.
          </p>
        </section>

        <footer className="game-service-footer">
          <strong>STORE GAMING</strong>
          <span>© {new Date().getFullYear()}</span>
        </footer>
      </div>
    </main>
  );
}
