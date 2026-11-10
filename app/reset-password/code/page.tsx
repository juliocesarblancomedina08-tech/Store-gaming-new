"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ResetPasswordCodePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem(
      "reset_password_email"
    );

    if (!savedEmail) {
      router.replace("/reset-password");
      return;
    }

    setEmail(savedEmail);
  }, [router]);

  async function handleConfirm(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanCode = code.trim();

    if (!email) {
      setError("NO SE ENCONTRÓ EL GMAIL.");
      return;
    }

    if (!cleanCode) {
      setError("PONGA EL CÓDIGO DE VERIFICACIÓN.");
      return;
    }

    if (!/^\d{8}$/.test(cleanCode)) {
      setError("EL CÓDIGO DEBE TENER 8 DÍGITOS.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: verifyError } =
        await supabase.auth.verifyOtp({
          email,
          token: cleanCode,
          type: "recovery",
        });

      if (verifyError) {
        console.error(
          "ERROR VERIFICANDO CÓDIGO:",
          verifyError
        );

        setError(
          "EL CÓDIGO ES INCORRECTO O HA EXPIRADO."
        );

        setLoading(false);
        return;
      }

      if (!data.session) {
        setError(
          "NO SE PUDO CREAR LA SESIÓN DE RECUPERACIÓN."
        );

        setLoading(false);
        return;
      }

      sessionStorage.setItem(
        "reset_password_verified",
        "true"
      );

      router.push("/reset-password/new-password");
    } catch (error) {
      console.error(
        "ERROR CONFIRMANDO CÓDIGO:",
        error
      );

      setError(
        "OCURRIÓ UN ERROR. INTENTE NUEVAMENTE."
      );

      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!email || resending || loading) return;

    setError("");
    setResending(true);

    try {
      const { error: resendError } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              `${window.location.origin}/reset-password/code`,
          }
        );

      if (resendError) {
        console.error(
          "ERROR REENVIANDO CÓDIGO:",
          resendError
        );

        setError(
          "NO SE PUDO REENVIAR EL CÓDIGO."
        );

        return;
      }

      setCode("");

      alert(
        "SE HA ENVIADO UN NUEVO CÓDIGO A TU GMAIL."
      );
    } catch (error) {
      console.error(
        "ERROR REENVIANDO CÓDIGO:",
        error
      );

      setError(
        "OCURRIÓ UN ERROR AL REENVIAR EL CÓDIGO."
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="auth-page login-page">

      <div className="auth-background" />

      <section className="auth-card login-card">

        {/* BOTÓN ATRÁS */}

        <button
          type="button"
          className="back-button auth-back-button login-back-button"
          onClick={() =>
            router.push("/reset-password")
          }
          disabled={loading}
        >
          <span className="back-arrow">
            ←
          </span>

          <span>
            ATRÁS
          </span>
        </button>

        {/* LOGO */}

        <div className="login-logo">

          <div className="login-logo-cart">
            🛒
          </div>

          <div className="login-logo-text">

            <span>
              STORE
            </span>

            <strong>
              GAMING
            </strong>

          </div>

        </div>

        {/* ENCABEZADO */}

        <div className="login-heading">

          <p className="auth-small">
            VERIFICACIÓN DE CUENTA
          </p>

          <h1 className="auth-title">
            CONFIRMAR <span>GMAIL</span>
          </h1>

          <div className="login-title-line" />

          <p className="auth-description">
            Introduce el código de
            <strong> 8 dígitos</strong> enviado a:
          </p>

          <p
            className="auth-description"
            style={{
              marginTop: "8px",
              fontWeight: 700,
              wordBreak: "break-word",
            }}
          >
            {email || "Cargando..."}
          </p>

        </div>

        {/* FORMULARIO */}

        <form
          onSubmit={handleConfirm}
          className="auth-form login-form"
        >

          {/* CÓDIGO */}

          <div className="login-field">

            <label htmlFor="reset-code">
              CÓDIGO DE 8 DÍGITOS
            </label>

            <div className="input-wrapper login-input-wrapper">

              <span className="input-icon">
                #
              </span>

              <input
                id="reset-code"
                type="text"
                value={code}
                onChange={(event) => {
                  const value =
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 8);

                  setCode(value);
                }}
                placeholder="00000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                disabled={loading}
                style={{
                  letterSpacing: "0.25em",
                  fontWeight: 800,
                }}
              />

            </div>

          </div>

          {/* ERROR */}

          {error && (
            <div className="auth-error login-message">

              <span>
                ⚠
              </span>

              <p>
                {error}
              </p>

            </div>
          )}

          {/* CONFIRMAR */}

          <button
            type="submit"
            className="auth-submit login-submit"
            disabled={
              loading ||
              code.length !== 8
            }
          >

            <span>
              {loading
                ? "CONFIRMANDO..."
                : "CONFIRMAR"}
            </span>

            {!loading && (
              <b>
                →
              </b>
            )}

          </button>

        </form>

        {/* REENVIAR */}

        <div className="login-forgot-wrapper">

          <button
            type="button"
            className="forgot-password-button login-forgot-button"
            onClick={handleResendCode}
            disabled={
              loading ||
              resending ||
              !email
            }
          >

            <span>
              {resending
                ? "REENVIANDO..."
                : "REENVIAR CÓDIGO"}
            </span>

            {!resending && (
              <b>
                ↻
              </b>
            )}

          </button>

        </div>

        {/* DIVISOR */}

        <div className="auth-divider login-divider">

          <span />

          <strong>
            O
          </strong>

          <span />

        </div>

        {/* INFORMACIÓN */}

        <div className="login-register-area">

          <p className="auth-register-text">
            ¿NO RECIBISTE EL CÓDIGO?
          </p>

          <p
            className="auth-description"
            style={{
              marginTop: "8px",
              fontSize: "13px",
            }}
          >
            Revisa tu bandeja de entrada y la
            carpeta de spam.
          </p>

        </div>

        {/* PIE */}

        <div className="login-footer">
          STORE GAMING • VERIFICACIÓN SEGURA
        </div>

      </section>

    </main>
  );
}
