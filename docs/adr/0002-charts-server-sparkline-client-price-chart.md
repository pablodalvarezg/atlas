# 0002 — Server-rendered sparklines, a real chart library for the price chart

Status: accepted — 2026-09-29

## Context

The brief bans charting libraries outright, on the grounds that "a sparkline is
an SVG `<path>` computed on the server, and a chart library is tens of KB of
JavaScript on the page that has a budget". That rule is right about the
sparkline and too broad about everything else: it would also rule out the chart a
crypto catalogue is expected to have, and it would leave the project unable to
demonstrate the tooling its author would actually reach for.

Sizes were measured rather than recalled (Bundlephobia, 2026-09-29):

| Library                           | Version | Minified | Gzipped  |
| --------------------------------- | ------- | -------- | -------- |
| `@visx/shape`                     | 4.0.0   | 35.6 KB  | 10.7 KB  |
| `lightweight-charts`              | 5.2.1   | 194 KB   | 61.6 KB  |
| `recharts` (what shadcn/ui wraps) | 3.10.1  | 566 KB   | 151.5 KB |
| `echarts`                         | 6.1.0   | 1.11 MB  | 368 KB   |

## Decision

**Two different charts, two different answers.**

**The 7-day sparkline in the listing stays a server-computed SVG path.** This is
not asceticism: the listing renders up to 250 rows, and a chart library there
means 250 chart instances mounted on the client. No real dashboard does that —
sparkline columns are inline SVG precisely because that is what scales. The
implementation is 19 lines of pure TypeScript in `catalog/domain`, unit-tested by
asserting the path string, and it ships no JavaScript at all.

**The token page gets an interactive price chart built on TradingView
Lightweight Charts**, which is what crypto products actually use: canvas-based,
purpose-built for financial series, with candlesticks, volume and a time scale.
Recharts is a general dashboard library doing an impression of a financial chart,
at 2.5× the weight.

**The chart is a progressive enhancement, not the data.** Price, market cap,
supply and ranges are rendered on the server as text. The chart mounts beside
them. Turning JavaScript off costs the reader the chart and nothing else.

## Consequences

- The thesis is unchanged and the phase 1 test still proves it: the price is in
  the server HTML, so a stray `"use client"` around the numbers still goes red.
- The token page carries ~61.6 KB gz of client JavaScript that the listing does
  not. **This is the first thing the Lighthouse budget has to account for**, and
  the reason the budget's thresholds get measured on a token page specifically.
- The chart is a client component, loaded below the fold, and must not be
  imported by anything the listing renders.
- `CLAUDE.md` changes in two places: chart libraries are no longer a blanket ban,
  and "heavy interactive charts" leaves the out-of-scope list.
- If the budget later says the chart does not fit, the thing that gets dropped is
  the chart, not the server-rendered numbers.
