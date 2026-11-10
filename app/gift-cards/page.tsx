
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCard = {
  name: string;
  route: string;
  image: string;
  region: string;
};

const giftCards: GiftCard[] = [
  { name: "GARENA FREE FIRE (GLOBAL)", route: "/gift-cards/garena-free-fire-global", image: "/images/gift-cards/gift-garena-free-fire-global.jpg", region: "GLOBAL" },
  { name: "ROBLOX (GLOBAL)", route: "/gift-cards/roblox-global", image: "/images/gift-cards/gift-roblox-global.jpg", region: "GLOBAL" },
  { name: "ROBLOX (RU)", route: "/gift-cards/roblox-ru", image: "/images/gift-cards/gift-roblox-ru.jpg", region: "RUSIA" },
  { name: "ROBLOX (EE.UU)", route: "/gift-cards/roblox-eeuu", image: "/images/gift-cards/gift-roblox-eeuu.jpg", region: "EE.UU" },
  { name: "ROBLOX (ID)", route: "/gift-cards/roblox-id", image: "/images/gift-cards/gift-roblox-id.jpg", region: "INDONESIA" },
  { name: "ARENA BREAKOUT", route: "/gift-cards/arena-breakout", image: "/images/gift-cards/gift-arena-breakout.jpg", region: "GLOBAL" },
  { name: "FORTNITE (AE)", route: "/gift-cards/fortnite-ae", image: "/images/gift-cards/gift-fortnite-ae.jpg", region: "EMIRATOS ÁRABES" },
  { name: "FORTNITE (SUIZA)", route: "/gift-cards/fortnite-suiza", image: "/images/gift-cards/gift-fortnite-suiza.jpg", region: "SUIZA" },
  { name: "FORTNITE (EE.UU)", route: "/gift-cards/fortnite-eeuu", image: "/images/gift-cards/gift-fortnite-eeuu.jpg", region: "EE.UU" },
  { name: "FORTNITE (DE)", route: "/gift-cards/fortnite-de", image: "/images/gift-cards/gift-fortnite-de.jpg", region: "ALEMANIA" },
  { name: "FORTNITE (UE)", route: "/gift-cards/fortnite-ue", image: "/images/gift-cards/gift-fortnite-ue.jpg", region: "EUROPA" },
  { name: "GOOGLE PLAY (EE.UU)", route: "/gift-cards/google-play-eeuu", image: "/images/gift-cards/gift-google-play-eeuu.jpg", region: "EE.UU" },
  { name: "GOOGLE PLAY (BRASIL)", route: "/gift-cards/google-play-brasil", image: "/images/gift-cards/gift-google-play-brasil.jpg", region: "BRASIL" },
  { name: "GOOGLE PLAY (ES)", route: "/gift-cards/google-play-es", image: "/images/gift-cards/gift-google-play-es.jpg", region: "ESPAÑA" },
  { name: "GOOGLE PLAY (AE)", route: "/gift-cards/google-play-ae", image: "/images/gift-cards/gift-google-play-ae.jpg", region: "EMIRATOS ÁRABES" },
  { name: "GOOGLE PLAY (ID)", route: "/gift-cards/google-play-id", image: "/images/gift-cards/gift-google-play-id.jpg", region: "INDONESIA" },
  { name: "LEAGUE OF LEGENDS (EE.UU)", route: "/gift-cards/league-of-legends-eeuu", image: "/images/gift-cards/gift-league-of-legends-eeuu.jpg", region: "EE.UU" },
  { name: "LEAGUE OF LEGENDS (RU)", route: "/gift-cards/league-of-legends-ru", image: "/images/gift-cards/gift-league-of-legends-ru.jpg", region: "RUSIA" },
  { name: "RAZER GOLD (EE.UU)", route: "/gift-cards/razer-gold-eeuu", image: "/images/gift-cards/gift-razer-gold-eeuu.jpg", region: "EE.UU" },
  { name: "RAZER GOLD (GLOBAL)", route: "/gift-cards/razer-gold-global", image: "/images/gift-cards/gift-razer-gold-global.jpg", region: "GLOBAL" },
  { name: "RAZER GOLD (ID)", route: "/gift-cards/razer-gold-id", image: "/images/gift-cards/gift-razer-gold-id.jpg", region: "INDONESIA" },
  { name: "RAZER GOLD (MX)", route: "/gift-cards/razer-gold-mx", image: "/images/gift-cards/gift-razer-gold-mx.jpg", region: "MÉXICO" },

  // NUEVAS TARJETAS NETFLIX
  { name: "NETFLIX (MX)", route: "/gift-cards/netflix-mx", image: "/images/gift-cards/gift-netflix-mx.jpg", region: "MÉXICO" },
  { name: "NETFLIX (EE.UU)", route: "/gift-cards/netflix-eeuu", image: "/images/gift-cards/gift-netflix-eeuu.jpg", region: "EE.UU" },
];

