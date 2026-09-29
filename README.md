# Atlas

A public token catalogue: search, filter, a page per token, and a link out to
where you can buy it.

What it sets out to prove: **the HTML of a token page arrives with the data
already inside it** — measured, under a performance budget that fails CI when it
is exceeded. Search, filtering and sorting are URL parameters answered by the
server, so they work with JavaScript turned off.

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
- `src/modules/catalog/data/` is the only place that talks to CoinGecko. Responses
  are validated before entering the domain, and mapped onto domain types — the
  raw upstream JSON never reaches a component.

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

Two environment variables hold the budget, validated in
[`env.ts`](src/shared/config/env.ts) with a 250 ceiling and a 60 s floor:

|                              | `ATLAS_TOKEN_COUNT` | `ATLAS_LISTING_REVALIDATE_SECONDS`  |
| ---------------------------- | ------------------- | ----------------------------------- |
| Default — development and CI | 10                  | 600                                 |
| Production — set in Vercel   | 250                 | 600, the default: no need to set it |

The interval is the same everywhere, so going to production is one variable. The
defaults are the development ones on purpose, so a CI build cannot quietly spend
250 detail calls. That leaves ~4,600 calls of headroom, roughly 18 builds that
prerender token pages: the ceiling is CI's, not the revalidation's.

The defaults are the development ones on purpose, so a CI build cannot quietly
spend 250 detail calls. Going to production means changing two variables, not
editing code.

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

Lighthouse CI runs in GitHub Actions against the Vercel preview deploy and
**fails the job** when a threshold is exceeded. At minimum: LCP, CLS and
JavaScript bytes on a token page.

`TODO(pablo):` thresholds get set from the first deploy's measurement, and only
ever move down from there. Numbers written before a measurement exists would be
invented.

A unit test opens the built HTML of a token page and looks for the price inside
it. If a stray `"use client"` pushes the data to the browser, that test goes red
before any metric does.

## Layout

```
src/
├─ app/        routing and composition only
├─ modules/    one folder per domain; each exposes its API in index.ts
│              domain/ pure TS · data/ the only I/O · ui/ props in, markup out
└─ shared/     ui primitives and config, never imports from modules/
```

The dependency direction is enforced by `eslint-plugin-boundaries`, so a
violation fails `npm run lint` rather than a review.
