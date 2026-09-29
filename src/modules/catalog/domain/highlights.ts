import type { Token } from "@modules/catalog/domain/token";

/**
 * The headline numbers, derived from the catalogue already fetched.
 *
 * Nothing here costs a CoinGecko credit: the totals are sums over the tokens on
 * hand and the movers are the same list sorted. That is also why the totals are
 * honestly named `listed…` — they cover the tokens Atlas lists, not the whole
 * market. The real market-wide figures live behind /global, which is a separate
 * call and a separate decision.
 */
export type Highlights = {
  readonly tokenCount: number;
  readonly listedMarketCap: number;
  readonly listedVolume24h: number;
  readonly topGainers: readonly Token[];
  readonly topLosers: readonly Token[];
};

const sum = (tokens: readonly Token[], of: (token: Token) => number | null) =>
  tokens.reduce((total, token) => total + (of(token) ?? 0), 0);

export function summariseCatalog(
  tokens: readonly Token[],
  moverCount = 3,
): Highlights {
  const movers = tokens.filter(
    (token) => token.priceChangePercentage24h !== null,
  );

  const byChangeDescending = [...movers].sort(
    (a, b) =>
      (b.priceChangePercentage24h ?? 0) - (a.priceChangePercentage24h ?? 0),
  );

  return {
    tokenCount: tokens.length,
    listedMarketCap: sum(tokens, (token) => token.marketCap),
    listedVolume24h: sum(tokens, (token) => token.totalVolume24h),
    // A token that fell is not a "gainer", so the sign is filtered rather than
    // just taking the first three: on a red day the list is short or empty, and
    // that is the honest rendering.
    topGainers: byChangeDescending
      .filter((token) => (token.priceChangePercentage24h ?? 0) > 0)
      .slice(0, moverCount),
    topLosers: byChangeDescending
      .filter((token) => (token.priceChangePercentage24h ?? 0) < 0)
      .reverse()
      .slice(0, moverCount),
  };
}
