
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Introduce tu correo electrónico.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      setError("Introduce un correo electrónico válido.");
      return;
    }

    setLoading(true);

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

    if (resetError) {
      setError(
        "No se pudo enviar el correo. Inténtalo nuevamente."
      );
      setLoading(false);
      return;
    }

    setSuccess(
      "Te enviamos un enlace para actualizar tu contraseña. Revisa tu correo electrónico."
    );

    setEmail("");
    setLoading(false);
  }

  return (
    <main className="auth-page">
      <div className="auth-background" />

      <section className="auth-card">
        <button
          type="button"
          className="back-button"
          onClick={() => router.push("/login")}
          disabled={loading}
        >
          ← Volver
        </button>

        <div className="auth-logo">
          🛒🎮
        </div>

        <p className="auth-small">
          RECUPERAR CUENTA
        </p>

        <h1 className="auth-title">
          OLVIDÉ MI <span>CONTRASEÑA</span>
        </h1>

        <p className="auth-description">
          Introduce el correo de tu cuenta y te enviaremos
          un enlace para crear una nueva contraseña.
        </p>

        <form
          onSubmit={handleReset}
          className="auth-form"
        >
          <label>
            CORREO ELECTRÓNICO

            <div className="input-wrapper">
              <span>✉️</span>

              <input
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
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "ENVIANDO..."
              : "ENVIAR ENLACE"}
          </button>
        </form>

        <div className="auth-divider">
          <span />
          O
          <span />
        </div>

        <p className="auth-register-text">
          ¿Recordaste tu contraseña?
        </p>

        <button
          type="button"
          className="auth-register-button"
          onClick={() => router.push("/login")}
          disabled={loading}
        >
          INICIAR SESIÓN
        </button>
      </section>
    </main>
  );
}
