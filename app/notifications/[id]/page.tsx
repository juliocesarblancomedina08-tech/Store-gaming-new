
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

        if (sessionError) throw sessionError;

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        if (!notificationId) {
          throw new Error("Identificador de notificación inválido.");
        }

        const { data, error: notificationError } = await supabase
          .from("notifications")
          .select(
            "id, title, message, type, is_read, created_at"
          )
          .eq("id", notificationId)
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (notificationError) throw notificationError;

        if (!data) {
          throw new Error(
            "Esta notificación no existe o no está disponible."
          );
        }

        if (!active) return;

        const currentNotification = data as Notification;

        setNotification(currentNotification);

        if (!currentNotification.is_read) {
          const { error: updateError } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", notificationId)
            .eq("user_id", session.user.id);

          if (updateError) {
            console.error(
              "Error marcando notificación como leída:",
              updateError
            );
          } else if (active) {
            setNotification({
              ...currentNotification,
              is_read: true,
            });
          }
        }
      } catch (err) {
        console.error("Error cargando notificación:", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la notificación."
          );
        }
      } finally {
        if (active) setLoading(false);
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
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getTypeLabel(type: string | null) {
    const value = (type || "").toLowerCase();

    if (
      value.includes("deposit") ||
      value.includes("payment") ||
      value.includes("pago")
    ) {
      return "Depósito / Pago";
    }

    if (
      value.includes("order") ||
      value.includes("purchase") ||
      value.includes("compra") ||
      value.includes("pedido")
    ) {
      return "Pedido / Compra";
    }

    if (
      value.includes("support") ||
      value.includes("soporte")
    ) {
      return "Soporte";
    }

    if (
      value.includes("security") ||
      value.includes("seguridad")
    ) {
      return "Seguridad";
    }

    return type || "General";
  }

  return (
    <main className="notification-page">
      <div className="page-container">

        <header className="top-bar">
          <button
            className="menu-button"
            onClick={() => router.push("/home")}
            aria-label="Volver al inicio"
          >
            ☰
          </button>

          <div className="brand">
            <div className="brand-logo">🛒</div>

            <div>
              <h1>
                STORE <span>GAMING</span>
              </h1>
              <p>USER NOTIFICATIONS</p>
            </div>
          </div>

          <div className="header-icon">🔔</div>
        </header>

        <section className="page-banner">
          <span className="banner-label">
            STORE GAMING / ACCOUNT
          </span>

          <h2>Notifications</h2>

          <p>
            Notification information and account activity.
          </p>
        </section>

        {loading ? (
          <section className="state-card">
            <div className="spinner" />
            <h3>CARGANDO NOTIFICACIÓN...</h3>
            <p>Obteniendo información de tu cuenta.</p>
          </section>
        ) : error ? (
          <section className="state-card error-state">
            <div className="state-icon">⚠️</div>

            <h3>NOTIFICACIÓN NO DISPONIBLE</h3>

            <p>{error}</p>

            <button
              className="primary-button"
              onClick={() => router.push("/home")}
            >
              Volver al inicio
            </button>
          </section>
        ) : notification ? (
          <section className="transaction-card">

            <div className="card-content">

              <div className="status-row">
                <span
                  className={`status-badge ${
                    notification.is_read
                      ? "status-completed"
                      : "status-pending"
                  }`}
                >
                  <span className="status-check">
                    {notification.is_read ? "✓" : "•"}
                  </span>

                  {notification.is_read ? "Leída" : "No leída"}
                </span>
              </div>

              <div className="data-row">
                <span>ID</span>
                <strong>#{notification.id}</strong>
              </div>

              <div className="data-row">
                <span>Created</span>
                <strong>
                  {formatDate(notification.created_at)}
                </strong>
              </div>

              <div className="amount-section">
                <span>Notification title</span>

                <div className="notification-title">
                  {notification.title}
                </div>
              </div>

              <div className="data-row">
                <span>Movement type</span>
                <strong>Notification</strong>
              </div>

              <div className="data-row">
                <span>Type</span>
                <strong className="type-badge">
                  {getTypeLabel(notification.type)}
                </strong>
              </div>

              <div className="data-row">
                <span>Status</span>

                <strong
                  className={
                    notification.is_read
                      ? "green-text"
                      : "yellow-text"
                  }
                >
                  {notification.is_read ? "Read" : "Unread"}
                </strong>
              </div>

              <div className="timeline-divider">
                <span />
                <span />
              </div>

              <div className="description-section">
                <span className="description-label">
                  Description
                </span>

                <div className="description-box">
                  <div className="description-icon">
                    🔔
                  </div>

                  <div className="description-message">
                    {notification.message}
                  </div>
                </div>
              </div>

            </div>

            <div className="card-actions">
              <button
                className="primary-button"
                onClick={() => router.push("/home")}
              >
                Volver al inicio
              </button>

              <button
                className="secondary-button"
                onClick={() => router.push("/home")}
              >
                Back to list
              </button>
            </div>

          </section>
        ) : null}

        <footer className="page-footer">
          <span>© 2026 STORE GAMING</span>
          <span>Terms</span>
          <span>Privacy</span>
          <span>Support</span>
        </footer>

      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #070914;
        }

        .notification-page {
          min-height: 100vh;
          padding: 0 15px 50px;
          background: #070914;
          color: #e7e9f2;
          font-family: Arial, Helvetica, sans-serif;
        }

        .page-container {
          width: 100%;
          max-width: 950px;
          margin: 0 auto;
        }

        .top-bar {
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }

        .menu-button,
        .header-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 15px;
          background: #101426;
          color: #dfe3f2;
          font-size: 22px;
          cursor: pointer;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-right: auto;
          margin-left: 5px;
        }

        .brand-logo {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #20243b;
          font-size: 22px;
        }

        .brand h1 {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .brand h1 span {
          color: #a78bfa;
        }

        .brand p {
          margin: 5px 0 0;
          color: #82879d;
          font-size: 9px;
          letter-spacing: 1.5px;
        }

        .page-banner {
          padding: 34px 30px;
          margin: 0 0 20px;
          border: 1px solid rgba(167,139,250,0.12);
          border-radius: 0 0 22px 22px;
          background:
            linear-gradient(
              115deg,
              #17152f 0%,
              #11182b 55%,
              #10182b 100%
            );
        }

        .banner-label {
          display: block;
          margin-bottom: 10px;
          color: #a78bfa;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .page-banner h2 {
          margin: 0;
          color: #f0efff;
          font-size: 29px;
          font-weight: 900;
        }

        .page-banner p {
          margin: 14px 0 0;
          color: #a2a5b8;
          font-size: 16px;
          line-height: 1.5;
        }

        .transaction-card {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.075);
          border-radius: 24px;
          background: #0d1123;
          box-shadow: 0 15px 40px rgba(0,0,0,0.18);
        }

        .card-content {
          padding: 25px;
        }

        .status-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 20px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 9px 15px;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 30px;
          background: #202638;
          color: #e8eaf2;
          font-size: 14px;
          font-weight: 800;
        }

        .status-check {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(52,211,153,0.13);
          border: 1px solid rgba(52,211,153,0.25);
          color: #69d9ae;
          font-size: 16px;
        }

        .status-pending .status-check {
          background: rgba(250,189,76,0.12);
          border-color: rgba(250,189,76,0.25);
          color: #f6c66c;
        }

        .data-row {
          min-height: 59px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid rgba(255,255,255,0.075);
          color: #a7aaba;
          font-size: 14px;
          font-weight: 600;
        }

        .data-row strong {
          color: #e6e7ef;
          font-size: 14px;
          font-weight: 800;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .amount-section {
          padding: 26px 0 27px;
          border-bottom: 1px solid rgba(255,255,255,0.075);
        }

        .amount-section > span {
          display: block;
          margin-bottom: 9px;
          color: #888da2;
          font-size: 13px;
          font-weight: 700;
        }

        .notification-title {
          color: #34c879;
          font-size: 27px;
          font-weight: 900;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .type-badge {
          padding: 7px 12px;
          border-radius: 12px;
          background: #252b40;
          border: 1px solid rgba(255,255,255,0.06);
          color: #e0e2ed !important;
          font-size: 12px !important;
        }

        .green-text {
          color: #4ed59b !important;
        }

        .yellow-text {
          color: #f3c66d !important;
        }

        .timeline-divider {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 35px -6px 38px;
          border-top: 3px dashed rgba(150,157,190,0.17);
        }

        .timeline-divider span {
          position: absolute;
          top: -10px;
          width: 20px;
          height: 20px;
          border: 3px solid #080b18;
          border-radius: 50%;
          background: #080b18;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08);
        }

        .timeline-divider span:first-child {
          left: 0;
        }

        .timeline-divider span:last-child {
          right: 0;
        }

        .description-label {
          display: block;
          margin-bottom: 14px;
          color: #9296a9;
          font-size: 13px;
          font-weight: 800;
        }

        .description-box {
          display: flex;
          align-items: center;
          gap: 15px;
          min-height: 85px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,0.055);
          border-radius: 19px;
          background: #202638;
        }

        .description-icon {
          width: 55px;
          height: 55px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 15px;
          background: #30384e;
          font-size: 23px;
        }

        .description-message {
          color: #e2e5ee;
          font-size: 15px;
          line-height: 1.65;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 20px 25px;
          border-top: 1px solid rgba(255,255,255,0.06);
          background: rgba(5,8,19,0.18);
        }

        .primary-button,
        .secondary-button {
          min-height: 49px;
          padding: 0 19px;
          border-radius: 15px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s;
        }

        .primary-button {
          border: 1px solid rgba(139,92,246,0.25);
          background: #11152a;
          color: #f0efff;
          box-shadow: 0 0 18px rgba(111,76,255,0.08);
        }

        .primary-button:hover {
          border-color: #8b72f4;
          background: #191d38;
        }

        .secondary-button {
          border: 1px solid rgba(255,255,255,0.08);
          background: transparent;
          color: #a3a6b6;
        }

        .secondary-button:hover {
          border-color: rgba(255,255,255,0.2);
          color: #ffffff;
        }

        .state-card {
          padding: 60px 20px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 22px;
          background: #0d1123;
        }

        .state-card h3 {
          color: #e9eaf2;
          font-size: 14px;
        }

        .state-card p {
          color: #999eb2;
          font-size: 13px;
          line-height: 1.7;
        }

        .state-icon {
          margin-bottom: 15px;
          font-size: 35px;
        }

        .spinner {
          width: 38px;
          height: 38px;
          margin: 0 auto 20px;
          border: 3px solid rgba(167,139,250,0.15);
          border-top-color: #a78bfa;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .state-card .primary-button {
          margin-top: 15px;
        }

        .page-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 22px;
          margin-top: 60px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,0.045);
          border-radius: 17px;
          background: #0d1123;
          color: #85899c;
          font-size: 12px;
          font-weight: 700;
        }

        @media (max-width: 600px) {
          .notification-page {
            padding: 0 10px 35px;
          }

          .top-bar {
            min-height: 75px;
          }

          .menu-button,
          .header-icon {
            width: 43px;
            height: 43px;
            border-radius: 13px;
            font-size: 19px;
          }

          .brand-logo {
            width: 38px;
            height: 38px;
          }

          .brand h1 {
            font-size: 13px;
          }

          .brand p {
            font-size: 8px;
          }

          .page-banner {
            padding: 25px 20px;
          }

          .page-banner h2 {
            font-size: 24px;
          }

          .page-banner p {
            font-size: 14px;
          }

          .card-content {
            padding: 20px 17px;
          }

          .data-row {
            min-height: 58px;
            font-size: 13px;
          }

          .data-row strong {
            max-width: 58%;
            font-size: 13px;
          }

          .notification-title {
            font-size: 23px;
          }

          .description-box {
            padding: 13px;
            gap: 12px;
          }

          .description-icon {
            width: 47px;
            height: 47px;
            font-size: 20px;
          }

          .description-message {
            font-size: 14px;
          }

          .card-actions {
            padding: 17px;
            gap: 9px;
          }

          .primary-button,
          .secondary-button {
            min-height: 47px;
            padding: 0 14px;
            font-size: 12px;
          }

          .page-footer {
            gap: 13px;
            margin-top: 40px;
            font-size: 10px;
          }
        }
      `}</style>
    </main>
  );
}
