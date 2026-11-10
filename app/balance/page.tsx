
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function BalancePage() {
  const router = useRouter();

  const [balance, setBalance] = useState<number>(0);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadBalance() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/");
        return;
      }

      if (!active) return;

      setEmail(session.user.email || "usuario");

      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", session.user.id)
        .single();

      if (!active) return;

      if (!error && data) {
        setBalance(Number(data.balance || 0));
      }

      setLoading(false);
    }

    loadBalance();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <div className="balance-loading">
          <div className="balance-loading-logo">🛒🎮</div>
          <div className="balance-spinner" />
          <p>CARGANDO BILLETERA...</p>
        </div>

        <style jsx global>{styles}</style>
      </main>
    );
  }

  return (
    <main className="balance-page">
      <div className="balance-background" />

      <header className="balance-header">
        <button
          type="button"
          className="balance-back-button"
          onClick={() => router.push("/home")}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="balance-header-title">
          <small>STORE GAMING</small>
          <h1>
            MI <span>BILLETERA</span>
          </h1>
        </div>

        <div className="balance-header-icon">💰</div>
      </header>

      <section className="balance-content">

        {/* TARJETA DEL BALANCE */}

        <div className="balance-main-card">
          <div className="balance-card-glow" />

          <div className="balance-card-top">
            <div>
              <span className="balance-label">
                BALANCE DISPONIBLE
              </span>

              <div className="balance-live">
                <span />
                CUENTA ACTIVA
              </div>
            </div>

            {/* ICONO PREMIUM DE BILLETERA */}

            <div className="balance-wallet-symbol">
              <svg
                viewBox="0 0 48 48"
                className="wallet-premium-icon"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 14.5C8 12.57 9.57 11 11.5 11H37"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />

                <path
                  d="M8 15.5C8 13.57 9.57 12 11.5 12H36C38.21 12 40 13.79 40 16V36C40 38.21 38.21 40 36 40H12C9.79 40 8 38.21 8 36V15.5Z"
                  fill="url(#walletGradient)"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />

                <path
                  d="M8 20H40"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity=".55"
                />

                <path
                  d="M31 25H40V33H31C28.79 33 27 31.21 27 29C27 26.79 28.79 25 31 25Z"
                  fill="#160909"
                  stroke="currentColor"
                  strokeWidth="2"
                />

                <circle
                  cx="32"
                  cy="29"
                  r="1.8"
                  fill="#FF4545"
                />

                <defs>
                  <linearGradient
                    id="walletGradient"
                    x1="8"
                    y1="12"
                    x2="40"
                    y2="40"
                  >
                    <stop stopColor="#FF4545" />
                    <stop offset="1" stopColor="#8F1010" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <div className="balance-amount">
            <span>$</span>
            {balance.toFixed(2)}
          </div>

          <div className="balance-card-bottom">
            <div>
              <small>CUENTA STORE GAMING</small>
              <strong>{email}</strong>
            </div>

            <span>✦</span>
          </div>
        </div>

        {/* ACCIONES RÁPIDAS */}

        <div className="balance-section-heading">
          <strong>ACCIONES RÁPIDAS</strong>
          <span>GESTIONA TU BILLETERA</span>
        </div>

        <div className="balance-actions">

          <button
            type="button"
            className="balance-action deposit-action"
            onClick={() => router.push("/balance/methods")}
          >
            <div className="balance-action-icon">
              <span>＋</span>
            </div>

            <strong>DEPOSITAR</strong>
            <small>Ingresar balance</small>

            <span className="balance-action-arrow">→</span>
          </button>

          <button
            type="button"
            className="balance-action history-action"
            onClick={() => router.push("/balance/history")}
          >
            <div className="balance-action-icon">
              <span>▤</span>
            </div>

            <strong>MOVIMIENTOS</strong>
            <small>Consultar historial</small>

            <span className="balance-action-arrow">→</span>
          </button>

        </div>

        {/* SEGURIDAD */}

        <div className="balance-security-card">
          <div className="security-icon">🛡️</div>

          <div>
            <strong>TU DINERO ESTÁ PROTEGIDO</strong>

            <p>
              Tu balance está vinculado exclusivamente
              a tu cuenta de STORE GAMING.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="balance-home-button"
          onClick={() => router.push("/home")}
        >
          ← VOLVER A LA TIENDA
        </button>

      </section>

      <style jsx global>{styles}</style>
    </main>
  );
}

