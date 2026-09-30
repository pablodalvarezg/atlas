import "server-only";

import { z } from "zod";

import {
  tickersResponseSchema,
  toVenueCandidate,
} from "@modules/markets/data/coingecko-tickers";
import { selectVenues, type Venue } from "@modules/markets/domain/venue";
import { env } from "@shared/config/env";

/*
 * The only place that asks CoinGecko where a token trades.
 *
 * Unlike the catalogue, this is one call per token — the expensive shape. The
 * arithmetic that makes it affordable: 250 tokens revalidated weekly is
 * 250 × 30/7 ≈ 1,071 calls a month, about 11% of the 10,000 credit cap. Daily
 * would be 7,500 and would not fit beside the listing's 4,320.
 *
 * Venues move far more slowly than prices, so a week is not a compromise here.
 */
const VENUE_REVALIDATE_SECONDS = 604_800;

const REQUEST_TIMEOUT_MS = 8_000;

const endpoint = (tokenId: string) =>
  `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(tokenId)}/tickers`;

/**
 * Returns the venues worth linking to, or an empty list.
 *
 * It never throws: "where to buy" is one section of a token page, and an
 * upstream hiccup there must not take down a page whose price, market cap and
 * supply all rendered fine. That is the opposite of the listing, where failing
 * the build is correct because there is nothing left to show.
 */
export async function fetchVenues(tokenId: string): Promise<Venue[]> {
  const url = new URL(endpoint(tokenId));
  // Ranked upstream so the first page is already the part worth showing.
  url.searchParams.set("order", "trust_score_desc");
  url.searchParams.set("depth", "false");

  try {
    const response = await fetch(url, {
      headers: env.COINGECKO_API_KEY
        ? { "x-cg-demo-api-key": env.COINGECKO_API_KEY }
        : {},
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: {
        revalidate: VENUE_REVALIDATE_SECONDS,
        // Per token, so phase 2 can refresh one without touching the rest.
        tags: [`markets-venues-${tokenId}`],
      },
    });

    if (!response.ok) return [];

    const parsed = tickersResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      // Loud in the log, quiet on the page: a shape change here is a bug to
      // fix, not a reason to deny the visitor the rest of the token page.
      console.error(
        `CoinGecko tickers for ${tokenId} returned an unexpected shape:\n${z.prettifyError(parsed.error)}`,
      );
      return [];
    }

    return selectVenues(parsed.data.tickers.map(toVenueCandidate));
  } catch (error) {
    console.error(`CoinGecko tickers for ${tokenId} failed:`, error);
    return [];
  }
}
