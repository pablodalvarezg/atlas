/**
 * Fiat conversion, for information.
 *
 * Atlas prices everything in USD because that is what the catalogue is fetched
 * in. This module turns one of those prices into another currency, so a reader
 * outside the dollar does not have to do it in their head.
 *
 * It is not a quote and nobody trades on it. That is why a rate a few hours old
 * is fine, and why the UI says so.
 */
export const CURRENCIES = [
  "usd",
  "eur",
  "gbp",
  "jpy",
  "cny",
  "krw",
  "brl",
  "ars",
  "clp",
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

export const CURRENCY_LABEL: Record<CurrencyCode, string> = {
  usd: "US dollar",
  eur: "Euro",
  gbp: "Pound sterling",
  jpy: "Japanese yen",
  cny: "Chinese yuan",
  krw: "South Korean won",
  brl: "Brazilian real",
  ars: "Argentine peso",
  clp: "Chilean peso",
};

/** How much one bitcoin is worth in each currency, which is what upstream sends. */
export type BitcoinRates = Partial<Record<CurrencyCode, number>>;

export const isCurrencyCode = (value: string): value is CurrencyCode =>
  (CURRENCIES as readonly string[]).includes(value);

/**
 * Converts a USD amount using bitcoin-denominated rates.
 *
 * Both sides are quoted against the same asset, so bitcoin cancels out and the
 * result is a plain USD→target cross rate. Returns null rather than a wrong
 * number when either side is missing, so the UI can say it does not know.
 */
export function convertFromUsd(
  amountUsd: number,
  to: CurrencyCode,
  rates: BitcoinRates,
): number | null {
  const usdPerBitcoin = rates.usd;
  const targetPerBitcoin = rates[to];

  if (
    usdPerBitcoin === undefined ||
    targetPerBitcoin === undefined ||
    usdPerBitcoin === 0
  ) {
    return null;
  }

  return (amountUsd * targetPerBitcoin) / usdPerBitcoin;
}

/**
 * Formats in the target currency, letting Intl decide the decimals: yen, won and
 * Chilean pesos have none, and forcing two would invent precision.
 */
export function formatCurrency(
  value: number,
  currency: CurrencyCode,
  locale: string,
): string {
  const absolute = Math.abs(value);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    // Small values would otherwise round to zero in currencies with no decimals.
    maximumFractionDigits: absolute > 0 && absolute < 1 ? 6 : undefined,
  }).format(value);
}
