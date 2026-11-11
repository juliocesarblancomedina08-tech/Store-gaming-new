
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type StoreOrder = {
  id?: string;
  user_id?: string;
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
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [balance, setBalance] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  const [vipExpiresAt, setVipExpiresAt] = useState<string | null>(null);

  const vipActive =
    Boolean(vipExpiresAt) &&
    new Date(vipExpiresAt as string).getTime() > Date.now();

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !session?.user) {
        router.replace("/");
        return;
      }

      const user = session.user;
      const userEmail = user.email || "";

      setEmail(userEmail);

      await loadProfileData(user.id, userEmail);

      if (!mounted) return;

      loadOrders(user.id, userEmail);
      setLoading(false);
    }

    void loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          router.replace("/");
          return;
        }

        const user = session.user;
        const userEmail = user.email || "";

        setEmail(userEmail);

        await loadProfileData(user.id, userEmail);

        if (mounted) {
          loadOrders(user.id, userEmail);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  /*
   * =========================
   * DATOS DEL PERFIL
   * =========================
   */

  async function loadProfileData(
    userId: string,
    userEmail: string
  ) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url, balance, vip_expires_at")
        .eq("id", userId)
        .single();

      if (!error && data) {
        const fallbackUsername =
          userEmail.split("@")[0] || "usuario";

        setUsername(
          data.username?.trim() || fallbackUsername
        );

        setAvatarUrl(data.avatar_url || "");
        setBalance(Number(data.balance) || 0);
        setVipExpiresAt(data.vip_expires_at || null);
      } else {
        setUsername(userEmail.split("@")[0] || "usuario");
        setAvatarUrl("");
        setBalance(0);
        setVipExpiresAt(null);
      }
    } catch {
      setUsername(userEmail.split("@")[0] || "usuario");
      setAvatarUrl("");
      setBalance(0);
      setVipExpiresAt(null);
    }
  }

  /*
   * =========================
   * ÓRDENES
   * =========================
   */

  function loadOrders(
    userId: string,
    userEmail: string
  ) {
    let orders: StoreOrder[] = [];

    try {
      const savedOrders = localStorage.getItem(
        "storeGamingOrders"
      );

      if (savedOrders) {
        const parsed = JSON.parse(savedOrders);

        if (Array.isArray(parsed)) {
          orders = parsed;
        }
      }
    } catch {
      orders = [];
    }

    const userOrders = orders.filter((order) => {
      if (
        order.user_id &&
        order.user_id === userId
      ) {
        return true;
      }

      if (
        !order.user_id &&
        order.email &&
        order.email.toLowerCase() ===
          userEmail.toLowerCase()
      ) {
        return true;
      }

      return false;
    });

    setTotalOrders(userOrders.length);

    const completedStatuses = [
      "COMPLETADA",
      "COMPLETADO",
      "CONFIRMADA",
      "CONFIRMADO",
      "completada",
      "completado",
      "confirmada",
      "confirmado",
    ];

    const completedOrders = userOrders.filter(
      (order) =>
        completedStatuses.includes(
          String(order.status || "")
        )
    );

    const spent = completedOrders.reduce(
      (sum, order) => {
        const amount =
          Number(order.total) ||
          Number(order.price) ||
          0;

        return sum + amount;
      },
      0
    );

    setTotalSpent(spent);
  }

  /*
   * =========================
   * FECHA VIP
   * =========================
   */

  function formatVipDate(date: string | null) {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "No disponible";
    }

    return new Intl.DateTimeFormat("es", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(parsedDate);
  }

  /*
   * =========================
   * EDITAR PERFIL
   * =========================
   */

  function editProfile() {
    router.push("/profile/edit");
  }

  /*
   * =========================
   * ABRIR VIP
   * =========================
   */

  function openVIP() {
    router.push("/vip");
  }

  /*
   * =========================
   * CARGANDO
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
          CARGANDO PERFIL...
        </p>
      </main>
    );
  }

  return (
    <main className="service-page">

      {/* HEADER */}

      <header className="service-header">
        <button
          className="back-button"
          onClick={() => router.push("/home")}
          aria-label="Volver"
        >
          ←
        </button>

        <h1>
          ♙ PERFIL
        </h1>
      </header>

      {/* PERFIL */}

      <section className="profile-card">

        <div className="profile-avatar-container">
          <div
            className={`profile-avatar ${
              vipActive ? "profile-avatar-vip" : ""
            }`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Foto de perfil"
                className="profile-avatar-image"
              />
            ) : (
              username.charAt(0).toUpperCase() || "@"
            )}
          </div>

          {vipActive && (
            <span className="profile-avatar-vip-star">
              ★
            </span>
          )}
        </div>

        <h2>
          @{username}
        </h2>

        <p>
          {email}
        </p>

        <span className="profile-client-label">
          Cliente STORE GAMING
        </span>

        {vipActive && (
          <div className="profile-vip-active-label">
            <span>★</span>
            MIEMBRO VIP ACTIVO
          </div>
        )}

        <button
          type="button"
          onClick={editProfile}
        >
          EDITAR PERFIL
        </button>

      </section>

      {/* STORE GAMING VIP */}

      <section
        className={`profile-vip-card ${
          vipActive ? "profile-vip-card-active" : ""
        }`}
      >

        <div className="vip-card-decoration" />

        <div className="vip-card-top">

          <div className="vip-crown">
            ♛
          </div>

          <span className="vip-status">
            {vipActive
              ? "★ MEMBRESÍA VIP ACTIVA"
              : "MEMBRESÍA EXCLUSIVA"}
          </span>

        </div>

        <div className="vip-card-content">

          <span className="vip-brand">
            STORE GAMING
          </span>

          <h2>
            VIP <span>MEMBER</span>
          </h2>

          <p>
            Desbloquea ventajas, mejores precios
            y oportunidades exclusivas.
          </p>

        </div>

        <div className="vip-benefits">

          <div>
            <span>％</span>
            <p>
              Descuentos especiales en ofertas
            </p>
          </div>

          <div>
            <span>✦</span>
            <p>
              Promociones exclusivas para VIP
            </p>
          </div>

          <div>
            <span>◆</span>
            <p>
              Acceso a futuras ventajas premium
            </p>
          </div>

        </div>

        {vipActive && (
          <div className="vip-member-expiration">
            <span>★</span>
            <div>
              <small>MEMBRESÍA VÁLIDA HASTA</small>
              <strong>
                {formatVipDate(vipExpiresAt)}
              </strong>
            </div>
          </div>
        )}

        <div className="vip-card-footer">

          <div className="vip-price">
            <strong>5.00</strong>
            <span>CRÉDITOS / MES</span>
          </div>

          <button
            type="button"
            onClick={openVIP}
            className="vip-button"
          >
            {vipActive ? "MI MEMBRESÍA" : "DESCUBRIR VIP"}
            <span>→</span>
          </button>

        </div>

        <div className="vip-duration">
          SUSCRIPCIÓN MENSUAL · 30 DÍAS
        </div>

      </section>

      {/* ACCESOS */}

      <section className="profile-menu">

        <button
          type="button"
          className="profile-menu-item"
          onClick={() => router.push("/orders")}
        >
          <span className="profile-menu-icon">
            ▣
          </span>

          <div>
            <strong>ÓRDENES</strong>
            <small>Consulta tus pedidos</small>
          </div>

          <span className="profile-menu-arrow">→</span>
        </button>

        <button
          type="button"
          className="profile-menu-item"
          onClick={() => router.push("/balance")}
        >
          <span className="profile-menu-icon">$</span>

          <div>
            <strong>BALANCE</strong>
            <small>Administra tu saldo</small>
          </div>

          <span className="profile-menu-arrow">→</span>
        </button>

        <button
          type="button"
          className="profile-menu-item"
          onClick={() => router.push("/statistics")}
        >
          <span className="profile-menu-icon">▥</span>

          <div>
            <strong>ACTAS</strong>
            <small>Actividad de tu cuenta</small>
          </div>

          <span className="profile-menu-arrow">→</span>
        </button>

        <button
          type="button"
          className="profile-menu-item"
          onClick={() => router.push("/support")}
        >
          <span className="profile-menu-icon">🎧</span>

          <div>
            <strong>APOYO</strong>
            <small>Contacta con soporte</small>
          </div>

          <span className="profile-menu-arrow">→</span>
        </button>

      </section>

      {/* ESTADÍSTICAS */}

      <section className="profile-statistics">

        <div className="profile-stat-card profile-stat-balance">

          <div className="profile-stat-top">
            <span className="profile-stat-icon">$</span>
            <span>BALANCE</span>
          </div>

          <strong>
            ${balance.toFixed(4)}
          </strong>

        </div>

        <div className="profile-stat-card">

          <div className="profile-stat-top">
            <span className="profile-stat-icon">▣</span>
            <span>PEDIDOS TOTALES</span>
          </div>

          <strong>
            {totalOrders}
          </strong>

          <button
            type="button"
            onClick={() => router.push("/orders")}
          >
            ÓRDENES ABIERTAS →
          </button>

        </div>

        <div className="profile-stat-card profile-stat-wide">

          <div className="profile-stat-top">
            <span className="profile-stat-icon">💳</span>
            <span>GASTO TOTAL</span>
          </div>

          <strong>
            ${totalSpent.toFixed(4)}
          </strong>

          <small>TODOS LOS TIEMPOS</small>

        </div>

      </section>

      {/* INFORMACIÓN */}

      <section className="profile-account-info">

        <div>
          <span>USUARIO</span>
          <strong>@{username}</strong>
        </div>

        <div>
          <span>CORREO ELECTRÓNICO</span>
          <strong>{email}</strong>
        </div>

      </section>

      {/* FOOTER */}

      <footer className="service-footer">

        <strong>STORE GAMING</strong>

        <span>PERFIL DEL CLIENTE</span>

      </footer>

      {/* ESTILOS VIP Y AVATAR */}

      <style jsx global>{`
        .profile-avatar-container {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }

        .profile-avatar-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          border-radius: 50%;
        }

        .profile-avatar-vip {
          border: 3px solid #f5c75e !important;
          outline: 3px solid rgba(245, 199, 94, 0.17);
          outline-offset: 3px;
          box-shadow:
            0 0 12px rgba(245, 199, 94, 0.35),
            0 0 25px rgba(245, 199, 94, 0.15);
          color: #ffdf91 !important;
        }

        .profile-avatar-vip-star {
          position: absolute;
          right: -5px;
          bottom: -3px;
          z-index: 3;
          display: grid;
          place-items: center;
          width: 23px;
          height: 23px;
          border: 2px solid #17100a;
          border-radius: 50%;
          background: linear-gradient(145deg, #ffe99b, #d6a52d);
          color: #49320a;
          font-size: 13px;
          box-shadow: 0 0 12px rgba(245, 199, 94, 0.4);
        }

        .profile-vip-active-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          padding: 6px 11px;
          border: 1px solid #96742f;
          border-radius: 20px;
          background: linear-gradient(120deg, #4b3817, #281e0d);
          color: #ffe19a;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.7px;
        }

        .profile-vip-active-label span {
          font-size: 13px;
        }

        .profile-vip-card {
          position: relative;
          overflow: hidden;
          max-width: 620px;
          margin: 22px auto;
          padding: 21px;
          border-radius: 20px;
          border: 1px solid rgba(255,65,65,.45);
          background:
            radial-gradient(circle at 90% 5%, rgba(255,45,45,.22), transparent 42%),
            linear-gradient(135deg,#291010,#100909 75%);
          box-shadow: 0 12px 35px rgba(0,0,0,.3), 0 0 22px rgba(255,40,40,.07);
          color: white;
        }

        .profile-vip-card-active {
          border-color: rgba(245, 199, 94, 0.7);
          box-shadow: 0 12px 35px rgba(0,0,0,.3), 0 0 20px rgba(245, 199, 94, 0.12);
        }

        .vip-card-decoration {
          position: absolute;
          width: 180px;
          height: 180px;
          right: -80px;
          bottom: -100px;
          border-radius: 50%;
          background: rgba(255,40,40,.15);
          filter: blur(35px);
          pointer-events: none;
        }

        .vip-card-top,
        .vip-card-footer {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .vip-crown {
          width: 43px;
          height: 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: rgba(255,55,55,.15);
          border: 1px solid rgba(255,75,75,.4);
          color: #ff6262;
          font-size: 29px;
        }

        .profile-vip-card-active .vip-crown {
          border-color: #96742f;
          background: rgba(245, 199, 94, 0.12);
          color: #ffdc82;
        }

        .vip-status {
          color: #ff7777;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .profile-vip-card-active .vip-status {
          color: #ffdc82;
        }

        .vip-card-content {
          position: relative;
          z-index: 1;
          margin-top: 17px;
        }

        .vip-brand {
          color: #c18b8b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 3px;
        }

        .vip-card-content h2 {
          margin: 5px 0;
          font-size: 32px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .vip-card-content h2 span {
          color: #ff5555;
        }

        .profile-vip-card-active .vip-card-content h2 span {
          color: #ffdc82;
        }

        .vip-card-content p {
          max-width: 390px;
          margin: 7px 0 0;
          color: #c5aaaa;
          font-size: 11px;
          line-height: 1.6;
        }

        .vip-benefits {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 10px;
          margin: 20px 0;
          padding: 15px 0;
          border-top: 1px solid rgba(255,255,255,.09);
          border-bottom: 1px solid rgba(255,255,255,.09);
        }

        .vip-benefits > div {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .vip-benefits > div > span {
          width: 25px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(255,55,55,.13);
          color: #ff6565;
          font-size: 15px;
          flex-shrink: 0;
        }

        .vip-benefits p {
          margin: 0;
          color: #e3d2d2;
          font-size: 11px;
          font-weight: 700;
        }

        .vip-member-expiration {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 18px;
          padding: 11px;
          border: 1px solid rgba(245, 199, 94, 0.35);
          border-radius: 10px;
          background: rgba(245, 199, 94, 0.07);
          color: #ffdc82;
        }

        .vip-member-expiration > span {
          font-size: 22px;
        }

        .vip-member-expiration div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .vip-member-expiration small {
          color: #c9ad70;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .vip-member-expiration strong {
          color: #ffe6a7;
          font-size: 11px;
        }

        .vip-price strong {
          display: block;
          color: #fff;
          font-size: 26px;
          font-weight: 950;
        }

        .vip-price > span {
          display: block;
          margin-top: 3px;
          color: #c18b8b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .vip-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 15px;
          border: 0;
          border-radius: 10px;
          background: linear-gradient(135deg,#ff5555,#b71919);
          color: white;
          font-size: 10px;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 5px 18px rgba(255,40,40,.2);
          transition: .2s ease;
        }

        .vip-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(255,40,40,.3);
        }

        .vip-button:active {
          transform: scale(.97);
        }

        .vip-button span {
          font-size: 16px;
        }

        .vip-duration {
          position: relative;
          z-index: 1;
          margin-top: 16px;
          color: #997b7b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.2px;
          text-align: center;
        }

        @media(max-width:420px) {
          .profile-vip-card {
            padding: 17px;
          }

          .vip-card-content h2 {
            font-size: 28px;
          }

          .vip-button {
            padding: 11px;
            font-size: 9px;
          }
        }
      `}</style>

    </main>
  );
}
