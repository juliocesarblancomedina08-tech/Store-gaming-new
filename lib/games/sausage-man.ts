export type SausageManOffer = {
  id: string;
  name: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

export const SAUSAGE_MAN = {
  categoryId: "sausage_man",

  name: "Sausage Man",

  image: "/images/sausage-man.jpg",

  note:
    "Región: Global. Recarga automática de Sausage Man. El producto seleccionado se entrega directamente a tu cuenta después de realizar el pedido.",

  field: {
    key: "character_id",
    label: "Character ID",
    type: "text",
  },

  offers: [
    {
      id: "61_candies",
      name: "61 Candies",
      price: 0.5798,
      supplierPrice: 0.3798,
      icon: "🍬",
    },
    {
      id: "186_candies",
      name: "186 Candies",
      price: 1.3616,
      supplierPrice: 1.1616,
      icon: "🍬",
    },
    {
      id: "318_candies",
      name: "318 Candies",
      price: 2.1425,
      supplierPrice: 1.9425,
      icon: "🍬",
    },
    {
      id: "686_candies",
      name: "686 Candies",
      price: 4.095,
      supplierPrice: 3.895,
      icon: "🍬",
    },
    {
      id: "1378_candies",
      name: "1378 Candies",
      price: 7.589,
      supplierPrice: 7.389,
      icon: "🍬",
    },
    {
      id: "2118_candies",
      name: "2118 Candies",
      price: 11.484,
      supplierPrice: 11.284,
      icon: "🍬",
    },
    {
      id: "3548_candies",
      name: "3548 Candies",
      price: 19.6538,
      supplierPrice: 19.4538,
      icon: "🍬",
    },
    {
      id: "7108_candies",
      name: "7108 Candies",
      price: 39.1167,
      supplierPrice: 38.9167,
      icon: "🍬",
    },
  ] satisfies SausageManOffer[],
} as const;
