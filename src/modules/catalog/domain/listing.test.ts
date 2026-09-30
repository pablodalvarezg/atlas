import { describe, expect, it } from "vitest";

import {
  filterTokens,
  findToken,
  listTokens,
  parseListingQuery,
  sortQuery,
  sortTokens,
} from "@modules/catalog/domain/listing";
import type { Token } from "@modules/catalog/domain/token";

const token = (overrides: Partial<Token>): Token => ({
  id: "x",
  symbol: "x",
  name: "X",
  imageUrl: null,
  price: 1,
  marketCap: 1,
  marketCapRank: 1,
  priceChangePercentage1h: null,
  priceChangePercentage24h: 0,
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

const bitcoin = token({ id: "bitcoin", symbol: "btc", name: "Bitcoin", price: 60000, marketCapRank: 1 }); // prettier-ignore
const ether = token({ id: "ethereum", symbol: "eth", name: "Ethereum", price: 3000, marketCapRank: 2 }); // prettier-ignore
const unranked = token({ id: "ghost", symbol: "ghost", name: "Ghost", price: null, marketCapRank: null }); // prettier-ignore

describe("parseListingQuery", () => {
  it("falls back to rank ascending", () => {
    expect(parseListingQuery({})).toEqual({
      search: "",
      sort: "rank",
      direction: "asc",
      preset: "",
    });
  });

  it("ignores a sort key it does not know", () => {
    expect(parseListingQuery({ sort: "whatever" }).sort).toBe("rank");
  });

  it("points money and movement downwards on first click", () => {
    expect(parseListingQuery({ sort: "price" }).direction).toBe("desc");
    expect(parseListingQuery({ sort: "marketCap" }).direction).toBe("desc");
    expect(parseListingQuery({ sort: "name" }).direction).toBe("asc");
  });

  it("honours an explicit direction", () => {
    expect(parseListingQuery({ sort: "price", dir: "asc" }).direction).toBe(
      "asc",
    );
  });

  it("takes the first value when a param is repeated, and trims the search", () => {
    expect(parseListingQuery({ q: ["  btc  ", "eth"] }).search).toBe("btc");
  });
});

describe("filterTokens", () => {
  it("matches name or symbol, case-insensitively", () => {
    expect(filterTokens([bitcoin, ether], "bit")).toEqual([bitcoin]);
    expect(filterTokens([bitcoin, ether], "ETH")).toEqual([ether]);
  });

  it("returns everything for an empty search", () => {
    expect(filterTokens([bitcoin, ether], "   ")).toHaveLength(2);
  });
});

describe("sortTokens", () => {
  it("orders by the chosen column in both directions", () => {
    expect(sortTokens([ether, bitcoin], "price", "asc")).toEqual([
      ether,
      bitcoin,
    ]);
    expect(sortTokens([ether, bitcoin], "price", "desc")).toEqual([
      bitcoin,
      ether,
    ]);
  });

  it("keeps missing values last whichever way the column points", () => {
    // An unknown price is not the cheapest one, so it never leads the table.
    expect(sortTokens([unranked, bitcoin], "price", "asc").at(-1)).toBe(
      unranked,
    );
    expect(sortTokens([unranked, bitcoin], "price", "desc").at(-1)).toBe(
      unranked,
    );
  });

  it("does not mutate its input", () => {
    const input = [ether, bitcoin];
    sortTokens(input, "price", "asc");

    expect(input).toEqual([ether, bitcoin]);
  });
});

describe("listTokens", () => {
  it("filters before ordering", () => {
    const result = listTokens([bitcoin, ether, unranked], {
      search: "o",
      sort: "price",
      direction: "desc",
      preset: "",
    });

    // "Bitcoin" and "Ghost" contain an "o"; "Ethereum" does not. Ghost has no
    // price, so it lands last even though the column points downwards.
    expect(result).toEqual([bitcoin, unranked]);
  });
});

describe("sortQuery", () => {
  const current = {
    search: "",
    sort: "rank",
    direction: "asc",
    preset: "",
  } as const;

  it("flips the direction of the column already in use", () => {
    expect(sortQuery(current, "rank")).toBe("sort=rank&dir=desc");
  });

  it("uses the column's own default when switching columns", () => {
    expect(sortQuery(current, "price")).toBe("sort=price&dir=desc");
  });

  it("carries the search along, so ordering does not drop it", () => {
    expect(sortQuery({ ...current, search: "btc" }, "name")).toBe(
      "q=btc&sort=name&dir=asc",
    );
  });

  it("emits no path, so the route serving refined views can change freely", () => {
    expect(sortQuery(current, "price").startsWith("/")).toBe(false);
  });
});

describe("findToken", () => {
  it("finds a token by id", () => {
    expect(findToken([bitcoin, ether], "ethereum")).toBe(ether);
  });

  it("returns undefined for an id that is not listed, so the page can 404", () => {
    expect(findToken([bitcoin], "nothing")).toBeUndefined();
  });
});

describe("carrying the preset", () => {
  const inPreset = {
    search: "",
    sort: "rank",
    direction: "asc",
    preset: "rwa",
  } as const;

  it("reads the preset off the query string", () => {
    expect(parseListingQuery({ preset: "rwa" }).preset).toBe("rwa");
  });

  it("keeps it when reordering, so a preset does not become the whole market", () => {
    expect(sortQuery(inPreset, "price")).toBe("preset=rwa&sort=price&dir=desc");
  });

  it("is empty for the whole catalogue", () => {
    expect(parseListingQuery({}).preset).toBe("");
  });
});