const styles = `
.gift-cards-page {
--gc-red: #ff2638;
--gc-red-bright: #ff4351;
--gc-bg: #090a0e;
--gc-panel: #111319;
--gc-border: rgba(255,255,255,.09);
min-height: 100vh;
width: 100%;
overflow: hidden;
color: #f8f8fa;
background:
radial-gradient(ellipse at 50% 0%, rgba(255,38,56,.13), transparent 42%),
#090a0e;
font-family: Arial, Helvetica, sans-serif;
padding-bottom: 30px;
box-sizing: border-box;
}

.gift-cards-page *,
.gift-cards-page *::before,
.gift-cards-page *::after {
box-sizing: border-box;
}

.gift-cards-page button,
.gift-cards-page input {
font: inherit;
}

.gift-cards-header {
min-height: 68px;
width: 100%;
padding: 12px 16px;
display: grid;
grid-template-columns: 44px minmax(0,1fr) 44px;
align-items: center;
gap: 10px;
background: rgba(12,13,18,.96);
border-bottom: 1px solid rgba(255,38,56,.3);
box-shadow: 0 5px 24px rgba(0,0,0,.25);
}

.gift-cards-back-button,
.gift-cards-cart-button {
width: 42px;
height: 42px;
border: 1px solid rgba(255,255,255,.12);
border-radius: 12px;
background: #191b22;
color: white;
display: flex;
align-items: center;
justify-content: center;
font-size: 23px;
cursor: pointer;
transition: background .2s, border-color .2s, transform .2s;
}

.gift-cards-back-button:hover,
.gift-cards-cart-button:hover {
background: #29212a;
border-color: var(--gc-red);
transform: translateY(-1px);
}

.gift-cards-header-title {
display: flex;
align-items: center;
justify-content: center;
gap: 9px;
min-width: 0;
font-size: clamp(12px, 3.4vw, 17px);
letter-spacing: .7px;
text-align: center;
}

.gift-cards-header-title > span {
font-size: 23px;
}

.gift-cards-header-title strong {
overflow-wrap: anywhere;
}

.gift-cards-title-section {
max-width: 1000px;
margin: 0 auto;
padding: 34px 18px 25px;
text-align: center;
}

.gift-cards-title-decoration {
display: inline-flex;
width: 38px;
height: 38px;
align-items: center;
justify-content: center;
color: white;
background: linear-gradient(135deg, #ff2638, #a90d25);
border-radius: 12px;
box-shadow: 0 0 26px rgba(255,38,56,.25);
font-size: 22px;
margin-bottom: 14px;
}

.gift-cards-title-section h1 {
margin: 0;
font-size: clamp(25px, 5.5vw, 42px);
font-weight: 900;
line-height: 1.13;
letter-spacing: 1px;
color: #fff;
}

.gift-cards-title-section h1 span {
color: var(--gc-red);
text-shadow: 0 0 22px rgba(255,38,56,.2);
}

.gift-cards-title-section p {
max-width: 540px;
margin: 13px auto 0;
color: #a8abb7;
font-size: 14px;
line-height: 1.65;
}

.gift-cards-catalog {
width: 100%;
max-width: 1180px;
margin: 0 auto;
padding: 0 8px;
}

.gift-cards-catalog-heading {
display: flex;
align-items: center;
justify-content: space-between;
gap: 10px;
margin: 0 2px 14px;
color: #e7e8ed;
font-size: 12px;
font-weight: 800;
letter-spacing: .8px;
}

.gift-cards-catalog-heading strong {
min-width: 32px;
height: 28px;
display: inline-flex;
align-items: center;
justify-content: center;
border: 1px solid rgba(255,38,56,.4);
border-radius: 9px;
background: rgba(255,38,56,.12);
color: #ff6672;
font-size: 13px;
}

.gift-cards-search-wrapper {
position: relative;
width: 100%;
margin-bottom: 19px;
}

.gift-cards-search-icon {
position: absolute;
left: 15px;
top: 50%;
transform: translateY(-50%);
font-size: 17px;
pointer-events: none;
filter: grayscale(.2);
}

.gift-cards-search-input {
width: 100%;
height: 49px;
border: 1px solid #2b2d37;
border-radius: 13px;
outline: none;
background: #14161d;
color: #fff;
padding: 0 45px;
font-size: 14px;
transition: border-color .2s, box-shadow .2s;
}

.gift-cards-search-input::placeholder {
color: #777b89;
}

.gift-cards-search-input:focus {
border-color: var(--gc-red);
box-shadow: 0 0 0 3px rgba(255,38,56,.12);
}

.gift-cards-search-clear {
position: absolute;
top: 50%;
right: 10px;
transform: translateY(-50%);
width: 30px;
height: 30px;
border: 0;
border-radius: 9px;
color: white;
background: #30313b;
font-size: 21px;
cursor: pointer;
}

.gift-cards-grid {
display: grid;
grid-template-columns: repeat(2, minmax(0, 1fr));
gap: 12px;
width: 100%;
align-items: stretch;
}

.gift-card-item {
display: flex;
flex-direction: column;
width: 100%;
min-width: 0;
padding: 0;
overflow: hidden;
text-align: left;
color: #fff;
border: 1px solid rgba(255,255,255,.1);
border-radius: 15px;
background: linear-gradient(155deg, #181a22 0%, #101116 75%);
box-shadow: 0 5px 16px rgba(0,0,0,.24);
cursor: pointer;
appearance: none;
-webkit-appearance: none;
transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}

.gift-card-item:hover {
transform: translateY(-3px);
border-color: rgba(255,38,56,.8);
box-shadow: 0 9px 24px rgba(0,0,0,.35), 0 0 16px rgba(255,38,56,.1);
}

.gift-card-item:focus-visible {
outline: 2px solid var(--gc-red);
outline-offset: 3px;
}

.gift-card-image-container {
position: relative;
width: 100%;
height: clamp(150px, 39vw, 230px);
flex-shrink: 0;
overflow: hidden;
background: #1b1c24;
}

.gift-card-image-container::after {
content: "";
position: absolute;
inset: 45% 0 0;
pointer-events: none;
background: linear-gradient(to bottom, transparent, rgba(0,0,0,.48));
}

.gift-card-image {
display: block;
width: 100%;
height: 100%;
object-fit: cover;
object-position: center;
transition: transform .35s ease;
}

.gift-card-item:hover .gift-card-image {
transform: scale(1.045);
}

.gift-card-region {
position: absolute;
z-index: 1;
left: 8px;
top: 8px;
max-width: calc(100% - 16px);
padding: 6px 8px;
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
border: 1px solid rgba(255,255,255,.2);
border-radius: 7px;
color: #fff;
background: rgba(10,11,15,.88);
backdrop-filter: blur(8px);
font-size: 9px;
line-height: 1.2;
font-weight: 900;
letter-spacing: .5px;
}

.gift-card-info {
display: flex;
flex: 1;
flex-direction: column;
align-items: stretch;
justify-content: space-between;
gap: 10px;
min-height: 96px;
padding: 12px 10px 11px;
}

.gift-card-info h2 {
margin: 0;
color: #f5f5f8;
font-size: clamp(10px, 2.8vw, 13px);
line-height: 1.4;
font-weight: 800;
letter-spacing: .15px;
overflow-wrap: anywhere;
}

.gift-card-open {
display: flex;
align-items: center;
justify-content: space-between;
gap: 5px;
padding-top: 9px;
border-top: 1px solid rgba(255,255,255,.08);
color: #ff5261;
font-size: 9px;
font-weight: 900;
letter-spacing: .6px;
}

.gift-card-open span:last-child {
font-size: 16px;
line-height: 1;
transition: transform .2s;
}

.gift-card-item:hover .gift-card-open span:last-child {
transform: translateX(3px);
}

.gift-cards-search-empty {
display: flex;
flex-direction: column;
align-items: center;
text-align: center;
padding: 40px 18px;
border: 1px dashed #343641;
border-radius: 16px;
background: #111319;
}

.gift-cards-search-empty > span {
font-size: 32px;
margin-bottom: 13px;
}

.gift-cards-search-empty strong {
font-size: 14px;
}

.gift-cards-search-empty p {
color: #a4a6b1;
font-size: 13px;
line-height: 1.5;
}

.gift-cards-search-empty button {
min-height: 42px;
padding: 0 15px;
border: 0;
border-radius: 10px;
background: var(--gc-red);
color: #fff;
font-size: 11px;
font-weight: 900;
cursor: pointer;
}

.gift-cards-info {
display: grid;
grid-template-columns: 1fr;
gap: 10px;
max-width: 1180px;
margin: 30px auto 0;
padding: 0 8px;
}

.gift-cards-info-item {
display: flex;
align-items: flex-start;
gap: 13px;
padding: 16px;
border: 1px solid var(--gc-border);
border-radius: 14px;
background: linear-gradient(135deg, #15171e, #101116);
}

.gift-cards-info-item > span {
display: flex;
flex-shrink: 0;
width: 40px;
height: 40px;
align-items: center;
justify-content: center;
border-radius: 11px;
background: rgba(255,38,56,.12);
font-size: 20px;
}

.gift-cards-info-item strong {
color: #f5f5f8;
font-size: 11px;
letter-spacing: .5px;
}

.gift-cards-info-item p {
margin: 6px 0 0;
color: #a6a8b3;
font-size: 12px;
line-height: 1.55;
}

.gift-cards-footer {
display: flex;
flex-direction: column;
align-items: center;
gap: 7px;
padding: 28px 15px 0;
color: #777a87;
font-size: 10px;
letter-spacing: 1px;
}

.gift-cards-footer strong {
color: #f4f4f6;
font-size: 14px;
letter-spacing: 2px;
}

.gift-cards-footer span {
color: #ff5261;
font-weight: 800;
}

@media (min-width: 600px) {
.gift-cards-header {
padding-left: 24px;
padding-right: 24px;
}

.gift-cards-catalog,
.gift-cards-info {
  padding-left: 16px;
  padding-right: 16px;
}

.gift-cards-grid {
  gap: 16px;
}

.gift-card-image-container {
  height: clamp(190px, 27vw, 260px);
}

.gift-card-info {
  min-height: 104px;
  padding: 14px;
}

.gift-cards-info {
  grid-template-columns: repeat(3, minmax(0,1fr));
}
}

@media (min-width: 900px) {
.gift-cards-title-section {
padding-top: 45px;
padding-bottom: 34px;
}

.gift-cards-catalog,
.gift-cards-info {
  padding-left: 24px;
  padding-right: 24px;
}

.gift-cards-grid {
  gap: 18px;
}

.gift-card-image-container {
  height: 230px;
}

.gift-card-info h2 {
  font-size: 13px;
}
}

@media (max-width: 380px) {
.gift-cards-header {
padding-left: 9px;
padding-right: 9px;
gap: 6px;
}

.gift-cards-header-title {
  gap: 5px;
  letter-spacing: 0;
}

.gift-cards-catalog {
  padding-left: 5px;
  padding-right: 5px;
}

.gift-cards-grid {
  gap: 8px;
}

.gift-card-image-container {
  height: 142px;
}

.gift-card-info {
  min-height: 88px;
  padding: 9px 7px;
}

.gift-card-region {
  left: 5px;
  top: 5px;
  padding: 5px 6px;
  font-size: 8px;
}

.gift-card-open {
  font-size: 8px;
}
}

@media (prefers-reduced-motion: reduce) {
.gift-cards-page *,
.gift-cards-page *::before,
.gift-cards-page *::after {
scroll-behavior: auto !important;
transition-duration: .01ms !important;
animation-duration: .01ms !important;
}
}
`;

