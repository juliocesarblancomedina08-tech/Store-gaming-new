
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Client = {
  id: string;
  email: string;
  created_at: string;
  name: string;
  username: string;
  avatar_url: string | null;
  email_confirmed: boolean;
  vip_started_at: string | null;
  vip_expires_at: string | null;
  vip_active: boolean;
  vip_source: "purchase" | "manual" | null;
  vip_purchased: boolean;
  vip_manual: boolean;
};

export default function AdminClientsPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadClients = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      if (
        session.user.email?.toLowerCase() !==
        "juliocesarblancomedina08@gmail.com"
      ) {
        router.replace("/home");
        return;
      }

      const response = await fetch("/api/admin/clients", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        router.replace("/home");
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "No se pudieron cargar los clientes."
        );
      }

      setClients(result.clients || []);
    } catch (err) {
      console.error("Error al cargar clientes:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al cargar los clientes."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filteredClients = clients.filter((client) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      client.email.toLowerCase().includes(query) ||
      client.name.toLowerCase().includes(query) ||
      client.username.toLowerCase().includes(query)
    );
  });

  function formatDate(date: string) {
    if (!date) return "No disponible";

    return new Intl.DateTimeFormat("es", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  function openClient(clientId: string) {
    router.push(`/admin/clients/${clientId}`);
  }

  return (
    <main className="clients-page">
      <div className="container">

        <button
          type="button"
          className="back-button"
          onClick={() => router.push("/admin")}
        >
          <span>←</span>
          VOLVER AL PANEL
        </button>

        <header className="topbar">
          <div className="brand">
            <div className="brand-logo">🎮</div>

            <div>
              <span className="brand-name">STORE GAMING</span>
              <h1>GESTIÓN DE CLIENTES</h1>
            </div>
          </div>

          <button
            type="button"
            className="refresh-button"
            disabled={refreshing || loading}
            onClick={() => void loadClients(true)}
          >
            <span>{refreshing ? "…" : "↻"}</span>
            Actualizar
          </button>
        </header>

        <section className="intro">
          <div className="eyebrow">
            <span className="status-dot" />
            PANEL ADMINISTRATIVO
          </div>

          <h2>
            Nuestros clientes<span>.</span>
          </h2>

          <p>
            Consulta los usuarios registrados en STORE GAMING,
            sus fotografías de perfil, membresías VIP y fechas
            de registro.
          </p>
        </section>

        <section className="stats">
          <div className="stat-icon">👥</div>

          <div className="stat-info">
            <span>TOTAL DE CLIENTES REGISTRADOS</span>

            <strong>
              {loading ? "..." : clients.length}
            </strong>

            <p>Usuarios registrados en Supabase Auth</p>
          </div>

          <div className="stat-decoration">CLIENTES</div>
        </section>

        <section className="list-section">
          <div className="list-heading">
            <div>
              <span className="eyebrow">BASE DE DATOS</span>
              <h3>Lista de clientes</h3>

              <p>
                {loading
                  ? "Consultando usuarios..."
                  : `${filteredClients.length} de ${clients.length} clientes`}
              </p>
            </div>
          </div>

          <div className="search-box">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Buscar por usuario o correo..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar clientes"
            />

            {search && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>

          {error && (
            <div className="error-box">
              <strong>No se pudieron cargar los clientes</strong>
              <p>{error}</p>

              <button
                type="button"
                onClick={() => void loadClients(true)}
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {loading ? (
            <div className="state-box">
              <div className="loader" />
              <p>Cargando clientes...</p>
            </div>
          ) : !error && filteredClients.length === 0 ? (
            <div className="state-box empty">
              <span>🔎</span>
              <h4>No se encontraron clientes</h4>
              <p>
                {search
                  ? "Prueba con otro nombre o correo electrónico."
                  : "Todavía no hay usuarios registrados."}
              </p>
            </div>
          ) : !error ? (
            <div className="clients-list">
              {filteredClients.map((client, index) => {
                const displayName =
                  client.username ||
                  client.name ||
                  client.email ||
                  "Usuario";

                const initial = displayName
                  .charAt(0)
                  .toUpperCase();

                return (
                  <article
                    className="client-card"
                    key={client.id}
                    onClick={() => openClient(client.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Administrar cliente ${displayName}`}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        openClient(client.id);
                      }
                    }}
                  >
                    <div className="client-avatar">
                      {client.avatar_url ? (
                        <img
                          src={client.avatar_url}
                          alt={`Foto de ${displayName}`}
                        />
                      ) : (
                        initial
                      )}
                    </div>

                    <div className="client-info">
                      <div className="client-title">
                        <h4>{displayName}</h4>

                        <div className="client-badges">
                          {client.vip_active && (
                            <span className="vip-badge">
                              👑 VIP
                            </span>
                          )}

                          <span className="client-number">
                            #{String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                      </div>

                      <p className="client-email">
                        {client.email || "Correo no disponible"}
                      </p>

                      <div className="client-meta">
                        <span>
                          Registro: {formatDate(client.created_at)}
                        </span>

                        <span
                          className={
                            client.email_confirmed
                              ? "verification verified"
                              : "verification unverified"
                          }
                        >
                          <span className="verification-dot" />

                          {client.email_confirmed
                            ? "Correo verificado"
                            : "Correo sin verificar"}
                        </span>

                        {client.vip_active && (
                          <span className="vip-origin">
                            {client.vip_manual
                              ? "VIP manual"
                              : "VIP comprado"}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="client-arrow">›</span>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <footer className="footer">
          <strong>🎮 STORE GAMING</strong>
          <span>Centro de administración · Clientes</span>
        </footer>

      </div>

      <style jsx>{`
        .clients-page {
          min-height: 100vh;
          padding: 25px 16px 35px;
          background:
            radial-gradient(
              ellipse at 50% -10%,
              rgba(255, 48, 71, 0.13),
              transparent 42%
            ),
            #08090d;
          color: #f5f5f7;
          font-family: Arial, Helvetica, sans-serif;
        }

        .container {
          width: 100%;
          max-width: 780px;
          margin: 0 auto;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 20px;
          padding: 11px 14px;
          border: 1px solid #49303a;
          border-radius: 10px;
          background: #151219;
          color: #ff6477;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.7px;
          cursor: pointer;
        }

        .back-button span {
          font-size: 18px;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding-bottom: 22px;
          border-bottom: 1px solid #252630;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .brand-logo {
          display: grid;
          place-items: center;
          width: 45px;
          height: 45px;
          flex-shrink: 0;
          border: 1px solid #383944;
          border-radius: 13px;
          background: #191a22;
          font-size: 23px;
        }

        .brand-name {
          display: block;
          margin-bottom: 5px;
          color: #ff5267;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.6px;
        }

        .brand h1 {
          margin: 0;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .refresh-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 11px;
          border: 1px solid #353641;
          border-radius: 10px;
          background: #15161d;
          color: #e5e5eb;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .refresh-button span {
          color: #ff5267;
          font-size: 18px;
        }

        .intro {
          padding: 32px 0 25px;
        }

        .eyebrow {
          color: #ff5267;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .intro .eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ff3047;
          box-shadow: 0 0 10px #ff304780;
        }

        .intro h2 {
          margin: 13px 0 10px;
          font-size: clamp(29px, 6vw, 39px);
          font-weight: 900;
          letter-spacing: -1.3px;
        }

        .intro h2 span {
          color: #ff3047;
        }

        .intro > p {
          max-width: 570px;
          margin: 0;
          color: #9697a3;
          font-size: 12px;
          line-height: 1.8;
        }

        .stats {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          overflow: hidden;
          padding: 21px;
          border: 1px solid #49303a;
          border-radius: 16px;
          background: linear-gradient(
            120deg,
            #20151d,
            #15141b 70%
          );
        }

        .stat-icon {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          flex-shrink: 0;
          border: 1px solid #55303c;
          border-radius: 15px;
          background: #2a1b25;
          font-size: 28px;
        }

        .stat-info {
          min-width: 0;
          position: relative;
          z-index: 1;
        }

        .stat-info > span {
          color: #b9a5af;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .stat-info strong {
          display: block;
          margin-top: 5px;
          color: #ff5267;
          font-size: 37px;
          line-height: 1.1;
          font-weight: 900;
        }

        .stat-info p {
          margin: 6px 0 0;
          color: #9697a3;
          font-size: 10px;
        }

        .stat-decoration {
          margin-left: auto;
          color: #ffffff09;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .list-section {
          padding-top: 30px;
        }

        .list-heading {
          margin-bottom: 16px;
        }

        .list-heading h3 {
          margin: 8px 0 5px;
          font-size: 20px;
          font-weight: 900;
        }

        .list-heading p {
          margin: 0;
          color: #888995;
          font-size: 11px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          padding: 0 13px;
          border: 1px solid #30313b;
          border-radius: 12px;
          background: #13141b;
        }

        .search-box > span {
          color: #ff5267;
          font-size: 25px;
        }

        .search-box input {
          width: 100%;
          min-width: 0;
          padding: 14px 0;
          border: 0;
          outline: none;
          background: transparent;
          color: #f5f5f7;
          font-size: 12px;
        }

        .search-box input::placeholder {
          color: #777885;
        }

        .clear-search {
          border: 0;
          background: transparent;
          color: #b5b5bf;
          font-size: 22px;
          cursor: pointer;
        }

        .clients-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .client-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
          padding: 15px;
          border: 1px solid #292a34;
          border-radius: 13px;
          background: linear-gradient(135deg, #171820, #101116);
          cursor: pointer;
          transition: border-color 0.2s, transform 0.2s;
        }

        .client-card:hover {
          border-color: #ff5267;
          transform: translateY(-2px);
        }

        .client-card:focus-visible {
          outline: 2px solid #ff5267;
          outline-offset: 3px;
        }

        .client-avatar {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          overflow: hidden;
          border: 1px solid #49303a;
          border-radius: 50%;
          background: #251923;
          color: #ff6477;
          font-size: 18px;
          font-weight: 900;
        }

        .client-avatar img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .client-info {
          flex: 1;
          min-width: 0;
        }

        .client-title {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .client-title h4 {
          min-width: 0;
          margin: 2px 0 6px;
          overflow-wrap: anywhere;
          color: #f5f5f7;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 800;
        }

        .client-badges {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          gap: 8px;
        }

        .vip-badge {
          padding: 5px 9px;
          border: 1px solid #a8792d;
          border-radius: 20px;
          background: #352719;
          color: #ffd477;
          font-size: 9px;
          font-weight: 900;
        }

        .client-number {
          color: #737480;
          font-size: 10px;
          font-weight: 900;
        }

        .client-email {
          margin: 0;
          overflow-wrap: anywhere;
          color: #a6a6b1;
          font-size: 11px;
          line-height: 1.6;
        }

        .client-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 12px;
          margin-top: 10px;
          color: #777885;
          font-size: 9px;
        }

        .verification {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-weight: 700;
        }

        .verified {
          color: #86d5a0;
        }

        .unverified {
          color: #e9bd77;
        }

        .verification-dot {
          width: 6px;
          height: 6px;
          flex-shrink: 0;
          border-radius: 50%;
          background: currentColor;
        }

        .vip-origin {
          color: #ffd477;
          font-weight: 800;
        }

        .client-arrow {
          align-self: center;
          flex-shrink: 0;
          color: #ff5267;
          font-size: 25px;
          font-weight: 900;
        }

        .state-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: 180px;
          border: 1px solid #292a34;
          border-radius: 14px;
          background: #111218;
          color: #9697a3;
          font-size: 12px;
          text-align: center;
        }

        .state-box p {
          margin: 0;
        }

        .loader {
          width: 32px;
          height: 32px;
          border: 3px solid #30313b;
          border-top-color: #ff3047;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .empty > span {
          font-size: 28px;
        }

        .empty h4 {
          margin: 0;
          color: #e5e5eb;
        }

        .error-box {
          padding: 16px;
          border: 1px solid #71313d;
          border-radius: 12px;
          background: #24151a;
          color: #ffb3bd;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .error-box p {
          line-height: 1.6;
        }

        .error-box button {
          padding: 9px 12px;
          border: 1px solid #79404a;
          border-radius: 8px;
          background: #321b22;
          color: #ffb3bd;
          font-weight: 700;
          cursor: pointer;
        }

        .footer {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 10px;
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid #252630;
          color: #777885;
          font-size: 10px;
        }

        .footer strong {
          color: #c7c7d0;
          letter-spacing: 0.7px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 480px) {
          .clients-page {
            padding: 20px 12px 28px;
          }

          .brand {
            gap: 8px;
          }

          .brand-logo {
            width: 39px;
            height: 39px;
            font-size: 20px;
          }

          .brand-name {
            font-size: 9px;
            letter-spacing: 1px;
          }

          .brand h1 {
            font-size: 10px;
          }

          .refresh-button {
            padding: 9px;
            font-size: 10px;
          }

          .stats {
            gap: 12px;
            padding: 16px 13px;
          }

          .stat-icon {
            width: 45px;
            height: 45px;
            font-size: 22px;
          }

          .stat-info > span {
            font-size: 8px;
            letter-spacing: 0.5px;
          }

          .stat-info strong {
            font-size: 32px;
          }

          .stat-decoration {
            display: none;
          }

          .client-card {
            padding: 12px;
          }

          .client-avatar {
            width: 43px;
            height: 43px;
          }

          .client-number {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .loader {
            animation: none;
          }

          .client-card {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
