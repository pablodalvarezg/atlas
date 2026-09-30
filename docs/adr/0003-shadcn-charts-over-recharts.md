# 0003 — shadcn/ui charts over Recharts for the token page

Status: accepted — 2026-09-29. Supersedes the chart half of
[ADR 0002](0002-charts-server-sparkline-client-price-chart.md).

## Context

ADR 0002 chose a server-rendered SVG chart for the token page and kept every
charting library out. That version shipped: line, area, axes, grid, three ranges
switched by CSS, and hover readings pre-formatted by the server. It cost no
JavaScript at all.

It was rejected on its looks and on the work it would take to keep. The argument
against it is real and it is not about this chart: a hand-rolled chart has no
ecosystem. Every later want — a second series, a brush, a reference line, a
legend — is a fresh problem with no documentation and no one else's bug reports.
A team inheriting it inherits a private charting library.

Atlas also exists to be read by people deciding whether its author can build what
they need. "Wrote his own chart" and "used the components the ecosystem uses" are
different signals, and only one of them is the common case.

## Decision

**The token page's price chart is shadcn/ui's chart components over Recharts.**

shadcn is a source registry, not a dependency: `ChartContainer` and
`ChartTooltipContent` are copied into `shared/ui/chart.tsx` and can be edited.
Recharts is the actual dependency.

**What did not move:** the price, market capitalisation, supply, ranges and
all-time figures are still server-rendered text on a prerendered page. The chart
is an addition beside them, not the thing that carries the data.

## Consequences

- **JavaScript on a token page went from 177,054 to 288,986 bytes gzipped, +63%.**
  Both numbers were measured on a production build, not estimated. Less than the
  151.5 KB Recharts' own bundle size suggests, because only `AreaChart`, `Area`,
  `CartesianGrid`, `XAxis` and `YAxis` are imported.
- The performance budget test went red before this landed, which is what it is
  for. The threshold moved to 300,000 as a recorded decision, then back to
  290,000 once the trim below landed. It only goes down from there.
- **The thesis and its test are untouched.** `prerendered-html.test.ts` still
  finds the price in the built HTML, because the figures never depended on the
  chart. What changed is that the chart's own series is now serialised into the
  RSC payload and drawn in the browser.
- Range switching is client state. It still costs no CoinGecko call: all three
  ranges are slices of the same thirty days, fetched once and cached for a day.
- **shadcn's primitives were reduced to one series on 2026-09-30.** Upstream
  routes colour through a config object, a React context and an injected
  `--color-<dataKey>` custom property, which is what lets a five-series chart name
  its colours once. Atlas draws one line whose colour is already a token
  reference, so that chain was a variable pointing at a variable. Removing it
  returned **8,619 gzipped bytes** and let `clsx` and `tailwind-merge` — pulled in
  only for shadcn's `cn()`, with two call sites — go with it. Dependencies are
  back to five. Upstream's file is public if a second series ever arrives.
- `CLAUDE.md`'s rule against chart libraries now applies only to the listing,
  where 250 rows would mean 250 chart instances. That is unchanged and not up for
  revisiting: the sparkline column stays a server-computed SVG path.
- If Lighthouse later shows the token page's LCP suffering on a slow connection,
  the chart is the first thing to load lazily or drop — not the figures.
