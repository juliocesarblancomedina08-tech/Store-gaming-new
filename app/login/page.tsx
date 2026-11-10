
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Completa todos los campos.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      setError("Introduce un correo electrónico válido.");
      return;
    }

    setLoading(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        if (
          loginError.message
            .toLowerCase()
            .includes("email not confirmed")
        ) {
          setError(
            "Tu correo todavía no está confirmado. Revisa tu email y pulsa el enlace de confirmación."
          );
        } else {
          setError("Correo o contraseña incorrectos.");
        }

        setLoading(false);
        return;
      }

      router.push("/home");
    } catch {
      setError(
        "No se pudo iniciar sesión. Inténtalo nuevamente."
      );

      setLoading(false);
    }
  }

  function handleForgotPassword() {
    if (loading) return;
    router.push("/reset-password");
  }

  return (
    <main className="sg-login-page">
      <div className="sg-login-background" />
      <div className="sg-login-overlay" />
      <div className="sg-login-grid" />

      <section className="sg-login-card">
        <div className="sg-login-top-line" />

        <button
          type="button"
          className="sg-login-back"
          onClick={() => router.push("/")}
          disabled={loading}
        >
          <span>←</span>
          VOLVER AL INICIO
        </button>

        <div className="sg-login-brand">
          <div className="sg-login-logo">
            <span>🛒</span>
          </div>

          <div className="sg-login-brand-name">
            <span>STORE</span>
            <strong>GAMING</strong>
          </div>
        </div>

        <div className="sg-login-heading">
          <div className="sg-login-status">
            <span />
            PLATAFORMA GAMING
          </div>

          <p className="sg-login-welcome">
            BIENVENIDO DE NUEVO
          </p>

          <h1>
            INICIAR
            <span> SESIÓN</span>
          </h1>

          <div className="sg-login-heading-line" />

          <p className="sg-login-description">
            Accede a tu cuenta y continúa disfrutando
            de todos los servicios de{" "}
            <strong>STORE GAMING</strong>.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="sg-login-form"
        >
          <div className="sg-login-field">
            <label htmlFor="login-email">
              CORREO ELECTRÓNICO
            </label>

            <div className="sg-login-input-box">
              <span className="sg-login-input-icon">
                ✉
              </span>

              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="tucorreo@gmail.com"
                autoComplete="email"
                inputMode="email"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="sg-login-field">
            <label htmlFor="login-password">
              CONTRASEÑA
            </label>

            <div className="sg-login-input-box">
              <span className="sg-login-input-icon">
                🔒
              </span>

              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Tu contraseña"
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="sg-login-forgot">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              ¿OLVIDASTE TU CONTRASEÑA?
              <span> →</span>
            </button>
          </div>

          {error && (
            <div
              className="sg-login-error"
              role="alert"
              aria-live="polite"
            >
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="sg-login-submit"
            disabled={loading}
          >
            <span>
              {loading ? "ENTRANDO..." : "ENTRAR A MI CUENTA"}
            </span>

            {!loading && <b>→</b>}

            {loading && (
              <span className="sg-login-spinner" />
            )}
          </button>
        </form>

        <div className="sg-login-divider">
          <span />
          <p>O</p>
          <span />
        </div>

        <div className="sg-login-register">
          <p>¿TODAVÍA NO TIENES UNA CUENTA?</p>

          <button
            type="button"
            onClick={() => router.push("/register")}
            disabled={loading}
          >
            <span>CREAR CUENTA</span>
            <b>→</b>
          </button>
        </div>

        <div className="sg-login-security">
          <span>🔐</span>
          CONEXIÓN SEGURA
          <i />
          STORE GAMING
        </div>

        <div className="sg-login-footer">
          © 2026 STORE GAMING · RECARGAS GAMING
        </div>
      </section>

      <style jsx global>{`
        .sg-login-page {
          min-height: 100vh;
          min-height: 100dvh;
          width: 100%;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 35px 18px;
          overflow: hidden;
          background: #070707;
          font-family: Arial, Helvetica, sans-serif;
          isolation: isolate;
        }

        .sg-login-background {
          position: fixed;
          inset: 0;
          z-index: -3;
          background-image: url("/images/battle-royale-bg.jpg");
          background-position: center;
          background-size: cover;
          transform: scale(1.04);
          filter: brightness(0.38) saturate(0.8);
        }

        .sg-login-overlay {
          position: fixed;
          inset: 0;
          z-index: -2;
          background:
            radial-gradient(
              ellipse at 50% 40%,
              rgba(180, 0, 0, 0.20),
              transparent 55%
            ),
            linear-gradient(
              135deg,
              rgba(0, 0, 0, 0.94),
              rgba(12, 0, 0, 0.82),
              rgba(0, 0, 0, 0.96)
            );
        }

        .sg-login-grid {
          position: fixed;
          inset: 0;
          z-index: -1;
          opacity: 0.12;
          pointer-events: none;
          background-image:
            linear-gradient(
              rgba(255, 255, 255, 0.07) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.07) 1px,
              transparent 1px
            );
          background-size: 45px 45px;
          mask-image: linear-gradient(
            to bottom,
            black,
            transparent 90%
          );
        }

        .sg-login-page * {
          box-sizing: border-box;
        }

        .sg-login-card {
          position: relative;
          width: 100%;
          max-width: 465px;
          padding: 35px 38px 25px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 20px;
          background: linear-gradient(
            145deg,
            rgba(19, 19, 19, 0.97),
            rgba(8, 8, 8, 0.98)
          );
          box-shadow:
            0 25px 90px rgba(0, 0, 0, 0.72),
            0 0 55px rgba(180, 0, 0, 0.10),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          animation: sgLoginAppear 0.65s ease both;
        }

        .sg-login-top-line {
          position: absolute;
          top: -1px;
          left: 18%;
          width: 64%;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            #ff2020,
            #ff5555,
            transparent
          );
          box-shadow: 0 0 15px rgba(255, 20, 20, 0.7);
        }

        .sg-login-back {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 8px 0;
          border: none;
          background: transparent;
          color: #888;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          cursor: pointer;
          transition: 0.2s;
        }

        .sg-login-back:hover {
          color: #ff3939;
        }

        .sg-login-back span {
          font-size: 19px;
          color: #ff3030;
        }

        .sg-login-back:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sg-login-brand {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 13px;
          margin: 25px 0 29px;
        }

        .sg-login-logo {
          width: 57px;
          height: 57px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          border: 1px solid rgba(255, 55, 55, 0.55);
          background: linear-gradient(
            145deg,
            #3b0909,
            #150505
          );
          box-shadow:
            0 0 25px rgba(255, 0, 0, 0.18),
            inset 0 0 15px rgba(255, 0, 0, 0.10);
        }

        .sg-login-logo span {
          font-size: 29px;
        }

        .sg-login-brand-name {
          display: flex;
          flex-direction: column;
          line-height: 1;
          gap: 4px;
        }

        .sg-login-brand-name span {
          color: #fff;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 3px;
        }

        .sg-login-brand-name strong {
          color: #ff3030;
          font-size: 23px;
          font-weight: 1000;
          letter-spacing: 4px;
          text-shadow: 0 0 15px rgba(255, 0, 0, 0.3);
        }

        .sg-login-heading {
          text-align: center;
          margin-bottom: 29px;
        }

        .sg-login-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border: 1px solid rgba(255, 50, 50, 0.20);
          border-radius: 30px;
          background: rgba(255, 0, 0, 0.07);
          color: #ff6464;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.5px;
          margin-bottom: 19px;
        }

        .sg-login-status span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ff3333;
          box-shadow: 0 0 10px #ff2222;
        }

        .sg-login-welcome {
          margin: 0 0 8px;
          color: #858585;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2.8px;
        }

        .sg-login-heading h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(29px, 7vw, 36px);
          font-weight: 1000;
          letter-spacing: -1.5px;
          line-height: 1.15;
        }

        .sg-login-heading h1 span {
          color: #ff3030;
          text-shadow: 0 0 22px rgba(255, 0, 0, 0.22);
        }

        .sg-login-heading-line {
          width: 48px;
          height: 3px;
          border-radius: 5px;
          margin: 16px auto;
          background: #f32c2c;
          box-shadow: 0 0 12px rgba(255, 0, 0, 0.55);
        }

        .sg-login-description {
          max-width: 320px;
          margin: 0 auto;
          color: #999;
          font-size: 12px;
          line-height: 1.7;
        }

        .sg-login-description strong {
          color: #eee;
        }

        .sg-login-form {
          display: flex;
          flex-direction: column;
          gap: 19px;
        }

        .sg-login-field {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .sg-login-field label {
          color: #c6c6c6;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .sg-login-input-box {
          position: relative;
          display: flex;
          align-items: center;
          height: 53px;
          border: 1px solid #303030;
          border-radius: 9px;
          background: rgba(0, 0, 0, 0.43);
          transition: 0.25s;
        }

        .sg-login-input-box:focus-within {
          border-color: #e52c2c;
          background: rgba(35, 8, 8, 0.48);
          box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.08);
        }

        .sg-login-input-icon {
          width: 48px;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #ff4444;
          font-size: 17px;
          flex-shrink: 0;
        }

        .sg-login-input-box input {
          width: 100%;
          height: 100%;
          padding: 0 14px 0 0;
          border: none;
          outline: none;
          background: transparent;
          color: #fff;
          font-size: 13px;
          font-family: inherit;
        }

        .sg-login-input-box input::placeholder {
          color: #606060;
        }

        .sg-login-input-box input:disabled {
          opacity: 0.6;
        }

        .sg-login-forgot {
          display: flex;
          justify-content: flex-end;
          margin-top: -8px;
        }

        .sg-login-forgot button {
          padding: 5px 0;
          border: none;
          background: transparent;
          color: #999;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.8px;
          cursor: pointer;
          transition: 0.2s;
        }

        .sg-login-forgot button:hover {
          color: #ff4444;
        }

        .sg-login-forgot button span {
          color: #ff3333;
          font-size: 14px;
          margin-left: 4px;
        }

        .sg-login-forgot button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sg-login-error {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 13px;
          border: 1px solid rgba(255, 60, 60, 0.35);
          border-radius: 9px;
          background: rgba(120, 0, 0, 0.15);
        }

        .sg-login-error > span {
          width: 19px;
          height: 19px;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: #e42c2c;
          color: white;
          font-size: 12px;
          font-weight: 900;
        }

        .sg-login-error p {
          margin: 0;
          color: #ffaaaa;
          font-size: 11px;
          line-height: 1.6;
        }

        .sg-login-submit {
          position: relative;
          width: 100%;
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 3px;
          border: 1px solid #ff4444;
          border-radius: 9px;
          background: linear-gradient(
            110deg,
            #b90808,
            #f02727,
            #b90808
          );
          background-size: 200% 100%;
          color: #fff;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 1.4px;
          cursor: pointer;
          box-shadow:
            0 8px 25px rgba(190, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          transition: 0.25s;
        }

        .sg-login-submit:hover:not(:disabled) {
          background-position: 100% 0;
          transform: translateY(-2px);
          box-shadow:
            0 12px 30px rgba(220, 0, 0, 0.35),
            0 0 20px rgba(255, 0, 0, 0.15);
        }

        .sg-login-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .sg-login-submit b {
          font-size: 19px;
        }

        .sg-login-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: sgLoginSpin 0.7s linear infinite;
        }

        .sg-login-divider {
          display: flex;
          align-items: center;
          gap: 13px;
          margin: 25px 0 21px;
        }

        .sg-login-divider span {
          height: 1px;
          flex: 1;
          background: linear-gradient(
            90deg,
            transparent,
            #393939
          );
        }

        .sg-login-divider span:last-child {
          background: linear-gradient(
            90deg,
            #393939,
            transparent
          );
        }

        .sg-login-divider p {
          margin: 0;
          color: #686868;
          font-size: 10px;
          font-weight: 900;
        }

        .sg-login-register {
          text-align: center;
        }

        .sg-login-register p {
          margin: 0 0 12px;
          color: #858585;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        .sg-login-register button {
          width: 100%;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 1px solid #414141;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.025);
          color: #eee;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.3px;
          cursor: pointer;
          transition: 0.25s;
        }

        .sg-login-register button:hover:not(:disabled) {
          border-color: #ff3838;
          background: rgba(255, 0, 0, 0.08);
          color: #ff5555;
        }

        .sg-login-register button b {
          color: #ff3939;
          font-size: 17px;
        }

        .sg-login-register button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sg-login-security {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 9px;
          margin-top: 27px;
          color: #666;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .sg-login-security span {
          font-size: 12px;
        }

        .sg-login-security i {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #ff3333;
        }

        .sg-login-footer {
          margin-top: 19px;
          padding-top: 17px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          color: #555;
          text-align: center;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 1.1px;
        }

        @keyframes sgLoginAppear {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes sgLoginSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 520px) {
          .sg-login-page {
            padding: 20px 13px;
            align-items: center;
          }

          .sg-login-card {
            max-width: 430px;
            padding: 27px 22px 21px;
            border-radius: 16px;
          }

          .sg-login-brand {
            margin: 22px 0 25px;
          }

          .sg-login-heading {
            margin-bottom: 25px;
          }

          .sg-login-heading h1 {
            font-size: 31px;
          }

          .sg-login-input-box {
            height: 51px;
          }
        }

        @media (max-width: 360px) {
          .sg-login-card {
            padding: 23px 17px 19px;
          }

          .sg-login-brand-name span {
            font-size: 18px;
          }

          .sg-login-brand-name strong {
            font-size: 21px;
          }

          .sg-login-security {
            font-size: 7px;
            gap: 6px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sg-login-card {
            animation: none;
          }

          .sg-login-spinner {
            animation-duration: 1.5s;
          }
        }
      `}</style>
    </main>
  );
}
