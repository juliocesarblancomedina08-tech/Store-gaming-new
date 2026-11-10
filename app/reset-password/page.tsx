"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("PONGA SU GMAIL.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("PONGA UN GMAIL VÁLIDO.");
      return;
    }

    setLoading(true);

    try {
      sessionStorage.setItem(
        "reset_password_email",
        cleanEmail
      );

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              `${window.location.origin}/reset-password/code`,
          }
        );

      if (resetError) {
        console.error(
          "ERROR ENVIANDO CÓDIGO:",
          resetError
        );

        setError(
          resetError.message ||
            "NO SE PUDO ENVIAR EL CÓDIGO."
        );

        setLoading(false);
        return;
      }

      router.push("/reset-password/code");
    } catch (error) {
      console.error(
        "ERROR RECUPERANDO CONTRASEÑA:",
        error
      );

      setError(
        "OCURRIÓ UN ERROR. INTENTE NUEVAMENTE."
      );
    } finally {
      setLoading(false);
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
          onClick={() => router.push("/login")}
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
            RECUPERACIÓN DE CUENTA
          </p>

          <h1 className="auth-title">
            RECUPERAR <span>CONTRASEÑA</span>
          </h1>

          <div className="login-title-line" />

          <p className="auth-description">
            Introduce tu Gmail para recibir un
            <strong> código de verificación</strong>.
          </p>

        </div>

        {/* FORMULARIO */}

        <form
          onSubmit={handleSendCode}
          className="auth-form login-form"
        >

          {/* GMAIL */}

          <div className="login-field">

            <label htmlFor="reset-email">
              GMAIL
            </label>

            <div className="input-wrapper login-input-wrapper">

              <span className="input-icon">
                ✉
              </span>

              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="tucorreo@gmail.com"
                autoComplete="email"
                inputMode="email"
                disabled={loading}
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

          {/* VERIFICAR GMAIL */}

          <button
            type="submit"
            className="auth-submit login-submit"
            disabled={loading}
          >

            <span>
              {loading
                ? "ENVIANDO CÓDIGO..."
                : "VERIFICAR GMAIL"}
            </span>

            {!loading && (
              <b>
                →
              </b>
            )}

          </button>

        </form>

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
            RECIBIRÁS UN CÓDIGO DE 6 DÍGITOS
          </p>

          <p
            className="auth-description"
            style={{
              marginTop: "8px",
              fontSize: "13px",
            }}
          >
            Revisa tu bandeja de entrada y también
            la carpeta de spam.
          </p>

        </div>

        {/* PIE */}

        <div className="login-footer">
          STORE GAMING • RECUPERACIÓN SEGURA
        </div>

      </section>

    </main>
  );
}
