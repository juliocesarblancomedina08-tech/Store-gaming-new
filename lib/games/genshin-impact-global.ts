
export type GenshinImpactGlobalOffer = {
  id: string;
  supplierOfferId: string;
  name: string;
  display: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

export const GENSHIN_IMPACT_GLOBAL = {
  game: "Genshin Impact (Global)",
  categoryId: "genshin_impact_global",
  image: "/images/genshin-impact-global.jpg",
  note: "Recarga global de Genshin Impact. Introduce tu Player ID y selecciona el servidor correcto. Los Cristales Génesis se entregan directamente a tu cuenta.",
  fields: [
    { key: "player_id", label: "Player ID", type: "text" },
    {
      key: "server",
      label: "Servidor",
      type: "select",
      options: [
        { label: "America", value: "america" },
        { label: "Asia", value: "asia" },
        { label: "Europe", value: "europe" },
        { label: "TW HK MO", value: "tw_hk_mo" },
      ],
    },
  ],
} as const;

export const GENSHIN_SERVERS = [
  { label: "America", value: "america" },
  { label: "Asia", value: "asia" },
  { label: "Europe", value: "europe" },
  { label: "TW HK MO", value: "tw_hk_mo" },
] as const;

export const GENSHIN_STORE_MARGIN = 0.30;
