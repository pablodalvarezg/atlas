import "server-only";

import { z } from "zod";

import {
  type BitcoinRates,
  CURRENCIES,
  isCurrencyCode,
} from "@modules/currency/domain/currency";
import { env } from "@shared/config/env";

/*
 * One call for every currency and every token.
 *
 * /exchange_rates quotes everything against bitcoin, so a single response gives
 * the cross rate between any pair. It is not per token, which is what makes the
 * converter almost free: 120 calls a month at six hours, about 1% of the cap.
 *
 * Six hours because this is information, not a quote. Nobody trades on it, and
 * the page says as much.
 */
const RATES_ENDPOINT = "https://api.coingecko.com/api/v3/exchange_rates";
const RATES_REVALIDATE_SECONDS = 21_600;
const REQUEST_TIMEOUT_MS = 8_000;

const ratesSchema = z.object({
  rates: z.record(z.string(), z.object({ value: z.number() })),
});

/** Returns what it could read. An empty object means the converter stays quiet. */
export async function fetchBitcoinRates(): Promise<BitcoinRates> {
  try {
    const response = await fetch(RATES_ENDPOINT, {
      headers: env.COINGECKO_API_KEY
        ? { "x-cg-demo-api-key": env.COINGECKO_API_KEY }
        : {},
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: {
        revalidate: RATES_REVALIDATE_SECONDS,
        tags: ["currency-rates"],
      },
    });

    if (!response.ok) return {};

    const parsed = ratesSchema.safeParse(await response.json());

    if (!parsed.success) {
      console.error(
        `CoinGecko exchange_rates returned an unexpected shape:\n${z.prettifyError(parsed.error)}`,
      );
      return {};
    }

    // Upstream sends 76 currencies; carrying the 67 Atlas does not offer would
    // be dead weight in every token page's payload.
    const wanted: BitcoinRates = {};

    for (const [code, rate] of Object.entries(parsed.data.rates)) {
      if (isCurrencyCode(code) && CURRENCIES.includes(code)) {
        wanted[code] = rate.value;
      }
    }

    return wanted;
  } catch (error) {
    console.error("CoinGecko exchange_rates failed:", error);
    return {};
  }
}