const styles = `
.balance-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: #050706;
  color: #fff;
  padding-bottom: 45px;
  font-family: Arial, sans-serif;
}

.balance-page .balance-background {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(180,25,25,.16), transparent 48%),
    linear-gradient(180deg, #100808, #050505 55%);
}

.balance-page .balance-header,
.balance-page .balance-content {
  position: relative;
  z-index: 1;
}

.balance-page .balance-header {
  max-width: 760px;
  margin: auto;
  padding: 25px 20px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.balance-page .balance-back-button {
  width: 43px;
  height: 43px;
  border-radius: 13px;
  border: 1px solid #492020;
  background: #1b1010;
  color: #fff;
  font-size: 23px;
  cursor: pointer;
  transition: .2s ease;
}

.balance-page .balance-back-button:hover {
  background: #321313;
  border-color: #e33b3b;
}

.balance-page .balance-header-title {
  flex: 1;
}

.balance-page .balance-header-title small {
  color: #ff4545;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 3px;
}

.balance-page .balance-header-title h1 {
  font-size: 22px;
  margin: 4px 0 0;
  font-weight: 950;
  letter-spacing: 1px;
}

.balance-page .balance-header-title h1 span {
  color: #ff4545;
}

.balance-page .balance-header-icon {
  font-size: 27px;
}

.balance-page .balance-content {
  max-width: 620px;
  margin: 15px auto;
  padding: 0 20px;
}

.balance-page .balance-main-card {
  position: relative;
  overflow: hidden;
  padding: 25px;
  min-height: 220px;
  border-radius: 22px;
  border: 1px solid rgba(255,65,65,.42);
  background:
    radial-gradient(circle at 90% 10%, rgba(255,50,50,.22), transparent 40%),
    linear-gradient(135deg, #291111, #100909 70%);
  box-shadow:
    0 18px 50px rgba(0,0,0,.4),
    0 0 30px rgba(255,40,40,.08);
}

.balance-page .balance-card-glow {
  position: absolute;
  width: 190px;
  height: 190px;
  right: -70px;
  bottom: -100px;
  border-radius: 50%;
  background: rgba(255,40,40,.16);
  filter: blur(35px);
}

.balance-page .balance-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.balance-page .balance-label {
  display: block;
  font-size: 11px;
  letter-spacing: 1.5px;
  color: #d5b5b5;
  font-weight: 900;
}

.balance-page .balance-live {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  color: #42d6a1;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1px;
}

.balance-page .balance-live span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #32d69a;
  box-shadow: 0 0 10px #32d69a;
}

/* BILLETERA PREMIUM ROJA */

.balance-page .balance-wallet-symbol {
  width: 62px;
  height: 62px;
  flex-shrink: 0;
  border-radius: 19px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 30% 20%, rgba(255,75,75,.22), transparent 65%),
    linear-gradient(145deg, #251010, #100909);
  color: #ff5555;
  border: 1px solid rgba(255,65,65,.55);
  box-shadow:
    0 8px 22px rgba(0,0,0,.35),
    0 0 18px rgba(255,40,40,.13),
    inset 0 1px 0 rgba(255,255,255,.08);
  transition: transform .25s ease, box-shadow .25s ease;
}

.balance-page .balance-wallet-symbol:hover {
  transform: translateY(-3px);
  box-shadow:
    0 12px 25px rgba(0,0,0,.4),
    0 0 25px rgba(255,40,40,.25);
}

.balance-page .wallet-premium-icon {
  width: 39px;
  height: 39px;
  filter: drop-shadow(0 2px 5px rgba(255,35,35,.3));
}

.balance-page .balance-amount {
  margin-top: 26px;
  font-size: clamp(37px, 9vw, 49px);
  font-weight: 950;
  letter-spacing: -2px;
  position: relative;
  z-index: 1;
}

.balance-page .balance-amount span {
  color: #ff4545;
  margin-right: 4px;
}

.balance-page .balance-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(255,255,255,.1);
  margin-top: 20px;
  padding-top: 15px;
  position: relative;
  z-index: 1;
}

.balance-page .balance-card-bottom small {
  display: block;
  color: #b99595;
  font-size: 9px;
  letter-spacing: 1px;
  margin-bottom: 5px;
}

.balance-page .balance-card-bottom strong {
  display: block;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.balance-page .balance-card-bottom > span {
  color: #ff5555;
  font-size: 25px;
}

.balance-page .balance-section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 30px 2px 14px;
}

.balance-page .balance-section-heading strong,
.balance-page .balance-history-heading strong {
  font-size: 12px;
  letter-spacing: 1px;
}

.balance-page .balance-section-heading span {
  color: #918080;
  font-size: 9px;
  font-weight: 800;
}

.balance-page .balance-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.balance-page .balance-action {
  min-width: 0;
  position: relative;
  text-align: left;
  padding: 17px 14px;
  min-height: 145px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.09);
  background: linear-gradient(145deg,#1c1515,#100b0b);
  color: white;
  cursor: pointer;
  transition: .2s ease;
}

.balance-page .balance-action:active {
  transform: scale(.97);
}

.balance-page .deposit-action {
  border-color: rgba(255,65,65,.35);
}

.balance-page .balance-action-icon {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(255,65,65,.14);
  color: #ff5555;
  font-size: 26px;
  margin-bottom: 15px;
}

.balance-page .history-action .balance-action-icon {
  background: rgba(86,145,235,.13);
  color: #7cafff;
  font-size: 22px;
}

.balance-page .balance-action > strong {
  display: block;
  font-size: 12px;
  font-weight: 950;
}

.balance-page .balance-action > small {
  display: block;
  margin-top: 6px;
  font-size: 10px;
  color: #a09292;
}

.balance-page .balance-action-arrow {
  position: absolute;
  right: 14px;
  top: 18px;
  color: #ff5555;
}

.balance-page .balance-security-card {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 17px;
  margin-top: 20px;
  border: 1px solid rgba(255,65,65,.18);
  background: rgba(255,50,50,.045);
  border-radius: 15px;
}

.balance-page .security-icon {
  font-size: 25px;
}

.balance-page .balance-security-card strong {
  font-size: 11px;
  color: #ff6262;
}

.balance-page .balance-security-card p {
  margin: 7px 0 0;
  font-size: 11px;
  color: #b2a2a2;
  line-height: 1.6;
}

.balance-page .balance-home-button {
  width: 100%;
  margin-top: 22px;
  padding: 15px;
  border-radius: 12px;
  border: 1px solid rgba(255,65,65,.25);
  background: #180d0d;
  color: #ff5555;
  font-weight: 900;
  font-size: 11px;
  cursor: pointer;
  transition: .2s ease;
}

.balance-page .balance-home-button:hover {
  background: #281010;
  border-color: #ff4545;
}

.balance-page .balance-loading {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 15px;
}

.balance-page .balance-loading-logo {
  font-size: 40px;
}

.balance-page .balance-loading p {
  color: #ff5555;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2px;
}

.balance-page .balance-spinner {
  width: 34px;
  height: 34px;
  border: 3px solid #351919;
  border-top-color: #ff4545;
  border-radius: 50%;
  animation: balanceSpin .8s linear infinite;
}

@keyframes balanceSpin {
  to {
    transform: rotate(360deg);
  }
}

@media(max-width:480px) {
  .balance-page .balance-header {
    padding: 20px 15px;
  }

  .balance-page .balance-content {
    padding: 0 15px;
  }

  .balance-page .balance-main-card {
    padding: 21px;
  }
}
`;
