"use client";

import { useRouter } from "next/navigation";

type PaymentMethod = {
  name: string;
  description: string;
  label: string;
  icon: string;
  color: string;
  background: string;
  border: string;
  action: () => void;
};

export default function PaymentMethodsPage() {
  const router = useRouter();

  const methods: PaymentMethod[] = [
    {
      name: "USDT BEP20",
      description: "BNB Smart Chain",
      label: "AUTOMÁTICO",
      icon: "usdt",
      color: "#36d6a0",
      background: "rgba(38,161,123,.13)",
      border: "rgba(38,161,123,.35)",
      action: () =>
        router.push("/balance/deposit?network=BEP20"),
    },
    {
      name: "SALDO CUP",
      description: "Depósito manual · CUP",
      label: "MANUAL",
      icon: "💵",
      color: "#e5b75f",
      background: "rgba(229,183,95,.12)",
      border: "rgba(229,183,95,.35)",
      action: () =>
        router.push("/balance/manual-deposit?method=saldo_cup"),
    },
    {
      name: "TRANSFERENCIA CUP",
      description: "Transferencia bancaria · CUP",
      label: "MANUAL",
      icon: "🏦",
      color: "#76adff",
      background: "rgba(76,135,230,.12)",
      border: "rgba(76,135,230,.35)",
      action: () =>
        router.push("/balance/transfer-cup"),
    },
  ];

  return (
    <main className="payment-methods-page">

      <div className="methods-background" />

      {/* HEADER */}

      <header className="methods-header">
        <button
          type="button"
          className="methods-back"
          onClick={() => router.push("/balance")}
          aria-label="Volver a la billetera"
        >
          ←
        </button>

        <div>
          <small>STORE GAMING</small>
          <strong>WALLET</strong>
        </div>

        <div className="methods-header-icon">💳</div>
      </header>

      <section className="methods-content">

        {/* TÍTULO */}

        <div className="methods-intro">
          <div className="methods-intro-icon">
            <span>＋</span>
          </div>

          <span className="methods-overline">
            INGRESAR FONDOS
          </span>

          <h1>
            SELECCIONE SU
            <span> MÉTODO DE PAGO</span>
          </h1>

          <p>
            Elige cómo deseas ingresar balance a tu
            billetera de STORE GAMING.
          </p>
        </div>

        {/* MÉTODOS */}

        <div className="methods-section-title">
          <strong>MÉTODOS DISPONIBLES</strong>
          <span>03 OPCIONES</span>
        </div>

        <div className="methods-list">

          {methods.map((method) => (
            <button
              type="button"
              key={method.name}
              className="payment-method-row"
              style={{
                borderColor: method.border,
              }}
              onClick={method.action}
            >

              <div
                className="payment-method-icon"
                style={{
                  background: method.background,
                  color: method.color,
                  borderColor: method.border,
                }}
              >
                {method.icon === "usdt" ? (
                  <img
                    src="/images/usdt-bep20-logo.png"
                    alt="USDT"
                  />
                ) : (
                  <span>{method.icon}</span>
                )}
              </div>

              <div className="payment-method-info">
                <strong>{method.name}</strong>

                <span>{method.description}</span>

                <small
                  style={{ color: method.color }}
                >
                  ● {method.label}
                </small>
              </div>

              <div
                className="payment-method-arrow"
                style={{ color: method.color }}
              >
                →
              </div>

            </button>
          ))}

        </div>

        {/* SEGURIDAD */}

        <div className="methods-security">
          <div className="methods-security-icon">
            🛡️
          </div>

          <div>
            <strong>PAGOS PROTEGIDOS</strong>

            <p>
              Selecciona un método y sigue las instrucciones
              correspondientes para ingresar balance a tu cuenta.
            </p>
          </div>
        </div>

        {/* REGRESAR */}

        <button
          type="button"
          className="methods-cancel"
          onClick={() => router.push("/balance")}
        >
          ← REGRESAR A MI BILLETERA
        </button>

        <div className="methods-footer">
          STORE GAMING · WALLET
        </div>

      </section>

      <style jsx global>{`
        .payment-methods-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: #050706;
          color: #fff;
          padding-bottom: 40px;
          font-family: Arial, sans-serif;
        }

        .payment-methods-page .methods-background {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              ellipse at 50% 0%,
              rgba(38,161,123,.15),
              transparent 48%
            ),
            linear-gradient(180deg,#080e0b,#050706 65%);
        }

        .payment-methods-page .methods-header,
        .payment-methods-page .methods-content {
          position: relative;
          z-index: 1;
        }

        .payment-methods-page .methods-header {
          max-width: 650px;
          margin: auto;
          padding: 23px 20px;
          display: flex;
          align-items: center;
          gap: 13px;
          border-bottom: 1px solid rgba(255,255,255,.055);
        }

        .payment-methods-page .methods-back {
          width: 43px;
          height: 43px;
          border-radius: 12px;
          border: 1px solid #263c32;
          background: #101b15;
          color: #fff;
          font-size: 23px;
          cursor: pointer;
        }

        .payment-methods-page .methods-header > div:nth-child(2) {
          flex: 1;
        }

        .payment-methods-page .methods-header small {
          display: block;
          color: #36c997;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .payment-methods-page .methods-header strong {
          display: block;
          margin-top: 4px;
          font-size: 14px;
          letter-spacing: 1px;
        }

        .payment-methods-page .methods-header-icon {
          font-size: 26px;
        }

        .payment-methods-page .methods-content {
          max-width: 590px;
          margin: 35px auto 0;
          padding: 0 20px;
        }

        .payment-methods-page .methods-intro {
          margin-bottom: 35px;
        }

        .payment-methods-page .methods-intro-icon {
          width: 53px;
          height: 53px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(38,161,123,.12);
          border: 1px solid rgba(38,161,123,.3);
          border-radius: 16px;
          color: #36c997;
          font-size: 34px;
          margin-bottom: 22px;
        }

        .payment-methods-page .methods-overline {
          color: #36c997;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .payment-methods-page .methods-intro h1 {
          margin: 10px 0;
          font-size: clamp(23px,5vw,31px);
          line-height: 1.25;
          font-weight: 950;
          letter-spacing: -.5px;
        }

        .payment-methods-page .methods-intro h1 span {
          display: block;
          color: #36c997;
        }

        .payment-methods-page .methods-intro p {
          color: #9aa89f;
          font-size: 13px;
          line-height: 1.7;
          margin-top: 12px;
        }

        .payment-methods-page .methods-section-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .payment-methods-page .methods-section-title strong {
          font-size: 11px;
          letter-spacing: 1px;
        }

        .payment-methods-page .methods-section-title span {
          font-size: 10px;
          color: #89968e;
          font-weight: 900;
        }

        .payment-methods-page .methods-list {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .payment-methods-page .payment-method-row {
          width: 100%;
          min-height: 91px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 15px;
          text-align: left;
          color: #fff;
          border: 1px solid;
          border-radius: 16px;
          background: linear-gradient(145deg,#151c17,#090e0b);
          cursor: pointer;
          transition: transform .2s ease, background .2s ease;
        }

        .payment-methods-page .payment-method-row:active {
          transform: scale(.98);
          background: #17251d;
        }

        .payment-methods-page .payment-method-icon {
          width: 51px;
          height: 51px;
          flex: 0 0 51px;
          border-radius: 15px;
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .payment-methods-page .payment-method-icon img {
          width: 100%;
          height: 100%;
          padding: 7px;
          object-fit: contain;
        }

        .payment-methods-page .payment-method-icon span {
          font-size: 25px;
        }

        .payment-methods-page .payment-method-info {
          flex: 1;
          min-width: 0;
        }

        .payment-methods-page .payment-method-info strong {
          display: block;
          font-size: 13px;
          font-weight: 950;
        }

        .payment-methods-page .payment-method-info > span {
          display: block;
          margin-top: 5px;
          color: #a0aaa3;
          font-size: 11px;
        }

        .payment-methods-page .payment-method-info small {
          display: block;
          margin-top: 7px;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .8px;
        }

        .payment-methods-page .payment-method-arrow {
          font-size: 23px;
          font-weight: 900;
        }

        .payment-methods-page .methods-security {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          padding: 17px;
          margin-top: 27px;
          border: 1px solid rgba(38,161,123,.2);
          background: rgba(38,161,123,.055);
          border-radius: 15px;
        }

        .payment-methods-page .methods-security-icon {
          font-size: 25px;
        }

        .payment-methods-page .methods-security strong {
          color: #36c997;
          font-size: 11px;
        }

        .payment-methods-page .methods-security p {
          margin: 7px 0 0;
          color: #a0aea5;
          font-size: 11px;
          line-height: 1.6;
        }

        .payment-methods-page .methods-cancel {
          width: 100%;
          margin-top: 20px;
          padding: 15px;
          border-radius: 12px;
          border: 1px solid rgba(38,161,123,.2);
          background: #101913;
          color: #36c997;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .payment-methods-page .methods-footer {
          margin-top: 30px;
          text-align: center;
          color: #56645b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        @media(max-width:480px) {
          .payment-methods-page .methods-header {
            padding: 18px 15px;
          }

          .payment-methods-page .methods-content {
            padding: 0 15px;
            margin-top: 27px;
          }

          .payment-methods-page .payment-method-row {
            min-height: 82px;
            padding: 12px;
            gap: 11px;
          }

          .payment-methods-page .payment-method-icon {
            width: 45px;
            height: 45px;
            flex-basis: 45px;
          }

          .payment-methods-page .payment-method-info strong {
            font-size: 12px;
          }
        }
      `}</style>

    </main>
  );
}
