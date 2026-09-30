# Atlas

A public token catalogue: search, filter, a page per token, and a link out to
where you can buy it.

What it sets out to prove: **the HTML of a token page arrives with the data
already inside it** — measured, under a performance budget that fails CI when it
is exceeded. Search, filtering and sorting are URL parameters answered by the
server, so they work with JavaScript turned off.

A token page adds an interactive price chart, a fiat converter for nine
currencies, and the venues where it trades — all beside server-rendered figures
rather than instead of them.

Not a portfolio tracker, not financial advice, no accounts.

## Running it

Requires Node 24.21.0 (`nvm use 24.21.0`).

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script           | What it does                                |
| ---------------- | ------------------------------------------- |
| `npm run dev`    | Dev server                                  |
| `npm run build`  | Production build                            |
| `npm run check`  | `next typegen` then `tsc --noEmit`          |
| `npm run lint`   | ESLint, including the module boundary rules |
| `npm run format` | Prettier                                    |
| `npm test`       | Vitest                                      |

`npm install` approves the install scripts listed under `allowScripts` in
`package.json`. One of them matters: `unrs-resolver` is the native resolver
behind the boundary rules, and **without its postinstall `npm run lint` passes
green without checking any import at all.**

## Where the data comes from

[CoinGecko](https://docs.coingecko.com/), free plan, with an API key.

- The key lives in the environment, validated with Zod in
  [`src/shared/config/env.ts`](src/shared/config/env.ts). Nothing else in the
  codebase reads `process.env`. Copy `.env.example` to `.env.local` to set it.
- Every response is validated with Zod before it enters the domain and mapped
  onto domain types, so the raw upstream JSON never reaches a component. Only
  `data/` layers make requests, and each is marked `server-only`.

Atlas makes five calls in all, each with its own lifetime:

| Endpoint                           | Revalidate | Scope                           | Cost at 250 tokens  |
| ---------------------------------- | ---------- | ------------------------------- | ------------------- |
| `/coins/markets`                   | 600 s      | the whole catalogue             | 4,320/mo (43%)      |
| `/coins/markets?category=…`        | 1 h        | one preset each                 | 720/mo each         |
| `/coins/{id}/tickers`              | 7 days     | **per token**                   | ~1,071/mo (11%)     |
| `/coins/{id}/market_chart?days=30` | 24 h       | **per token**                   | scales with traffic |
| `/exchange_rates`                  | 6 h        | **every currency, every token** | 120/mo (1%)         |

Two of those are worth understanding rather than rediscovering:

- **`market_chart?days=30` covers all three chart ranges.** It returns 720 hourly
  points, so 24 hours, 7 days and 30 days are slices of one payload: switching
  range costs no credit. The slicing happens on the server.
- **The chart scales with visitors, not with time.** The ceiling is (tokens
  visited in a window) × (windows per month). At 24 hours that is 30 windows, so
  twenty popular tokens cost about 600 calls a month.

A build with the defaults costs **24 credits**: one listing, ten tickers, ten
histories, two categories and one rates call.

### The free plan's limits, which are a design input

Verified against the docs on 2026-09-28, Demo plan: **100 calls/min**, **10,000
call credits/month**, upstream data refreshed **every 60 s**, and
`/coins/markets` returns up to **250 coins per call**.

The monthly cap is the binding constraint, not the rate limit — 10,000 a month is
~333 a day, and 100/min would burn the month's quota in 100 minutes. Two things
follow:

- **One upstream call feeds the listing and every token page.** `/coins/markets`
  already returns price, market cap, rank, supply, 24h range, ATH/ATL and a 7-day
  sparkline. One call per token would be 180,000 a month, 18× the quota.
- **`per_page` does not change the price.** One call costs one credit whether it
  returns 10 coins or 250. Listing fewer tokens saves per-token _detail_ calls —
  one each — plus build time and payload weight, not listing credits.
- **The interval is what spends.** 600 s is 4,320 calls/month, 43% of the cap.
  300 s was considered and dropped: 8,640 is 86%, and detail calls on top of that
  leave about one CI build of headroom a month. Both are ceilings, not forecasts —
  ISR revalidates when a request comes in, so a page nobody visits costs nothing.

- **Where-to-buy is the one per-token call.** `/coins/{id}/tickers`, revalidated
  weekly: ~1,071 calls a month at 250 tokens, 11% of the cap. Daily would be
  7,500 and would not fit beside the listing.
- **Every prerendered token page spends one of those at build time.** Measured: a
  build with 10 prerendered pages makes 24 calls: four fixed — the listing, two
  categories and the rates — and **two per page**, tickers and price history.
  That is why the prerender count is its own knob.

Three environment variables hold the budget, validated in
[`env.ts`](src/shared/config/env.ts) with a 250 ceiling and a 60 s floor:

| Variable                           | Dev and CI | Production | What it buys                                                     |
| ---------------------------------- | ---------- | ---------- | ---------------------------------------------------------------- |
| `ATLAS_TOKEN_COUNT`                | 10         | 250        | How many tokens the catalogue lists. Free — one call either way. |
| `ATLAS_PRERENDERED_TOKEN_COUNT`    | 10         | your call  | How many token pages the build prerenders. **One credit each.**  |
| `ATLAS_LISTING_REVALIDATE_SECONDS` | 600        | 600        | How often the listing refreshes. The default everywhere.         |

The defaults are the development ones on purpose, so a CI build cannot quietly
spend 250 credits. Lowering the prerender count never breaks a page:
`dynamicParams` generates the rest on first request and caches them, trading a
cold first visit for a cheaper build. Set it to 0 and a build costs only the
four fixed calls.

### What to set on Vercel

Four variables, and `VERCEL_ENV` is not one of them:

| Variable                        | Value                                              | Who sets it               |
| ------------------------------- | -------------------------------------------------- | ------------------------- |
| `COINGECKO_API_KEY`             | your Demo key                                      | you                       |
| `NEXT_PUBLIC_SITE_URL`          | the canonical origin, e.g. `https://atlas.example` | you                       |
| `ATLAS_TOKEN_COUNT`             | `250`                                              | you                       |
| `ATLAS_PRERENDERED_TOKEN_COUNT` | your call — one credit per page, per build         | you                       |
| `VERCEL_ENV`                    | `production` \| `preview` \| `development`         | **Vercel, automatically** |

`VERCEL_ENV` is a system variable: Vercel injects it at build and at runtime and
it is absent anywhere else, which is what lets the guard tell a deploy from a CI
run. It only appears when **Enable access to System Environment Variables** is
ticked in the project settings — with it off, the guard silently never fires, so
treat it as a safety net rather than the mechanism.

One free-plan constraint worth knowing: **the Demo plan returns no
`trust_score`** — all 100 tickers for bitcoin come back `null`. Venues are
therefore ranked by self-reported volume, which is the thing that rating exists
to correct. An explicit `red` is still refused; absence is not.

A production deploy must also set `NEXT_PUBLIC_SITE_URL`. The build refuses to
proceed without it when `VERCEL_ENV` is `production`, because the localhost
fallback would otherwise end up inside canonical URLs and the sitemap without
anything looking broken.

Caching is three layers, and it is half the project:

1. **Upstream** — each `fetch` carries its own `revalidate`. A token's name and
   its price do not expire at the same time.
2. **Page** — `revalidate` per route. The listing more often than a token page.
3. **Edge** — Next emits `s-maxage` and `stale-while-revalidate` on ISR routes,
   so nobody waits for a regeneration.

Every chosen value carries a comment explaining why.
See [ADR 0001](docs/adr/0001-isr-over-static-export.md) for why this is ISR and
not a static export.

## How the budget is measured

The budget runs on every commit, from [`tests/`](tests/), against build output —
which is why `npm run build` runs before `npm test`, in CI and locally.

| Metric                     | Budget          | Measured |
| -------------------------- | --------------- | -------- |
| JavaScript on a token page | 290,000 gzipped | ~281,000 |
| HTML of a token page       | 10,000 gzipped  | ~8,600   |

Bytes are deterministic, so they need no browser and gate every commit.
`TODO(pablo):` **LCP and CLS** still need Lighthouse CI against a real deploy,
and their thresholds have to come from that first measurement.

### How a budget moves

Only when the test goes red first and the decision is written down with both
measurements. That has already happened three times:

- **JavaScript, 186,000 → 300,000.** The price chart moved to shadcn/ui over
  Recharts: 177,054 → 288,986 bytes gzipped, +63%. Recorded in
  [ADR 0003](docs/adr/0003-shadcn-charts-over-recharts.md). The 177,054 it
  started from is Next's framework floor — React and the router — on a page that
  had no interactive component at all.
- **HTML, 12,000 → 16,000, then back down to 11,000.** Up when the chart gained
  pre-formatted hover readings; down again when the range slicing moved back to
  the server. Handing a client component thirty days of raw hourly prices cost
  about 8,000 bytes; handing it the three ranges already sliced, thinned and
  rounded cost none of them.

That round trip is the rule, not an anecdote: **before raising a budget, cut what
nobody can see.** Coordinate precision, overlapping points, data crossing to the
client that did not need to. On the token page that alone saved 47%.

A budget that only ever ratchets upward is not a budget.

### What guards the thesis

[`prerendered-html.test.ts`](tests/prerendered-html.test.ts) greps the price out
of the HTML `next build` wrote for every token page.

Be precise about what it catches, because the obvious phrasing is wrong: a stray
`"use client"` does **not** remove content from the initial HTML, since client
components are still server-rendered. What it catches is the route ceasing to be
prerendered, and data moving to a browser-side fetch. It was verified by being
made to fail on purpose.

A second guard: `shared/config/env.ts` is marked `server-only`, so a client
component that reaches the configuration fails the build instead of quietly
shipping Zod — measured at 392 KB — to the browser.

## Layout

```
src/
├─ app/        routing and composition only
│              / and /category/* prerendered · /search per request · /token/[id] SSG
├─ modules/    one folder per domain; each exposes its API in index.ts
│              catalog · markets (where to buy) · currency (fiat conversion)
│              domain/ pure TS · data/ the only I/O · ui/ props in, markup out
└─ shared/     ui primitives and config, never imports from modules/
```

The dependency direction is enforced by `eslint-plugin-boundaries`, so a
violation fails `npm run lint` rather than a review. The rules are checked by
writing fixtures that break them on purpose — a boundary plugin that resolves
nothing passes green, and this repo has hit that twice.

### Where the client-side code is

Four files carry `"use client"`, and the list is short on purpose: the site nav
(a layout cannot know the pathname on the server), shadcn's chart primitives,
the chart panel, and the currency converter. **None of them fetch.** Rates and
price series arrive with the page, already sliced by the server, so changing
currency or chart range is arithmetic rather than a request.

## Decisions worth reading

- [ADR 0001](docs/adr/0001-isr-over-static-export.md) — ISR instead of a static
  export, and why the listing is split across two routes.
- [ADR 0002](docs/adr/0002-charts-server-sparkline-client-price-chart.md) — the
  sparkline stays a server-computed SVG path. Its chart half is superseded.
- [ADR 0003](docs/adr/0003-shadcn-charts-over-recharts.md) — the token page's
  chart on shadcn/ui over Recharts, and the 63% it cost.
