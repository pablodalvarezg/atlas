import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { fetchTokens, findToken, TokenDetail } from "@modules/catalog";

/*
 * ISR, and this is the route the project's thesis is about: the HTML arrives
 * with the price already inside it.
 *
 * It costs no CoinGecko credit of its own. Both `generateStaticParams` and the
 * page body read the same cached listing call, so prerendering every token page
 * at build time spends exactly what the listing already spent: one credit.
 */
export const revalidate = 600;

/*
 * A token that was not in the listing when the build ran still renders, on
 * demand, and is cached afterwards. Without this, a coin that climbs into the
 * top 250 between deploys would 404.
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  const tokens = await fetchTokens();

  return tokens.map((token) => ({ id: token.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/token/[id]">): Promise<Metadata> {
  const { id } = await params;
  const token = findToken(await fetchTokens(), id);

  if (token === undefined) return { title: "Token not found" };

  return {
    title: `${token.name} price`,
    description: `${token.name} (${token.symbol.toUpperCase()}) price, market capitalisation, supply and ranges.`,
    alternates: { canonical: `/token/${token.id}` },
  };
}

export default async function TokenPage({ params }: PageProps<"/token/[id]">) {
  const { id } = await params;
  const token = findToken(await fetchTokens(), id);

  if (token === undefined) notFound();

  return <TokenDetail token={token} />;
}
