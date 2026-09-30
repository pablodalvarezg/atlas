import "server-only";

import {
  type PricePoint,
  toCompleteDays,
} from "@modules/catalog/domain/price-history";
import { env } from "@shared/config/env";

import { z } from "zod";

/*
 * Thirty days of prices, in one call, for all three ranges.
 *
 * `days=30` comes back as 720 hourly points (measured), so 24 hours, 7 days and
 * 30 days are all slices of this one payload. Asking for each range separately
 * would be four calls per token for data we already have.
 */
const MARKET_CHART_ENDPOINT = (tokenId: string) =>
  `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(tokenId)}/market_chart`;

const HISTORY_DAYS = 30;

/*
 * Once a day.
 *
 * This is the one call that scales with visitors rather than with time: the
 * ceiling is (tokens visited in a window) × (windows a month). At 24 hours that
 * is 30 windows, so twenty popular tokens cost about 600 calls a month, 6% of
 * the cap; an hourly refresh would be 14,400 and would not fit.
 *
 * The chart can afford to be a day old because it is not the fresh number: the
 * price above it comes from the listing and is at most ten minutes behind. The
 * series is cut at the last complete day so the chart says as much.
 */
const HISTORY_REVALIDATE_SECONDS = 86_400;

const REQUEST_TIMEOUT_MS = 8_000;

const marketChartSchema = z.object({
  /** [unix milliseconds, price] pairs, oldest first. */
  prices: z.array(z.tuple([z.number(), z.number()])),
});

/**
 * Returns the price history, or an empty series.
 *
 * Like the venues, it never throws: the chart is one section of a token page,
 * and losing it must not take down a page whose price and market cap rendered.
 */
export async function fetchPriceHistory(
  tokenId: string,
): Promise<PricePoint[]> {
  const url = new URL(MARKET_CHART_ENDPOINT(tokenId));
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("days", String(HISTORY_DAYS));

  try {
    const response = await fetch(url, {
      headers: env.COINGECKO_API_KEY
        ? { "x-cg-demo-api-key": env.COINGECKO_API_KEY }
        : {},
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: {
        revalidate: HISTORY_REVALIDATE_SECONDS,
        tags: [`catalog-history-${tokenId}`],
      },
    });

    if (!response.ok) return [];

    const parsed = marketChartSchema.safeParse(await response.json());

    if (!parsed.success) {
      console.error(
        `CoinGecko market_chart for ${tokenId} returned an unexpected shape:\n${z.prettifyError(parsed.error)}`,
      );
      return [];
    }

    // Cut here, where impurity already lives: the fetch is what knows when it
    // happened, and with a daily revalidate the cut lands on the same cadence.
    return toCompleteDays(
      parsed.data.prices.map(([at, price]) => ({ at, price })),
      Date.now(),
    );
  } catch (error) {
    console.error(`CoinGecko market_chart for ${tokenId} failed:`, error);
    return [];
  }
}
