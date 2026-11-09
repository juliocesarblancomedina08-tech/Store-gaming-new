
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [verificationCode, setVerificationCode] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");

  const [showVerification, setShowVerification] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password || !confirmPassword) {
      setError("Completa todos los campos.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      setError("Introduce un correo electrónico válido.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const referralCode =
        new URLSearchParams(window.location.search)
          .get("ref")
          ?.trim()
          .toUpperCase() || null;

      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: referralCode
              ? { referral_code: referralCode }
              : {},
          },
        });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user && !data.session) {
        setVerificationEmail(cleanEmail);
        setVerificationCode("");
        setShowVerification(true);

        setSuccess(
          `Hemos enviado un código de verificación de 8 dígitos a ${cleanEmail}.`
        );

        setPassword("");
        setConfirmPassword("");
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push("/home");
        return;
      }

      setSuccess(
        "Revisa tu correo electrónico para verificar tu cuenta."
      );
    } catch {
      setError(
        "Ocurrió un error al crear la cuenta. Inténtalo nuevamente."
      );
    }

    setLoading(false);
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanCode = verificationCode.trim();

    if (!cleanCode) {
      setError("Introduce el código de verificación.");
      return;
    }

    if (!/^\d{8}$/.test(cleanCode)) {
      setError("El código debe tener 8 dígitos.");
      return;
    }

    if (!verificationEmail) {
      setError(
        "No encontramos el correo que está pendiente de verificación."
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error: verifyError } =
        await supabase.auth.verifyOtp({
          email: verificationEmail,
          token: cleanCode,
          type: "email",
        });

      if (verifyError) {
        setError(
          "El código no es válido o ha expirado. Comprueba el código e inténtalo nuevamente."
        );

        setLoading(false);
        return;
      }

      if (data.session) {
        setSuccess(
          "Correo verificado correctamente. ¡Bienvenido a STORE GAMING!"
        );

        setTimeout(() => {
          router.push("/home");
        }, 700);

        return;
      }

      setSuccess(
        "Correo verificado correctamente. Ahora puedes iniciar sesión."
      );

      setTimeout(() => {
        router.push("/login");
      }, 900);
    } catch {
      setError(
        "No se pudo verificar el código. Inténtalo nuevamente."
      );
    }

    setLoading(false);
  }

  async function handleResendCode() {
    if (!verificationEmail) {
      setError(
        "No encontramos el correo que está pendiente de verificación."
      );
      return;
    }

    setError("");
    setSuccess("");
    setResending(true);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: verificationEmail,
      });

      if (resendError) {
        setError(
          "No se pudo reenviar el código. Espera unos segundos e inténtalo nuevamente."
        );

        setResending(false);
        return;
      }

      setVerificationCode("");

      setSuccess(
        "Hemos enviado un nuevo código de 8 dígitos a tu correo electrónico."
      );
    } catch {
      setError(
        "No se pudo reenviar el código. Inténtalo nuevamente."
      );
    }

    setResending(false);
  }

  function backToRegister() {
    setShowVerification(false);
    setVerificationCode("");
    setError("");
    setSuccess("");
  }

  return (
    <main className="sg-register-page">
      <div className="sg-register-background" />
      <div className="sg-register-overlay" />
      <div className="sg-register-grid" />

      <div className="sg-register-glow sg-register-glow-one" />
      <div className="sg-register-glow sg-register-glow-two" />

      <section className="sg-register-card">
        <div className="sg-register-top-line" />

        <button
          type="button"
          className="sg-register-back"
          onClick={() =>
            showVerification
              ? backToRegister()
              : router.push("/")
          }
        >
          <span>←</span>
          ATRÁS
        </button>

        <div className="sg-register-brand">
          <div className="sg-register-brand-icon">
            🛒
          </div>

          <div className="sg-register-brand-name">
            <span>STORE</span>
            <strong>GAMING</strong>
          </div>
        </div>

        {showVerification ? (
          <>
            <div className="sg-register-heading">
              <div className="sg-register-label">
                <span />
                VERIFICACIÓN DE CORREO
                <span />
              </div>

              <h1>
                CONFIRMA
                <span> TU CUENTA</span>
              </h1>

              <p>
                Introduce el código de 8 dígitos que hemos enviado a:
              </p>

              <div className="sg-register-email">
                {verificationEmail}
              </div>
            </div>

            <form
              onSubmit={handleVerifyCode}
              className="sg-register-form"
            >
              <div className="sg-register-field">
                <label htmlFor="sg-verification-code">
                  CÓDIGO DE VERIFICACIÓN
                </label>

                <div className="sg-register-input-box sg-register-code-box">
                  <span className="sg-register-input-icon">#</span>

                  <input
                    id="sg-verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={verificationCode}
                    onChange={(event) => {
                      const value = event.target.value.replace(/\D/g, "");
                      setVerificationCode(value.slice(0, 8));
                    }}
                    placeholder="00000000"
                  />
                </div>
              </div>

              {error && (
                <div className="sg-register-message sg-register-error">
                  <span>!</span>
                  <p>{error}</p>
                </div>
              )}

              {success && (
                <div className="sg-register-message sg-register-success">
                  <span>✓</span>
                  <p>{success}</p>
                </div>
              )}

              <button
                type="submit"
                className="sg-register-submit"
                disabled={loading || verificationCode.length !== 8}
              >
                <span>
                  {loading ? "VERIFICANDO..." : "VERIFICAR CORREO"}
                </span>
                {!loading && <b>✓</b>}
              </button>
            </form>

            <div className="sg-register-resend">
              <p>¿No recibiste el código?</p>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
              >
                {resending ? "ENVIANDO..." : "REENVIAR CÓDIGO"}
              </button>
            </div>

            <button
              type="button"
              className="sg-register-back-form"
              onClick={backToRegister}
            >
              ← VOLVER AL REGISTRO
            </button>
          </>
        ) : (
          <>
            <div className="sg-register-heading">
              <div className="sg-register-label">
                <span />
                ÚNETE A LA COMUNIDAD
                <span />
              </div>

              <h1>
                CREAR
                <span> CUENTA</span>
              </h1>

              <p>
                Crea tu cuenta y comienza a disfrutar de todas
                nuestras recargas gaming.
              </p>
            </div>

            <form
              onSubmit={handleRegister}
              className="sg-register-form"
            >
              <div className="sg-register-field">
                <label htmlFor="sg-register-email">
                  CORREO ELECTRÓNICO
                </label>

                <div className="sg-register-input-box">
                  <span className="sg-register-input-icon">✉</span>

                  <input
                    id="sg-register-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tucorreo@gmail.com"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
              </div>

              <div className="sg-register-field">
                <label htmlFor="sg-register-password">
                  CONTRASEÑA
                </label>

                <div className="sg-register-input-box">
                  <span className="sg-register-input-icon">⌑</span>

                  <input
                    id="sg-register-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="sg-register-field">
                <label htmlFor="sg-register-confirm">
                  CONFIRMAR CONTRASEÑA
                </label>

                <div className="sg-register-input-box">
                  <span className="sg-register-input-icon">✓</span>

                  <input
                    id="sg-register-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <div className="sg-register-message sg-register-error">
                  <span>!</span>
                  <p>{error}</p>
                </div>
              )}

              {success && (
                <div className="sg-register-message sg-register-success">
                  <span>✓</span>
                  <p>{success}</p>
                </div>
              )}

              <button
                type="submit"
                className="sg-register-submit"
                disabled={loading}
              >
                <span>
                  {loading ? "CREANDO CUENTA..." : "CREAR CUENTA"}
                </span>

                {!loading && <b>→</b>}
              </button>
            </form>

            <div className="sg-register-divider">
              <span />
              <strong>O</strong>
              <span />
            </div>

            <div className="sg-register-login-area">
              <p>¿YA TIENES UNA CUENTA?</p>

              <button
                type="button"
                onClick={() => router.push("/login")}
              >
                <span>INICIAR SESIÓN</span>
                <b>→</b>
              </button>
            </div>
          </>
        )}

        <div className="sg-register-security">
          <span>♢</span>
          REGISTRO SEGURO
          <span>•</span>
          STORE GAMING
        </div>

        <div className="sg-register-footer">
          RECARGAS GAMING • TU TIENDA DIGITAL
        </div>
      </section>

      <style jsx global>{`
        .sg-register-page {
          min-height: 100vh;
          min-height: 100svh;
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 42px 18px;
          overflow: hidden;
          isolation: isolate;
          background: #080607;
          color: #fff;
          font-family: Arial, Helvetica, sans-serif;
        }

        .sg-register-background {
          position: fixed;
          inset: 0;
          z-index: -4;
          background-image: url("/images/battle-royale-bg.jpg");
          background-position: center;
          background-size: cover;
          transform: scale(1.04);
        }

        .sg-register-overlay {
          position: fixed;
          inset: 0;
          z-index: -3;
          background:
            linear-gradient(110deg, rgba(5, 3, 5, .96), rgba(10, 4, 7, .88)),
            linear-gradient(rgba(0, 0, 0, .45), rgba(0, 0, 0, .8));
        }

        .sg-register-grid {
          position: fixed;
          inset: 0;
          z-index: -2;
          opacity: .12;
          background-image:
            linear-gradient(rgba(255, 51, 77, .17) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 51, 77, .17) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(to bottom, black, transparent 90%);
        }

        .sg-register-glow {
          position: fixed;
          z-index: -1;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          filter: blur(110px);
          pointer-events: none;
          opacity: .18;
        }

        .sg-register-glow-one {
          top: -170px;
          left: -100px;
          background: #ff173d;
        }

        .sg-register-glow-two {
          bottom: -180px;
          right: -100px;
          background: #a50025;
        }

        .sg-register-card {
          width: 100%;
          max-width: 465px;
          position: relative;
          padding: 35px 39px 25px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, .10);
          border-radius: 19px;
          background: linear-gradient(
            145deg,
            rgba(20, 17, 19, .97),
            rgba(9, 8, 10, .98)
          );
          box-shadow:
            0 25px 90px rgba(0, 0, 0, .65),
            0 0 45px rgba(229, 9, 20, .09),
            inset 0 1px 0 rgba(255, 255, 255, .04);
          animation: sgRegisterAppear .55s ease both;
        }

        .sg-register-top-line {
          position: absolute;
          top: 0;
          left: 12%;
          width: 76%;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            #ff334d,
            #ff7585,
            #ff334d,
            transparent
          );
          box-shadow: 0 0 18px rgba(255, 51, 77, .8);
        }

        .sg-register-back {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #929096;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: color .2s ease;
        }

        .sg-register-back:hover {
          color: #ff4058;
        }

        .sg-register-back span {
          font-size: 20px;
          line-height: 10px;
        }

        .sg-register-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 25px 0 29px;
        }

        .sg-register-brand-icon {
          width: 49px;
          height: 49px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 51, 77, .45);
          border-radius: 13px;
          background: linear-gradient(145deg, #341017, #16090d);
          box-shadow: 0 0 24px rgba(255, 51, 77, .13);
          font-size: 25px;
        }

        .sg-register-brand-name {
          display: flex;
          flex-direction: column;
          line-height: .98;
          letter-spacing: 3px;
        }

        .sg-register-brand-name span {
          color: #fff;
          font-size: 16px;
          font-weight: 900;
        }

        .sg-register-brand-name strong {
          margin-top: 5px;
          color: #ff334d;
          font-size: 22px;
          font-weight: 1000;
          letter-spacing: 2px;
        }

        .sg-register-heading {
          text-align: center;
          margin-bottom: 28px;
        }

        .sg-register-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin-bottom: 12px;
          color: #a6a0a3;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2.1px;
        }

        .sg-register-label span {
          width: 20px;
          height: 1px;
          background: #e52b43;
          opacity: .8;
        }

        .sg-register-heading h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(27px, 5vw, 34px);
          line-height: 1.15;
          font-weight: 1000;
          letter-spacing: -1px;
        }

        .sg-register-heading h1 span {
          color: #ff4058;
        }

        .sg-register-heading > p {
          max-width: 330px;
          margin: 12px auto 0;
          color: #969096;
          font-size: 12px;
          line-height: 1.65;
        }

        .sg-register-email {
          display: inline-block;
          max-width: 100%;
          margin-top: 10px;
          padding: 9px 13px;
          border: 1px solid rgba(255, 51, 77, .2);
          border-radius: 8px;
          background: rgba(255, 51, 77, .07);
          color: #ff697c;
          font-size: 12px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .sg-register-form {
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .sg-register-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sg-register-field label {
          color: #d6d0d3;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.3px;
        }

        .sg-register-input-box {
          height: 51px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 15px;
          border: 1px solid rgba(255, 255, 255, .10);
          border-radius: 9px;
          background: rgba(255, 255, 255, .035);
          transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
        }

        .sg-register-input-box:focus-within {
          border-color: rgba(255, 51, 77, .75);
          background: rgba(255, 51, 77, .045);
          box-shadow: 0 0 0 3px rgba(255, 51, 77, .08);
        }

        .sg-register-input-icon {
          flex-shrink: 0;
          width: 17px;
          color: #ff4058;
          font-size: 17px;
          text-align: center;
        }

        .sg-register-input-box input {
          width: 100%;
          height: 100%;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: #fff;
          font-family: inherit;
          font-size: 13px;
        }

        .sg-register-input-box input::placeholder {
          color: #686268;
        }

        .sg-register-input-box input:-webkit-autofill,
        .sg-register-input-box input:-webkit-autofill:hover,
        .sg-register-input-box input:-webkit-autofill:focus {
          -webkit-text-fill-color: #fff;
          transition: background-color 9999s ease-in-out 0s;
        }

        .sg-register-code-box input {
          text-align: center;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 8px;
        }

        .sg-register-message {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border-radius: 8px;
          font-size: 11px;
          line-height: 1.5;
        }

        .sg-register-message > span {
          flex-shrink: 0;
          font-weight: 1000;
        }

        .sg-register-message p {
          margin: 0;
          overflow-wrap: anywhere;
        }

        .sg-register-error {
          border: 1px solid rgba(255, 65, 78, .25);
          background: rgba(255, 45, 60, .08);
          color: #ff7c88;
        }

        .sg-register-success {
          border: 1px solid rgba(42, 205, 133, .25);
          background: rgba(42, 205, 133, .07);
          color: #66dca7;
        }

        .sg-register-submit {
          min-height: 52px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 5px;
          border: 1px solid #ff4058;
          border-radius: 9px;
          background: linear-gradient(110deg, #c90024, #ff334d);
          box-shadow: 0 8px 25px rgba(229, 9, 20, .23);
          color: #fff;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
        }

        .sg-register-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.1);
          box-shadow: 0 11px 30px rgba(229, 9, 20, .36);
        }

        .sg-register-submit:disabled {
          opacity: .55;
          cursor: not-allowed;
          box-shadow: none;
        }

        .sg-register-submit b {
          font-size: 17px;
        }

        .sg-register-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 25px 0 20px;
        }

        .sg-register-divider span {
          height: 1px;
          flex: 1;
          background: rgba(255, 255, 255, .10);
        }

        .sg-register-divider strong {
          color: #777078;
          font-size: 10px;
          font-weight: 800;
        }

        .sg-register-login-area {
          text-align: center;
        }

        .sg-register-login-area p {
          margin: 0 0 12px;
          color: #888188;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .sg-register-login-area button {
          width: 100%;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 1px solid rgba(255, 255, 255, .14);
          border-radius: 9px;
          background: rgba(255, 255, 255, .035);
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.2px;
          cursor: pointer;
          transition: .2s ease;
        }

        .sg-register-login-area button:hover {
          border-color: #ff4058;
          background: rgba(255, 51, 77, .08);
          color: #ff697c;
        }

        .sg-register-login-area button b {
          color: #ff4058;
          font-size: 17px;
        }

        .sg-register-resend {
          margin-top: 23px;
          text-align: center;
        }

        .sg-register-resend p {
          margin: 0;
          color: #858087;
          font-size: 11px;
        }

        .sg-register-resend button {
          margin-top: 9px;
          padding: 5px 8px;
          border: none;
          background: transparent;
          color: #ff4058;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 1px;
          cursor: pointer;
        }

        .sg-register-resend button:disabled {
          opacity: .5;
          cursor: wait;
        }

        .sg-register-back-form {
          display: block;
          margin: 18px auto 0;
          padding: 7px;
          border: none;
          background: transparent;
          color: #8e858d;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
          cursor: pointer;
        }

        .sg-register-back-form:hover {
          color: #ff4058;
        }

        .sg-register-security {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin-top: 27px;
          color: #716a72;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .sg-register-security span {
          color: #ff4058;
        }

        .sg-register-footer {
          margin-top: 13px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, .07);
          color: #514b52;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-align: center;
        }

        @keyframes sgRegisterAppear {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 520px) {
          .sg-register-page {
            align-items: center;
            padding: 22px 13px;
          }

          .sg-register-card {
            max-width: 430px;
            padding: 27px 23px 21px;
            border-radius: 15px;
          }

          .sg-register-brand {
            margin: 22px 0 25px;
          }

          .sg-register-heading {
            margin-bottom: 24px;
          }

          .sg-register-form {
            gap: 15px;
          }
        }

        @media (max-width: 360px) {
          .sg-register-card {
            padding: 24px 17px 19px;
          }

          .sg-register-heading h1 {
            font-size: 27px;
          }

          .sg-register-label {
            font-size: 8px;
            letter-spacing: 1.5px;
          }

          .sg-register-input-box {
            height: 48px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sg-register-card {
            animation: none;
          }

          .sg-register-page *,
          .sg-register-page *::before,
          .sg-register-page *::after {
            transition-duration: .01ms !important;
          }
        }
      `}</style>
    </main>
  );
}
