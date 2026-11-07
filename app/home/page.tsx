
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!active) return;

      if (error || !session) {
        router.replace("/login");
        return;
      }

      setEmail(session.user.email ?? "");
      setLoading(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (!session) {
        router.replace("/login");
        return;
      }

      setEmail(session.user.email ?? "");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="home-loading">
        <div className="home-spinner" />
        <p>CARGANDO STORE GAMING...</p>
      </main>
    );
  }

  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-logo">
          <span>SG</span>
          <strong>STORE GAMING</strong>
        </div>

        <button
          type="button"
          className="home-logout"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "SALIENDO..." : "CERRAR SESIÓN"}
        </button>
      </header>

      <section className="home-content">
        <div className="home-badge">
          ● CUENTA CONECTADA
        </div>

        <h1>
          BIENVENIDO A
          <span> STORE GAMING</span>
        </h1>

        <p className="home-description">
          Tu universo gaming comienza aquí.
          Prepárate para descubrir nuestros productos digitales.
        </p>

        <div className="home-account">
          <span>SESIÓN INICIADA COMO</span>
          <strong>{email}</strong>
        </div>

        <div className="home-message">
          <span>🎮</span>
          <h2>¡Estamos preparando tu experiencia!</h2>
          <p>
            Muy pronto podrás explorar el catálogo,
            gestionar tus compras y consultar tus pedidos.
          </p>
        </div>
      </section>

      <footer className="home-footer">
        © {new Date().getFullYear()} STORE GAMING
      </footer>

      <style jsx>{`
        .home-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top, #321014 0%, transparent 45%),
            #080808;
          color: #fff;
          font-family: Arial, sans-serif;
        }

        .home-header {
          min-height: 75px;
          padding: 15px 5%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid #252525;
          background: #0b0b0b;
        }

        .home-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          letter-spacing: 1px;
        }

        .home-logo span {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #e50914;
          font-weight: 900;
        }

        .home-logout {
          padding: 12px 16px;
          border: 1px solid #e50914;
          border-radius: 9px;
          background: transparent;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .home-logout:disabled {
          opacity: .5;
          cursor: wait;
        }

        .home-content {
          width: min(850px, 90%);
          margin: 0 auto;
          padding: 90px 0 60px;
          text-align: center;
        }

        .home-badge {
          display: inline-block;
          padding: 10px 15px;
          border: 1px solid #492024;
          border-radius: 30px;
          color: #ff626a;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .home-content h1 {
          margin: 30px 0 15px;
          font-size: clamp(30px, 6vw, 55px);
          font-weight: 950;
          line-height: 1.1;
        }

        .home-content h1 span {
          display: block;
          color: #e50914;
        }

        .home-description {
          max-width: 550px;
          margin: 0 auto;
          color: #aaa;
          line-height: 1.7;
        }

        .home-account {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 35px auto;
          padding: 22px;
          max-width: 480px;
          border: 1px solid #292929;
          border-radius: 14px;
          background: #121212;
        }

        .home-account span {
          color: #888;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .home-account strong {
          overflow-wrap: anywhere;
          color: #fff;
        }

        .home-message {
          margin-top: 30px;
          padding: 35px 20px;
          border: 1px solid #292929;
          border-radius: 18px;
          background: linear-gradient(145deg, #171717, #0c0c0c);
        }

        .home-message > span {
          font-size: 38px;
        }

        .home-message h2 {
          font-size: 20px;
        }

        .home-message p {
          color: #999;
          line-height: 1.7;
        }

        .home-footer {
          padding: 25px;
          border-top: 1px solid #222;
          color: #777;
          text-align: center;
          font-size: 11px;
        }

        .home-loading {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
          background: #080808;
          color: #aaa;
          font: 800 11px Arial, sans-serif;
        }

        .home-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #333;
          border-top-color: #e50914;
          border-radius: 50%;
          animation: home-spin .8s linear infinite;
        }

        @keyframes home-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
