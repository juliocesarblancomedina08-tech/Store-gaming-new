"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  const [message, setMessage] = useState(
    "Verificando tu cuenta..."
  );

  useEffect(() => {
    async function verifySession() {
      const { data, error } =
        await supabase.auth.getSession();

      if (error || !data.session) {
        setMessage(
          "No se pudo confirmar la cuenta. Intenta iniciar sesión."
        );

        setTimeout(() => {
          router.push("/login");
        }, 3000);

        return;
      }

      setMessage(
        "¡Cuenta confirmada correctamente! 🎉"
      );

      setTimeout(() => {
        router.push("/home");
      }, 1500);
    }

    verifySession();
  }, [router]);

  return (
    <main className="auth-page">
      <div className="auth-background" />

      <section className="auth-card">
        <div className="auth-logo">
          🛒🎮
        </div>

        <p className="auth-small">
          STORE GAMING
        </p>

        <h1 className="auth-title">
          VERIFICANDO <span>CUENTA</span>
        </h1>

        <p className="auth-description">
          {message}
        </p>

        <div
          style={{
            marginTop: "24px",
            fontSize: "36px",
          }}
        >
          🔐
        </div>
      </section>
    </main>
  );
}
