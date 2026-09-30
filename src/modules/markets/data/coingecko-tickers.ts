import { z } from "zod";

import type { VenueCandidate } from "@modules/markets/domain/venue";

/*
 * The frontier with CoinGecko's /coins/{id}/tickers.
 *
 * `trade_url` is documented as a required string and is null in practice often
 * enough that treating it as required would throw away whole coins. The world
 * lies; the schema does not have to believe it.
 */
const tickerSchema = z.object({
  base: z.string(),
  target: z.string(),
  market: z.object({
    name: z.string(),
    identifier: z.string(),
  }),
  trade_url: z.string().nullish(),
  trust_score: z.string().nullish(),
  is_anomaly: z.boolean().nullish(),
  is_stale: z.boolean().nullish(),
  converted_last: z.object({ usd: z.number().nullish() }).nullish(),
  converted_volume: z.object({ usd: z.number().nullish() }).nullish(),
});

export const tickersResponseSchema = z.object({
  tickers: z.array(tickerSchema),
});

export type CoinGeckoTicker = z.infer<typeof tickerSchema>;

/** Maps one upstream ticker onto the candidate the domain then judges. */
export function toVenueCandidate(ticker: CoinGeckoTicker): VenueCandidate {
  return {
    exchangeId: ticker.market.identifier,
    exchangeName: ticker.market.name,
    pair: `${ticker.base}/${ticker.target}`,
    tradeUrl: ticker.trade_url ?? null,
    trust: ticker.trust_score ?? null,
    volumeUsd: ticker.converted_volume?.usd ?? null,
    lastPriceUsd: ticker.converted_last?.usd ?? null,
    // Absent flags mean "not flagged", which is the safe reading: the domain
    // discards on a true, so a missing value must not read as suspicious.
    isAnomaly: ticker.is_anomaly ?? false,
    isStale: ticker.is_stale ?? false,
  };
}
