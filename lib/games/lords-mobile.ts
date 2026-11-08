
export const LORDS_MOBILE = {
  game: "Lords Mobile",

  categoryId: "lords_mobile",

  image: "/images/lords-mobile.jpg",

  note:
    "Recarga de Lords Mobile. Selecciona el producto e introduce tu Player ID. El producto seleccionado se entrega directamente a tu cuenta después de procesar el pedido.",

  playerField: {
    name: "player_id",
    label: "PLAYER ID",
    description:
      "Introduzca el Player ID de la cuenta donde desea recibir la compra.",
    placeholder: "Introduzca su Player ID",
  },

  offers: [
    {
      id: "lm-weekly-diamond-pass",
      supplierOfferId: "weekly_diamond_pass",
      name: "Weekly Diamond Pass",
      display: "WEEKLY DIAMOND PASS",
      price: 2.1848,
      supplierPrice: 1.9848,
      icon: "🎟️",
    },
    {
      id: "lm-395",
      supplierOfferId: "395_diamonds",
      name: "395 Diamonds",
      display: "395💎",
      price: 4.1696,
      supplierPrice: 3.9696,
      icon: "💎",
    },
    {
      id: "lm-785",
      supplierOfferId: "785_diamonds",
      name: "785 Diamonds",
      display: "785💎",
      price: 8.1492,
      supplierPrice: 7.9492,
      icon: "💎",
    },
    {
      id: "lm-1179",
      supplierOfferId: "1179_diamonds",
      name: "1179 Diamonds",
      display: "1179💎",
      price: 12.1187,
      supplierPrice: 11.9187,
      icon: "💎",
    },
    {
      id: "lm-monthly-diamond-pass",
      supplierOfferId: "monthly_diamond_pass",
      name: "Monthly Diamond Pass",
      display: "MONTHLY DIAMOND PASS",
      price: 20.0276,
      supplierPrice: 19.8276,
      icon: "🎟️",
    },
    {
      id: "lm-1964",
      supplierOfferId: "1964_diamonds",
      name: "1964 Diamonds",
      display: "1964💎",
      price: 20.0276,
      supplierPrice: 19.8276,
      icon: "💎",
    },
    {
      id: "lm-3928",
      supplierOfferId: "3928_diamonds",
      name: "3928 Diamonds",
      display: "3928💎",
      price: 39.9257,
      supplierPrice: 39.7257,
      icon: "💎",
    },
    {
      id: "lm-7857",
      supplierOfferId: "7857_diamonds",
      name: "7857 Diamonds",
      display: "7857💎",
      price: 79.6515,
      supplierPrice: 79.4515,
      icon: "💎",
    },
    {
      id: "lm-11785",
      supplierOfferId: "11785_diamonds",
      name: "11785 Diamonds",
      display: "11785💎",
      price: 119.3772,
      supplierPrice: 119.1772,
      icon: "💎",
    },
    {
      id: "lm-19642",
      supplierOfferId: "19642_diamonds",
      name: "19642 Diamonds",
      display: "19642💎",
      price: 198.8286,
      supplierPrice: 198.6286,
      icon: "💎",
    },
  ],
} as const;

export type LordsMobileOffer =
  (typeof LORDS_MOBILE.offers)[number];
