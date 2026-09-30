export type PricePoint = {
  /** Unix milliseconds. */
  readonly at: number;
  readonly price: number;
};

export const HISTORY_RANGES = ["1d", "7d", "30d"] as const;

export type HistoryRange = (typeof HISTORY_RANGES)[number];

export const DEFAULT_HISTORY_RANGE: HistoryRange = "7d";

const RANGE_DAYS: Record<HistoryRange, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
};

export const RANGE_LABEL: Record<HistoryRange, string> = {
  "1d": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
};

const DAY_MS = 86_400_000;

/**
 * Cuts the series at the last complete UTC day.
 *
 * The chart refreshes once a day, so its right edge would otherwise be a partial
 * day drawn at the same weight as the complete ones — a dip that is not a dip,
 * just an afternoon. Ending at midnight makes the chart honest about what it
 * knows, and the live price above it is the number that moves.
 */
export function toCompleteDays(
  history: readonly PricePoint[],
  now: number,
): PricePoint[] {
  const lastMidnight = Math.floor(now / DAY_MS) * DAY_MS;

  return history.filter((point) => point.at < lastMidnight);
}

/** The tail of the series covering one range, measured back from its own end. */
export function sliceRange(
  history: readonly PricePoint[],
  range: HistoryRange,
): PricePoint[] {
  const last = history.at(-1);
  if (last === undefined) return [];

  const from = last.at - RANGE_DAYS[range] * DAY_MS;

  return history.filter((point) => point.at >= from);
}

/**
 * Thins a series to at most `maxPoints`, keeping the first and the last.
 *
 * 30 days arrive as 720 hourly points. Drawing every one of them into an SVG
 * path costs bytes on a page with a byte budget and buys nothing: at chart width
 * they land on top of each other.
 */
export function downsample(
  history: readonly PricePoint[],
  maxPoints: number,
): PricePoint[] {
  if (maxPoints < 2 || history.length <= maxPoints) return [...history];

  const step = (history.length - 1) / (maxPoints - 1);

  return Array.from({ length: maxPoints }, (_, index) => {
    const point = history[Math.round(index * step)];
    // The arithmetic above can only land inside the array, but the index type
    // does not know that and a silent undefined would draw a broken path.
    if (point === undefined) throw new Error("downsample index out of range");
    return point;
  });
}

/**
 * The three ranges, each already sliced and thinned.
 *
 * Built on the server so only what is drawn crosses to the client: 30 days of
 * hourly prices is 720 points, and the chart never shows more than a fraction of
 * them at once. Prices are rounded too — upstream sends seventeen significant
 * digits, and a chart cannot draw the seventeenth.
 */
export type RangedHistory = Record<HistoryRange, PricePoint[]>;

export function toRangedHistory(
  history: readonly PricePoint[],
  maxPoints: number,
): RangedHistory {
  const build = (range: HistoryRange) =>
    downsample(sliceRange(history, range), maxPoints).map((point) => ({
      at: point.at,
      price: Number(point.price.toPrecision(8)),
    }));

  return { "1d": build("1d"), "7d": build("7d"), "30d": build("30d") };
}
