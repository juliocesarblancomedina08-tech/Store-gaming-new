
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
      price: 0.6010,
      supplierPrice: 0.4010,
    },
    {
      id: "bs-105",
      supplierOfferId: "105_bc",
      name: "105 BC",
      displayName: "105 BC",
      price: 0.9657,
      supplierPrice: 0.7657,
    },
    {
      id: "bs-320",
      supplierOfferId: "320_bc",
      name: "320 BC",
      displayName: "320 BC",
      price: 2.4165,
      supplierPrice: 2.2165,
    },
    {
      id: "bs-540",
      supplierOfferId: "540_bc",
      name: "540 BC",
      displayName: "540 BC",
      price: 3.8774,
      supplierPrice: 3.6774,
    },
    {
      id: "bs-1100",
      supplierOfferId: "1100_bc",
      name: "1100 BC",
      displayName: "1100 BC",
      price: 7.5548,
      supplierPrice: 7.3548,
    },
    {
      id: "bs-2260",
      supplierOfferId: "2260_bc",
      name: "2260 BC",
      displayName: "2260 BC",
      price: 14.7987,
      supplierPrice: 14.5987,
    },
    {
      id: "bs-5800",
      supplierOfferId: "5800_bc",
      name: "5800 BC",
      displayName: "5800 BC",
      price: 36.5808,
      supplierPrice: 36.3808,
    },
    {
      id: "bs-099-deal",
      supplierOfferId: "0_99_deal",
      name: "0.99 DEAL",
      displayName: "0.99 DEAL",
      price: 0.9808,
      supplierPrice: 0.7808,
    },
    {
      id: "bs-049-deal",
      supplierOfferId: "0_49_deal",
      name: "0.49 DEAL",
      displayName: "0.49 DEAL",
      price: 0.6010,
      supplierPrice: 0.4010,
    },
    {
      id: "bs-199-deal",
      supplierOfferId: "1_99_deal",
      name: "1.99 DEAL",
      displayName: "1.99 DEAL",
      price: 1.7929,
      supplierPrice: 1.5929,
    },
    {
      id: "bs-299-deal",
      supplierOfferId: "2_99_deal",
      name: "2.99 DEAL",
      displayName: "2.99 DEAL",
      price: 2.5837,
      supplierPrice: 2.3837,
    },
    {
      id: "bs-399-deal",
      supplierOfferId: "3_99_deal",
      name: "3.99 DEAL",
      displayName: "3.99 DEAL",
      price: 3.3857,
      supplierPrice: 3.1857,
    },
    {
      id: "bs-499-deal",
      supplierOfferId: "4_99_deal",
      name: "4.99 DEAL",
      displayName: "4.99 DEAL",
      price: 4.1877,
      supplierPrice: 3.9877,
    },
    {
      id: "bs-699-deal",
      supplierOfferId: "6_99_deal",
      name: "6.99 DEAL",
      displayName: "6.99 DEAL",
      price: 5.7292,
      supplierPrice: 5.5292,
    },
    {
      id: "bs-599-deal",
      supplierOfferId: "5_99_deal",
      name: "5.99 DEAL",
      displayName: "5.99 DEAL",
      price: 4.9272,
      supplierPrice: 4.7272,
    },
    {
      id: "bs-799-deal",
      supplierOfferId: "7_99_deal",
      name: "7.99 DEAL",
      displayName: "7.99 DEAL",
      price: 6.5200,
      supplierPrice: 6.3200,
    },
    {
      id: "bs-899-deal",
      supplierOfferId: "8_99_deal",
      name: "8.99 DEAL",
      displayName: "8.99 DEAL",
      price: 7.3835,
      supplierPrice: 7.1835,
    },
    {
      id: "bs-999-deal",
      supplierOfferId: "9_99_deal",
      name: "9.99 DEAL",
      displayName: "9.99 DEAL",
      price: 8.1955,
      supplierPrice: 7.9955,
    },
    {
      id: "bs-ultra-skin",
      supplierOfferId: "ultra_skin_lucky_chest",
      name: "Ultra Skin Lucky Chest",
      displayName: "Ultra Skin Lucky Chest",
      price: 0.6010,
      supplierPrice: 0.4010,
    },
    {
      id: "bs-lucky-bag-week",
      supplierOfferId: "lucky_bag_week",
      name: "Lucky Bag Week",
      displayName: "Lucky Bag Week",
      price: 0.9959,
      supplierPrice: 0.7959,
    },
    {
      id: "bs-level-up-pass",
      supplierOfferId: "level_up_pass",
      name: "Level Up Pass",
      displayName: "Level Up Pass",
      price: 1.7929,
      supplierPrice: 1.5929,
    },
    {
      id: "bs-strike-pass-elite",
      supplierOfferId: "strike_pass_elite",
      name: "Strike Pass Elite",
      displayName: "Strike Pass Elite",
      price: 3.3333,
      supplierPrice: 3.1333,
    },
    {
      id: "bs-strike-pass-premium",
      supplierOfferId: "strike_pass_premium",
      name: "Strike Pass Premium",
      displayName: "Strike Pass Premium",
      price: 7.2827,
      supplierPrice: 7.0827,
    },
  ] satisfies BloodStrikeOffer[],
} as const;
