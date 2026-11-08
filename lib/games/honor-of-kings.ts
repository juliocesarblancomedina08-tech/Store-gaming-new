export type HonorOfKingsOffer = {
  id: string;
  name: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

export const HONOR_OF_KINGS = {
  categoryId: "honor_of_kings",
  name: "Honor of Kings",
  image: "/images/honor-of-kings.jpg",

  note:
    "Recarga de Honor of Kings. Ingrese su ID de jugador antes de realizar el pedido. El producto seleccionado se entrega directamente a su cuenta después de realizar el pedido.",

  field: {
    key: "player_id",
    label: "Player ID",
    type: "text",
  },

  offers: [
    {
      id: "16_tokens",
      name: "16 Tokens",
      supplierPrice: 0.1713,
      price: 0.3713,
      icon: "🪙",
    },

    {
      id: "double_token_lucky_bag",
      name: "Double Token Lucky Bag",
      supplierPrice: 0.3224,
      price: 0.5224,
      icon: "🎁",
    },

    {
      id: "honor_point_value_pack",
      name: "Honor Point Value Pack",
      supplierPrice: 0.3224,
      price: 0.5224,
      icon: "🏆",
    },

    {
      id: "standard_purchase_rebate_pack",
      name: "Standard Purchase Rebate Paquete",
      supplierPrice: 0.3224,
      price: 0.5224,
      icon: "🎁",
    },

    {
      id: "80_tokens",
      name: "80 Tokens",
      supplierPrice: 0.8463,
      price: 1.0463,
      icon: "🪙",
    },

    {
      id: "weekly_card",
      name: "Weekly Card",
      supplierPrice: 0.9471,
      price: 1.1471,
      icon: "🎟️",
    },

    {
      id: "premium_purchase_rebate_pack",
      name: "Premium Purchase Rebate Pack",
      supplierPrice: 1.1888,
      price: 1.3888,
      icon: "🎁",
    },

    {
      id: "240_tokens",
      name: "240 Tokens",
      supplierPrice: 2.5288,
      price: 2.7288,
      icon: "🪙",
    },

    {
      id: "weekly_card_plus",
      name: "Weekly Card Plus",
      supplierPrice: 2.9016,
      price: 3.1016,
      icon: "🎟️",
    },

    {
      id: "400_tokens",
      name: "400 Tokens",
      supplierPrice: 4.2214,
      price: 4.4214,
      icon: "🪙",
    },

    {
      id: "560_tokens",
      name: "560 Tokens",
      supplierPrice: 5.914,
      price: 6.114,
      icon: "🪙",
    },

    {
      id: "830_tokens",
      name: "830 Tokens",
      supplierPrice: 8.4429,
      price: 8.6429,
      icon: "🪙",
    },

    {
      id: "1245_tokens",
      name: "1245 Tokens",
      supplierPrice: 12.6643,
      price: 12.8643,
      icon: "🪙",
    },

    {
      id: "2508_tokens",
      name: "2508 Tokens",
      supplierPrice: 25.3386,
      price: 25.5386,
      icon: "🪙",
    },

    {
      id: "4180_tokens",
      name: "4180 Tokens",
      supplierPrice: 42.2344,
      price: 42.4344,
      icon: "🪙",
    },

    {
      id: "8360_tokens",
      name: "8360 Tokens",
      supplierPrice: 84.4688,
      price: 84.6688,
      icon: "🪙",
    },
  ] satisfies HonorOfKingsOffer[],
} as const;
