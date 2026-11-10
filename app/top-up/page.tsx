
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Game = {
  name: string;
  description: string;
  image: string;
  route: string;
  tag: string;
};

const games: Game[] = [
  {
    name: "FREE FIRE LATAM",
    description: "Diamantes para tu cuenta.",
    image: "/images/free-fire-latam.jpg",
    route: "/games/free-fire-latam",
    tag: "DIAMANTES",
  },
  {
    name: "GENSHIN IMPACT (GLOBAL)",
    description: "Cristales génesis para tu cuenta.",
    image: "/images/genshin-impact-global.jpg",
    route: "/games/genshin-impact-global",
    tag: "RECARGAS",
  },
  {
    name: "MOBILE LEGENDS (EE.UU)",
    description: "Diamantes para Mobile Legends.",
    image: "/images/mobile-legends.jpg",
    route: "/games/mobile-legends",
    tag: "DIAMANTES",
  },
  {
    name: "LEGENDS MOBILE (GLOBAL)",
    description: "Diamantes para Mobile Legends.",
    image: "/images/mobile-legends.jpg",
    route: "/games/mobile-legends-global",
    tag: "DIAMANTES",
  },
  {
    name: "BLOOD STRIKE",
    description: "Recargas para tu cuenta.",
    image: "/images/blood-strike.jpg",
    route: "/games/blood-strike",
    tag: "RECARGAS",
  },
  {
    name: "ARENA BREAKOUT",
    description: "Recargas para tu cuenta.",
    image: "/images/arena-breakout.jpg",
    route: "/games/arena-breakout",
    tag: "RECARGAS",
  },
  {
    name: "DELTA FORCE",
    description: "Recargas para tu cuenta.",
    image: "/images/delta-force.jpg",
    route: "/games/delta-force",
    tag: "RECARGAS",
  },
  {
    name: "FC MOBILE (ID)",
    description: "Recargas para FC Mobile.",
    image: "/images/fc-mobile.jpg",
    route: "/games/fc-mobile-id",
    tag: "RECARGAS",
  },
  {
    name: "HONOR OF KINGS",
    description: "Recargas para tu cuenta.",
    image: "/images/honor-of-kings.jpg",
    route: "/games/honor-of-kings",
    tag: "DIAMANTES",
  },
  {
    name: "LEAGUE OF LEGENDS (ID)",
    description: "Recargas para League of Legends.",
    image: "/images/league-of-legends.jpg",
    route: "/games/league-of-legends-id",
    tag: "RECARGAS",
  },
  {
    name: "GARENA FREE FIRE (ID)",
    description: "Diamantes para tu cuenta.",
    image: "/images/free-fire-latam.jpg",
    route: "/games/free-fire-id",
    tag: "DIAMANTES",
  },
  {
    name: "MODERN WARSHIPS NAVAL BATTLES",
    description: "Recargas para tu cuenta.",
    image: "/images/modern-warships.jpg",
    route: "/games/modern-warships",
    tag: "RECARGAS",
  },
  {
    name: "SAUSAGE MAN",
    description: "Recargas para tu cuenta.",
    image: "/images/sausage-man.jpg",
    route: "/games/sausage-man",
    tag: "RECARGAS",
  },
  {
    name: "LORDS MOBILE",
    description: "Diamantes y pases para Lords Mobile.",
    image: "/images/lords-mobile.jpg",
    route: "/games/lords-mobile",
    tag: "DIAMANTES",
  },
];

export default function TopUpPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredGames = games.filter((game) => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) {
      return true;
    }

    return (
      game.name.toLowerCase().includes(searchText) ||
      game.description.toLowerCase().includes(searchText) ||
      game.tag.toLowerCase().includes(searchText)
    );
  });

  return (
    <main className="top-up-page">
      <header className="top-up-header">
        <button
          type="button"
          className="top-up-back-button"
          onClick={() => router.push("/home")}
          aria-label="Volver al inicio"
        >
          ←
        </button>

        <div className="top-up-header-title">
          <span>STORE GAMING</span>
          <h1>RECARGAS TOP UP</h1>
        </div>
      </header>

      <section className="top-up-games-section">
        <div className="top-up-catalog-header">
          <div>
            <span>GAMING SERVICES</span>
            <h2>ELIGE TU JUEGO</h2>
          </div>

          <div className="top-up-catalog-decoration">
            <i />
            <i />
            <i />
          </div>
        </div>

        <div className="top-up-search-wrapper">
          <span
            className="top-up-search-icon"
            aria-hidden="true"
          >
            🔍
          </span>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Buscar juego u oferta..."
            className="top-up-search-input"
            aria-label="Buscar juego u oferta"
            autoComplete="off"
          />

          {search && (
            <button
              type="button"
              className="top-up-search-clear"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        {filteredGames.length > 0 ? (
          <div className="top-up-games-grid">
            {filteredGames.map((game) => (
              <button
                key={game.name}
                type="button"
                className="top-up-game-card"
                onClick={() => router.push(game.route)}
              >
                <div className="top-up-game-image-container">
                  {game.image ? (
                    <img
                      src={game.image}
                      alt={game.name}
                      className="top-up-game-image"
                    />
                  ) : (
                    <div className="top-up-game-image-placeholder">
                      🎮
                    </div>
                  )}

                  <div className="top-up-game-image-dark" />

                  <div className="top-up-game-tag">
                    {game.tag}
                  </div>

                  <div className="top-up-game-open">
                    VER OFERTAS →
                  </div>
                </div>

                <div className="top-up-game-info">
                  <h3>{game.name}</h3>

                  <p>{game.description}</p>

                  <div className="top-up-game-bottom">
                    <span>TOP UP</span>
                    <strong>→</strong>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="top-up-search-empty">
            <span>🔍</span>

            <strong>NO ENCONTRAMOS RESULTADOS</strong>

            <p>Prueba con otro nombre de juego.</p>

            <button
              type="button"
              onClick={() => setSearch("")}
            >
              VER TODOS LOS JUEGOS
            </button>
          </div>
        )}
      </section>

      <footer className="top-up-footer">
        <strong>STORE GAMING</strong>
        <span>RECARGAS GAMING RÁPIDAS Y SEGURAS</span>
      </footer>
    </main>
  );
}
