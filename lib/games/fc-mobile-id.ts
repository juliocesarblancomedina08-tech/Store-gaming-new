export type FcMobileIdOffer = {
  id: string;
  name: string;
  display: string;
  icon: string;
  supplierPrice: number;
  price: number;
};

export const FC_MOBILE_ID = {
  categoryId: "eafc_mobile_id",

  name: "EAFC Mobile",

  image: "/images/fc-mobile.jpg",

  note:
    "Región: Indonesia. Recarga de EA Sports FC Mobile. Ingrese su ID de jugador antes de realizar el pedido. Asegúrese de que su cuenta EA esté registrada en la región de Indonesia; los productos están bloqueados por región. El producto seleccionado se entrega directamente a su cuenta después de realizar el pedido.",

  field: {
    key: "player_id",
    label: "ID del jugador",
    type: "text",
  },

  offers: [
    {
      id: "40_fc_points",
      name: "40 FC Points",
      display: "40 FC POINTS",
      icon: "⚽",
      supplierPrice: 0.3426,
      price: 0.5426,
    },

    {
      id: "100_fc_points",
      name: "100 FC Points",
      display: "100 FC POINTS",
      icon: "⚽",
      supplierPrice: 0.8463,
      price: 1.0463,
    },

    {
      id: "520_fc_points",
      name: "520 FC Points",
      display: "520 FC POINTS",
      icon: "⚽",
      supplierPrice: 4.1912,
      price: 4.3912,
    },

    {
      id: "1070_fc_points",
      name: "1070 FC Points",
      display: "1070 FC POINTS",
      icon: "⚽",
      supplierPrice: 8.4227,
      price: 8.6227,
    },

    {
      id: "2200_fc_points",
      name: "2200 FC Points",
      display: "2200 FC POINTS",
      icon: "⚽",
      supplierPrice: 17.4298,
      price: 17.6298,
    },

    {
      id: "5750_fc_points",
      name: "5750 FC Points",
      display: "5750 FC POINTS",
      icon: "⚽",
      supplierPrice: 42.3352,
      price: 42.5352,
    },

    {
      id: "12000_fc_points",
      name: "12000 FC Points",
      display: "12000 FC POINTS",
      icon: "⚽",
      supplierPrice: 84.7308,
      price: 84.9308,
    },

    {
      id: "39_silver",
      name: "39 Silver",
      display: "39 SILVER",
      icon: "🪙",
      supplierPrice: 0.3426,
      price: 0.5426,
    },

    {
      id: "99_silver",
      name: "99 Silver",
      display: "99 SILVER",
      icon: "🪙",
      supplierPrice: 0.8463,
      price: 1.0463,
    },

    {
      id: "499_silver",
      name: "499 Silver",
      display: "499 SILVER",
      icon: "🪙",
      supplierPrice: 4.1912,
      price: 4.3912,
    },

    {
      id: "999_plata",
      name: "999 Plata",
      display: "999 PLATA",
      icon: "🪙",
      supplierPrice: 8.4227,
      price: 8.6227,
    },

    {
      id: "1999_plata",
      name: "1999 Plata",
      display: "1999 PLATA",
      icon: "🪙",
      supplierPrice: 17.4298,
      price: 17.6298,
    },

    {
      id: "4999_plata",
      name: "4999 Plata",
      display: "4999 PLATA",
      icon: "🪙",
      supplierPrice: 42.3352,
      price: 42.5352,
    },

    {
      id: "9999_plata",
      name: "9999 Plata",
      display: "9999 PLATA",
      icon: "🪙",
      supplierPrice: 84.7308,
      price: 84.9308,
    },
  ] satisfies FcMobileIdOffer[],
} as const;
