import "server-only";

import { z } from "zod";

import {
  marketsResponseSchema,
  toToken,
} from "@modules/catalog/data/coingecko-schema";
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

export class TokenRepositoryError extends Error {}

function buildUrl(): URL {
  const url = new URL(MARKETS_ENDPOINT);

  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("order", "market_cap_desc");
  // One credit per call regardless of page size, so this number is about build
  // time and payload weight, not quota. 10 in development, 250 in production.
  url.searchParams.set("per_page", String(env.ATLAS_TOKEN_COUNT));
  url.searchParams.set("page", "1");
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

async function requestMarkets(): Promise<Response> {
  return fetch(buildUrl(), {
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
      revalidate: env.ATLAS_LISTING_REVALIDATE_SECONDS,
      // Named so phase 2's scheduled ingest can invalidate it on demand.
      tags: ["catalog-markets"],
    },
  });
}

export async function fetchTokens(): Promise<Token[]> {
  let response = await requestMarkets();

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
    response = await requestMarkets();
  }

  if (!response.ok) {
    throw new TokenRepositoryError(
      `CoinGecko replied ${response.status} ${response.statusText}`,
    );
  }

  const parsed = marketsResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw new TokenRepositoryError(
      `CoinGecko returned an unexpected shape:\n${z.prettifyError(parsed.error)}`,
    );
  }

  return parsed.data.map(toToken);
}
