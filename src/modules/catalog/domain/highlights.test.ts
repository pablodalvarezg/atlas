import { describe, expect, it } from "vitest";

import { summariseCatalog } from "@modules/catalog/domain/highlights";
import type { Token } from "@modules/catalog/domain/token";

const token = (overrides: Partial<Token>): Token => ({
  id: "x",
  symbol: "x",
  name: "X",
  imageUrl: null,
  price: 1,
  marketCap: null,
  marketCapRank: null,
  priceChangePercentage1h: null,
  priceChangePercentage24h: null,
  priceChangePercentage7d: null,
  priceChangePercentage30d: null,
  totalVolume24h: null,
  high24h: null,
  low24h: null,
  circulatingSupply: null,
  totalSupply: null,
  maxSupply: null,
  allTimeHigh: null,
  allTimeLow: null,
  sparkline7d: [],
  updatedAt: null,
  ...overrides,
});

const up = token({ id: "up", marketCap: 100, totalVolume24h: 10, priceChangePercentage24h: 5 }); // prettier-ignore
const flat = token({ id: "flat", marketCap: 50, totalVolume24h: 5, priceChangePercentage24h: 0 }); // prettier-ignore
const down = token({ id: "down", marketCap: 25, totalVolume24h: 1, priceChangePercentage24h: -8 }); // prettier-ignore
const unknown = token({ id: "unknown" });

describe("summariseCatalog", () => {
  it("sums only what it has, treating a missing value as nothing to add", () => {
    const highlights = summariseCatalog([up, flat, down, unknown]);

    expect(highlights.tokenCount).toBe(4);
    expect(highlights.listedMarketCap).toBe(175);
    expect(highlights.listedVolume24h).toBe(16);
  });

  it("puts the biggest gain first and the biggest loss first", () => {
    const worse = token({ id: "worse", priceChangePercentage24h: -20 });
    const better = token({ id: "better", priceChangePercentage24h: 12 });

    const highlights = summariseCatalog([up, down, worse, better]);

    expect(highlights.topGainers.map((t) => t.id)).toEqual(["better", "up"]);
    expect(highlights.topLosers.map((t) => t.id)).toEqual(["worse", "down"]);
  });

  it("never files a faller under gainers, even on a day with nothing green", () => {
    const highlights = summariseCatalog([down, flat]);

    expect(highlights.topGainers).toEqual([]);
    expect(highlights.topLosers.map((t) => t.id)).toEqual(["down"]);
  });

  it("ignores tokens with no 24h change rather than counting them as flat", () => {
    expect(summariseCatalog([unknown]).topGainers).toEqual([]);
    expect(summariseCatalog([unknown]).topLosers).toEqual([]);
  });

  it("caps each list at the requested size", () => {
    const many = [1, 2, 3, 4, 5].map((n) =>
      token({ id: `t${n}`, priceChangePercentage24h: n }),
    );

    expect(summariseCatalog(many, 2).topGainers.map((t) => t.id)).toEqual([
      "t5",
      "t4",
    ]);
  });
});
