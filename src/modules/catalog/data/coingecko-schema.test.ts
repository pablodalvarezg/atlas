import { describe, expect, it } from "vitest";

import {
  marketsResponseSchema,
  toToken,
} from "@modules/catalog/data/coingecko-schema";

/** A trimmed real response: the fields Atlas reads, shaped as upstream sends them. */
const bitcoin = {
  id: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "https://example.test/bitcoin.png",
  current_price: 61234.56,
  market_cap: 1_210_000_000_000,
  market_cap_rank: 1,
  price_change_percentage_24h: -1.25,
  price_change_percentage_1h_in_currency: 0.4,
  price_change_percentage_24h_in_currency: -1.25,
  price_change_percentage_7d_in_currency: 3.1,
  price_change_percentage_30d_in_currency: -9.5,
  total_volume: 38_000_000_000,
  high_24h: 62000,
  low_24h: 60500,
  circulating_supply: 19_700_000,
  total_supply: 21_000_000,
  max_supply: 21_000_000,
  ath: 73_750,
  atl: 67.81,
  sparkline_in_7d: { price: [60000, 61000, 62000] },
  last_updated: "2026-09-29T12:00:00.000Z",
};

describe("marketsResponseSchema", () => {
  it("accepts a real-shaped response", () => {
    expect(marketsResponseSchema.safeParse([bitcoin]).success).toBe(true);
  });

  it("accepts the nulls upstream really sends", () => {
    const sparse = { ...bitcoin, market_cap_rank: null, max_supply: null };

    expect(marketsResponseSchema.safeParse([sparse]).success).toBe(true);
  });

  it("accepts a coin missing the optional keys entirely", () => {
    // CoinGecko omits rather than nulls, depending on the endpoint and the coin.
    const { sparkline_in_7d, last_updated, image, ...bare } = bitcoin;
    void [sparkline_in_7d, last_updated, image];

    expect(marketsResponseSchema.safeParse([bare]).success).toBe(true);
  });

  it("rejects a field that changed type, in one place", () => {
    const renamed = { ...bitcoin, current_price: "61234.56" };

    expect(marketsResponseSchema.safeParse([renamed]).success).toBe(false);
  });

  it("rejects a coin with no id, which nothing downstream could link to", () => {
    const { id, ...withoutId } = bitcoin;
    void id;

    expect(marketsResponseSchema.safeParse([withoutId]).success).toBe(false);
  });
});

describe("toToken", () => {
  it("renames upstream's fields into the domain's", () => {
    expect(toToken(bitcoin)).toEqual({
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      imageUrl: "https://example.test/bitcoin.png",
      price: 61234.56,
      marketCap: 1_210_000_000_000,
      marketCapRank: 1,
      priceChangePercentage1h: 0.4,
      priceChangePercentage24h: -1.25,
      priceChangePercentage7d: 3.1,
      priceChangePercentage30d: -9.5,
      totalVolume24h: 38_000_000_000,
      high24h: 62000,
      low24h: 60500,
      circulatingSupply: 19_700_000,
      totalSupply: 21_000_000,
      maxSupply: 21_000_000,
      allTimeHigh: 73_750,
      allTimeLow: 67.81,
      sparkline7d: [60000, 61000, 62000],
      updatedAt: "2026-09-29T12:00:00.000Z",
    });
  });

  it("collapses absent and null into one null, so the UI has one case to handle", () => {
    const token = toToken({ ...bitcoin, max_supply: null, image: undefined });

    expect(token.maxSupply).toBeNull();
    expect(token.imageUrl).toBeNull();
  });

  it("gives a coin with no sparkline an empty series, not undefined", () => {
    expect(toToken({ ...bitcoin, sparkline_in_7d: null }).sparkline7d).toEqual(
      [],
    );
  });
});
