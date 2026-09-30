"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type { TooltipContentProps } from "recharts";

/*
 * shadcn/ui's chart primitives, copied in rather than installed: shadcn is a
 * registry of source, not a dependency. Recharts underneath is the dependency,
 * and ADR 0003 records what it costs.
 *
 * Reduced to one series. Upstream routes colour through a config object, a React
 * context and an injected `--color-<dataKey>` custom property, which is what lets
 * a five-series chart name its colours once. Atlas draws one line whose colour is
 * already computed as a token reference, so that chain was a variable pointing at
 * a variable: the colour is a prop here instead.
 *
 * If a chart here ever needs several series, upstream's version is public and
 * copying it back is mechanical.
 */

export function ChartContainer({
  className = "",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  return (
    <div
      data-slot="chart"
      className={`flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-[var(--color-content-muted)] [&_.recharts-cartesian-grid_line]:stroke-[var(--color-border)] [&_.recharts-surface]:outline-hidden ${className}`}
      {...props}
    >
      <RechartsPrimitive.ResponsiveContainer>
        {children}
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
  name,
  colour,
}: Partial<TooltipContentProps<number, string>> & {
  /** What the value is called in the card, e.g. "Price". */
  readonly name: string;
  /** Any CSS colour, for the indicator square. */
  readonly colour: string;
}) {
  if (!active || !payload?.length) return null;

  const [entry] = payload;
  if (entry === undefined) return null;

  return (
    <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-xl">
      {label !== undefined && (
        <div className="font-medium">
          {labelFormatter ? labelFormatter(label, payload) : String(label)}
        </div>
      )}
      <div className="flex w-full items-center gap-2">
        <div
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: colour }}
        />
        <div className="flex flex-1 items-center justify-between gap-2 leading-none">
          <span className="text-content-muted">{name}</span>
          <span className="font-mono font-medium text-content tabular-nums">
            {formatter
              ? String(
                  formatter(
                    entry.value as number,
                    entry.name as string,
                    entry,
                    0,
                    payload,
                  ),
                )
              : String(entry.value)}
          </span>
        </div>
      </div>
    </div>
  );
}
