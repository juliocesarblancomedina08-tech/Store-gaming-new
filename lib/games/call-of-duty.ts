export type CallOfDutyOffer = {
  id: string;
  supplierOfferId: string;
  name: string;
  displayName: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

export const CALL_OF_DUTY = {
  name: "Call of Duty Mobile - Activision (EE. UU.)",

  categoryId: "codm_activision_us",

  image: "/images/call-of-duty.jpg",

  note:
    "Región: Estados Unidos. Recarga de Call of Duty: Mobile (Activision). " +
    "Ingrese su ID de usuario de Activision antes de realizar el pedido. " +
    "Asegúrese de que su cuenta de Activision esté registrada en la región " +
    "de Estados Unidos; esta es la versión occidental (Activision), no la de Garena. " +
    "El producto seleccionado se entrega directamente a su cuenta después de realizar el pedido.",

  offers: [
    {
      id: "cod-88",
      supplierOfferId: "88_cp",
      name: "80 + 8 CP",
      displayName: "88 CP",
      price: 1.15,
      supplierPrice: 0.9974,
      icon: "🪙",
    },

    {
      id: "cod-460",
      supplierOfferId: "460_cp",
      name: "400 + 60 CP",
      displayName: "460 CP",
      price: 5.18,
      supplierPrice: 5.0274,
      icon: "🪙",
    },

    {
      id: "cod-960",
      supplierOfferId: "960_cp",
      name: "800 + 160 CP",
      displayName: "960 CP",
      price: 10.21,
      supplierPrice: 10.0649,
      icon: "🪙",
    },

    {
      id: "cod-2600",
      supplierOfferId: "2600_cp",
      name: "2000 + 600 CP",
      displayName: "2600 CP",
      price: 25.33,
      supplierPrice: 25.1774,
      icon: "🪙",
    },

    {
      id: "cod-5400",
      supplierOfferId: "5400_cp",
      name: "4000 + 1400 CP",
      displayName: "5400 CP",
      price: 50.51,
      supplierPrice: 50.3649,
      icon: "🪙",
    },

    {
      id: "cod-11600",
      supplierOfferId: "11600_cp",
      name: "8000 + 3600 CP",
      displayName: "11600 CP",
      price: 100.89,
      supplierPrice: 100.7399,
      icon: "🪙",
    },

    {
      id: "cod-23200",
      supplierOfferId: "23200_cp",
      name: "16000 + 7200 CP",
      displayName: "23200 CP",
      price: 201.64,
      supplierPrice: 201.4899,
      icon: "🪙",
    },

    {
      id: "cod-34800",
      supplierOfferId: "34800_cp",
      name: "24000 + 10800 CP",
      displayName: "34800 CP",
      price: 302.39,
      supplierPrice: 302.2399,
      icon: "🪙",
    },

    {
      id: "cod-58000",
      supplierOfferId: "58000_cp",
      name: "40000 + 18000 CP",
      displayName: "58000 CP",
      price: 503.89,
      supplierPrice: 503.7399,
      icon: "🪙",
    },
  ] satisfies CallOfDutyOffer[],

  playerField: {
    name: "user_id",
    label: "ID de usuario",
    type: "text",
    description:
      "Introduzca el ID de usuario de Activision donde desea recibir los CP.",
    placeholder: "Introduzca su ID",
  },
} as const;
