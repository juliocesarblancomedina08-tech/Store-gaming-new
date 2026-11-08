export type LeagueOfLegendsIdOffer = {
  id: string;
  name: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

export const LEAGUE_OF_LEGENDS_ID = {
  categoryId: "lol_id",
  name: "League of Legends (ID)",
  image: "/images/league-of-legends.jpg",

  note:
    "Región: Indonesia. Recarga de League of Legends (PC). " +
    "Ingresa tu Riot ID antes de realizar el pedido (formato: Nombre#TAG). " +
    "Asegúrate de que tu cuenta de Riot esté registrada en Indonesia. " +
    "Los códigos están bloqueados por región.",

  field: {
    key: "riot_id",
    label: "Riot ID",
    type: "text",
  },

  offers: [
    {
      id: "575_rp",
      name: "575 RP",
      price: 3.3736,
      supplierPrice: 3.1736,
      icon: "💎",
    },
    {
      id: "1380_rp",
      name: "1380 RP",
      price: 7.5951,
      supplierPrice: 7.3951,
      icon: "💎",
    },
    {
      id: "2800_rp",
      name: "2800 RP",
      price: 14.9901,
      supplierPrice: 14.7901,
      icon: "💎",
    },
    {
      id: "4500_rp",
      name: "4500 RP",
      price: 23.443,
      supplierPrice: 23.243,
      icon: "💎",
    },
    {
      id: "6500_rp",
      name: "6500 RP",
      price: 32.9437,
      supplierPrice: 32.7437,
      icon: "💎",
    },
    {
      id: "13500_rp",
      name: "13500 RP",
      price: 63.5818,
      supplierPrice: 63.3818,
      icon: "💎",
    },
  ] satisfies LeagueOfLegendsIdOffer[],
} as const;
