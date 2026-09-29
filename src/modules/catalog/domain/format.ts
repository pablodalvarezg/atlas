/*
 * Region is not optional in a locale tag: plain `en` leaves grouping and
 * currency placement to the runtime, `en-US` pins 1200 to "$1,200.00".
 *
 * The domain owns this constant instead of importing `shared/config/site`,
 * because domain is pure TypeScript and that module reads the environment at
 * import time. If the two ever need to agree, the page passes the locale down.
 */
export const LOCALE = "en-US";

const CURRENCY = "USD";

/** What a missing value renders as, so a cell never shows "null". */
export const EMPTY = "—";

export function formatPrice(value: number | null): string {
  if (value === null) return EMPTY;

  // Crypto prices span nine orders of magnitude. A fixed two decimals would
  // render most of the long tail as "$0.00".
  const digits = value >= 1 ? 2 : value >= 0.01 ? 4 : 8;

  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Market caps and volumes run to twelve digits; no column wants them spelled out. */
export function formatCompactUsd(value: number | null): string {
  if (value === null) return EMPTY;

  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

/** Upstream sends 2.34 meaning 2.34%, so it is divided before formatting. */
export function formatPercentage(value: number | null): string {
  if (value === null) return EMPTY;

  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    signDisplay: "exceptZero",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function formatSupply(value: number | null): string {
  if (value === null) return EMPTY;

  return new Intl.NumberFormat(LOCALE, {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}
