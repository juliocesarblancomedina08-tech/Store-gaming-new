"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type AdminService = {
name: string;
description: string;
icon: string;
route: string;
};

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

const adminServices: AdminService[] = [
{
name: "SOPORTE",
description: "Gestiona las solicitudes de ayuda de los clientes.",
icon: "🎧",
route: "/admin/support",
},
{
name: "BALANCES",
description: "Consulta y administra los balances de los clientes.",
icon: "💰",
route: "/admin/balances",
},
{
name: "ÓRDENES",
description: "Revisa y administra las órdenes de la tienda.",
icon: "📦",
route: "/admin/orders",
},
{
name: "CLIENTES",
description: "Consulta la información de los clientes.",
icon: "👥",
route: "/admin/clients",
},
{
name: "MOVIMIENTOS",
description: "Controla los movimientos, ingresos y gastos.",
icon: "📊",
route: "/admin/movements",
},
{
name: "TASAS CUP",
description:
"Actualiza por separado las tasas de Saldo CUP y Transferencia CUP.",
icon: "💱",
route: "/admin/cup-rates",
},
];

export default function AdminPage() {
const router = useRouter();

const [loading, setLoading] = useState(true);
const [authorized, setAuthorized] = useState(false);
const [adminEmail, setAdminEmail] = useState("");

useEffect(() => {
let mounted = true;

async function checkAdmin() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    if (!session) {
      router.replace("/login");
      return;
    }

    const userEmail = session.user.email?.toLowerCase() ?? "";

    if (userEmail !== ADMIN_EMAIL.toLowerCase()) {
      router.replace("/home");
      return;
    }

    if (mounted) {
      setAdminEmail(session.user.email ?? "");
      setAuthorized(true);
    }
  } catch (error) {
    console.error("Error al verificar el acceso:", error);
    router.replace("/login");
  } finally {
    if (mounted) setLoading(false);
  }
}

void checkAdmin();

return () => {
  mounted = false;
};

}, [router]);

async function handleLogout() {
const { error } = await supabase.auth.signOut();

if (error) {
  console.error("Error al cerrar sesión:", error);
  alert("No se pudo cerrar la sesión. Inténtalo de nuevo.");
  return;
}

router.replace("/login");

}

if (loading) {
return (
<main className="loading-page">
<div className="loader" />
<p>Verificando acceso administrativo...</p>

    <style jsx>{`
      .loading-page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 16px;
        background: #08090d;
        color: #a1a1aa;
        font-family: Arial, Helvetica, sans-serif;
      }

      .loader {
        width: 42px;
        height: 42px;
        border: 4px solid #272832;
        border-top-color: #ff3047;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `}</style>
  </main>
);

}

if (!authorized) return null;

