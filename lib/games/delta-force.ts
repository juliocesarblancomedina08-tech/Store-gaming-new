export const DELTA_FORCE_CATEGORY_ID = "delta_force";

export type DeltaForceOffer = {
  id: string;
  supplierOfferId: string;
  name: string;
  supplierPrice: number;
  price: number;
};

const RAW_OFFERS = [
  ["18_delta_coins", "18 Delta Coins", 0.2217],
  ["30_delta_coins", "30 Delta Coins", 0.3829],
  ["60_delta_coins", "60 Delta Coins", 0.7556],
  ["320_delta_coins", "320 Delta Coins", 3.8083],
  ["460_delta_coins", "460 Delta Coins", 5.5211],
  ["750_delta_coins", "750 Delta Coins", 7.6167],
  ["1480_delta_coins", "1480 Delta Coins", 15.2133],
  ["1980_delta_coins", "1980 Delta Coins", 19.0216],
  ["3950_delta_coins", "3950 Delta Coins", 38.0634],
  ["8100_delta_coins", "8100 Delta Coins", 76.1066],
  ["16200_delta_coins", "16200 Delta Coins", 157.7130],
  ["24300_delta_coins", "24300 Delta Coins", 236.5751],
  [
    "season_pass_operations_special",
    "Season Pass Operations Special",
    4.2647,
  ],
  [
    "season_pass_warfare_special",
    "Season Pass Warfare Special",
    4.2647,
  ],
  [
    "season_pass_delta_force_deluxe",
    "Season Pass Delta Force Deluxe",
    5.9090,
  ],
] as const;

const MARGIN_USD = 0.15;

export const DELTA_FORCE_OFFERS: DeltaForceOffer[] =
  RAW_OFFERS.map(([supplierOfferId, name, supplierPrice]) => ({
    id: supplierOfferId,
    supplierOfferId,
    name,
    supplierPrice,
    price: Number((supplierPrice + MARGIN_USD).toFixed(4)),
  }));