export default function GiftCardsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const searchText = search.toLowerCase().trim();

  const filteredGiftCards = giftCards.filter((card) => {
    if (!searchText) return true;

    return (
      card.name.toLowerCase().includes(searchText) ||
      card.region.toLowerCase().includes(searchText)
    );
  });

  return (
    <main className="gift-cards-page">
      <style>{styles}</style>

      <header className="gift-cards-header">
        <button
          type="button"
          className="gift-cards-back-button"
          onClick={() => router.push("/home")}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="gift-cards-header-title">
          <span>🎁</span>
          <strong>TARJETAS DE REGALO</strong>
        </div>

        <button
          type="button"
          className="gift-cards-cart-button"
          onClick={() => router.push("/orders")}
          aria-label="Pedidos"
        >
          🛒
        </button>
      </header>

      <section className="gift-cards-title-section">
        <span className="gift-cards-title-decoration">✦</span>

        <h1>
          TARJETAS DE REGALO
          <br />
          <span>Y CÓDIGOS</span>
        </h1>

        <p>
          Compra tarjetas y códigos digitales para tus
          juegos y plataformas favoritas.
        </p>
      </section>

      <section className="gift-cards-catalog">
        <div className="gift-cards-catalog-heading">
          <span>PRODUCTOS DISPONIBLES</span>
          <strong>{filteredGiftCards.length}</strong>
        </div>

        <div className="gift-cards-search-wrapper">
          <span className="gift-cards-search-icon" aria-hidden="true">
            🔍
          </span>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar tarjeta o región..."
            className="gift-cards-search-input"
            aria-label="Buscar tarjeta o región"
            autoComplete="off"
          />

          {search && (
            <button
              type="button"
              className="gift-cards-search-clear"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        {filteredGiftCards.length > 0 ? (
          <div className="gift-cards-grid">
            {filteredGiftCards.map((card) => (
              <button
                key={card.route}
                type="button"
                className="gift-card-item"
                onClick={() => router.push(card.route)}
              >
                <div className="gift-card-image-container">
                  <img
                    src={card.image}
                    alt={card.name}
                    className="gift-card-image"
                    loading="lazy"
                  />

                  <div className="gift-card-region">{card.region}</div>
                </div>

                <div className="gift-card-info">
                  <h2>{card.name}</h2>

                  <div className="gift-card-open">
                    <span>VER OPCIONES</span>
                    <span>→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="gift-cards-search-empty">
            <span>🔍</span>
            <strong>NO ENCONTRAMOS RESULTADOS</strong>
            <p>Prueba con otro nombre de tarjeta o región.</p>

            <button type="button" onClick={() => setSearch("")}>
              VER TODAS LAS TARJETAS
            </button>
          </div>
        )}
      </section>

      <section className="gift-cards-info">
        <div className="gift-cards-info-item">
          <span>🎁</span>
          <div>
            <strong>CÓDIGOS DIGITALES</strong>
            <p>Recibe tu código después de completar tu pedido.</p>
          </div>
        </div>

        <div className="gift-cards-info-item">
          <span>🔒</span>
          <div>
            <strong>COMPRA SEGURA</strong>
            <p>Revisa siempre la región antes de comprar.</p>
          </div>
        </div>

        <div className="gift-cards-info-item">
          <span>🌎</span>
          <div>
            <strong>REGIONES</strong>
            <p>Cada tarjeta está limitada a la región indicada.</p>
          </div>
        </div>
      </section>

      <footer className="gift-cards-footer">
        <strong>STORE GAMING</strong>
        <span>🎁 TARJETAS DE REGALO</span>
      </footer>
    </main>
  );
}
