# 0001 — ISR instead of `output: 'export'`

Status: accepted — 2026-09-28

## Context

Atlas exists to prove one thing: the HTML of a token page arrives with the data
already inside it, measured, under a performance budget that breaks the build
when it is exceeded. That is the difference from STM, which solves the same
problem by rendering in the browser.

The portfolio repo this project inherits its conventions from is a static export
(`output: 'export'`). Copying that choice would be the cheapest path, and the
thesis would survive: a static export is prerendered HTML.

It fails on freshness. A token catalogue shows prices. With a static export the
only way to update a price is to rebuild and redeploy the whole site, which means
either a build on a schedule for data that moves continuously, or a catalogue
that is visibly wrong. Neither is defensible in an interview.

The alternative that keeps the data fresh — fetching prices in the browser after
load — is exactly what the project exists not to do.

## Decision

Deploy to Vercel with **Incremental Static Regeneration**: pages are prerendered
and revalidate on a timer, per route.

**Cache Components (`cacheComponents` + `partialPrefetching`) is explicitly not
enabled.** Next 16 offers it as the modern ISR equivalent, and it would be the
fashionable answer, but it serves an App Shell for params that
`generateStaticParams` did not list: the first visitor to such a token gets HTML
containing Suspense fallbacks, and the price streams in afterwards. That is a
weaker claim than the one Atlas is making, and it would make the test that greps
the price out of the built HTML pass or fail depending on which token it picked.
Classic ISR — `generateStaticParams` plus a route-level `revalidate` — produces
HTML with the values in it for every prerendered route.

## Consequences

- The browser still receives the data inside the HTML. The thesis holds, with an
  expiry date attached.
- **The first visitor after the cache expires gets the stale page** while the new
  one regenerates in the background. This is the correct behaviour and it goes in
  the case study, not hidden. `x-nextjs-cache` on the response reports it as
  `HIT`, `STALE`, `MISS` or `REVALIDATED`, which is how it gets verified rather
  than asserted.
- **The listing is split across two routes, and that split exists because of
  this decision.** `searchParams` is a runtime API in this version of Next, so
  any route that reads it renders per request — inherently, not by
  misconfiguration, since a page answering arbitrary query strings has
  infinitely many variants to prerender. Rather than let that cost apply to the
  whole catalogue, `/` never reads them and serves the default ordering, while
  `/search` reads them and serves every refined view. Measured on a production
  build:

  | Route     | Rendering                          | `Cache-Control`                                           |
  | --------- | ---------------------------------- | --------------------------------------------------------- |
  | `/`       | prerendered, `x-nextjs-cache: HIT` | `s-maxage=600, stale-while-revalidate=31535400`           |
  | `/search` | per request                        | `private, no-cache, no-store, max-age=0, must-revalidate` |

  So the URL that gets indexed and takes most of the traffic keeps the edge
  cache, and only a visitor who actually searches or reorders pays for a render.
  `/search` carries `robots: noindex, follow`: its variants are thin duplicates
  of `/` and crawling them wastes budget.

- **Refined views cost no extra CoinGecko credits.** The Data Cache is keyed on
  the upstream URL, not the page URL, and `fetchTokens()` builds the same URL
  regardless of the query — filtering and ordering happen in `catalog/domain`
  over the list already fetched. Verified against a production build: twenty
  distinct query strings left `.next/cache/fetch-cache` at one entry and every
  response took under 30 ms, against 278 ms for one real round trip to
  CoinGecko. Delegating search to the API would break this, since each term
  would become its own cache entry and a crawler walking the search box could
  drain the monthly quota.
- Real route handlers exist, which the phase 2 outbound-click endpoint needs.
- **The edge cache layer is not code we write.** Next already emits
  `s-maxage={revalidate}, stale-while-revalidate={expire - revalidate}` on ISR
  routes. That layer is verified against a deployed response, not hand-rolled in
  config.
- **Mixed revalidate times inside one route collapse to the lowest one for the
  page**, even though each `fetch` still honours its own for the data cache. So
  giving a token's name a longer life than its price does not by itself slow the
  page's regeneration down — the page follows the shortest. The per-fetch values
  still buy fewer upstream calls, which is what the CoinGecko free plan limits.
- Vercel Hobby runs **one cron per day**. Anything scheduled more often than that
  goes to GitHub Actions.
- ISR requires the Node.js runtime, and is incompatible with a static export.
  Re-deciding this later means re-deciding the deploy target.