return (
<main className="admin-page">
<div className="container">
<button
type="button"
className="back-home-button"
onClick={() => router.push("/home")}
>
<span className="back-home-arrow">←</span>
<span>VOLVER AL HOME</span>
</button>

    <header className="topbar">
      <div className="brand">
        <div className="brand-logo">🎮</div>

        <div className="brand-text">
          <span>STORE GAMING</span>
          <h1>CONTROL CENTER</h1>
        </div>
      </div>

      <button
        type="button"
        className="logout-button"
        onClick={handleLogout}
      >
        <span>↪</span>
        <span>Cerrar sesión</span>
      </button>
    </header>

    <section className="hero">
      <div className="protected-label">
        <span className="status-dot" />
        PANEL PROTEGIDO
      </div>

      <h2>
        Administración
        <span className="title-dot">.</span>
      </h2>

      <p className="hero-description">
        Bienvenido al centro de control de STORE GAMING. Administra los
        servicios, clientes, órdenes y movimientos desde un solo lugar.
      </p>

      <div className="account-card">
        <div className="account-avatar">👤</div>

        <div className="account-info">
          <span>SESIÓN ADMINISTRATIVA</span>
          <p>{adminEmail}</p>
        </div>

        <div className="account-status">
          <span />
          Activa
        </div>
      </div>
    </section>

    <section className="modules-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">GESTIÓN DE LA TIENDA</span>
          <h3>Módulos de administración</h3>
          <p>Selecciona el apartado que deseas administrar.</p>
        </div>

        <div className="module-counter">
          <strong>{String(adminServices.length).padStart(2, "0")}</strong>
          <span>MÓDULOS</span>
        </div>
      </div>

      <div className="services-grid">
        {adminServices.map((service, index) => (
          <button
            key={service.route}
            type="button"
            className="service-card"
            onClick={() => router.push(service.route)}
          >
            <div className="card-header">
              <div className="service-icon">{service.icon}</div>

              <span className="card-index">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>

            <div className="card-content">
              <h4>{service.name}</h4>
              <p>{service.description}</p>
            </div>

            <div className="card-bottom">
              <span>ACCEDER AL MÓDULO</span>
              <span className="card-arrow">↗</span>
            </div>
          </button>
        ))}
      </div>
    </section>

    <footer className="footer">
      <div className="footer-brand">
        <span>🎮</span>
        <strong>STORE GAMING</strong>
      </div>

      <p>Centro de administración · Acceso restringido</p>
    </footer>
  </div>

  <style jsx>{`
    .admin-page {
      min-height: 100vh;
      padding: 28px 18px 35px;
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

    .back-home-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      margin-bottom: 20px;
      padding: 11px 15px;
      border: 1px solid rgba(255, 48, 71, 0.35);
      border-radius: 10px;
      background: linear-gradient(
        135deg,
        rgba(255, 48, 71, 0.14),
        rgba(21, 22, 29, 0.95)
      );
      color: #ff6477;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.8px;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .back-home-button:hover {
      border-color: #ff3047;
      background: rgba(255, 48, 71, 0.2);
      transform: translateY(-1px);
    }

    .back-home-arrow {
      font-size: 19px;
      line-height: 1;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      padding-bottom: 25px;
      border-bottom: 1px solid #252630;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .brand-logo {
      width: 47px;
      height: 47px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      border: 1px solid #383944;
      border-radius: 14px;
      background: linear-gradient(145deg, #20212a, #121319);
      font-size: 24px;
      box-shadow: 0 5px 20px #0004;
    }

    .brand-text > span {
      display: block;
      margin-bottom: 5px;
      color: #ff5267;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
    }

    .brand-text h1 {
      margin: 0;
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 1.2px;
    }

    .logout-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 10px 12px;
      border: 1px solid #353641;
      border-radius: 10px;
      background: #15161d;
      color: #e5e5eb;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .logout-button:hover {
      border-color: #ff3047;
      color: #ff6477;
    }

    .logout-button > span:first-child {
      font-size: 17px;
    }

    .hero {
      padding: 35px 0 31px;
    }

    .protected-label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ff596d;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 1.8px;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ff3047;
      box-shadow: 0 0 12px #ff304780;
    }

    .hero h2 {
      margin: 13px 0 11px;
      font-size: clamp(30px, 6vw, 40px);
      line-height: 1.1;
      font-weight: 900;
      letter-spacing: -1.5px;
    }

    .title-dot {
      color: #ff3047;
    }

    .hero-description {
      max-width: 580px;
      margin: 0;
      color: #9697a3;
      font-size: 13px;
      line-height: 1.8;
    }

    .account-card {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 24px;
      padding: 15px;
      border: 1px solid #292a34;
      border-radius: 14px;
      background: linear-gradient(120deg, #15161d, #101116);
    }

    .account-avatar {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      border: 1px solid #353641;
      border-radius: 12px;
      background: #22232c;
      font-size: 18px;
    }

    .account-info {
      flex: 1;
      min-width: 0;
    }

    .account-info > span {
      color: #888995;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 1.2px;
    }

    .account-info p {
      margin: 5px 0 0;
      color: #e7e7ec;
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    .account-status {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #9fdbb0;
      font-size: 10px;
      font-weight: 700;
    }

    .account-status span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #48c774;
    }

    .modules-section {
      padding-top: 5px;
    }

    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 20px;
    }

    .eyebrow {
      color: #ff5267;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 1.6px;
    }

    .section-heading h3 {
      margin: 8px 0 6px;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }

    .section-heading p {
      margin: 0;
      color: #898a96;
      font-size: 11px;
      line-height: 1.6;
    }

    .module-counter {
      display: flex;
      flex-shrink: 0;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 62px;
      padding: 9px 8px;
      border: 1px solid #33343e;
      border-radius: 12px;
      background: #15161d;
    }

    .module-counter strong {
      color: #ff5267;
      font-size: 23px;
      font-weight: 900;
    }

    .module-counter span {
      margin-top: 2px;
      color: #858692;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 1px;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 13px;
    }

    .service-card {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 205px;
      padding: 16px;
      border: 1px solid #2a2b35;
      border-radius: 15px;
      background: linear-gradient(145deg, #171820, #101116);
      color: #f5f5f7;
      text-align: left;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .service-card:hover {
      transform: translateY(-3px);
      border-color: #ff3047;
      box-shadow: 0 8px 28px #0004;
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .service-icon {
      display: grid;
      place-items: center;
      width: 43px;
      height: 43px;
      border: 1px solid #363741;
      border-radius: 12px;
      background: #22232c;
      font-size: 22px;
    }

    .card-index {
      color: #686976;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 1px;
    }

    .card-content {
      flex: 1;
      padding: 19px 0 16px;
    }

    .card-content h4 {
      margin: 0 0 8px;
      font-size: 12px;
      line-height: 1.5;
      font-weight: 900;
      letter-spacing: 0.2px;
      overflow-wrap: anywhere;
    }

    .card-content p {
      margin: 0;
      color: #9697a3;
      font-size: 11px;
      line-height: 1.65;
    }

    .card-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 7px;
      padding-top: 12px;
      border-top: 1px solid #2b2c35;
      color: #a5a5af;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 0.8px;
    }

    .card-arrow {
      color: #ff5267;
      font-size: 17px;
    }

    .footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 33px;
      padding-top: 20px;
      border-top: 1px solid #252630;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #c7c7d0;
      font-size: 10px;
      letter-spacing: 1px;
    }

    .footer-brand span {
      font-size: 16px;
    }

    .footer p {
      margin: 0;
      color: #737480;
      font-size: 10px;
    }

    @media (max-width: 480px) {
      .admin-page {
        padding: 20px 12px 28px;
      }

      .back-home-button {
        margin-bottom: 17px;
      }

      .topbar {
        gap: 8px;
        padding-bottom: 20px;
      }

      .brand {
        gap: 8px;
      }

      .brand-logo {
        width: 39px;
        height: 39px;
        font-size: 20px;
      }

      .brand-text > span {
        font-size: 9px;
        letter-spacing: 1.2px;
      }

      .brand-text h1 {
        font-size: 11px;
        letter-spacing: 0.6px;
      }

      .logout-button {
        gap: 4px;
        padding: 9px 8px;
        font-size: 10px;
      }

      .hero {
        padding-top: 29px;
      }

      .account-card {
        gap: 9px;
        padding: 12px;
      }

      .account-info > span {
        font-size: 8px;
        letter-spacing: 0.7px;
      }

      .account-info p {
        font-size: 10px;
      }

      .account-status {
        font-size: 9px;
      }

      .section-heading h3 {
        font-size: 17px;
      }

      .section-heading p {
        max-width: 230px;
      }

      .services-grid {
        gap: 9px;
      }

      .service-card {
        min-height: 205px;
        padding: 12px;
        border-radius: 13px;
      }

      .service-icon {
        width: 38px;
        height: 38px;
        font-size: 20px;
      }

      .card-content h4 {
        font-size: 11px;
      }

      .card-content p {
        font-size: 10px;
      }

      .card-bottom {
        font-size: 7px;
        letter-spacing: 0.3px;
      }

      .footer {
        align-items: flex-start;
        flex-direction: column;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .service-card,
      .logout-button,
      .back-home-button {
        transition: none;
      }

      .service-card:hover,
      .back-home-button:hover {
        transform: none;
      }
    }
  `}</style>
</main>

);
}
