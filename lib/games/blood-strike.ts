
export type BloodStrikeOffer = {
  id: string;
  supplierOfferId: string;
  name: string;
  displayName: string;
  price: number;
  supplierPrice: number;
};

export const BLOOD_STRIKE = {
  categoryId: "blood_strike",

  name: "Blood Strike",

  image: "/images/blood-strike.jpg",

  note:
    "Recarga Global de Blood Strike. Los BC y pases se entregan automáticamente después de realizar el pedido.",

  playerField: {
    name: "player_id",
    label: "PONGA SU ID",
    type: "text",
    description:
      "Introduzca el Player ID de la cuenta donde desea recibir la compra.",
    placeholder: "Introduzca su Player ID",
  },

  services: [
    "Entrega rápida",
    "Compra segura",
    "Blood Strike BC",
    "Pases y ofertas",
    "Recargas automáticas",
  ],

  offers: [
    {
      id: "bs-51",
      supplierOfferId: "51_bc",
      name: "51 BC",
      displayName: "51 BC",
      price: 0.52,
      supplierPrice: 0.3909,
    },
    {
      id: "bs-105",
      supplierOfferId: "105_bc",
      name: "105 BC",
      displayName: "105 BC",
      price: 0.85,
      supplierPrice: 0.7707,
    },
    {
      id: "bs-320",
      supplierOfferId: "320_bc",
      name: "320 BC",
      displayName: "320 BC",
      price: 2.35,
      supplierPrice: 2.2568,
    },
    {
      id: "bs-540",
      supplierOfferId: "540_bc",
      name: "540 BC",
      displayName: "540 BC",
      price: 3.85,
      supplierPrice: 3.7681,
    },
    {
      id: "bs-1100",
      supplierOfferId: "1100_bc",
      name: "1100 BC",
      displayName: "1100 BC",
      price: 7.6,
      supplierPrice: 7.526,
    },
    {
      id: "bs-2260",
      supplierOfferId: "2260_bc",
      name: "2260 BC",
      displayName: "2260 BC",
      price: 15.1,
      supplierPrice: 14.9513,
    },
    {
      id: "bs-5800",
      supplierOfferId: "5800_bc",
      name: "5800 BC",
      displayName: "5800 BC",
      price: 37.4,
      supplierPrice: 37.2574,
    },
    {
      id: "bs-099-deal",
      supplierOfferId: "0_99_deal",
      name: "0.99 DEAL",
      displayName: "0.99 DEAL",
      price: 0.99,
      supplierPrice: 0.7808,
    },
    {
      id: "bs-049-deal",
      supplierOfferId: "0_49_deal",
      name: "0.49 DEAL",
      displayName: "0.49 DEAL",
      price: 0.49,
      supplierPrice: 0.3909,
    },
    {
      id: "bs-199-deal",
      supplierOfferId: "1_99_deal",
      name: "1.99 DEAL",
      displayName: "1.99 DEAL",
      price: 1.99,
      supplierPrice: 1.5828,
    },
    {
      id: "bs-299-deal",
      supplierOfferId: "2_99_deal",
      name: "2.99 DEAL",
      displayName: "2.99 DEAL",
      price: 2.99,
      supplierPrice: 2.3737,
    },
    {
      id: "bs-399-deal",
      supplierOfferId: "3_99_deal",
      name: "3.99 DEAL",
      displayName: "3.99 DEAL",
      price: 3.99,
      supplierPrice: 3.1756,
    },
    {
      id: "bs-499-deal",
      supplierOfferId: "4_99_deal",
      name: "4.99 DEAL",
      displayName: "4.99 DEAL",
      price: 4.99,
      supplierPrice: 3.9665,
    },
    {
      id: "bs-699-deal",
      supplierOfferId: "6_99_deal",
      name: "6.99 DEAL",
      displayName: "6.99 DEAL",
      price: 6.99,
      supplierPrice: 5.4879,
    },
    {
      id: "bs-599-deal",
      supplierOfferId: "5_99_deal",
      name: "5.99 DEAL",
      displayName: "5.99 DEAL",
      price: 5.99,
      supplierPrice: 4.696,
    },
    {
      id: "bs-799-deal",
      supplierOfferId: "7_99_deal",
      name: "7.99 DEAL",
      displayName: "7.99 DEAL",
      price: 7.99,
      supplierPrice: 6.2888,
    },
    {
      id: "bs-899-deal",
      supplierOfferId: "8_99_deal",
      name: "8.99 DEAL",
      displayName: "8.99 DEAL",
      price: 8.99,
      supplierPrice: 7.1522,
    },
    {
      id: "bs-999-deal",
      supplierOfferId: "9_99_deal",
      name: "9.99 DEAL",
      displayName: "9.99 DEAL",
      price: 9.99,
      supplierPrice: 7.9441,
    },
    {
      id: "bs-ultra-skin",
      supplierOfferId: "ultra_skin_lucky_chest",
      name: "Ultra Skin Lucky Chest",
      displayName: "Ultra Skin Lucky Chest",
      price: 0.55,
      supplierPrice: 0.3909,
    },
    {
      id: "bs-lucky-bag-week",
      supplierOfferId: "lucky_bag_week",
      name: "Lucky Bag Week",
      displayName: "Lucky Bag Week",
      price: 0.99,
      supplierPrice: 0.7808,
    },
    {
      id: "bs-level-up-pass",
      supplierOfferId: "level_up_pass",
      name: "Level Up Pass",
      displayName: "Level Up Pass",
      price: 1.99,
      supplierPrice: 1.5828,
    },
    {
      id: "bs-strike-pass-elite",
      supplierOfferId: "strike_pass_elite",
      name: "Strike Pass Elite",
      displayName: "Strike Pass Elite",
      price: 3.99,
      supplierPrice: 3.1756,
    },
    {
      id: "bs-strike-pass-premium",
      supplierOfferId: "strike_pass_premium",
      name: "Strike Pass Premium",
      displayName: "Strike Pass Premium",
      price: 7.99,
      supplierPrice: 7.1522,
    },
  ] satisfies BloodStrikeOffer[],
} as const;
