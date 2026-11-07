"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ShowcaseProduct = {
  name: string;
  image: string;
  category: string;
};

const showcaseProducts: ShowcaseProduct[] = [
  // JUEGOS Y RECARGAS
  { name: "FREE FIRE LATAM", image: "/images/free-fire-latam.jpg", category: "DIAMANTES" },
  { name: "GENSHIN IMPACT GLOBAL", image: "/images/genshin-impact-global.jpg", category: "RECARGAS" },
  { name: "MOBILE LEGENDS EE.UU", image: "/images/mobile-legends.jpg", category: "DIAMANTES" },
  { name: "LEGENDS MOBILE GLOBAL", image: "/images/mobile-legends.jpg", category: "DIAMANTES" },
  { name: "BLOOD STRIKE", image: "/images/blood-strike.jpg", category: "RECARGAS" },
  { name: "ARENA BREAKOUT", image: "/images/arena-breakout.jpg", category: "RECARGAS" },
  { name: "DELTA FORCE", image: "/images/delta-force.jpg", category: "RECARGAS" },
  { name: "FC MOBILE ID", image: "/images/fc-mobile.jpg", category: "RECARGAS" },
  { name: "HONOR OF KINGS", image: "/images/honor-of-kings.jpg", category: "DIAMANTES" },
  { name: "LEAGUE OF LEGENDS ID", image: "/images/league-of-legends.jpg", category: "RECARGAS" },
  { name: "GARENA FREE FIRE ID", image: "/images/free-fire-latam.jpg", category: "DIAMANTES" },
  { name: "MODERN WARSHIPS", image: "/images/modern-warships.jpg", category: "RECARGAS" },
  { name: "SAUSAGE MAN", image: "/images/sausage-man.jpg", category: "RECARGAS" },
  { name: "LORDS MOBILE", image: "/images/lords-mobile.jpg", category: "DIAMANTES" },

  // TARJETAS DE REGALO
  { name: "GARENA FREE FIRE GLOBAL", image: "/images/gift-cards/gift-garena-free-fire-global.jpg", category: "GLOBAL" },
  { name: "ROBLOX GLOBAL", image: "/images/gift-cards/gift-roblox-global.jpg", category: "GLOBAL" },
  { name: "ROBLOX RU", image: "/images/gift-cards/gift-roblox-ru.jpg", category: "RUSIA" },
  { name: "ROBLOX EE.UU", image: "/images/gift-cards/gift-roblox-eeuu.jpg", category: "EE.UU" },
  { name: "ROBLOX ID", image: "/images/gift-cards/gift-roblox-id.jpg", category: "INDONESIA" },
  { name: "ARENA BREAKOUT", image: "/images/gift-cards/gift-arena-breakout.jpg", category: "GLOBAL" },
  { name: "FORTNITE AE", image: "/images/gift-cards/gift-fortnite-ae.jpg", category: "EMIRATOS ÁRABES" },
  { name: "FORTNITE SUIZA", image: "/images/gift-cards/gift-fortnite-suiza.jpg", category: "SUIZA" },
  { name: "FORTNITE EE.UU", image: "/images/gift-cards/gift-fortnite-eeuu.jpg", category: "EE.UU" },
  { name: "FORTNITE DE", image: "/images/gift-cards/gift-fortnite-de.jpg", category: "ALEMANIA" },
  { name: "FORTNITE UE", image: "/images/gift-cards/gift-fortnite-ue.jpg", category: "EUROPA" },
  { name: "GOOGLE PLAY EE.UU", image: "/images/gift-cards/gift-google-play-eeuu.jpg", category: "EE.UU" },
  { name: "GOOGLE PLAY BRASIL", image: "/images/gift-cards/gift-google-play-brasil.jpg", category: "BRASIL" },
  { name: "GOOGLE PLAY ES", image: "/images/gift-cards/gift-google-play-es.jpg", category: "ESPAÑA" },
  { name: "GOOGLE PLAY AE", image: "/images/gift-cards/gift-google-play-ae.jpg", category: "EMIRATOS ÁRABES" },
  { name: "GOOGLE PLAY ID", image: "/images/gift-cards/gift-google-play-id.jpg", category: "INDONESIA" },
  { name: "LEAGUE OF LEGENDS EE.UU", image: "/images/gift-cards/gift-league-of-legends-eeuu.jpg", category: "EE.UU" },
  { name: "LEAGUE OF LEGENDS RU", image: "/images/gift-cards/gift-league-of-legends-ru.jpg", category: "RUSIA" },
  { name: "RAZER GOLD EE.UU", image: "/images/gift-cards/gift-razer-gold-eeuu.jpg", category: "EE.UU" },
  { name: "RAZER GOLD GLOBAL", image: "/images/gift-cards/gift-razer-gold-global.jpg", category: "GLOBAL" },
  { name: "RAZER GOLD ID", image: "/images/gift-cards/gift-razer-gold-id.jpg", category: "INDONESIA" },
  { name: "RAZER GOLD MX", image: "/images/gift-cards/gift-razer-gold-mx.jpg", category: "MÉXICO" },
];

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem("storeGamingAuth");

    if (!auth) return;

    try {
      const account = JSON.parse(auth);

      if (account?.username) {
        router.replace("/home");
      }
    } catch {
      localStorage.removeItem("storeGamingAuth");
    }
  }, [router]);

  return (
    <main className="premium-welcome">
      <div className="premium-background" />
      <div className="premium-overlay" />
      <div className="premium-grid" />
      <div className="premium-glow premium-glow-one" />
      <div className="premium-glow premium-glow-two" />

      <header className="premium-header">
        <button
          type="button"
          className="premium-brand"
          onClick={() => router.push("/")}
          aria-label="STORE GAMING inicio"
        >
          <span className="brand-icon">SG</span>
          <span className="brand-name">
            STORE <strong>GAMING</strong>
          </span>
        </button>

        <div className="header-status">
          <span className="status-dot" />
          PLATAFORMA GAMING
        </div>

        <button
          type="button"
          className="header-login"
          onClick={() => router.push("/login")}
        >
          INICIAR SESIÓN <span>↗</span>
        </button>
      </header>

      <section className="premium-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span>✦</span>
            TU UNIVERSO GAMING
            <span>✦</span>
          </div>

          <p className="hero-eyebrow">BIENVENIDO A STORE GAMING</p>

          <h1>
            LLEVA TU
            <br />
            EXPERIENCIA
            <br />
            <span>GAMING</span>
            <br />
            AL SIGUIENTE NIVEL
          </h1>

          <div className="hero-underline">
            <span />
          </div>

          <p className="hero-description">
            Descubre una nueva forma de conseguir tus
            <strong> recargas gaming </strong>
            y productos digitales favoritos.
            Todo en un solo lugar.
          </p>

          <div className="hero-buttons">
            <button
              type="button"
              className="hero-button hero-button-primary"
              onClick={() => router.push("/register")}
            >
              <span>CREAR MI CUENTA</span>
              <b>→</b>
            </button>

            <button
              type="button"
              className="hero-button hero-button-secondary"
              onClick={() => router.push("/login")}
            >
              <span>YA TENGO CUENTA</span>
              <b>↗</b>
            </button>
          </div>

          <div className="hero-categories">
            <div className="category-item">
              <span>⚡</span>
              <small>RECARGAS</small>
            </div>

            <i />

            <div className="category-item">
              <span>🎮</span>
              <small>GAMING</small>
            </div>

            <i />

            <div className="category-item">
              <span>💎</span>
              <small>DIGITAL</small>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTOS DIGITALES */}
      <section className="premium-products">
        <div className="products-heading">
          <div>
            <span className="products-eyebrow">
              <i /> NUESTRO CATÁLOGO
            </span>

            <h2>
              PRODUCTOS <span>DIGITALES</span>
            </h2>

            <p>
              Descubre algunos de los juegos y tarjetas disponibles en STORE GAMING.
            </p>
          </div>

          <div className="products-counter">
            <strong>{showcaseProducts.length}</strong>
            <span>PRODUCTOS</span>
          </div>
        </div>

        <div className="products-marquee">
          <div className="products-track">
            {[0, 1].map((group) => (
              <div
                className="products-group"
                key={group}
                aria-hidden={group === 1 ? true : undefined}
              >
                {showcaseProducts.map((product, index) => (
                  <article
                    className="product-showcase-card"
                    key={`${group}-${index}`}
                  >
                    <div className="product-showcase-image">
                      <img
                        src={product.image}
                        alt={group === 1 ? "" : product.name}
                        loading="lazy"
                      />

                      <span className="product-showcase-category">
                        {product.category}
                      </span>

                      <div className="product-image-overlay" />
                    </div>

                    <div className="product-showcase-info">
                      <span>STORE GAMING</span>
                      <strong>{product.name}</strong>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="products-bottom-line">
          <span />
          <p>RECARGAS GAMING · TARJETAS DE REGALO · PRODUCTOS DIGITALES</p>
          <span />
        </div>
      </section>

      <section className="premium-benefits">
        <div className="benefit-item">
          <span className="benefit-icon">🎯</span>
          <div>
            <strong>TODO EN UN LUGAR</strong>
            <small>Tu espacio para productos gaming.</small>
          </div>
        </div>

        <div className="benefit-divider" />

        <div className="benefit-item">
          <span className="benefit-icon">🛡️</span>
          <div>
            <strong>CUENTA PERSONAL</strong>
            <small>Gestiona tu perfil y tu balance.</small>
          </div>
        </div>

        <div className="benefit-divider" />

        <div className="benefit-item">
          <span className="benefit-icon">💬</span>
          <div>
            <strong>SOPORTE</strong>
            <small>Estamos aquí para ayudarte.</small>
          </div>
        </div>
      </section>

      <footer className="premium-footer">
        <span>© {new Date().getFullYear()} STORE GAMING</span>

        <span className="footer-center">
          <i />
          TU UNIVERSO GAMING
          <i />
        </span>

        <span>POWERED BY SG</span>
      </footer>

      <style jsx global>{styles}</style>
    </main>
  );
}

const styles = `
.premium-welcome {
  min-height: 100vh;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: #080607;
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
}

.premium-background {
  position: absolute;
  inset: 0;
  z-index: -4;
  background-image:
    linear-gradient(90deg, rgba(8,4,6,.97) 0%, rgba(8,4,6,.88) 45%, rgba(8,4,6,.58) 100%),
    linear-gradient(180deg, rgba(8,4,6,.3), #080607 100%),
    url("/images/battle-royale-bg.jpg");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transform: scale(1.02);
}

.premium-overlay {
  position: absolute;
  inset: 0;
  z-index: -3;
  background:
    radial-gradient(ellipse at 75% 40%, rgba(220,25,48,.18), transparent 42%),
    linear-gradient(180deg, transparent 65%, #080607 100%);
  pointer-events: none;
}

.premium-grid {
  position: absolute;
  inset: 0;
  z-index: -2;
  opacity: .13;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(220,35,55,.13) 1px, transparent 1px),
    linear-gradient(90deg, rgba(220,35,55,.13) 1px, transparent 1px);
  background-size: 55px 55px;
  mask-image: linear-gradient(to bottom, black, transparent 85%);
}

.premium-glow {
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(100px);
}

.premium-glow-one {
  width: 390px;
  height: 390px;
  background: rgba(210,20,45,.19);
  top: 12%;
  right: 4%;
}

.premium-glow-two {
  width: 280px;
  height: 280px;
  background: rgba(155,10,30,.12);
  bottom: 0;
  left: -100px;
}

/* HEADER */

.premium-header {
  width: 100%;
  max-width: 1250px;
  margin: auto;
  padding: 24px 35px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 5;
  border-bottom: 1px solid rgba(255,255,255,.07);
}

.premium-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
}

.brand-icon {
  width: 45px;
  height: 45px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 1000;
  letter-spacing: -1px;
  background: linear-gradient(145deg,#f02b45,#790b20);
  border: 1px solid rgba(255,80,100,.6);
  box-shadow: 0 0 25px rgba(235,30,55,.28);
}

.brand-name {
  font-size: 16px;
  font-weight: 950;
  letter-spacing: 1px;
}

.brand-name strong {
  color: #ff334d;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #b7a6aa;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 2px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff344e;
  box-shadow: 0 0 12px #ff344e;
}

.header-login {
  padding: 12px 18px;
  border: 1px solid rgba(255,60,85,.4);
  border-radius: 10px;
  background: rgba(75,10,23,.45);
  color: white;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .8px;
  cursor: pointer;
  transition: .25s ease;
}

.header-login:hover {
  background: rgba(180,20,45,.3);
  border-color: #ff344e;
  box-shadow: 0 0 20px rgba(220,25,48,.16);
}

.header-login span {
  color: #ff4058;
  margin-left: 8px;
}

/* HERO */

.premium-hero {
  width: 100%;
  max-width: 1250px;
  min-height: 590px;
  margin: auto;
  padding: 70px 35px 55px;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: 30px;
  position: relative;
  z-index: 1;
}

.hero-content {
  max-width: 590px;
  animation: heroAppear .8s ease both;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-radius: 30px;
  border: 1px solid rgba(255,55,80,.35);
  background: rgba(90,12,27,.35);
  color: #ffb0bb;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 2px;
  box-shadow: inset 0 0 15px rgba(220,25,48,.05);
}

.hero-badge span {
  color: #ff344e;
}

.hero-eyebrow {
  margin: 24px 0 0;
  color: #c7aeb2;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 3px;
}

.hero-content h1 {
  margin: 12px 0 0;
  font-size: clamp(38px, 6vw, 67px);
  line-height: .99;
  font-weight: 1000;
  letter-spacing: -2.5px;
  text-shadow: 0 5px 30px rgba(0,0,0,.6);
}

.hero-content h1 span {
  color: #ff334d;
  text-shadow: 0 0 30px rgba(255,40,65,.3);
}

.hero-underline {
  width: 140px;
  height: 4px;
  margin-top: 23px;
  background: rgba(255,55,80,.15);
  border-radius: 10px;
}

.hero-underline span {
  display: block;
  width: 68%;
  height: 100%;
  border-radius: 10px;
  background: linear-gradient(90deg,#ff334d,#a50d28);
  box-shadow: 0 0 15px rgba(255,40,65,.8);
}

.hero-description {
  max-width: 450px;
  margin: 23px 0 0;
  color: #b9adb1;
  font-size: 14px;
  line-height: 1.9;
}

.hero-description strong {
  color: #ffffff;
}

.hero-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 13px;
  margin-top: 32px;
}

.hero-button {
  min-height: 54px;
  min-width: 190px;
  padding: 0 19px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .7px;
  cursor: pointer;
  transition: .25s ease;
}

.hero-button:hover {
  transform: translateY(-4px);
}

.hero-button-primary {
  color: #fff;
  background: linear-gradient(135deg,#ff4059,#b80e2c);
  border: 1px solid #ff5268;
  box-shadow: 0 9px 30px rgba(210,20,45,.23);
}

.hero-button-primary:hover {
  box-shadow: 0 12px 35px rgba(240,35,60,.4);
  background: linear-gradient(135deg,#ff526a,#d01637);
}

.hero-button-primary b {
  font-size: 19px;
}

.hero-button-secondary {
  color: white;
  background: rgba(25,12,16,.8);
  border: 1px solid rgba(255,255,255,.17);
}

.hero-button-secondary:hover {
  border-color: #ff344e;
  background: rgba(140,15,35,.18);
}

.hero-button-secondary b {
  color: #ff4058;
  font-size: 17px;
}

/* CATEGORÍAS */

.hero-categories {
  display: flex;
  align-items: center;
  gap: 17px;
  margin-top: 42px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-item span {
  font-size: 16px;
}

.category-item small {
  color: #b9a8ad;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1px;
}

.hero-categories > i {
  height: 18px;
  width: 1px;
  background: rgba(255,255,255,.2);
}

/* PRODUCTOS DIGITALES */

.premium-products {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1250px;
  margin: 15px auto 0;
  padding: 35px 0 30px;
  overflow: hidden;
  border-top: 1px solid rgba(255,255,255,.07);
  border-bottom: 1px solid rgba(255,255,255,.07);
  background:
    radial-gradient(ellipse at 50% 0%, rgba(210,20,45,.12), transparent 65%),
    rgba(10,5,8,.72);
}

.products-heading {
  padding: 0 35px;
  margin-bottom: 25px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 15px;
}

.products-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ff687b;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 2px;
}

.products-eyebrow i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff334d;
  box-shadow: 0 0 12px #ff334d;
}

.products-heading h2 {
  margin: 10px 0 0;
  color: white;
  font-size: clamp(23px, 4vw, 34px);
  font-weight: 1000;
  letter-spacing: -1px;
}

.products-heading h2 span {
  color: #ff334d;
}

.products-heading p {
  margin: 8px 0 0;
  color: #a99ba0;
  font-size: 12px;
  line-height: 1.6;
}

.products-counter {
  flex-shrink: 0;
  min-width: 76px;
  padding: 10px 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  border: 1px solid rgba(255,55,80,.3);
  border-radius: 12px;
  background: rgba(100,10,28,.2);
}

.products-counter strong {
  color: #ff5269;
  font-size: 22px;
  font-weight: 1000;
}

.products-counter span {
  color: #b9a6ac;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1px;
}

.products-marquee {
  width: 100%;
  overflow: hidden;
  position: relative;
  padding: 5px 0 13px;
  mask-image: linear-gradient(
    90deg,
    transparent,
    black 4%,
    black 96%,
    transparent
  );
}

.products-track {
  display: flex;
  width: max-content;
  animation: productsScroll 115s linear infinite;
  will-change: transform;
}

.products-group {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  padding-right: 16px;
}

.product-showcase-card {
  width: 178px;
  flex: 0 0 178px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 14px;
  background: linear-gradient(145deg,#1b1419,#0e0b0e);
  box-shadow: 0 7px 22px rgba(0,0,0,.32);
  user-select: none;
}

.product-showcase-image {
  height: 125px;
  width: 100%;
  position: relative;
  overflow: hidden;
  background: #191116;
}

.product-showcase-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  user-select: none;
  -webkit-user-drag: none;
}

.product-image-overlay {
  position: absolute;
  inset: 35% 0 0;
  background: linear-gradient(to bottom,transparent,rgba(0,0,0,.48));
  pointer-events: none;
}

.product-showcase-category {
  position: absolute;
  z-index: 1;
  top: 9px;
  left: 9px;
  max-width: calc(100% - 18px);
  padding: 5px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 6px;
  background: rgba(10,7,9,.86);
  color: #ff9aa7;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: .6px;
  backdrop-filter: blur(8px);
}

.product-showcase-info {
  min-height: 66px;
  padding: 10px 11px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
}

.product-showcase-info > span {
  color: #ff5269;
  font-size: 7px;
  font-weight: 950;
  letter-spacing: 1.3px;
}

.product-showcase-info strong {
  color: #f5eef0;
  font-size: 10px;
  line-height: 1.35;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.products-bottom-line {
  margin: 20px 35px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
}

.products-bottom-line span {
  height: 1px;
  max-width: 75px;
  flex: 1;
  background: linear-gradient(90deg,transparent,#a91b34);
}

.products-bottom-line span:last-child {
  background: linear-gradient(90deg,#a91b34,transparent);
}

.products-bottom-line p {
  margin: 0;
  color: #8f7c83;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1.3px;
  text-align: center;
}

@keyframes productsScroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

/* VENTAJAS */

.premium-benefits {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 35px;
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: center;
  gap: 25px;
  border-top: 1px solid rgba(255,255,255,.08);
  border-bottom: 1px solid rgba(255,255,255,.08);
  background: rgba(13,6,9,.72);
  position: relative;
  z-index: 2;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 13px;
}

.benefit-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 12px;
  background: rgba(190,20,45,.14);
  border: 1px solid rgba(255,65,90,.23);
  box-shadow: inset 0 0 15px rgba(220,25,48,.06);
  font-size: 19px;
}

.benefit-item strong,
.benefit-item small {
  display: block;
}

.benefit-item strong {
  font-size: 10px;
  letter-spacing: .7px;
}

.benefit-item small {
  color: #a8979d;
  font-size: 9px;
  margin-top: 6px;
}

.benefit-divider {
  height: 35px;
  width: 1px;
  background: rgba(255,255,255,.1);
}

/* FOOTER */

.premium-footer {
  max-width: 1180px;
  margin: auto;
  padding: 22px 35px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #817078;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1.3px;
  position: relative;
  z-index: 2;
}

.footer-center {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #b39ca2;
}

.footer-center i {
  width: 16px;
  height: 1px;
  background: #ff344e;
}

/* ANIMACIONES */

@keyframes heroAppear {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* TABLETS */

@media (max-width: 900px) {
  .premium-hero {
    grid-template-columns: 1fr;
    padding-top: 55px;
    gap: 10px;
  }

  .hero-content h1 {
    font-size: clamp(37px, 6vw, 53px);
  }

  .premium-benefits {
    gap: 13px;
  }

  .product-showcase-card {
    width: 165px;
    flex-basis: 165px;
  }
}

/* MÓVILES */

@media (max-width: 650px) {
  .premium-header {
    padding: 17px 16px;
  }

  .brand-icon {
    width: 39px;
    height: 39px;
  }

  .brand-name {
    font-size: 13px;
  }

  .header-status {
    display: none;
  }

  .header-login {
    padding: 11px 12px;
    font-size: 9px;
  }

  .premium-hero {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 55px 22px 35px;
    gap: 20px;
  }

  .hero-content {
    width: 100%;
  }

  .hero-content h1 {
    font-size: clamp(38px, 10vw, 54px);
    letter-spacing: -1.8px;
    margin-top: 12px;
  }

  .hero-description {
    font-size: 13px;
    line-height: 1.8;
  }

  .hero-buttons {
    display: grid;
    grid-template-columns: 1fr;
    gap: 11px;
  }

  .hero-button {
    width: 100%;
    min-height: 53px;
  }

  .hero-categories {
    justify-content: space-between;
    gap: 8px;
    margin-top: 30px;
  }

  .category-item {
    gap: 5px;
  }

  .category-item small {
    font-size: 8px;
  }

  .premium-products {
    margin-top: 5px;
    padding: 28px 0 23px;
  }

  .products-heading {
    padding: 0 18px;
    margin-bottom: 20px;
  }

  .products-heading h2 {
    font-size: 24px;
  }

  .products-heading p {
    max-width: 270px;
    font-size: 11px;
  }

  .products-counter {
    min-width: 62px;
    padding: 8px 9px;
  }

  .products-counter strong {
    font-size: 19px;
  }

  .products-counter span {
    font-size: 7px;
  }

  .products-group {
    gap: 12px;
    padding-right: 12px;
  }

  .product-showcase-card {
    width: 145px;
    flex-basis: 145px;
    border-radius: 12px;
  }

  .product-showcase-image {
    height: 108px;
  }

  .product-showcase-info {
    min-height: 61px;
    padding: 9px;
  }

  .product-showcase-info strong {
    font-size: 9px;
  }

  .products-bottom-line {
    margin: 17px 18px 0;
    gap: 8px;
  }

  .products-bottom-line p {
    font-size: 7px;
    letter-spacing: .7px;
  }

  .premium-benefits {
    grid-template-columns: 1fr;
    gap: 17px;
    padding: 23px 22px;
  }

  .benefit-divider {
    width: 100%;
    height: 1px;
  }

  .premium-footer {
    padding: 20px 16px;
    gap: 12px;
    font-size: 7px;
  }

  .footer-center {
    display: none;
  }
}

@media (max-width: 360px) {
  .premium-header {
    padding-left: 12px;
    padding-right: 12px;
  }

  .brand-name {
    font-size: 11px;
  }

  .header-login {
    font-size: 8px;
  }

  .premium-hero {
    padding-left: 16px;
    padding-right: 16px;
  }

  .hero-content h1 {
    font-size: 36px;
  }

  .products-heading {
    padding-left: 13px;
    padding-right: 13px;
  }

  .products-heading h2 {
    font-size: 21px;
  }

  .product-showcase-card {
    width: 132px;
    flex-basis: 132px;
  }
}

/* MOVIMIENTO REDUCIDO */

@media (prefers-reduced-motion: reduce) {
  .hero-content,
  .products-track {
    animation: none;
  }

  .hero-button {
    transition: none;
  }
}
`;
