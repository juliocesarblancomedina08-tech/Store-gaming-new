export type ArenaBreakoutOffer = {
  id: string;
  name: string;
  displayName: string;
  supplierPrice: number;
  price: number;
};

export const ARENA_BREAKOUT = {
  categoryId: "arena_breakout",

  name: "Arena Breakout",

  image: "/images/arena-breakout.jpg",

  note:
    "Región: Global. Recarga automática de Arena Breakout. La moneda se entrega directamente a tu cuenta una vez realizada la orden.",

  field: {
    key: "player_id",
    label: "Player ID",
    type: "text",
  },

  offers: [
    {
      id: "66_bonds",
      name: "66 Bonos",
      displayName: "66 BONOS",
      supplierPrice: 0.7909,
      price: 0.9909,
    },

    {
      id: "335_bonds",
      name: "335 Bonos",
      displayName: "335 BONOS",
      supplierPrice: 3.9877,
      price: 4.1877,
    },

    {
      id: "675_bonds",
      name: "675 Bonos",
      displayName: "675 BONOS",
      supplierPrice: 7.9844,
      price: 8.1844,
    },

    {
      id: "1690_bonds",
      name: "1690 Bonos",
      displayName: "1690 BONOS",
      supplierPrice: 19.9566,
      price: 20.1566,
    },

    {
      id: "3400_bonds",
      name: "3400 Bonos",
      displayName: "3400 BONOS",
      supplierPrice: 39.9756,
      price: 40.1756,
    },

    {
      id: "6820_bonds",
      name: "6820 Bonos",
      displayName: "6820 BONOS",
      supplierPrice: 79.8283,
      price: 80.0283,
    },

    {
      id: "beginner_select",
      name: "Beginner Select",
      displayName: "BEGINNER SELECT",
      supplierPrice: 0.7194,
      price: 0.9194,
    },

    {
      id: "monthly_advanced_battle_pass_activation_pass",
      name: "Pase de activación del pase de batalla avanzado mensual",
      displayName: "PASE DE BATALLA AVANZADO MENSUAL",
      supplierPrice: 0.8534,
      price: 1.0534,
    },

    {
      id: "bulletproof_case_privileges",
      name: "Privilegios de la caja a prueba de balas",
      displayName: "PRIVILEGIOS DE LA CAJA A PRUEBA DE BALAS",
      supplierPrice: 2.2064,
      price: 2.4064,
    },

    {
      id: "bulletproof_case_30d",
      name: "Casa a prueba de balas (30d)",
      displayName: "CAJA A PRUEBA DE BALAS (30 DÍAS)",
      supplierPrice: 2.1681,
      price: 2.3681,
    },

    {
      id: "monthly_premium_battle_pass_activation_pass",
      name: "Monthly Premium Battle Pass Activation Pass",
      displayName: "PASE DE BATALLA PREMIUM MENSUAL",
      supplierPrice: 3.4527,
      price: 3.6527,
    },

    {
      id: "composite_case_privileges",
      name: "Composite Case Privileges",
      displayName: "PRIVILEGIOS DE LA CAJA COMPUESTA",
      supplierPrice: 6.6394,
      price: 6.8394,
    },

    {
      id: "composition_case_30d",
      name: "Composition Case (30d)",
      displayName: "CAJA COMPUESTA (30 DÍAS)",
      supplierPrice: 6.5457,
      price: 6.7457,
    },

    {
      id: "quarterly_premium_battle_pass_bundle_activation_pass_bundle",
      name: "Quarterly Premium Battle Pass Bundle Activation Pass Bundle",
      displayName: "PAQUETE DE PASE DE BATALLA PREMIUM TRIMESTRAL",
      supplierPrice: 10.3692,
      price: 10.5692,
    },
  ] satisfies ArenaBreakoutOffer[],
} as const;
