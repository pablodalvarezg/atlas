import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  fetchPriceHistory,
  fetchTokenById,
  fetchTokens,
  PriceChartPanel,
  toRangedHistory,
  TokenDetail,
} from "@modules/catalog";
import { CurrencyConverter, fetchBitcoinRates } from "@modules/currency";
import { fetchVenues, WhereToBuy } from "@modules/markets";
import { env } from "@shared/config/env";
import { site } from "@shared/config/site";

/*
 * ISR, and this is the route the project's thesis is about: the HTML arrives
 * with the price already inside it.
 *
 * The token's own figures cost no credit — `generateStaticParams`, the metadata
 * and the page body all read the same cached listing call. The venues do: one
 * /coins/{id}/tickers call per token, which is why how many pages get
 * prerendered is a budget decision rather than a build-time one.
 */
export const revalidate = 600;

/*
 * A token the build did not prerender still renders, on first request, and is
 * cached afterwards. That is what makes the prerender count a dial rather than a
 * cliff: lowering it trades a cold first visit for a cheaper build.
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  const tokens = await fetchTokens();

  return tokens
    .slice(0, env.ATLAS_PRERENDERED_TOKEN_COUNT)
    .map((token) => ({ id: token.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/token/[id]">): Promise<Metadata> {
  const { id } = await params;
  const token = await fetchTokenById(id);

  if (token === null) return { title: "Token not found" };

  return {
    title: `${token.name} price`,
    description: `${token.name} (${token.symbol.toUpperCase()}) price, market capitalisation, supply and ranges.`,
    alternates: { canonical: `/token/${token.id}` },
  };
}

export default async function TokenPage({ params }: PageProps<"/token/[id]">) {
  const { id } = await params;
  // Resolved by id rather than looked up in the listing: a preset links to
  // tokens outside the top ATLAS_TOKEN_COUNT, and those were dead links.
  const token = await fetchTokenById(id);

  if (token === null) notFound();

  // Only after the token is known to exist: a 404 should not spend a credit.
  // Both are per-token calls, so they run together rather than in sequence.
  // The rates call is not per token, so it is shared with every other page.
  const [venues, history, rates] = await Promise.all([
    fetchVenues(token.id),
    fetchPriceHistory(token.id),
    fetchBitcoinRates(),
  ]);

  return (
    <TokenDetail
      token={token}
      chart={
        <PriceChartPanel
          tokenName={token.name}
          // Sliced and thinned here, so only what the chart draws is serialised
          // into the payload the browser downloads.
          series={toRangedHistory(history, 120)}
        />
      }
      venues={<WhereToBuy tokenName={token.name} venues={venues} />}
      venueCount={venues.length}
      converter={
        <CurrencyConverter
          symbol={token.symbol}
          priceUsd={token.price}
          rates={rates}
          locale={site.locale}
        />
      }
    />
  );
}
