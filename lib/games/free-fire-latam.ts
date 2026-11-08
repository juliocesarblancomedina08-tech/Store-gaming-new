export const FREE_FIRE_LATAM = {
  game: "Free Fire LATAM",

  categoryId: "free_fire_latam",

  image: "/images/free-fire-latam.jpg",

  note:
    "Región: LATAM Y N.A. Recarga automática de Free Fire. Los diamantes se entregan automáticamente después de realizar el pedido.",

  playerField: {
    name: "player_id",

    label: "PONGA SU ID",

    description:
      "Introduzca el ID de la cuenta donde desea recibir la compra.",

    placeholder: "Introduzca su ID",
  },

  offers: [
    {
      id: "ff-110",
      supplierOfferId: "110_diamonds",
      name: "110 Diamonds",
      display: "110💎",
      price: 0.78,
      supplierPrice: 0.6871,
      icon: "💎",
    },

    {
      id: "ff-341",
      supplierOfferId: "341_diamonds",
      name: "341 Diamonds",
      display: "341💎",
      price: 2.2094,
      supplierPrice: 2.0594,
      icon: "💎",
    },

    {
      id: "ff-572",
      supplierOfferId: "572_diamonds",
      name: "572 Diamonds",
      display: "572💎",
      price: 3.6429,
      supplierPrice: 3.4929,
      icon: "💎",
    },

    {
      id: "ff-1166",
      supplierOfferId: "1166_diamonds",
      name: "1166 Diamonds",
      display: "1166💎",
      price: 6.631,
      supplierPrice: 6.481,
      icon: "💎",
    },

    {
      id: "ff-2398",
      supplierOfferId: "2398_diamonds",
      name: "2398 Diamonds",
      display: "2398💎",
      price: 13.011,
      supplierPrice: 12.861,
      icon: "💎",
    },

    {
      id: "ff-6160",
      supplierOfferId: "6160_diamantes",
      name: "6160 Diamonds",
      display: "6160💎",
      price: 32.8881,
      supplierPrice: 32.7381,
      icon: "💎",
    },

    {
      id: "ff-210",
      supplierOfferId: "210_diamantes",
      name: "210 Diamonds",
      display: "210💎",
      price: 2.0945,
      supplierPrice: 1.9445,
      icon: "💎",
    },

    {
      id: "ff-530",
      supplierOfferId: "530_diamantes",
      name: "530 Diamonds",
      display: "530💎",
      price: 5.0162,
      supplierPrice: 4.8662,
      icon: "💎",
    },

    {
      id: "ff-1080",
      supplierOfferId: "1080_diamantes",
      name: "1080 Diamonds",
      display: "1080💎",
      price: 9.8724,
      supplierPrice: 9.7224,
      icon: "💎",
    },

    {
      id: "ff-2200",
      supplierOfferId: "2200_diamantes",
      name: "2200 Diamonds",
      display: "2200💎",
      price: 19.5948,
      supplierPrice: 19.4448,
      icon: "💎",
    },

    {
      id: "ff-weekly-lite",
      supplierOfferId: "weekly_lite",
      name: "Semanal Lite",
      display: "SEMANAL LITE",
      price: 0.6538,
      supplierPrice: 0.5038,
      icon: "⭐",
    },

    {
      id: "ff-weekly-membership",
      supplierOfferId: "membresía_semanal",
      name: "Membresía semanal",
      display: "MEMBRESÍA SEMANAL",
      price: 2.3282,
      supplierPrice: 2.1782,
      icon: "⭐",
    },

    {
      id: "ff-elite-pass",
      supplierOfferId: "booyah_pass",
      name: "Booyah Pass",
      display: "BOOYAH PASS",
      price: 4.0138,
      supplierPrice: 3.8638,
      icon: "🎟️",
    },

    {
      id: "ff-monthly-membership",
      supplierOfferId: "membresía_mensual",
      name: "Membresía mensual",
      display: "MEMBRESÍA MENSUAL",
      price: 10.632,
      supplierPrice: 10.482,
      icon: "⭐",
    },

    {
      id: "ff-100",
      supplierOfferId: "100_diamantes",
      name: "100 Diamonds",
      display: "100💎",
      price: 1.1273,
      supplierPrice: 0.9773,
      icon: "💎",
    },
  ],
} as const;

export type FreeFireLatamOffer =
  (typeof FREE_FIRE_LATAM.offers)[number];
