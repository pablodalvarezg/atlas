import { z } from "zod";

import type { Token } from "@modules/catalog/domain/token";

/*
 * The frontier with the world, and the world lies.
 *
 * Only the fields Atlas reads are declared. A field that changes name upstream
 * has to fail here, in one file, rather than let `undefined` travel to a
 * component. Everything optional is optional because CoinGecko really does omit
 * it — `.nullish()` covers both null and absent, which the API mixes freely.
 */
const marketCoinSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  image: z.string().nullish(),
  current_price: z.number().nullish(),
  market_cap: z.number().nullish(),
  market_cap_rank: z.number().nullish(),
  price_change_percentage_24h: z.number().nullish(),
  // Present only because the request asks for them by name via
  // `price_change_percentage=1h,24h,7d,30d`. Same call, same single credit.
  price_change_percentage_1h_in_currency: z.number().nullish(),
  price_change_percentage_24h_in_currency: z.number().nullish(),
  price_change_percentage_7d_in_currency: z.number().nullish(),
  price_change_percentage_30d_in_currency: z.number().nullish(),
  total_volume: z.number().nullish(),
  high_24h: z.number().nullish(),
  low_24h: z.number().nullish(),
  circulating_supply: z.number().nullish(),
  total_supply: z.number().nullish(),
  max_supply: z.number().nullish(),
  ath: z.number().nullish(),
  atl: z.number().nullish(),
  sparkline_in_7d: z.object({ price: z.array(z.number()) }).nullish(),
  last_updated: z.string().nullish(),
});

export const marketsResponseSchema = z.array(marketCoinSchema);

export type MarketCoin = z.infer<typeof marketCoinSchema>;

/** Collapses upstream's null-or-absent into the domain's plain null. */
const orNull = <T>(value: T | null | undefined): T | null => value ?? null;

/**
 * Maps one upstream coin onto the domain type. The raw JSON stops here: nothing
 * past this function knows what CoinGecko's field names are.
 */
export function toToken(coin: MarketCoin): Token {
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    imageUrl: orNull(coin.image),
    price: orNull(coin.current_price),
    marketCap: orNull(coin.market_cap),
    marketCapRank: orNull(coin.market_cap_rank),
    priceChangePercentage1h: orNull(
      coin.price_change_percentage_1h_in_currency,
    ),
    // The plain field and the _in_currency one are the same number; the second
    // only appears when requested. Prefer it, fall back to the plain one.
    priceChangePercentage24h: orNull(
      coin.price_change_percentage_24h_in_currency ??
        coin.price_change_percentage_24h,
    ),
    priceChangePercentage7d: orNull(
      coin.price_change_percentage_7d_in_currency,
    ),
    priceChangePercentage30d: orNull(
      coin.price_change_percentage_30d_in_currency,
    ),
    totalVolume24h: orNull(coin.total_volume),
    high24h: orNull(coin.high_24h),
    low24h: orNull(coin.low_24h),
    circulatingSupply: orNull(coin.circulating_supply),
    totalSupply: orNull(coin.total_supply),
    maxSupply: orNull(coin.max_supply),
    allTimeHigh: orNull(coin.ath),
    allTimeLow: orNull(coin.atl),
    sparkline7d: coin.sparkline_in_7d?.price ?? [],
    updatedAt: orNull(coin.last_updated),
  };
}
