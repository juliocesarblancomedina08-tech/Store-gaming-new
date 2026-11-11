
export type MobileLegendsOffer = {
  id: string;
  name: string;
  supplierPrice: number;
};

export const MOBILE_LEGENDS_CATEGORY_ID =
  "mobile_legends_united_states";

export const MOBILE_LEGENDS_GAME_NAME =
  "Mobile Legends (United States)";

export const NORMAL_MARKUP = 0.20;
export const VIP_MARKUP = 0.08;

export const MOBILE_LEGENDS_OFFERS: MobileLegendsOffer[] = [
  {
    id: "51_5_diamonds",
    name: "51 + 5 Diamonds",
    supplierPrice: 0.8665,
  },
  {
    id: "weekly_diamond_pass",
    name: "Weekly Diamond Pass",
    supplierPrice: 1.7430,
  },
  {
    id: "253_25_diamonds",
    name: "253 + 25 Diamonds",
    supplierPrice: 4.3423,
  },
  {
    id: "505_66_diamonds",
    name: "505 + 66 Diamonds",
    supplierPrice: 8.7048,
  },
  {
    id: "1010_182_diamonds",
    name: "1010 + 182 Diamonds",
    supplierPrice: 17.3391,
  },
  {
    id: "1515_273_diamonds",
    name: "1515 + 273 Diamonds",
    supplierPrice: 25.9935,
  },
  {
    id: "2525_480_diamonds",
    name: "2525 + 480 Diamonds",
    supplierPrice: 43.3225,
  },
  {
    id: "3030_576_diamonds",
    name: "3030 + 576 Diamonds",
    supplierPrice: 51.9870,
  },
  {
    id: "4008_802_diamonds",
    name: "4008 + 802 Diamonds",
    supplierPrice: 69.3160,
  },
  {
    id: "5010_1002_diamonds",
    name: "5010 + 1002 Diamonds",
    supplierPrice: 86.6450,
  },
];

export function calculateMobileLegendsPrice(
  supplierPrice: number,
  vipActive: boolean
): number {
  const markup = vipActive ? VIP_MARKUP : NORMAL_MARKUP;

  return Number((supplierPrice + markup).toFixed(4));
}

export function getMobileLegendsOffer(
  offerId: string
): MobileLegendsOffer | null {
  return (
    MOBILE_LEGENDS_OFFERS.find(
      (offer) => offer.id === offerId
    ) ?? null
  );
}
