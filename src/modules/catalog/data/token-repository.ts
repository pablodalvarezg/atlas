import "server-only";

import { z } from "zod";

import {
  marketsResponseSchema,
  toToken,
} from "@modules/catalog/data/coingecko-schema";
import { findToken } from "@modules/catalog/domain/listing";
import type { Token } from "@modules/catalog/domain/token";
import { env } from "@shared/config/env";

/*
 * The only place in Atlas that talks to CoinGecko.
 *
 * One call feeds the whole catalogue and every token page. /coins/markets
 * already returns price, market cap, rank, supply, the 24h range, ATH/ATL and a
 * 7-day sparkline, so a per-token call would be 250 × 24 × 30 = 180,000 requests
 * a month against a 10,000 credit cap. See "El contrato con CoinGecko" in
 * CLAUDE.md for the arithmetic.
 */
const MARKETS_ENDPOINT = "https://api.coingecko.com/api/v3/coins/markets";

type MarketsQuery = {
  readonly perPage: number;
  /** A CoinGecko category id, or undefined for the whole market. */
  readonly category?: string;
  /** A single coin id, for resolving a token the listing does not carry. */
  readonly ids?: string;
};

function buildUrl({ perPage, category, ids }: MarketsQuery): URL {
  const url = new URL(MARKETS_ENDPOINT);

  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("order", "market_cap_desc");
  // One credit per call regardless of page size, so this number is about build
  // time and payload weight, not quota. 10 in development, 250 in production.
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", "1");
  // A category is a different upstream URL, so it is a cache entry -- and a
  // credit -- of its own. That is why presets revalidate far more slowly.
  if (category !== undefined) url.searchParams.set("category", category);
  if (ids !== undefined) url.searchParams.set("ids", ids);
  // The sparkline rides along on this same call; fetching it separately would
  // double the cost of the one request the whole catalogue depends on.
  url.searchParams.set("sparkline", "true");
  // Four windows for the price of the one credit this call already costs.
  url.searchParams.set("price_change_percentage", "1h,24h,7d,30d");

  return url;
}

/*
 * A stalled connection would otherwise sit on undici's 300 s default, which
 * during `next build` means a five-minute pause before anything is reported.
 */
const REQUEST_TIMEOUT_MS = 8_000;

/** Retried once, never in a loop: a failed request still costs a credit. */
const RETRY_DELAY_MS = 1_500;

const isWorthRetrying = (status: number) => status === 429 || status >= 500;

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function requestMarkets(
  query: MarketsQuery,
  revalidate: number,
  tag: string,
): Promise<Response> {
  return fetch(buildUrl(query), {
    // The key goes in the header: as a query parameter it would end up in logs
    // and in Next's cache key.
    headers: env.COINGECKO_API_KEY
      ? { "x-cg-demo-api-key": env.COINGECKO_API_KEY }
      : {},
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: {
      /*
       * 600 s: 4,320 calls a month, 43% of the Demo plan's cap. Anything under
       * 60 s buys nothing because upstream data is not fresher than that, and
       * 300 s would take 86% of the quota and leave roughly one CI build of
       * headroom. A ceiling rather than a forecast — ISR only revalidates when a
       * request arrives.
       */
      revalidate,
      // Named so phase 2's scheduled ingest can invalidate one without the rest.
      tags: [tag],
    },
  });
}

async function fetchMarkets(
  query: MarketsQuery,
  revalidate: number,
  tag: string,
): Promise<Token[]> {
  let response = await requestMarkets(query, revalidate, tag);

  /*
   * Exactly one retry, and only for the statuses that mean "try again": a rate
   * limit or an upstream fault. Two attempts cost at most two credits out of
   * 10,000, which is worth it because the alternative is a failed deploy of an
   * unrelated change. A real outage still fails the build, and that is the
   * intended behaviour — shipping an empty catalogue that then sits in the edge
   * cache for ten minutes is worse than not shipping.
   */
  if (!response.ok && isWorthRetrying(response.status)) {
    await wait(RETRY_DELAY_MS);
    response = await requestMarkets(query, revalidate, tag);
  }

  if (!response.ok) {
    // A plain Error: nothing catches this by type, and a subclass that nobody
    // distinguishes is a class for nobody. Give it one when a caller needs it.
    throw new Error(
      `CoinGecko replied ${response.status} ${response.statusText}`,
    );
  }

  const parsed = marketsResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw new Error(
      `CoinGecko returned an unexpected shape:\n${z.prettifyError(parsed.error)}`,
    );
  }

  return parsed.data.map(toToken);
}

/** The catalogue: every token Atlas lists, at the listing's own freshness. */
export async function fetchTokens(): Promise<Token[]> {
  return fetchMarkets(
    { perPage: env.ATLAS_TOKEN_COUNT },
    env.ATLAS_LISTING_REVALIDATE_SECONDS,
    "catalog-markets",
  );
}

/*
 * A preset: the top tokens of one CoinGecko category, as many as the listing.
 *
 * Every category is a distinct upstream URL, so it is a distinct cache entry and
 * a distinct credit. An hour rather than ten minutes because a category's top
 * page does not reshuffle in ten minutes: 720 calls a month each, against the
 * 4,320 the main listing spends.
 */
const PRESET_REVALIDATE_SECONDS = 3_600;

export async function fetchCategoryTokens(
  categoryId: string,
): Promise<Token[]> {
  return fetchMarkets(
    { perPage: env.ATLAS_TOKEN_COUNT, category: categoryId },
    PRESET_REVALIDATE_SECONDS,
    `catalog-category-${categoryId}`,
  );
}

/*
 * One token by id, for the ones the listing does not carry.
 *
 * A preset links to tokens outside the top ATLAS_TOKEN_COUNT, and so does any
 * bookmark from when the ranking was different. Resolving those against the
 * listing alone left the links dead — measured at 36 of them in development.
 *
 * Same endpoint, same schema, same mapper as the catalogue: `ids=` filters
 * /coins/markets to one coin. It is a credit, but only for a token nobody
 * listed, cached for a day and shared by everyone who opens that page.
 */
const SINGLE_TOKEN_REVALIDATE_SECONDS = 86_400;

export async function fetchTokenById(id: string): Promise<Token | null> {
  // The listing first, because it is already cached and costs nothing. Only a
  // token nobody listed reaches the second call.
  const listed = findToken(await fetchTokens(), id);
  if (listed !== undefined) return listed;

  const tokens = await fetchMarkets(
    { perPage: 1, ids: id },
    SINGLE_TOKEN_REVALIDATE_SECONDS,
    `catalog-token-${id}`,
  );

  return tokens[0] ?? null;
}
