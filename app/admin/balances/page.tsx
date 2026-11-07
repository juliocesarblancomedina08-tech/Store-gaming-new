"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type ClientBalance = {
  id: string;
  email: string;
  balance: number;
};

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

export default function AdminBalancesPage() {
  const router = useRouter();

  const [clients, setClients] = useState<ClientBalance[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBalances = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        router.replace("/login");
        return;
      }

      const email = session.user.email?.toLowerCase();

      if (email !== ADMIN_EMAIL.toLowerCase()) {
        router.replace("/");
        return;
      }

      const response = await fetch("/api/admin/balances", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "No se pudieron cargar los saldos."
        );
      }

      setClients(Array.isArray(data.balances) ? data.balances : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al cargar los saldos."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadBalances();
  }, [loadBalances]);

  const totalBalance = useMemo(
    () =>
      clients.reduce(
        (total, client) => total + (Number(client.balance) || 0),
        0
      ),
    [clients]
  );

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return clients;

    return clients.filter((client) =>
      (client.email || "Sin correo").toLowerCase().includes(term)
    );
  }, [clients, search]);

  const formatBalance = (balance: number) =>
    (Number(balance) || 0).toFixed(2);

  return (
    <main className="balances-page">
      <style jsx>{`
        .balances-page {
          min-height: 100vh;
          padding: 22px 16px 40px;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(229, 9, 20, 0.16),
              transparent 38%
            ),
            #080808;
          color: #fff;
        }

        .container {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .top-actions {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 22px;
        }

        .back-button,
        .refresh-button {
          min-height: 44px;
          border: 1px solid #e50914;
          border-radius: 10px;
          padding: 11px 17px;
          color: #fff;
          background: #151515;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 0.2s ease,
            transform 0.2s ease;
        }

        .back-button:hover,
        .refresh-button:hover {
          background: #e50914;
        }

        .back-button:active,
        .refresh-button:active {
          transform: scale(0.98);
        }

        .summary-card {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          padding: 25px 22px;
          margin-bottom: 24px;
          border: 1px solid #ff2631;
          border-radius: 18px;
          background:
            linear-gradient(
              125deg,
              rgba(229, 9, 20, 0.24),
              rgba(15, 15, 15, 0.98) 55%
            ),
            #111;
          box-shadow: 0 8px 30px rgba(229, 9, 20, 0.12);
        }

        .summary-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: #e50914;
        }

        .summary-item {
          min-width: 0;
          padding: 8px 4px;
        }

        .summary-label {
          display: block;
          margin-bottom: 12px;
          color: #e5e5e5;
          font-size: 14px;
          font-weight: 700;
        }

        .summary-value {
          display: block;
          overflow-wrap: anywhere;
          color: #fff;
          font-size: clamp(27px, 6vw, 39px);
          line-height: 1.15;
          font-weight: 900;
        }

        .summary-value.money {
          color: #43f28a;
        }

        .search-box {
          width: 100%;
          min-height: 48px;
          margin-bottom: 17px;
          padding: 13px 15px;
          border: 1px solid #333;
          border-radius: 11px;
          outline: none;
          background: #111;
          color: #fff;
          font-size: 16px;
        }

        .search-box::placeholder {
          color: #999;
        }

        .search-box:focus {
          border-color: #e50914;
          box-shadow: 0 0 0 2px rgba(229, 9, 20, 0.13);
        }

        .section-heading {
          margin: 0 0 15px;
          color: #fff;
          font-size: 19px;
          font-weight: 900;
        }

        .client-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .client-row {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 14px;
          padding: 17px;
          border: 1px solid #303030;
          border-left: 4px solid #e50914;
          border-radius: 13px;
          background: linear-gradient(110deg, #171717, #0d0d0d);
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .client-row:hover {
          border-color: #e50914;
          background: #1b1112;
        }

        .client-row:active {
          transform: scale(0.995);
        }

        .client-info,
        .client-balance {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .field-label {
          color: #bdbdbd;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

        .client-email {
          color: #fff !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #fff;
          font-size: 15px;
          font-weight: 800;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .client-money {
          color: #43f28a;
          font-size: 22px;
          font-weight: 900;
        }

        .empty-state,
        .message {
          padding: 20px;
          border: 1px solid #303030;
          border-radius: 12px;
          background: #111;
          color: #ddd;
          text-align: center;
        }

        .error {
          margin-bottom: 16px;
          border-color: #e50914;
          color: #ff777d;
        }

        .loading {
          color: #ddd;
        }

        .list-footer {
          margin-top: 14px;
          color: #999;
          font-size: 13px;
          text-align: center;
        }

        @media (min-width: 600px) {
          .balances-page {
            padding: 30px 24px 48px;
          }

          .client-row {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
          }

          .client-balance {
            align-items: flex-end;
            text-align: right;
          }

          .summary-card {
            padding: 30px;
          }
        }

        @media (max-width: 380px) {
          .summary-card {
            gap: 8px;
            padding: 22px 13px;
          }

          .summary-label {
            font-size: 12px;
          }

          .client-row {
            padding: 14px;
          }
        }
      `}</style>

      <div className="container">
        <div className="top-actions">
          <button
            type="button"
            className="back-button"
            onClick={() => router.push("/admin")}
          >
            ← Regresar al panel
          </button>
        </div>

        <section className="summary-card" aria-label="Resumen de saldos">
          <div className="summary-item">
            <span className="summary-label">Total de clientes</span>
            <strong className="summary-value">
              {loading ? "…" : clients.length}
            </strong>
          </div>

          <div className="summary-item">
            <span className="summary-label">Saldo total</span>
            <strong className="summary-value money">
              {loading ? "…" : formatBalance(totalBalance)}
            </strong>
          </div>
        </section>

        <input
          className="search-box"
          type="search"
          placeholder="Buscar usuario..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Buscar usuario"
        />

        <h2 className="section-heading">Usuarios</h2>

        {error && <div className="message error">{error}</div>}

        {loading ? (
          <div className="message loading">Cargando usuarios y saldos...</div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-state">
            {search.trim()
              ? "No se encontraron usuarios con esa búsqueda."
              : "Todavía no hay usuarios para mostrar."}
          </div>
        ) : (
          <div className="client-list">
            {filteredClients.map((client) => (
              <button
                type="button"
                className="client-row"
                key={client.id}
                onClick={() =>
                  router.push(
                    `/admin/balances/${encodeURIComponent(client.id)}`
                  )
                }
              >
                <div className="client-info">
                  <span className="field-label">Usuario</span>
                  <span className="client-email">
                    {client.email || "Sin correo"}
                  </span>
                </div>

                <div className="client-balance">
                  <span className="field-label">Balance</span>
                  <span className="client-money">
                    {formatBalance(client.balance)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="list-footer">
          {loading
            ? "Actualizando información..."
            : `Mostrando ${filteredClients.length} de ${clients.length} usuarios`}
        </div>

        <div className="top-actions" style={{ marginTop: 20, marginBottom: 0 }}>
          <button
            type="button"
            className="refresh-button"
            onClick={() => void loadBalances()}
            disabled={loading}
          >
            {loading ? "Cargando..." : "↻ Actualizar saldos"}
          </button>
        </div>
      </div>
    </main>
  );
}
