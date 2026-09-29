/**
 * What Atlas knows about a token.
 *
 * Deliberately not the shape of CoinGecko's response: the upstream returns
 * dozens of fields per coin, `data/` maps the ones below, and changing provider
 * means touching one folder. The nullability is upstream's, not decoration —
 * plenty of coins have no rank, no max supply, or no price at all, and the type
 * says so rather than letting `undefined` reach a component.
 */
export type Token = {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly price: number | null;
  readonly marketCap: number | null;
  readonly marketCapRank: number | null;
  readonly priceChangePercentage1h: number | null;
  readonly priceChangePercentage24h: number | null;
  readonly priceChangePercentage7d: number | null;
  readonly priceChangePercentage30d: number | null;
  readonly totalVolume24h: number | null;
  readonly high24h: number | null;
  readonly low24h: number | null;
  readonly circulatingSupply: number | null;
  readonly totalSupply: number | null;
  readonly maxSupply: number | null;
  readonly allTimeHigh: number | null;
  readonly allTimeLow: number | null;
  /** Hourly closes for the last 7 days. Empty when upstream omits them. */
  readonly sparkline7d: readonly number[];
  readonly updatedAt: string | null;
};
