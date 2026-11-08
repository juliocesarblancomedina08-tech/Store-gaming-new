
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type ManualOrder = {
  id: string;
  user_id: string;
  username?: string | null;
  email?: string | null;
  method: string;
  amount_cup: number;
  exchange_rate: number;
  balance_amount: number;
  confirmation_number?: string | null;
  receipt_url?: string | null;
  receipt_signed_url?: string | null;
  receipt_error?: string | null;
  status: string;
  created_at: string;
  admin_note?: string | null;
  can_process?: boolean;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  orders?: ManualOrder[];
  order?: ManualOrder;
  balance_credited?: number;
};

const formatMoney = (value: number) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

const formatDate = (value: string) => {
  if (!value) return "Fecha no disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return date.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const normalizeStatus = (status: string) =>
  (status || "").toLowerCase().trim();

const statusLabel = (status: string) => {
  switch (normalizeStatus(status)) {
    case "pending":
      return "PENDIENTE";
    case "approved":
    case "completed":
      return "COMPLETADA";
    case "rejected":
      return "RECHAZADA";
    case "cancelled":
    case "canceled":
      return "CANCELADA";
    default:
      return status?.toUpperCase() || "DESCONOCIDO";
  }
};

const methodLabel = (method: string) => {
  switch (method) {
    case "transferencia_cup":
      return "TRANSFERENCIA CUP";
    case "saldo_cup":
      return "SALDO CUP";
    default:
      return method?.replaceAll("_", " ").toUpperCase() || "DEPÓSITO";
  }
};

export default function ManualOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<ManualOrder[]>([]);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] =
    useState<ManualOrder | null>(null);

  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getToken = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error(
        "Tu sesión ha expirado. Inicia sesión nuevamente."
      );
    }

    return session.access_token;
  }, []);

  const loadOrders = useCallback(
    async (showRefresh = false, silent = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else if (!silent) {
          setLoading(true);
        }

        setError("");

        const token = await getToken();

        const response = await fetch(
          "/api/admin/manual-orders",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );

        const data: ApiResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              data.message ||
              "No se pudieron cargar las solicitudes."
          );
        }

        const allOrders = Array.isArray(data.orders)
          ? data.orders
          : [];

        setOrders(allOrders);

        setSelectedOrder((current) => {
          if (!current) return null;

          return (
            allOrders.find((order) => order.id === current.id) ??
            current
          );
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error cargando las solicitudes."
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }

        if (showRefresh) {
          setRefreshing(false);
        }
      }
    },
    [getToken]
  );

  // Carga inicial, actualización automática y escucha de Supabase.
  useEffect(() => {
    void loadOrders();

    const interval = window.setInterval(() => {
      void loadOrders(false, true);
    }, 15000);

    const channel = supabase
      .channel("admin-manual-orders-counter")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "manual_orders",
        },
        () => {
          void loadOrders(false, true);
        }
      )
      .subscribe();

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;

    if (filter === "cancelled") {
      return orders.filter((order) =>
        ["cancelled", "canceled"].includes(
          normalizeStatus(order.status)
        )
      );
    }

    if (filter === "rejected") {
      return orders.filter(
        (order) => normalizeStatus(order.status) === "rejected"
      );
    }

    if (filter === "approved") {
      return orders.filter((order) =>
        ["approved", "completed"].includes(
          normalizeStatus(order.status)
        )
      );
    }

    return orders.filter(
      (order) => normalizeStatus(order.status) === filter
    );
  }, [orders, filter]);

  const pendingCount = useMemo(
    () =>
      orders.filter(
        (order) => normalizeStatus(order.status) === "pending"
      ).length,
    [orders]
  );

  const approvedCount = useMemo(
    () =>
      orders.filter((order) =>
        ["approved", "completed"].includes(
          normalizeStatus(order.status)
        )
      ).length,
    [orders]
  );

  const cancelledCount = useMemo(
    () =>
      orders.filter((order) =>
        ["cancelled", "canceled", "rejected"].includes(
          normalizeStatus(order.status)
        )
      ).length,
    [orders]
  );

  const openOrder = (order: ManualOrder) => {
    setSelectedOrder(order);
    setAdminNote(order.admin_note || "");
    setError("");
    setSuccess("");
  };

  const closeOrder = () => {
    if (processing) return;

    setSelectedOrder(null);
    setAdminNote("");
    setError("");
  };

  const processOrder = async (
    action: "approve" | "reject"
  ) => {
    if (!selectedOrder || processing) return;

    if (normalizeStatus(selectedOrder.status) !== "pending") {
      setError("Esta solicitud ya fue procesada.");
      return;
    }

    if (selectedOrder.can_process === false) {
      setError(
        "Esta solicitud no está habilitada para procesarse."
      );
      return;
    }

    if (
      action === "approve" &&
      !selectedOrder.receipt_signed_url
    ) {
      setError(
        selectedOrder.receipt_error ||
          "No hay un comprobante disponible para revisar. No puedes aprobar esta solicitud."
      );
      return;
    }

    const confirmation =
      action === "approve"
        ? `¿Confirmas que revisaste el comprobante y deseas APROBAR esta solicitud?\n\nSe acreditarán ${formatMoney(
            selectedOrder.balance_amount
          )} USD al saldo interno de STORE GAMING del usuario.`
        : "¿Confirmas que deseas RECHAZAR esta solicitud?\n\nNo se acreditará ningún saldo al usuario.";

    if (!window.confirm(confirmation)) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const token = await getToken();

      const response = await fetch("/api/admin/manual-orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          action,
          adminNote: adminNote.trim(),
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "No se pudo procesar la solicitud."
        );
      }

      setSuccess(
        action === "approve"
          ? `Solicitud aprobada. Saldo acreditado: ${formatMoney(
              data.balance_credited ??
                selectedOrder.balance_amount
            )} USD.`
          : "Solicitud rechazada. No se acreditó saldo."
      );

      setSelectedOrder(null);
      setAdminNote("");

      await loadOrders(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error procesando la solicitud."
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="manual-page">
      <div className="page-container">
        <header className="page-header">
          <div className="header-title">
            <div className="eyebrow">
              STORE GAMING / ADMINISTRACIÓN
            </div>

            <h1>
              Solicitudes de <span>depósito</span>
            </h1>

            <p>
              Revisa los comprobantes y administra las solicitudes
              de saldo de los usuarios.
            </p>
          </div>

          <div className="header-actions">
            <button
              className="back-button"
              onClick={() => router.push("/admin")}
              type="button"
            >
              ← Regresar
            </button>

            <button
              className="refresh-button"
              onClick={() => void loadOrders(true)}
              disabled={refreshing || loading}
              type="button"
            >
              <span className={refreshing ? "spin" : ""}>↻</span>
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </header>

        {success && (
          <div className="alert success-alert">
            <span>✓</span>
            {success}
          </div>
        )}

        {error && !selectedOrder && (
          <div className="alert error-alert">{error}</div>
        )}

        <section className="statistics">
          <div className="stat-card">
            <div className="stat-icon pending-icon">◷</div>
            <div>
              <span>Pendientes</span>
              <strong>{pendingCount}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon approved-icon">✓</div>
            <div>
              <span>Completadas</span>
              <strong>{approvedCount}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon rejected-icon">×</div>
            <div>
              <span>Canceladas / rechazadas</span>
              <strong>{cancelledCount}</strong>
            </div>
          </div>
        </section>

        <section className="orders-section">
          <div className="section-heading">
            <div>
              <h2>Solicitudes recibidas</h2>
              <p>
                Selecciona una solicitud para ver sus detalles.
              </p>
            </div>

            <span className="total-count">
              {filteredOrders.length} solicitudes
            </span>
          </div>

          <div className="filters">
            {[
              { value: "all", label: "Todas" },
              { value: "pending", label: "Pendientes" },
              { value: "approved", label: "Completadas" },
              { value: "rejected", label: "Rechazadas" },
              { value: "cancelled", label: "Canceladas" },
            ].map((item) => (
              <button
                key={item.value}
                className={
                  filter === item.value ? "filter active" : "filter"
                }
                onClick={() => setFilter(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="loader" />
              <p>Cargando solicitudes...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">▤</div>
              <h3>No hay solicitudes</h3>
              <p>
                No se encontraron solicitudes para este filtro.
              </p>
            </div>
          ) : (
            <div className="orders-list">
              {filteredOrders.map((order) => (
                <button
                  key={order.id}
                  className="order-card"
                  onClick={() => openOrder(order)}
                  type="button"
                >
                  <div className="order-main">
                    <div className="order-avatar">
                      {(order.username || order.email || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="order-user">
                      <strong>{order.username || "Usuario"}</strong>
                      <span>{order.email || order.user_id}</span>
                      <small>{methodLabel(order.method)}</small>
                    </div>
                  </div>

                  <div className="order-amount">
                    <strong>
                      {formatMoney(order.amount_cup)} CUP
                    </strong>
                    <span>
                      Crédito: {formatMoney(order.balance_amount)} USD
                    </span>
                  </div>

                  <div className="order-right">
                    <span
                      className={`status status-${normalizeStatus(
                        order.status
                      )}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                    <small>{formatDate(order.created_at)}</small>
                    <span className="view-detail">
                      Ver detalles →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedOrder && (
        <div className="modal-overlay" onClick={closeOrder}>
          <section
            className="detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  REVISIÓN ADMINISTRATIVA
                </span>
                <h2>Detalle de solicitud</h2>
              </div>

              <button
                className="close-button"
                onClick={closeOrder}
                disabled={processing}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="detail-status">
                <span
                  className={`status status-${normalizeStatus(
                    selectedOrder.status
                  )}`}
                >
                  {statusLabel(selectedOrder.status)}
                </span>
                <span className="order-id">
                  ID: {selectedOrder.id}
                </span>
              </div>

              <div className="detail-block">
                <h3>Información del usuario</h3>

                <div className="detail-grid">
                  <div className="detail-item">
                    <span>Usuario</span>
                    <strong>
                      {selectedOrder.username || "No disponible"}
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>Correo electrónico</span>
                    <strong>
                      {selectedOrder.email || "No disponible"}
                    </strong>
                  </div>

                  <div className="detail-item full-width">
                    <span>ID del usuario</span>
                    <strong className="break-word">
                      {selectedOrder.user_id}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="detail-block">
                <h3>Información del depósito</h3>

                <div className="detail-grid">
                  <div className="detail-item">
                    <span>Método</span>
                    <strong>
                      {methodLabel(selectedOrder.method)}
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>Fecha de solicitud</span>
                    <strong>
                      {formatDate(selectedOrder.created_at)}
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>Cantidad solicitada</span>
                    <strong>
                      {formatMoney(selectedOrder.amount_cup)} CUP
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>Tasa de cambio</span>
                    <strong>
                      {formatMoney(selectedOrder.exchange_rate)}
                    </strong>
                  </div>

                  <div className="detail-item full-width credit-highlight">
                    <span>
                      Crédito que recibirá en STORE GAMING
                    </span>
                    <strong>
                      {formatMoney(selectedOrder.balance_amount)} USD
                    </strong>
                    <small>
                      Saldo interno de la página, no crédito bancario.
                    </small>
                  </div>

                  <div className="detail-item full-width">
                    <span>Número de confirmación</span>
                    <strong>
                      {selectedOrder.confirmation_number || "No indicado"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="detail-block">
                <h3>Comprobante de pago</h3>

                {selectedOrder.receipt_signed_url ? (
                  <div className="receipt-container">
                    <a
                      href={selectedOrder.receipt_signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="receipt-link"
                    >
                      <img
                        src={selectedOrder.receipt_signed_url}
                        alt="Comprobante de transferencia"
                      />
                    </a>

                    <a
                      href={selectedOrder.receipt_signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="open-receipt"
                    >
                      Abrir comprobante completo ↗
                    </a>
                  </div>
                ) : (
                  <div className="no-receipt">
                    <span>!</span>
                    <div>
                      <strong>Comprobante no disponible</strong>
                      <p>
                        {selectedOrder.receipt_error ||
                          "El usuario todavía no ha adjuntado un comprobante o no se pudo generar el enlace."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {selectedOrder.admin_note && (
                <div className="detail-block">
                  <h3>Nota administrativa anterior</h3>
                  <p className="previous-note">
                    {selectedOrder.admin_note}
                  </p>
                </div>
              )}

              {normalizeStatus(selectedOrder.status) === "pending" ? (
                <>
                  <div className="detail-block">
                    <h3>Nota administrativa</h3>
                    <textarea
                      value={adminNote}
                      onChange={(event) =>
                        setAdminNote(event.target.value)
                      }
                      placeholder="Escribe una nota opcional..."
                      rows={3}
                      disabled={processing}
                    />
                  </div>

                  <div className="review-warning">
                    <strong>Importante:</strong>
                    <p>
                      Comprueba manualmente que el comprobante sea
                      válido antes de aprobar. La aprobación acredita
                      el saldo interno del usuario. Rechazar no genera
                      ninguna acreditación.
                    </p>
                  </div>

                  {error && (
                    <div className="alert error-alert modal-error">
                      {error}
                    </div>
                  )}

                  <div className="action-buttons">
                    <button
                      className="reject-button"
                      onClick={() => void processOrder("reject")}
                      disabled={processing}
                      type="button"
                    >
                      {processing
                        ? "Procesando..."
                        : "CANCELAR / RECHAZAR"}
                    </button>

                    <button
                      className="approve-button"
                      onClick={() => void processOrder("approve")}
                      disabled={
                        processing ||
                        !selectedOrder.receipt_signed_url
                      }
                      type="button"
                    >
                      {processing
                        ? "Procesando..."
                        : "✓ ACEPTAR Y ACREDITAR"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="processed-message">
                  Esta solicitud ya fue procesada. No se pueden
                  realizar más acciones.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <style jsx>{`
        .manual-page {
          min-height: 100vh;
          background:
            radial-gradient(
              ellipse at 10% 0%,
              rgba(160, 20, 35, 0.16),
              transparent 38%
            ),
            #09090d;
          color: #f5f5f7;
          padding: 32px 20px 60px;
        }

        .page-container {
          max-width: 1250px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
        }

        .header-title {
          min-width: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .eyebrow {
          color: #ff4655;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .page-header h1 {
          font-size: clamp(27px, 4vw, 39px);
          font-weight: 950;
          letter-spacing: -1.5px;
          margin: 10px 0;
        }

        .page-header h1 span {
          color: #ff4655;
        }

        .page-header p,
        .section-heading p {
          color: #92929e;
          font-size: 13px;
          margin: 0;
          line-height: 1.6;
        }

        .back-button,
        .refresh-button {
          background: #18181f;
          color: white;
          border: 1px solid #30303a;
          border-radius: 11px;
          padding: 12px 15px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: 0.2s;
        }

        .back-button:hover,
        .refresh-button:hover:not(:disabled) {
          border-color: #ed344a;
          background: #a7192b;
        }

        .refresh-button span {
          font-size: 19px;
          margin-right: 7px;
          display: inline-block;
        }

        .refresh-button:disabled,
        .back-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        .statistics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 28px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          background: linear-gradient(145deg, #17171e, #101015);
          border: 1px solid #292932;
          border-radius: 15px;
          padding: 19px;
          min-width: 0;
        }

        .stat-icon {
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-size: 22px;
          font-weight: 900;
        }

        .pending-icon {
          background: #392b16;
          color: #ffc65b;
        }

        .approved-icon {
          background: #153326;
          color: #4fe0a0;
        }

        .rejected-icon {
          background: #3a1d25;
          color: #ff6474;
        }

        .stat-card span,
        .stat-card strong {
          display: block;
        }

        .stat-card span {
          color: #9999a5;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .stat-card strong {
          font-size: 25px;
          font-weight: 950;
        }

        .orders-section {
          background: #111116;
          border: 1px solid #292932;
          border-radius: 18px;
          padding: 23px;
        }

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
        }

        .section-heading h2 {
          font-size: 19px;
          margin: 0 0 7px;
          font-weight: 900;
        }

        .total-count {
          color: #bdbdc7;
          background: #22222b;
          border-radius: 30px;
          padding: 8px 12px;
          font-size: 11px;
          white-space: nowrap;
        }

        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }

        .filter {
          border: 1px solid #30303a;
          background: #19191f;
          color: #aaaab5;
          border-radius: 9px;
          padding: 9px 15px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .filter.active {
          color: white;
          background: #a7192b;
          border-color: #ed344a;
        }

        .orders-list {
          display: grid;
          gap: 10px;
        }

        .order-card {
          width: 100%;
          text-align: left;
          display: grid;
          grid-template-columns: 1.3fr 1fr auto;
          align-items: center;
          gap: 20px;
          background: #18181f;
          border: 1px solid #292932;
          border-radius: 13px;
          padding: 16px;
          color: white;
          cursor: pointer;
          transition: 0.2s;
        }

        .order-card:hover {
          border-color: #d12b40;
          background: #20171c;
          transform: translateY(-1px);
        }

        .order-main {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .order-avatar {
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #a7192b, #ef4054);
          border-radius: 12px;
          font-weight: 950;
          font-size: 18px;
        }

        .order-user {
          min-width: 0;
        }

        .order-user strong,
        .order-user span,
        .order-user small {
          display: block;
          overflow-wrap: anywhere;
        }

        .order-user strong {
          font-size: 13px;
          margin-bottom: 4px;
        }

        .order-user span {
          color: #9999a5;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .order-user small {
          color: #ff6979;
          font-size: 10px;
          font-weight: 900;
        }

        .order-amount strong,
        .order-amount span {
          display: block;
        }

        .order-amount strong {
          font-size: 15px;
          font-weight: 950;
        }

        .order-amount span {
          color: #55d99c;
          font-size: 11px;
          margin-top: 5px;
        }

        .order-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }

        .order-right small {
          color: #92929e;
          font-size: 10px;
        }

        .view-detail {
          color: #ff596b;
          font-size: 11px;
          font-weight: 800;
        }

        .status {
          display: inline-block;
          border-radius: 30px;
          padding: 6px 10px;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.5px;
        }

        .status-pending {
          background: #3b2e18;
          color: #ffd078;
        }

        .status-approved,
        .status-completed {
          background: #153728;
          color: #65e3a9;
        }

        .status-rejected,
        .status-cancelled,
        .status-canceled {
          background: #3d2028;
          color: #ff8190;
        }

        .empty-state {
          padding: 55px 15px;
          text-align: center;
          color: #92929e;
        }

        .empty-state h3 {
          color: white;
          margin: 12px 0 7px;
        }

        .empty-state p {
          font-size: 12px;
        }

        .empty-icon {
          font-size: 35px;
          color: #ff4655;
        }

        .loader {
          width: 30px;
          height: 30px;
          border: 3px solid #35353d;
          border-top-color: #ff4655;
          border-radius: 50%;
          margin: 0 auto;
          animation: spin 0.8s linear infinite;
        }

        .alert {
          border-radius: 11px;
          padding: 13px 15px;
          margin-bottom: 18px;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .success-alert {
          color: #72e6ae;
          background: #123323;
          border: 1px solid #246c49;
        }

        .error-alert {
          color: #ff8996;
          background: #351b22;
          border: 1px solid #74303d;
        }

        .success-alert span {
          margin-right: 8px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(7px);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 18px;
          overflow-y: auto;
        }

        .detail-modal {
          width: 100%;
          max-width: 700px;
          max-height: 92vh;
          overflow-y: auto;
          background: #111116;
          border: 1px solid #39303a;
          border-radius: 18px;
          box-shadow: 0 25px 90px rgba(0, 0, 0, 0.65);
        }

        .modal-header {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 20px 23px;
          background: #17171e;
          border-bottom: 1px solid #292932;
        }

        .modal-header h2 {
          margin: 7px 0 0;
          font-size: 21px;
          font-weight: 950;
        }

        .close-button {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          border: 1px solid #383842;
          border-radius: 10px;
          background: #25252d;
          color: white;
          font-size: 25px;
          cursor: pointer;
        }

        .close-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-content {
          padding: 22px;
        }

        .detail-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 23px;
          flex-wrap: wrap;
        }

        .order-id {
          color: #777783;
          font-size: 10px;
          overflow-wrap: anywhere;
        }

        .detail-block {
          margin-bottom: 23px;
          padding-bottom: 21px;
          border-bottom: 1px solid #292932;
        }

        .detail-block h3 {
          margin: 0 0 15px;
          font-size: 13px;
          font-weight: 900;
          color: #f3f3f5;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 13px;
        }

        .detail-item {
          min-width: 0;
          padding: 13px;
          background: #19191f;
          border: 1px solid #292932;
          border-radius: 10px;
        }

        .detail-item span,
        .detail-item strong,
        .detail-item small {
          display: block;
        }

        .detail-item span {
          color: #92929e;
          font-size: 10px;
          margin-bottom: 7px;
        }

        .detail-item strong {
          color: white;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .detail-item small {
          color: #a7a7b1;
          font-size: 10px;
          margin-top: 7px;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .credit-highlight {
          background: linear-gradient(120deg, #192b22, #151f1b);
          border-color: #286346;
        }

        .credit-highlight strong {
          color: #5de5a4;
          font-size: 23px;
        }

        .break-word {
          word-break: break-all;
        }

        .receipt-container {
          padding: 12px;
          background: #19191f;
          border: 1px solid #30303a;
          border-radius: 12px;
          text-align: center;
        }

        .receipt-link {
          display: block;
        }

        .receipt-container img {
          display: block;
          max-width: 100%;
          max-height: 380px;
          object-fit: contain;
          margin: 0 auto;
          border-radius: 8px;
        }

        .open-receipt {
          display: inline-block;
          margin-top: 12px;
          color: #ff6576;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
        }

        .open-receipt:hover {
          text-decoration: underline;
        }

        .no-receipt {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 15px;
          border-radius: 11px;
          background: #30251a;
          border: 1px solid #69502a;
        }

        .no-receipt > span {
          display: grid;
          place-items: center;
          width: 25px;
          height: 25px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #684b20;
          color: #ffd078;
          font-weight: 950;
        }

        .no-receipt strong {
          display: block;
          color: #ffd078;
          font-size: 12px;
        }

        .no-receipt p {
          color: #c5b99f;
          font-size: 11px;
          line-height: 1.5;
          margin: 6px 0 0;
          overflow-wrap: anywhere;
        }

        .previous-note {
          color: #b9b9c3;
          background: #19191f;
          padding: 13px;
          border-radius: 9px;
          font-size: 12px;
          line-height: 1.6;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        textarea {
          display: block;
          width: 100%;
          box-sizing: border-box;
          resize: vertical;
          min-height: 85px;
          padding: 13px;
          border: 1px solid #373740;
          border-radius: 10px;
          outline: none;
          background: #19191f;
          color: white;
          font: inherit;
          font-size: 12px;
        }

        textarea:focus {
          border-color: #e33a4d;
        }

        textarea:disabled {
          opacity: 0.6;
        }

        .review-warning {
          padding: 14px;
          background: #30251a;
          border: 1px solid #69502a;
          border-radius: 10px;
          margin-bottom: 17px;
        }

        .review-warning strong {
          color: #ffd078;
          font-size: 12px;
        }

        .review-warning p {
          color: #c5b99f;
          font-size: 11px;
          line-height: 1.6;
          margin: 6px 0 0;
        }

        .action-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 11px;
        }

        .action-buttons button {
          min-height: 47px;
          border: 0;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s;
        }

        .action-buttons button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .reject-button {
          color: #ff8794;
          background: #3b1d25;
          border: 1px solid #74303d !important;
        }

        .reject-button:hover:not(:disabled) {
          background: #54232e;
        }

        .approve-button {
          color: white;
          background: linear-gradient(135deg, #a7192b, #e9344b);
          box-shadow: 0 5px 18px rgba(204, 37, 59, 0.2);
        }

        .approve-button:hover:not(:disabled) {
          filter: brightness(1.15);
        }

        .modal-error {
          margin-bottom: 14px;
        }

        .processed-message {
          padding: 15px;
          background: #202027;
          color: #bdbdc7;
          border: 1px solid #363640;
          border-radius: 10px;
          font-size: 12px;
          text-align: center;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 700px) {
          .manual-page {
            padding: 22px 12px 40px;
          }

          .page-header {
            align-items: stretch;
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions button {
            flex: 1;
          }

          .statistics {
            gap: 8px;
          }

          .stat-card {
            padding: 12px 9px;
            gap: 8px;
          }

          .stat-icon {
            width: 32px;
            height: 32px;
            font-size: 17px;
          }

          .stat-card span {
            font-size: 10px;
          }

          .stat-card strong {
            font-size: 20px;
          }

          .orders-section {
            padding: 14px;
          }

          .order-card {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 12px;
            padding: 13px;
          }

          .order-amount {
            grid-column: 1;
            padding-left: 55px;
          }

          .order-right {
            grid-column: 2;
            grid-row: 1 / span 2;
          }

          .order-right small {
            text-align: right;
          }

          .section-heading {
            align-items: flex-start;
          }

          .section-heading h2 {
            font-size: 16px;
          }

          .total-count {
            font-size: 9px;
          }

          .detail-modal {
            max-height: 95vh;
          }

          .modal-header {
            padding: 16px;
          }

          .modal-content {
            padding: 16px;
          }
        }

        @media (max-width: 420px) {
          .statistics {
            grid-template-columns: 1fr;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .full-width {
            grid-column: auto;
          }

          .action-buttons {
            grid-template-columns: 1fr;
          }

          .filters {
            gap: 6px;
          }

          .filter {
            padding: 8px 10px;
            font-size: 10px;
          }

          .order-card {
            grid-template-columns: minmax(0, 1fr);
          }

          .order-amount {
            grid-column: 1;
            padding-left: 55px;
          }

          .order-right {
            grid-column: 1;
            grid-row: auto;
            align-items: flex-start;
            padding-left: 55px;
          }

          .order-right small {
            text-align: left;
          }
        }
      `}</style>
    </main>
  );
}
