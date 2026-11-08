"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { supabase } from "../../../lib/supabase";

type User = {
  id: string;
  email: string | null;
  balance: number;
};

type Movement = {
  id: string;
  kind: "ADD" | "SUBTRACT" | "PURCHASE";
  amount: number;
  description: string;
  product?: string | null;
  date: string;
};

type Summary = {
  totalAdded: number;
  totalSpent: number;
  balance: number;
};

type MovementsResponse = {
  ok: boolean;
  user?: User;
  summary?: Summary;
  movements?: Movement[];
  error?: string;
};

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

function formatMoney(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MovementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedUserId =
    searchParams.get("userId");

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);

  const [summary, setSummary] =
    useState<Summary | null>(null);

  const [movements, setMovements] =
    useState<Movement[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const getAccessToken =
    useCallback(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return null;
      }

      const email =
        session.user.email?.toLowerCase();

      if (email !== ADMIN_EMAIL.toLowerCase()) {
        router.replace("/home");
        return null;
      }

      return session.access_token;
    }, [router]);

  const loadUsers =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const token =
          await getAccessToken();

        if (!token) return;

        const response = await fetch(
          "/api/admin/movements",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ||
              "No se pudieron cargar los usuarios."
          );
        }

        setUsers(data.users || []);
      } catch (err) {
        console.error(
          "ERROR MOVIMIENTOS:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Error cargando usuarios."
        );
      } finally {
        setLoading(false);
      }
    }, [getAccessToken]);

  const loadUserMovements =
    useCallback(
      async (userId: string) => {
        setDetailLoading(true);
        setError("");

        try {
          const token =
            await getAccessToken();

          if (!token) return;

          const response = await fetch(
            `/api/admin/movements?userId=${encodeURIComponent(
              userId
            )}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: "no-store",
            }
          );

          const data: MovementsResponse =
            await response.json();

          if (
            !response.ok ||
            !data.ok
          ) {
            throw new Error(
              data.error ||
                "No se pudieron cargar los movimientos."
            );
          }

          setSelectedUser(
            data.user || null
          );

          setSummary(
            data.summary || {
              totalAdded: 0,
              totalSpent: 0,
              balance: 0,
            }
          );

          setMovements(
            data.movements || []
          );
        } catch (err) {
          console.error(
            "ERROR DETALLE MOVIMIENTOS:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Error cargando movimientos."
          );
        } finally {
          setDetailLoading(false);
        }
      },
      [getAccessToken]
    );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (selectedUserId) {
      loadUserMovements(
        selectedUserId
      );
    } else {
      setSelectedUser(null);
      setSummary(null);
      setMovements([]);
    }
  }, [
    selectedUserId,
    loadUserMovements,
  ]);

  const filteredUsers =
    useMemo(() => {
      const value =
        search.trim().toLowerCase();

      if (!value) {
        return users;
      }

      return users.filter((user) =>
        (user.email || "")
          .toLowerCase()
          .includes(value)
      );
    }, [users, search]);

  const goBackToUsers = () => {
    router.push("/admin/movements");
  };

  const refresh = async () => {
    if (selectedUserId) {
      await loadUserMovements(
        selectedUserId
      );
    } else {
      await loadUsers();
    }
  };

  if (selectedUserId) {
    return (
      <main className="page">
        <style jsx>{`
          .page {
            min-height: 100vh;
            background:
              radial-gradient(
                circle at top,
                #241012 0%,
                #0a0a0a 45%,
                #050505 100%
              );
            color: #fff;
            padding: 25px 16px 50px;
          }

          .container {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
          }

          .top-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
          }

          .back-button,
          .refresh-button {
            border: 1px solid #333;
            background: #111;
            color: #fff;
            padding: 11px 15px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
          }

          .back-button:hover,
          .refresh-button:hover {
            border-color: #e50914;
            background: #181010;
          }

          .hero {
            margin-bottom: 22px;
          }

          .hero-title {
            margin: 0;
            color: #fff;
            font-size: 30px;
            font-weight: 950;
            letter-spacing: 1px;
          }

          .hero-text {
            margin: 7px 0 0;
            color: #999;
            font-size: 13px;
          }

          .user-card {
            margin-bottom: 20px;
            padding: 18px;
            border: 1px solid #303030;
            border-left: 4px solid #e50914;
            border-radius: 14px;
            background:
              linear-gradient(
                110deg,
                #171717,
                #0d0d0d
              );
          }

          .user-label {
            color: #888;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 7px;
          }

          .user-email {
            color: #fff;
            font-size: 17px;
            font-weight: 900;
            overflow-wrap: anywhere;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 25px;
          }

          .summary-card {
            min-width: 0;
            padding: 18px 14px;
            border: 1px solid #303030;
            border-radius: 13px;
            background: #101010;
            text-align: center;
          }

          .summary-label {
            margin-bottom: 8px;
            color: #999;
            font-size: 10px;
            font-weight: 950;
            letter-spacing: 0.7px;
          }

          .summary-value {
            font-size: 21px;
            font-weight: 950;
            white-space: nowrap;
          }

          .added {
            color: #43f28a;
          }

          .spent {
            color: #ff454f;
          }

          .current {
            color: #fff;
          }

          .section-title {
            margin: 0 0 12px;
            color: #fff;
            font-size: 18px;
            font-weight: 950;
          }

          .movement-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .movement {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            padding: 15px;
            border: 1px solid #2d2d2d;
            border-radius: 12px;
            background: #0f0f0f;
          }

          .movement.add {
            border-left: 4px solid #25d96f;
          }

          .movement.expense {
            border-left: 4px solid #e50914;
          }

          .movement-info {
            min-width: 0;
            flex: 1;
          }

          .movement-title {
            color: #fff;
            font-size: 14px;
            font-weight: 900;
            overflow-wrap: anywhere;
          }

          .movement-date {
            margin-top: 5px;
            color: #777;
            font-size: 11px;
          }

          .movement-type {
            margin-top: 4px;
            color: #999;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .movement-amount {
            flex-shrink: 0;
            font-size: 18px;
            font-weight: 950;
            white-space: nowrap;
          }

          .green {
            color: #43f28a;
          }

          .red {
            color: #ff454f;
          }

          .message {
            padding: 22px;
            border: 1px solid #303030;
            border-radius: 12px;
            background: #111;
            color: #ccc;
            text-align: center;
          }

          .error {
            margin-bottom: 15px;
            border-color: #e50914;
            color: #ff777d;
          }

          @media (max-width: 650px) {
            .summary {
              grid-template-columns: 1fr;
            }

            .summary-card {
              padding: 15px;
            }

            .movement {
              align-items: flex-start;
            }

            .movement-amount {
              font-size: 16px;
            }

            .hero-title {
              font-size: 26px;
            }
          }
        `}</style>

        <div className="container">
          <div className="top-actions">
            <button
              type="button"
              className="back-button"
              onClick={goBackToUsers}
            >
              ← Regresar
            </button>

            <button
              type="button"
              className="refresh-button"
              onClick={refresh}
              disabled={detailLoading}
            >
              {detailLoading
                ? "Actualizando..."
                : "↻ Actualizar"}
            </button>
          </div>

          <section className="hero">
            <h1 className="hero-title">
              MOVIMIENTOS
            </h1>

            <p className="hero-text">
              Historial financiero del usuario.
            </p>
          </section>

          {error && (
            <div className="message error">
              {error}
            </div>
          )}

          {detailLoading &&
          !selectedUser ? (
            <div className="message">
              Cargando movimientos...
            </div>
          ) : (
            <>
              {selectedUser && (
                <div className="user-card">
                  <div className="user-label">
                    Usuario
                  </div>

                  <div className="user-email">
                    {selectedUser.email ||
                      "Sin correo"}
                  </div>
                </div>
              )}

              <div className="summary">
                <div className="summary-card">
                  <div className="summary-label">
                    AGREGADO
                  </div>

                  <div className="summary-value added">
                    {formatMoney(
                      summary?.totalAdded || 0
                    )}
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-label">
                    GASTADO
                  </div>

                  <div className="summary-value spent">
                    {formatMoney(
                      summary?.totalSpent || 0
                    )}
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-label">
                    BALANCE ACTUAL
                  </div>

                  <div className="summary-value current">
                    {formatMoney(
                      summary?.balance || 0
                    )}
                  </div>
                </div>
              </div>

              <h2 className="section-title">
                Historial
              </h2>

              {movements.length === 0 ? (
                <div className="message">
                  Este usuario todavía no tiene
                  movimientos registrados.
                </div>
              ) : (
                <div className="movement-list">
                  {movements.map(
                    (movement) => {
                      const isAdd =
                        movement.kind ===
                        "ADD";

                      const isPurchase =
                        movement.kind ===
                        "PURCHASE";

                      const product =
                        movement.product ||
                        movement.description ||
                        "Producto";

                      return (
                        <div
                          className={`movement ${
                            isAdd
                              ? "add"
                              : "expense"
                          }`}
                          key={
                            movement.id
                          }
                        >
                          <div className="movement-info">
                            <div className="movement-title">
                              {isAdd
                                ? "INGRESO DE SALDO"
                                : isPurchase
                                ? product
                                : movement.description}
                            </div>

                            <div className="movement-date">
                              {formatDate(
                                movement.date
                              )}
                            </div>

                            <div className="movement-type">
                              {isAdd
                                ? "Saldo agregado"
                                : isPurchase
                                ? "Compra"
                                : "Ajuste de saldo"}
                            </div>
                          </div>

                          <div
                            className={`movement-amount ${
                              isAdd
                                ? "green"
                                : "red"
                            }`}
                          >
                            {isAdd
                              ? "+"
                              : "-"}
                            {formatMoney(
                              movement.amount
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <style jsx>{`
        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top,
              #241012 0%,
              #0a0a0a 45%,
              #050505 100%
            );
          color: #fff;
          padding: 25px 16px 50px;
        }

        .container {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .top-actions {
          margin-bottom: 20px;
        }

        .back-button {
          border: 1px solid #333;
          background: #111;
          color: #fff;
          padding: 11px 15px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .back-button:hover {
          border-color: #e50914;
          background: #181010;
        }

        .hero {
          margin-bottom: 22px;
        }

        .hero-title {
          margin: 0;
          color: #fff;
          font-size: 30px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .hero-text {
          margin: 7px 0 0;
          color: #999;
          font-size: 13px;
        }

        .search {
          width: 100%;
          box-sizing: border-box;
          margin-bottom: 22px;
          padding: 14px 15px;
          border: 1px solid #303030;
          border-radius: 12px;
          outline: none;
          background: #101010;
          color: #fff;
          font-size: 14px;
        }

        .search:focus {
          border-color: #e50914;
        }

        .search::placeholder {
          color: #666;
        }

        .section-title {
          margin: 0 0 12px;
          color: #fff;
          font-size: 18px;
          font-weight: 950;
        }

        .user-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .user-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 16px;
          border: 1px solid #303030;
          border-left: 4px solid #e50914;
          border-radius: 13px;
          background:
            linear-gradient(
              110deg,
              #171717,
              #0d0d0d
            );
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .user-row:hover {
          border-color: #e50914;
          background: #1b1112;
        }

        .user-row:active {
          transform: scale(0.995);
        }

        .user-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .label {
          color: #999;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

                .email {
          color: #fff;
          font-size: 15px;
          font-weight: 850;
          overflow-wrap: anywhere;
        }

        .balance {
          flex-shrink: 0;
          color: #43f28a;
          font-size: 20px;
          font-weight: 950;
          white-space: nowrap;
        }

        .message {
          padding: 22px;
          border: 1px solid #303030;
          border-radius: 12px;
          background: #111;
          color: #ccc;
          text-align: center;
        }

        .error {
          margin-bottom: 15px;
          border-color: #e50914;
          color: #ff777d;
        }

        .footer {
          margin-top: 14px;
          color: #777;
          font-size: 12px;
          text-align: center;
        }

        @media (max-width: 500px) {
          .user-row {
            align-items: flex-start;
          }

          .balance {
            font-size: 17px;
          }
        }
      `}</style>

      <div className="container">
        <div className="top-actions">
          <button
            type="button"
            className="back-button"
            onClick={() =>
              router.push("/admin")
            }
          >
            ← Regresar al panel
          </button>
        </div>

        <section className="hero">
          <h1 className="hero-title">
            MOVIMIENTOS
          </h1>

          <p className="hero-text">
            Historial automático de ingresos,
            compras y ajustes de saldo.
          </p>
        </section>

        <input
          className="search"
          type="search"
          placeholder="Buscar usuario por correo..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        {error && (
          <div className="message error">
            {error}
          </div>
        )}

        <h2 className="section-title">
          Usuarios
        </h2>

        {loading ? (
          <div className="message">
            Cargando usuarios...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="message">
            {search.trim()
              ? "No se encontraron usuarios."
              : "No hay usuarios para mostrar."}
          </div>
        ) : (
          <div className="user-list">
            {filteredUsers.map(
              (user) => (
                <button
                  type="button"
                  className="user-row"
                  key={user.id}
                  onClick={() =>
                    router.push(
                      `/admin/movements?userId=${encodeURIComponent(
                        user.id
                      )}`
                    )
                  }
                >
                  <div className="user-info">
                    <span className="label">
                      Usuario
                    </span>

                    <span className="email">
                      {user.email ||
                        "Sin correo"}
                    </span>
                  </div>

                  <span className="balance">
                    {formatMoney(
                      user.balance
                    )}
                  </span>
                </button>
              )
            )}
          </div>
        )}

        <div className="footer">
          Mostrando{" "}
          {filteredUsers.length} de{" "}
          {users.length} usuarios
        </div>
      </div>
    </main>
  );
}

export default function MovementsPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            background: "#050505",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              padding: "20px",
              border: "1px solid #303030",
              borderRadius: "12px",
              background: "#111",
              color: "#ccc",
              textAlign: "center",
            }}
          >
            Cargando movimientos...
          </div>
        </main>
      }
    >
      <MovementsContent />
    </Suspense>
  );
}
