import { LOCALE } from "@modules/catalog/domain/format";
import type { Token } from "@modules/catalog/domain/token";

/*
 * Search, filter and order are URL state, not component state. The server reads
 * them off the query string and returns the page already filtered and sorted,
 * so the catalogue works with JavaScript turned off. Everything here is a pure
 * function over that query string for exactly that reason.
 */

export const SORT_KEYS = [
  "rank",
  "name",
  "price",
  "change1h",
  "change",
  "change7d",
  "change30d",
  "volume",
  "marketCap",
] as const;

export type SortKey = (typeof SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";

export type ListingQuery = {
  readonly search: string;
  readonly sort: SortKey;
  readonly direction: SortDirection;
  /**
   * The preset slug the reader came from, carried so that reordering a preset
   * stays inside it. Empty means the whole catalogue.
   */
  readonly preset: string;
};

/**
 * Which way a column wants to be read the first time you click it: rank and
 * name ascend, money and movement descend. Guessing wrong costs two clicks.
 */
const DEFAULT_DIRECTION: Record<SortKey, SortDirection> = {
  rank: "asc",
  name: "asc",
  price: "desc",
  change1h: "desc",
  change: "desc",
  change7d: "desc",
  change30d: "desc",
  volume: "desc",
  marketCap: "desc",
};

export const DEFAULT_LISTING_QUERY: ListingQuery = {
  search: "",
  sort: "rank",
  direction: DEFAULT_DIRECTION.rank,
  preset: "",
};

const isSortKey = (value: string): value is SortKey =>
  (SORT_KEYS as readonly string[]).includes(value);

const firstValue = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

/** Reads the query string. Anything unrecognised falls back to the default. */
export function parseListingQuery(
  params: Record<string, string | string[] | undefined>,
): ListingQuery {
  const rawSort = firstValue(params.sort);
  const sort =
    rawSort !== undefined && isSortKey(rawSort)
      ? rawSort
      : DEFAULT_LISTING_QUERY.sort;

  const rawDirection = firstValue(params.dir);
  const direction =
    rawDirection === "asc" || rawDirection === "desc"
      ? rawDirection
      : DEFAULT_DIRECTION[sort];

  return {
    search: firstValue(params.q)?.trim() ?? "",
    sort,
    direction,
    preset: firstValue(params.preset)?.trim() ?? "",
  };
}

export function filterTokens(
  tokens: readonly Token[],
  search: string,
): Token[] {
  const needle = search.trim().toLowerCase();
  if (needle === "") return [...tokens];

  return tokens.filter(
    (token) =>
      token.name.toLowerCase().includes(needle) ||
      token.symbol.toLowerCase().includes(needle),
  );
}

const VALUE_OF: Record<SortKey, (token: Token) => number | string | null> = {
  rank: (token) => token.marketCapRank,
  name: (token) => token.name.toLowerCase(),
  price: (token) => token.price,
  change1h: (token) => token.priceChangePercentage1h,
  change: (token) => token.priceChangePercentage24h,
  change7d: (token) => token.priceChangePercentage7d,
  change30d: (token) => token.priceChangePercentage30d,
  volume: (token) => token.totalVolume24h,
  marketCap: (token) => token.marketCap,
};

export function sortTokens(
  tokens: readonly Token[],
  sort: SortKey,
  direction: SortDirection,
): Token[] {
  const valueOf = VALUE_OF[sort];
  const sign = direction === "asc" ? 1 : -1;

  return [...tokens].sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);

    // Missing values sort last whichever way the column points: a coin with no
    // market cap is not the smallest one, it is an unknown one.
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;

    if (typeof left === "string" && typeof right === "string") {
      return sign * left.localeCompare(right, LOCALE);
    }

    return sign * (Number(left) - Number(right));
  });
}

/** What the page renders: the query applied to the catalogue, in order. */
export function listTokens(
  tokens: readonly Token[],
  query: ListingQuery,
): Token[] {
  return sortTokens(
    filterTokens(tokens, query.search),
    query.sort,
    query.direction,
  );
}

/**
 * The query string a sortable column header points at: same search, that
 * column, and the direction flipped if the column is already the active one.
 *
 * Returns the query alone, without a path — which route serves refined views is
 * the app layer's business, not the domain's. A plain link either way, so
 * ordering the table needs no JavaScript.
 */
export function sortQuery(current: ListingQuery, key: SortKey): string {
  const direction =
    current.sort === key
      ? current.direction === "asc"
        ? "desc"
        : "asc"
      : DEFAULT_DIRECTION[key];

  const params = new URLSearchParams();
  if (current.search !== "") params.set("q", current.search);
  // Carried first so the refined route knows which catalogue it is reordering.
  if (current.preset !== "") params.set("preset", current.preset);
  params.set("sort", key);
  params.set("dir", direction);

  return params.toString();
}

/** Looks a token up in a list already fetched, so a detail page costs no call. */
export function findToken(
  tokens: readonly Token[],
  id: string,
): Token | undefined {
  return tokens.find((token) => token.id === id);
}
