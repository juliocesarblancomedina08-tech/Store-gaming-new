
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
    let active = true;

    async function verifyAccount() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }
        } else {
          const { data, error } =
            await supabase.auth.getSession();

          if (error || !data.session) {
            throw new Error("No se pudo verificar la sesión.");
          }
        }

        if (!active) return;

        setMessage("¡Cuenta verificada! Redirigiendo...");

        router.replace("/home");
        router.refresh();
      } catch {
        if (!active) return;

        setMessage(
          "No se pudo verificar tu cuenta. Vuelve a iniciar sesión."
        );

        setTimeout(() => {
          router.replace("/login");
        }, 2500);
      }
    }

    verifyAccount();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
        <h1 className="mb-4 text-2xl font-bold">
          STORE GAMING
        </h1>

        <div className="mb-5 text-4xl">🎮</div>

        <p role="status" aria-live="polite" className="text-gray-300">
          {message}
        </p>
      </div>
    </main>
  );
}
