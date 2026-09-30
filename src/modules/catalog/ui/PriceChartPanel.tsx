"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  formatHour,
  formatPrice,
  formatShortDate,
} from "@modules/catalog/domain/format";
import {
  DEFAULT_HISTORY_RANGE,
  HISTORY_RANGES,
  type HistoryRange,
  RANGE_LABEL,
  type RangedHistory,
} from "@modules/catalog/domain/price-history";
import { SegmentedControl } from "@shared/ui/SegmentedControl";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@shared/ui/chart";

type Props = {
  readonly tokenName: string;
  /**
   * Each range already sliced, thinned and rounded by the server, so the RSC
   * payload carries what is drawn rather than thirty days of raw hourly prices.
   */
  readonly series: RangedHistory;
};

/*
 * The price chart, on shadcn/ui's chart components over Recharts.
 *
 * This is the one place in Atlas where data reaches the browser to be drawn
 * there: the range is client state and the series is serialised into the RSC
 * payload. ADR 0003 records the decision and what it cost. The figures above it
 * — price, market cap, supply, ranges — stay server-rendered text, so the thesis
 * and the test that guards it are untouched.
 *
 * All three ranges are slices of the same thirty days already fetched, so
 * switching costs no CoinGecko call, and the range you are already on is
 * disabled rather than re-selected.
 */
export function PriceChartPanel({ tokenName, series }: Props) {
  const [range, setRange] = useState<HistoryRange>(DEFAULT_HISTORY_RANGE);

  const points = series[range];
  const lastPoint = series["30d"].at(-1);

  // Green up, red down, across the window on screen: on a price chart the
  // direction is the first thing being read, so it carries the colour.
  const first = points[0]?.price ?? 0;
  const last = points.at(-1)?.price ?? 0;
  const colour =
    last > first
      ? "var(--color-positive)"
      : last < first
        ? "var(--color-negative)"
        : "var(--color-content-muted)";

  // No top margin: the grid in TokenDetail owns the spacing now.
  return (
    <section aria-labelledby="chart-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="chart-heading" className="text-sm font-medium">
          Price history
        </h2>
        {lastPoint !== undefined && (
          <p className="max-w-prose text-xs text-content-muted">
            Chart data refreshes once a day and ends on{" "}
            <time dateTime={new Date(lastPoint.at).toISOString()}>
              {formatShortDate(lastPoint.at)}
            </time>
            , the last complete day. Times are UTC. The price above is live.
          </p>
        )}
      </div>

      <SegmentedControl
        label={`Chart range for ${tokenName}`}
        options={HISTORY_RANGES.map((option) => ({
          value: option,
          label: RANGE_LABEL[option],
        }))}
        value={range}
        onChange={setRange}
        className="mt-3 inline-flex gap-1 rounded-lg bg-surface-muted p-1"
        optionClassName={(active) =>
          `rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            active
              ? "bg-surface text-content shadow-sm"
              : "cursor-pointer text-content-muted hover:text-content"
          }`
        }
      />

      {points.length < 2 ? (
        <p className="py-8 text-sm text-content-muted">
          No price history available for this window.
        </p>
      ) : (
        <ChartContainer className="mt-4 aspect-auto h-[260px] w-full">
          <AreaChart data={points} margin={{ left: 4, right: 4, top: 8 }}>
            <defs>
              <linearGradient id="price-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colour} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colour} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} strokeDasharray="3 3" />

            <XAxis
              dataKey="at"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={range === "1d" ? formatHour : formatShortDate}
            />
            <YAxis
              dataKey="price"
              domain={["dataMin", "dataMax"]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={76}
              orientation="right"
              tickFormatter={formatPrice}
            />

            <ChartTooltip
              cursor={{ stroke: "var(--color-border)" }}
              content={
                <ChartTooltipContent
                  name="Price"
                  colour={colour}
                  labelFormatter={(value) =>
                    `${formatShortDate(Number(value))}, ${formatHour(Number(value))} UTC`
                  }
                  formatter={(value) => formatPrice(Number(value))}
                />
              }
            />

            <Area
              dataKey="price"
              type="monotone"
              stroke={colour}
              strokeWidth={2}
              fill="url(#price-fill)"
              fillOpacity={0.4}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </section>
  );
}
