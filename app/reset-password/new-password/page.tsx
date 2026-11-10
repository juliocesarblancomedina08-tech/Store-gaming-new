"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function NewPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkRecoverySession() {
      try {
        const verified =
          sessionStorage.getItem(
            "reset_password_verified"
          );

        if (verified !== "true") {
          router.replace("/reset-password");
          return;
        }

        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (
          sessionError ||
          !data.session
        ) {
          sessionStorage.removeItem(
            "reset_password_verified"
          );

          router.replace("/reset-password");
          return;
        }

        setChecking(false);
      } catch (error) {
        console.error(
          "ERROR COMPROBANDO SESIÓN:",
          error
        );

        router.replace("/reset-password");
      }
    }

    checkRecoverySession();
  }, [router]);

  async function handleChangePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!password) {
      setError(
        "PONGA SU CONTRASEÑA."
      );
      return;
    }

    if (!repeatPassword) {
      setError(
        "REPITA SU CONTRASEÑA."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "LA CONTRASEÑA DEBE TENER AL MENOS 6 CARACTERES."
      );
      return;
    }

    if (password !== repeatPassword) {
      setError(
        "LAS CONTRASEÑAS NO COINCIDEN."
      );
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        console.error(
          "ERROR ACTUALIZANDO CONTRASEÑA:",
          updateError
        );

        setError(
          updateError.message ||
            "NO SE PUDO CAMBIAR LA CONTRASEÑA."
        );

        setLoading(false);
        return;
      }

      sessionStorage.removeItem(
        "reset_password_verified"
      );

      sessionStorage.removeItem(
        "reset_password_email"
      );

      router.push("/home");
    } catch (error) {
      console.error(
        "ERROR CAMBIANDO CONTRASEÑA:",
        error
      );

      setError(
        "OCURRIÓ UN ERROR. INTENTE NUEVAMENTE."
      );

      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="auth-page login-page">
        <div className="auth-background" />

        <section className="auth-card login-card">

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

          <div className="login-heading">

            <p className="auth-small">
              STORE GAMING
            </p>

            <h1 className="auth-title">
              VERIFICANDO <span>CUENTA</span>
            </h1>

            <div className="login-title-line" />

            <p className="auth-description">
              COMPROBANDO LA SESIÓN DE RECUPERACIÓN...
            </p>

          </div>

          <div className="login-footer">
            STORE GAMING • RECUPERACIÓN SEGURA
          </div>

        </section>
      </main>
    );
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
            router.push("/reset-password/code")
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
            SEGURIDAD DE CUENTA
          </p>

          <h1 className="auth-title">
            NUEVA <span>CONTRASEÑA</span>
          </h1>

          <div className="login-title-line" />

          <p className="auth-description">
            Crea una nueva contraseña para
            <strong> proteger tu cuenta.</strong>
          </p>

        </div>

        {/* FORMULARIO */}

        <form
          onSubmit={handleChangePassword}
          className="auth-form login-form"
        >

          {/* CONTRASEÑA */}

          <div className="login-field">

            <label htmlFor="new-password">
              PONGA SU CONTRASEÑA
            </label>

            <div className="input-wrapper login-input-wrapper">

              <span className="input-icon">
                🔒
              </span>

              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Nueva contraseña"
                autoComplete="new-password"
                disabled={loading}
              />

            </div>

          </div>

          {/* REPETIR CONTRASEÑA */}

          <div className="login-field">

            <label htmlFor="repeat-password">
              REPETIR CONTRASEÑA
            </label>

            <div className="input-wrapper login-input-wrapper">

              <span className="input-icon">
                🔒
              </span>

              <input
                id="repeat-password"
                type="password"
                value={repeatPassword}
                onChange={(event) =>
                  setRepeatPassword(
                    event.target.value
                  )
                }
                placeholder="Repita su contraseña"
                autoComplete="new-password"
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

          {/* CONTINUAR */}

          <button
            type="submit"
            className="auth-submit login-submit"
            disabled={
              loading ||
              !password ||
              !repeatPassword
            }
          >

            <span>
              {loading
                ? "GUARDANDO..."
                : "CONTINUAR"}
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
            CONTRASEÑA SEGURA
          </p>

          <p
            className="auth-description"
            style={{
              marginTop: "8px",
              fontSize: "13px",
            }}
          >
            Usa una contraseña que puedas
            recordar y que sea difícil de adivinar.
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
