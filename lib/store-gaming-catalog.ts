
// ============================================================
// STORE GAMING - CATÁLOGO COMERCIAL CENTRAL
// TOP UP + GIFT CARDS
// ============================================================

// Moneda oficial del catálogo
export const CATALOG_CURRENCY = "USD";

// ============================================================
// TIPOS
// ============================================================

export type CatalogField = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
};

export type CatalogOffer = {
  id: string;
  name: string;
  displayName?: string;
  price: number;
  currency: string;
  published: boolean;
};

export type TopUpProduct = {
  id: string;
  name: string;
  categoryId: string;
  type: "topup";
  image?: string;
  note?: string;
  fields: CatalogField[];
  offers: CatalogOffer[];
};

export type GiftCardProduct = {
  id: string;
  name: string;
  categoryId: string;
  type: "gift_card";
  region: string;
  image?: string;
  note?: string;
  offers: CatalogOffer[];
};

// ============================================================
// CATÁLOGO TOP UP
// Aquí incorporaremos los juegos y sus ofertas comerciales.
// ============================================================

export const TOPUP_CATALOG: TopUpProduct[] = [];

// ============================================================
// CATÁLOGO GIFT CARDS
// Las 24 categorías de la tienda.
// ============================================================

export const GIFT_CARD_CATALOG: GiftCardProduct[] = [
  {
    id: "garena-free-fire-global",
    name: "Garena Free Fire",
    categoryId: "garena_free_fire_global",
    type: "gift_card",
    region: "GLOBAL",
    image: "/images/gift-cards/gift-garena-free-fire-global.jpg",
    offers: [
      { id: "ff-global-1", name: "110 Diamantes", price: 1.00, currency: "USD", published: true },
      { id: "ff-global-2", name: "231 Diamantes", price: 2.00, currency: "USD", published: true },
      { id: "ff-global-5", name: "583 Diamantes", price: 5.00, currency: "USD", published: true },
      { id: "ff-global-10", name: "1188 Diamantes", price: 10.00, currency: "USD", published: true },
      { id: "ff-global-20", name: "2420 Diamantes", price: 20.00, currency: "USD", published: true }
    ]
  },
  {
    id: "roblox-global",
    name: "Roblox",
    categoryId: "roblox_global",
    type: "gift_card",
    region: "GLOBAL",
    image: "/images/gift-cards/gift-roblox-global.jpg",
    offers: []
  },
  {
    id: "roblox-ru",
    name: "Roblox",
    categoryId: "roblox_ru",
    type: "gift_card",
    region: "RUSIA",
    image: "/images/gift-cards/gift-roblox-ru.jpg",
    offers: []
  },
  {
    id: "roblox-eeuu",
    name: "Roblox",
    categoryId: "roblox_eeuu",
    type: "gift_card",
    region: "EE.UU",
    image: "/images/gift-cards/gift-roblox-eeuu.jpg",
    offers: [
      { id: "1", name: "3 USD", price: 3.18, currency: "USD", published: true },
      { id: "2", name: "4 USD", price: 4.19, currency: "USD", published: true },
      { id: "3", name: "5 USD", price: 5.19, currency: "USD", published: true },
      { id: "4", name: "10 USD", price: 10.29, currency: "USD", published: true },
      { id: "5", name: "15 USD", price: 15.39, currency: "USD", published: true },
      { id: "6", name: "20 USD", price: 20.49, currency: "USD", published: true },
      { id: "7", name: "25 USD", price: 25.59, currency: "USD", published: true },
      { id: "8", name: "30 USD", price: 30.69, currency: "USD", published: true },
      { id: "9", name: "50 USD", price: 50.99, currency: "USD", published: true },
      { id: "10", name: "75 USD", price: 76.49, currency: "USD", published: true },
      { id: "11", name: "100 USD", price: 101.99, currency: "USD", published: true },
      { id: "12", name: "200 USD", price: 203.99, currency: "USD", published: true }
    ]
  },
  {
    id: "roblox-id",
    name: "Roblox",
    categoryId: "roblox_id",
    type: "gift_card",
    region: "INDONESIA",
    image: "/images/gift-cards/gift-roblox-id.jpg",
    offers: []
  },
  {
    id: "arena-breakout",
    name: "Arena Breakout",
    categoryId: "arena_breakout",
    type: "gift_card",
    region: "GLOBAL",
    image: "/images/gift-cards/gift-arena-breakout.jpg",
    offers: []
  },
  {
    id: "fortnite-ae",
    name: "Fortnite",
    categoryId: "fortnite_ae",
    type: "gift_card",
    region: "EMIRATOS ÁRABES",
    image: "/images/gift-cards/gift-fortnite-ae.jpg",
    offers: []
  },
  {
    id: "fortnite-suiza",
    name: "Fortnite",
    categoryId: "fortnite_suiza",
    type: "gift_card",
    region: "SUIZA",
    image: "/images/gift-cards/gift-fortnite-suiza.jpg",
    offers: []
  },
  {
    id: "fortnite-eeuu",
    name: "Fortnite",
    categoryId: "fortnite_eeuu",
    type: "gift_card",
    region: "EE.UU",
    image: "/images/gift-cards/gift-fortnite-eeuu.jpg",
    offers: []
  },
  {
    id: "fortnite-de",
    name: "Fortnite",
    categoryId: "fortnite_de",
    type: "gift_card",
    region: "ALEMANIA",
    image: "/images/gift-cards/gift-fortnite-de.jpg",
    offers: []
  },
  {
    id: "fortnite-ue",
    name: "Fortnite",
    categoryId: "fortnite_ue",
    type: "gift_card",
    region: "EUROPA",
    image: "/images/gift-cards/gift-fortnite-ue.jpg",
    offers: []
  },
  {
    id: "google-play-eeuu",
    name: "Google Play",
    categoryId: "google_play_eeuu",
    type: "gift_card",
    region: "EE.UU",
    image: "/images/gift-cards/gift-google-play-eeuu.jpg",
    offers: []
  },
  {
    id: "google-play-brasil",
    name: "Google Play",
    categoryId: "google_play_brasil",
    type: "gift_card",
    region: "BRASIL",
    image: "/images/gift-cards/gift-google-play-brasil.jpg",
    offers: []
  },
  {
    id: "google-play-es",
    name: "Google Play",
    categoryId: "google_play_es",
    type: "gift_card",
    region: "ESPAÑA",
    image: "/images/gift-cards/gift-google-play-es.jpg",
    offers: []
  },
  {
    id: "google-play-ae",
    name: "Google Play",
    categoryId: "google_play_ae",
    type: "gift_card",
    region: "EMIRATOS ÁRABES",
    image: "/images/gift-cards/gift-google-play-ae.jpg",
    offers: []
  },
  {
    id: "google-play-id",
    name: "Google Play",
    categoryId: "google_play_id",
    type: "gift_card",
    region: "INDONESIA",
    image: "/images/gift-cards/gift-google-play-id.jpg",
    offers: []
  },
  {
    id: "league-of-legends-eeuu",
    name: "League of Legends",
    categoryId: "league_of_legends_eeuu",
    type: "gift_card",
    region: "EE.UU",
    image: "/images/gift-cards/gift-league-of-legends-eeuu.jpg",
    offers: []
  },
  {
    id: "league-of-legends-ru",
    name: "League of Legends",
    categoryId: "league_of_legends_ru",
    type: "gift_card",
    region: "RUSIA",
    image: "/images/gift-cards/gift-league-of-legends-ru.jpg",
    offers: []
  },
  {
    id: "razer-gold-eeuu",
    name: "Razer Gold",
    categoryId: "razer_gold_eeuu",
    type: "gift_card",
    region: "EE.UU",
    image: "/images/gift-cards/gift-razer-gold-eeuu.jpg",
    offers: []
  },
  {
    id: "razer-gold-global",
    name: "Razer Gold",
    categoryId: "razer_gold_global",
    type: "gift_card",
    region: "GLOBAL",
    image: "/images/gift-cards/gift-razer-gold-global.jpg",
    offers: []
  },
  {
    id: "razer-gold-id",
    name: "Razer Gold",
    categoryId: "razer_gold_id",
    type: "gift_card",
    region: "INDONESIA",
    image: "/images/gift-cards/gift-razer-gold-id.jpg",
    offers: []
  },
  {
    id: "razer-gold-mx",
    name: "Razer Gold",
    categoryId: "razer_gold_mx",
    type: "gift_card",
    region: "MÉXICO",
    image: "/images/gift-cards/gift-razer-gold-mx.jpg",
    offers: []
  },
  {
    id: "netflix-mx",
    name: "Netflix",
    categoryId: "netflix_mx",
    type: "gift_card",
    region: "MÉXICO",
    image: "/images/gift-cards/gift-netflix-mx.jpg",
    offers: []
  },
  {
    id: "netflix-eeuu",
    name: "Netflix",
    categoryId: "netflix_eeuu",
    type: "gift_card",
    region: "EE.UU",
    image: "/images/gift-cards/gift-netflix-eeuu.jpg",
    offers: []
  }
];

// ============================================================
// FUNCIONES DE CONSULTA
// ============================================================

export function getTopUpCatalog() {
  return TOPUP_CATALOG;
}

export function getGiftCardCatalog() {
  return GIFT_CARD_CATALOG;
}

export function getAllCatalog() {
  return {
    currency: CATALOG_CURRENCY,
    topups: TOPUP_CATALOG,
    gift_cards: GIFT_CARD_CATALOG
  };
}
