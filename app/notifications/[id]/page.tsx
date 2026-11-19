
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const notificationId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [notification, setNotification] =
    useState<Notification | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadNotification() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        if (!notificationId) {
          setError("No se encontró el identificador de la notificación.");
          return;
        }

        const { data, error: notificationError } = await supabase
          .from("notifications")
          .select(
            "id, title, message, type, is_read, created_at"
          )
          .eq("id", notificationId)
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (notificationError) {
          throw notificationError;
        }

        if (!data) {
          setError("Esta notificación no existe o no está disponible.");
          return;
        }

        if (!active) return;

        setNotification(data as Notification);

        if (!data.is_read) {
          const { error: updateError } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", notificationId)
            .eq("user_id", session.user.id);

          if (updateError) {
            console.error(
              "Error al marcar la notificación como leída:",
              updateError
            );
          } else if (active) {
            setNotification({
              ...data,
              is_read: true,
            } as Notification);
          }
        }
      } catch (err) {
        console.error("Error cargando notificación:", err);

        if (active) {
          setError("No se pudo cargar la notificación. Inténtalo nuevamente.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadNotification();

    return () => {
      active = false;
    };
  }, [notificationId, router]);

  function formatDate(date: string) {
    return new Date(date).toLocaleString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getNotificationType(type: string | null) {
    const normalized = (type || "").toLowerCase();

    if (
      normalized.includes("deposit") ||
      normalized.includes("payment") ||
      normalized.includes("pago")
    ) {
      return {
        label: "DEPÓSITO / PAGO",
        icon: "💰",
        color: "#00ed91",
      };
    }

    if (
      normalized.includes("order") ||
      normalized.includes("purchase") ||
      normalized.includes("compra") ||
      normalized.includes("pedido")
    ) {
      return {
        label: "PEDIDO / COMPRA",
        icon: "🛒",
        color: "#36a9ff",
      };
    }

    if (
      normalized.includes("security") ||
      normalized.includes("seguridad")
    ) {
      return {
        label: "SEGURIDAD",
        icon: "🔐",
        color: "#ffbd4a",
      };
    }

    if (
      normalized.includes("support") ||
      normalized.includes("soporte")
    ) {
      return {
        label: "SOPORTE",
        icon: "🎧",
        color: "#b58cff",
      };
    }

    return {
      label: "NOTIFICACIÓN",
      icon: "🔔",
      color: "#00ed91",
    };
  }

  const typeInfo = notification
    ? getNotificationType(notification.type)
    : null;

  return (
    <main className="notification-page">
      <div className="notification-background" />

      <div className="notification-container">
        <header className="notification-header">
          <button
            className="back-button"
            onClick={() => router.push("/home")}
          >
            <span>←</span>
            VOLVER
          </button>

          <div className="brand">
            <div className="brand-icon">🛒</div>
            <div>
              <h1>
                STORE <span>GAMING</span>
              </h1>
              <p>CENTRO DE NOTIFICACIONES</p>
            </div>
          </div>
        </header>

        <section className="page-heading">
          <div className="heading-icon">🔔</div>

          <div>
            <span className="section-label">
              CENTRO DE ACTIVIDAD
            </span>

            <h2>DETALLE DE NOTIFICACIÓN</h2>

            <p>
              Consulta toda la información de esta notificación.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="loading-card">
            <div className="spinner" />
            <h3>CARGANDO NOTIFICACIÓN...</h3>
            <p>Estamos obteniendo la información.</p>
          </div>
        ) : error ? (
          <div className="error-card">
            <div className="error-icon">⚠️</div>

            <h3>NOTIFICACIÓN NO DISPONIBLE</h3>

            <p>{error}</p>

            <button
              className="primary-button"
              onClick={() => router.push("/home")}
            >
              VOLVER AL HOME
            </button>
          </div>
        ) : notification && typeInfo ? (
          <section className="notification-card">
            <div
              className="notification-card-top"
              style={{
                borderLeftColor: typeInfo.color,
              }}
            >
              <div
                className="notification-icon"
                style={{
                  borderColor: `${typeInfo.color}55`,
                  background: `${typeInfo.color}14`,
                }}
              >
                {typeInfo.icon}
              </div>

              <div className="notification-heading">
                <span className="section-label">
                  INFORMACIÓN RECIBIDA
                </span>

                <h3>{notification.title}</h3>

                <div
                  className="type-badge"
                  style={{
                    color: typeInfo.color,
                    borderColor: `${typeInfo.color}55`,
                    background: `${typeInfo.color}12`,
                  }}
                >
                  {typeInfo.label}
                </div>
              </div>
            </div>

            <div className="notification-divider" />

            <div className="detail-section">
              <span className="detail-label">
                MENSAJE
              </span>

              <div className="message-box">
                {notification.message}
              </div>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">
                  FECHA Y HORA
                </span>

                <strong>
                  {formatDate(notification.created_at)}
                </strong>
              </div>

              <div className="detail-item">
                <span className="detail-label">
                  ESTADO
                </span>

                <span className="read-status">
                  <span className="status-dot" />
                  {notification.is_read
                    ? "LEÍDA"
                    : "NO LEÍDA"}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">
                  IDENTIFICADOR
                </span>

                <strong>#{notification.id}</strong>
              </div>
            </div>

            <div className="notification-footer">
              <div className="footer-info">
                <span className="footer-check">✓</span>

                <span>
                  Esta notificación pertenece a tu cuenta.
                </span>
              </div>

              <button
                className="primary-button"
                onClick={() => router.push("/home")}
              >
                VOLVER AL HOME
                <span>→</span>
              </button>
            </div>
          </section>
        ) : null}

        <footer className="page-footer">
          <span>STORE GAMING</span>
          <span>•</span>
          <span>CENTRO DE NOTIFICACIONES</span>
        </footer>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #070b10;
        }

        .notification-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: #070b10;
          color: #eef5f2;
          padding: 25px 18px 45px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .notification-background {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 15% 10%,
              rgba(0, 237, 145, 0.09),
              transparent 35%
            ),
            radial-gradient(
              circle at 90% 80%,
              rgba(0, 130, 255, 0.08),
              transparent 35%
            );
        }

        .notification-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 950px;
          margin: 0 auto;
        }

        .notification-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          padding-bottom: 25px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 9px;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.1);
          color: #d7e5df;
          padding: 11px 16px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          cursor: pointer;
          transition: 0.2s;
        }

        .back-button:hover {
          border-color: #00ed91;
          color: #00ed91;
          transform: translateY(-2px);
        }

        .back-button span {
          font-size: 19px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          background: rgba(0,237,145,0.1);
          border: 1px solid rgba(0,237,145,0.25);
          border-radius: 12px;
          font-size: 22px;
        }

        .brand h1 {
          margin: 0;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .brand h1 span {
          color: #00ed91;
        }

        .brand p {
          margin: 5px 0 0;
          color: #71827b;
          font-size: 9px;
          letter-spacing: 1.5px;
          font-weight: 700;
        }

        .page-heading {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 35px 0 25px;
        }

        .heading-icon {
          width: 55px;
          height: 55px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          background: rgba(0,237,145,0.1);
          border: 1px solid rgba(0,237,145,0.22);
          border-radius: 15px;
          font-size: 25px;
        }

        .section-label {
          display: block;
          color: #00ed91;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;
          margin-bottom: 8px;
        }

        .page-heading h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .page-heading p {
          margin: 7px 0 0;
          color: #81918b;
          font-size: 12px;
        }

        .notification-card,
        .loading-card,
        .error-card {
          background: linear-gradient(
            145deg,
            rgba(20,30,34,0.96),
            rgba(11,17,22,0.96)
          );
          border: 1px solid rgba(255,255,255,0.075);
          border-radius: 19px;
          padding: 25px;
          box-shadow: 0 15px 45px rgba(0,0,0,0.2);
        }

        .notification-card-top {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          border-left: 3px solid #00ed91;
          padding-left: 17px;
        }

        .notification-icon {
          width: 55px;
          height: 55px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border: 1px solid;
          border-radius: 14px;
          font-size: 25px;
        }

        .notification-heading {
          min-width: 0;
        }

        .notification-heading h3 {
          margin: 0 0 12px;
          font-size: 21px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .type-badge {
          display: inline-flex;
          align-items: center;
          border: 1px solid;
          border-radius: 20px;
          padding: 6px 11px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .notification-divider {
          height: 1px;
          background: rgba(255,255,255,0.07);
          margin: 25px 0;
        }

        .detail-section {
          margin-bottom: 25px;
        }

        .detail-label {
          display: block;
          color: #74877f;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.5px;
          margin-bottom: 10px;
        }

        .message-box {
          padding: 20px;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          color: #d4e0db;
          font-size: 14px;
          line-height: 1.8;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 13px;
        }

        .detail-item {
          min-width: 0;
          padding: 17px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
        }

        .detail-item strong {
          display: block;
          color: #e1ebe6;
          font-size: 12px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .read-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #00ed91;
          font-size: 11px;
          font-weight: 900;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #00ed91;
          box-shadow: 0 0 9px rgba(0,237,145,0.6);
        }

        .notification-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px;
          margin-top: 25px;
          padding-top: 22px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }

        .footer-info {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #8c9c95;
          font-size: 11px;
        }

        .footer-check {
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(0,237,145,0.12);
          color: #00ed91;
          font-weight: 900;
        }

        .primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 13px 19px;
          border: none;
          border-radius: 10px;
          background: #00ed91;
          color: #04140d;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
          cursor: pointer;
          transition: 0.2s;
        }

        .primary-button:hover {
          background: #32ffae;
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(0,237,145,0.18);
        }

        .primary-button span {
          font-size: 17px;
        }

        .loading-card,
        .error-card {
          text-align: center;
          padding: 55px 20px;
        }

        .spinner {
          width: 38px;
          height: 38px;
          margin: 0 auto 20px;
          border: 3px solid rgba(0,237,145,0.15);
          border-top-color: #00ed91;
          border-radius: 50%;
          animation: notification-spin 0.8s linear infinite;
        }

        @keyframes notification-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-card h3,
        .error-card h3 {
          margin: 0;
          font-size: 13px;
          letter-spacing: 1px;
        }

        .loading-card p,
        .error-card p {
          color: #87968f;
          font-size: 12px;
          line-height: 1.7;
        }

        .error-icon {
          font-size: 35px;
          margin-bottom: 15px;
        }

        .error-card .primary-button {
          margin-top: 15px;
        }

        .page-footer {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          margin-top: 30px;
          color: #53645d;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .page-footer span:first-child {
          color: #00ed91;
        }

        @media (max-width: 600px) {
          .notification-page {
            padding: 17px 12px 35px;
          }

          .notification-header {
            align-items: flex-start;
          }

          .brand {
            gap: 8px;
          }

          .brand h1 {
            font-size: 14px;
          }

          .brand p {
            font-size: 8px;
          }

          .back-button {
            padding: 10px 12px;
            font-size: 9px;
          }

          .page-heading {
            margin: 27px 0 20px;
            gap: 12px;
          }

          .heading-icon {
            width: 47px;
            height: 47px;
            font-size: 21px;
          }

          .page-heading h2 {
            font-size: 17px;
          }

          .page-heading p {
            font-size: 11px;
          }

          .notification-card {
            padding: 18px 15px;
          }

          .notification-card-top {
            gap: 12px;
            padding-left: 11px;
          }

          .notification-icon {
            width: 45px;
            height: 45px;
            font-size: 21px;
          }

          .notification-heading h3 {
            font-size: 16px;
          }

          .message-box {
            padding: 15px;
            font-size: 13px;
          }

          .details-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .detail-item {
            padding: 14px;
          }

          .notification-footer {
            align-items: stretch;
          }

          .notification-footer .primary-button {
            width: 100%;
          }

          .footer-info {
            font-size: 10px;
          }

          .page-footer {
            font-size: 8px;
            gap: 6px;
          }
        }
      `}</style>
    </main>
  );
}
