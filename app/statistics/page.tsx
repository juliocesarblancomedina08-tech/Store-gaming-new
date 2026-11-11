"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Period = "24h" | "7d" | "30d" | "all";

type StoreOrder = {
  id?: string;
  user_id?: string;
  userId?: string;
  email?: string;
  username?: string;

  game?: string;
  product?: string;
  displayProduct?: string;

  price?: number | string;
  total?: number | string;

  status?: string;

  date?: string;
  createdAt?: string;
  created_at?: string;
};

type ChartPoint = {
  label: string;
  created: number;
  completed: number;
  refunded: number;
};

function getOrderDate(order: StoreOrder): Date | null {
  const value =
    order.createdAt ||
    order.created_at ||
    order.date;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getOrderAmount(order: StoreOrder): number {
  return (
    Number(order.total) ||
    Number(order.price) ||
    0
  );
}

function normalizeStatus(order: StoreOrder): string {
  return String(order.status || "")
    .trim()
    .toLowerCase();
}

function isCompleted(order: StoreOrder): boolean {
  const status = normalizeStatus(order);

  return [
    "completada",
    "completado",
    "confirmada",
    "confirmado",
    "completed",
    "complete",
    "success",
    "successful",
    "terminada",
    "terminado",
    "finalizada",
    "finalizado",
  ].includes(status);
}

function isRefunded(order: StoreOrder): boolean {
  const status = normalizeStatus(order);

  return [
    "reembolsada",
    "reembolsado",
    "refund",
    "refunded",
    "cancelada",
    "cancelado",
  ].includes(status);
}

function formatMoney(value: number) {
  return `$${value.toFixed(4)}`;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("es-ES", {
    month: "short",
    day: "numeric",
  });
}

export default function StatisticsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("all");

  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [deposited, setDeposited] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadStatistics() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !session?.user) {
        router.replace("/");
        return;
      }

      /*
       * =========================
       * CARGAR ÓRDENES
       * =========================
       */

      let savedOrders: StoreOrder[] = [];

      try {
        const saved =
          localStorage.getItem(
            "storeGamingOrders"
          );

        if (saved) {
          const parsed = JSON.parse(saved);

          if (Array.isArray(parsed)) {
            savedOrders = parsed;
          }
        }
      } catch {
        savedOrders = [];
      }

      /*
       * =========================
       * FILTRAR POR CLIENTE
       * =========================
       */

      const currentUserId = session.user.id;
      const currentEmail =
        session.user.email || "";

      const userOrders = savedOrders.filter(
        (order) => {
          const hasUserId =
            Boolean(order.user_id) ||
            Boolean(order.userId);

          const hasEmail =
            Boolean(order.email);

          if (!hasUserId && !hasEmail) {
            return true;
          }

          if (
            order.user_id === currentUserId ||
            order.userId === currentUserId
          ) {
            return true;
          }

          if (
            order.email &&
            order.email.toLowerCase() ===
              currentEmail.toLowerCase()
          ) {
            return true;
          }

          return false;
        }
      );

      if (mounted) {
        setOrders(userOrders);
      }

      /*
       * =========================
       * BALANCE
       * =========================
       */

      try {
        const { data } = await supabase
          .from("profiles")
          .select("balance")
          .eq("id", currentUserId)
          .single();

        if (mounted && data) {
          setDeposited(
            Number(data.balance) || 0
          );
        }
      } catch {
        if (mounted) {
          setDeposited(0);
        }
      }

      if (mounted) {
        setLoading(false);
      }
    }

    loadStatistics();

    return () => {
      mounted = false;
    };
  }, [router]);


  /*
   * =========================
   * PERÍODO
   * =========================
   */

  const filteredOrders = useMemo(() => {
    if (period === "all") {
      return orders;
    }

    const now = new Date();

    let milliseconds = 0;

    if (period === "24h") {
      milliseconds =
        24 * 60 * 60 * 1000;
    }

    if (period === "7d") {
      milliseconds =
        7 * 24 * 60 * 60 * 1000;
    }

    if (period === "30d") {
      milliseconds =
        30 * 24 * 60 * 60 * 1000;
    }

    const start =
      now.getTime() - milliseconds;

    return orders.filter((order) => {
      const date = getOrderDate(order);

      if (!date) {
        return false;
      }

      return date.getTime() >= start;
    });
  }, [orders, period]);


  /*
   * =========================
   * ESTADÍSTICAS
   * =========================
   */

  const statistics = useMemo(() => {
    const created =
      filteredOrders.length;

    const completed =
      filteredOrders.filter(
        isCompleted
      ).length;

    const refunded =
      filteredOrders.filter(
        isRefunded
      ).length;

    const spent =
      filteredOrders
        .filter(isCompleted)
        .reduce(
          (sum, order) =>
            sum + getOrderAmount(order),
          0
        );

    return {
      created,
      completed,
      refunded,
      spent,
    };
  }, [filteredOrders]);


  /*
   * =========================
   * GRÁFICA
   * =========================
   */

  const chartData = useMemo(() => {
    if (period === "24h") {
      const points: ChartPoint[] = [];

      for (let i = 23; i >= 0; i--) {
        const date = new Date();

        date.setHours(
          date.getHours() - i,
          0,
          0,
          0
        );

        const key =
          date.getFullYear() +
          "-" +
          date.getMonth() +
          "-" +
          date.getDate() +
          "-" +
          date.getHours();

        const dayOrders =
          filteredOrders.filter(
            (order) => {
              const orderDate =
                getOrderDate(order);

              if (!orderDate) {
                return false;
              }

              const orderKey =
                orderDate.getFullYear() +
                "-" +
                orderDate.getMonth() +
                "-" +
                orderDate.getDate() +
                "-" +
                orderDate.getHours();

              return orderKey === key;
            }
          );

        points.push({
          label: `${String(
            date.getHours()
          ).padStart(2, "0")}:00`,
          created: dayOrders.length,
          completed:
            dayOrders.filter(
              isCompleted
            ).length,
          refunded:
            dayOrders.filter(
              isRefunded
            ).length,
        });
      }

      return points;
    }

    const days =
      period === "7d"
        ? 7
        : period === "30d"
          ? 30
          : 30;

    const points: ChartPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();

      date.setHours(0, 0, 0, 0);

      date.setDate(
        date.getDate() - i
      );

      const dayOrders =
        filteredOrders.filter(
          (order) => {
            const orderDate =
              getOrderDate(order);

            if (!orderDate) {
              return false;
            }

            return (
              orderDate.getFullYear() ===
                date.getFullYear() &&
              orderDate.getMonth() ===
                date.getMonth() &&
              orderDate.getDate() ===
                date.getDate()
            );
          }
        );

      points.push({
        label: formatShortDate(date),
        created: dayOrders.length,
        completed:
          dayOrders.filter(
            isCompleted
          ).length,
        refunded:
          dayOrders.filter(
            isRefunded
          ).length,
      });
    }

    return points;
  }, [filteredOrders, period]);


  /*
   * =========================
   * ESCALA DE GRÁFICA
   * =========================
   */

  const chartMax = useMemo(() => {
    const values = chartData.flatMap(
      (point) => [
        point.created,
        point.completed,
        point.refunded,
      ]
    );

    const max =
      Math.max(...values, 0);

    if (max <= 5) return 5;
    if (max <= 10) return 10;
    if (max <= 20) return 20;
    if (max <= 50) return 50;
    if (max <= 100) return 100;

    return Math.ceil(max / 10) * 10;
  }, [chartData]);


  /*
   * =========================
   * CREAR PUNTOS SVG
   * =========================
   */

  function createLine(
    key: "created" | "completed" | "refunded"
  ) {
    if (!chartData.length) {
      return "";
    }

    const width = 700;
    const height = 240;

    return chartData
      .map((point, index) => {
        const x =
          chartData.length === 1
            ? width / 2
            : (index /
                (chartData.length - 1)) *
              width;

        const y =
          height -
          (point[key] / chartMax) *
            height;

        return `${x},${y}`;
      })
      .join(" ");
  }


  /*
   * =========================
   * LOADING
   * =========================
   */

  if (loading) {
    return (
      <main className="store-loading">

        <div className="loading-logo">
          STORE GAMING
        </div>

        <div className="loading-line" />

        <p>
          CARGANDO ESTADÍSTICAS...
        </p>

      </main>
    );
  }


  return (
    <main className="service-page statistics-page">

      {/* =========================
          HEADER
      ========================== */}

      <header className="service-header">

        <button
          className="back-button"
          onClick={() =>
            router.push("/home")
          }
          aria-label="Volver"
        >
          ←
        </button>

        <h1>
          📊 ESTADÍSTICAS
        </h1>

      </header>


      {/* =========================
          INTRO
      ========================== */}

      <section className="statistics-intro">

        <h2>
          Estadística
        </h2>

        <p>
          Pedidos, volumen de negocios y
          depósitos durante el período
          seleccionado.
        </p>

      </section>


      {/* =========================
          PERIODOS
      ========================== */}

      <section className="statistics-periods">

        <button
          className={
            period === "24h"
              ? "active"
              : ""
          }
          onClick={() =>
            setPeriod("24h")
          }
        >
          24 horas
        </button>

        <button
          className={
            period === "7d"
              ? "active"
              : ""
          }
          onClick={() =>
            setPeriod("7d")
          }
        >
          7 días
        </button>

        <button
          className={
            period === "30d"
              ? "active"
              : ""
          }
          onClick={() =>
            setPeriod("30d")
          }
        >
          30 días
        </button>

        <button
          className={
            period === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setPeriod("all")
          }
        >
          Todos los tiempos
        </button>

      </section>


      <div className="statistics-timezone">
        Zona horaria: Europa/Moscú
      </div>


      {/* =========================
          RESUMEN
      ========================== */}

      <section className="statistics-summary">

        <div className="statistics-summary-card">

          <span>
            PEDIDOS CREADOS
          </span>

          <strong>
            {statistics.created}
          </strong>

          <small>
            En el período
          </small>

        </div>


        <div className="statistics-summary-card">

          <span>
            TERMINADO
          </span>

          <strong className="statistics-green">
            {statistics.completed}
          </strong>

          <small>
            Pedidos exitosos
          </small>

        </div>


        <div className="statistics-summary-card">

          <span>
            REEMBOLSOS
          </span>

          <strong className="statistics-red">
            {statistics.refunded}
          </strong>

          <small>
            Pedidos reembolsados
          </small>

        </div>


        <div className="statistics-summary-card">

          <span>
            ENTREGA COMPLETADA
          </span>

          <strong>
            {formatMoney(
              statistics.spent
            )}
          </strong>

          <small>
            Gastado en completado
          </small>

        </div>


        <div className="statistics-summary-card">

          <span>
            DEPOSITADO
          </span>

          <strong className="statistics-yellow">
            {formatMoney(
              deposited
            )}
          </strong>

          <small>
            Añadido al saldo
          </small>

        </div>

      </section>


      {/* =========================
          GRÁFICA
      ========================== */}

      <section className="statistics-chart-card">

        <div className="statistics-section-heading">

          <div>

            <h2>
              Pedidos a lo largo del tiempo
            </h2>

            <p>
              Creado · completado · reembolsos
            </p>

          </div>

        </div>


        <div className="statistics-chart-legend">

          <span>
            <i className="legend-created" />
            Pedidos creados
          </span>

          <span>
            <i className="legend-completed" />
            Terminado
          </span>

          <span>
            <i className="legend-refunded" />
            Reembolsos
          </span>

        </div>


        <div className="statistics-chart">

          {chartData.length > 0 ? (

            <svg
              viewBox="0 0 700 280"
              preserveAspectRatio="none"
              className="statistics-svg"
            >

              <line
                x1="0"
                y1="0"
                x2="700"
                y2="0"
                className="chart-grid-line"
              />

              <line
                x1="0"
                y1="60"
                x2="700"
                y2="60"
                className="chart-grid-line"
              />

              <line
                x1="0"
                y1="120"
                x2="700"
                y2="120"
                className="chart-grid-line"
              />

              <line
                x1="0"
                y1="180"
                x2="700"
                y2="180"
                className="chart-grid-line"
              />

              <line
                x1="0"
                y1="240"
                x2="700"
                y2="240"
                className="chart-grid-line"
              />


              <polyline
                points={createLine(
                  "created"
                )}
                className="chart-line-created"
                fill="none"
              />


              <polyline
                points={createLine(
                  "completed"
                )}
                className="chart-line-completed"
                fill="none"
              />


              <polyline
                points={createLine(
                  "refunded"
                )}
                className="chart-line-refunded"
                fill="none"
              />


              {chartData.map(
                (point, index) => {

                  const x =
                    chartData.length === 1
                      ? 350
                      : (index /
                          (chartData.length -
                            1)) *
                        700;

                  return (
                    <g key={index}>

                      <circle
                        cx={x}
                        cy={
                          240 -
                          (point.created /
                            chartMax) *
                            240
                        }
                        r="3.5"
                        className="chart-dot-created"
                      />

                      <circle
                        cx={x}
                        cy={
                          240 -
                          (point.completed /
                            chartMax) *
                            240
                        }
                        r="3.5"
                        className="chart-dot-completed"
                      />

                      <circle
                        cx={x}
                        cy={
                          240 -
                          (point.refunded /
                            chartMax) *
                            240
                        }
                        r="3.5"
                        className="chart-dot-refunded"
                      />

                    </g>
                  );
                }
              )}

            </svg>

          ) : (

            <div className="statistics-chart-empty">

              <span>
                📊
              </span>

              <strong>
                SIN DATOS TODAVÍA
              </strong>

              <p>
                Cuando tengas pedidos,
                aparecerán aquí.
              </p>

            </div>

          )}

        </div>


        <div className="statistics-chart-labels">

          {chartData
            .filter(
              (_, index) => {
                const step =
                  Math.max(
                    1,
                    Math.ceil(
                      chartData.length /
                        6
                    )
                  );

                return (
                  index % step === 0
                );
              }
            )
            .map(
              (point, index) => (
                <span key={index}>
                  {point.label}
                </span>
              )
            )}

        </div>

      </section>


      {/* =========================
          PRODUCTOS
      ========================== */}

      <section className="statistics-products">

        <div className="statistics-section-heading">

          <div>

            <h2>
              Por tipo de producto
            </h2>

            <p>
              Desglose por categoría
            </p>

          </div>

        </div>


        <div className="statistics-table">

          <div className="statistics-table-header">

                        <span>
              Tipo
            </span>

            <span>
              Nuevo
            </span>

            <span>
              Hecho
            </span>

            <span>
              Árbitro./Reemb.
            </span>

            <span>
              Volumen de negocios
            </span>

          </div>


          {/* =========================
              RECARGAS DE JUEGOS
          ========================== */}

          <div className="statistics-table-row">

            <div className="statistics-product-name">

              <div className="statistics-product-icon">
                🎮
              </div>

              <div>

                <strong>
                  Recargas de juegos y servicios
                </strong>

                <small>
                  TOP UP / Servicios digitales
                </small>

              </div>

            </div>


            <span className="statistics-number">
              {statistics.created}
            </span>


            <span className="statistics-number statistics-number-success">
              {statistics.completed}
            </span>


            <span className="statistics-number statistics-number-refund">
              {statistics.refunded}
            </span>


            <span className="statistics-volume">
              {formatMoney(
                statistics.spent
              )}
            </span>

          </div>


          {/* =========================
              TOTAL
          ========================== */}

          <div className="statistics-table-total">

            <div>

              <strong>
                Total
              </strong>

              <small>
                Todos los productos
              </small>

            </div>


            <strong>
              {formatMoney(
                statistics.spent
              )}
            </strong>

          </div>

        </div>

      </section>


      {/* =========================
          RESUMEN DE ACTIVIDAD
      ========================== */}

      <section className="statistics-activity">

        <div className="statistics-section-heading">

          <div>

            <h2>
              Resumen de actividad
            </h2>

            <p>
              Actividad de tu cuenta durante
              el período seleccionado.
            </p>

          </div>

        </div>


        <div className="statistics-activity-grid">


          {/* PEDIDOS CREADOS */}

          <div className="statistics-activity-card">

            <div className="statistics-activity-icon">
              🛒
            </div>

            <div>

              <strong>
                {statistics.created}
              </strong>

              <span>
                Pedidos creados
              </span>

            </div>

          </div>


          {/* PEDIDOS COMPLETADOS */}

          <div className="statistics-activity-card">

            <div className="statistics-activity-icon">
              ✅
            </div>

            <div>

              <strong>
                {statistics.completed}
              </strong>

              <span>
                Entregas completadas
              </span>

            </div>

          </div>


          {/* REEMBOLSOS */}

          <div className="statistics-activity-card">

            <div className="statistics-activity-icon">
              ↩️
            </div>

            <div>

              <strong>
                {statistics.refunded}
              </strong>

              <span>
                Reembolsos
              </span>

            </div>

          </div>


          {/* DEPOSITADO */}

          <div className="statistics-activity-card">

            <div className="statistics-activity-icon">
              💰
            </div>

            <div>

              <strong>
                {formatMoney(
                  deposited
                )}
              </strong>

              <span>
                Depositado
              </span>

            </div>

          </div>

        </div>

      </section>


      {/* =========================
          SIN ACTIVIDAD
      ========================== */}

      {statistics.created === 0 && (

        <section className="statistics-empty">

          <div className="statistics-empty-icon">
            📊
          </div>


          <h3>
            Aún no hay estadísticas
          </h3>


          <p>
            Cuando realices pedidos,
            completes compras o agregues
            saldo, tus estadísticas
            aparecerán automáticamente aquí.
          </p>


          <button
            type="button"
            className="statistics-empty-button"
            onClick={() =>
              router.push("/top-up")
            }
          >
            HACER UNA RECARGA
          </button>

        </section>

      )}


      {/* =========================
          FOOTER
      ========================== */}

      <footer className="statistics-footer">

        <strong>
          STORE GAMING
        </strong>

        <span>
          Estadísticas de tu cuenta
        </span>

      </footer>


    </main>
  );
}
