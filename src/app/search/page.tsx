import type { Metadata } from "next";

import { CatalogView, fetchTokens, parseListingQuery } from "@modules/catalog";

/*
 * The refined listing: search, filter and ordering, all read off the query
 * string. Reading `searchParams` is a runtime API, so this route renders per
 * request — which is correct, because there is no finite set of query strings to
 * prerender.
 *
 * It costs no extra CoinGecko credits. The upstream URL does not depend on the
 * query, so every variant of this page shares one Data Cache entry with `/`;
 * filtering and ordering happen in catalog/domain over the list already
 * fetched. Delegating the search to the API instead would make each new term
 * its own cache entry, and a crawler walking the search box would drain the
 * monthly quota.
 */
export const metadata: Metadata = {
  title: "Search",
  // Infinitely many parameter combinations, all of them thin variants of `/`.
  // Letting a crawler index them wastes crawl budget and splits the signal.
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const [tokens, params] = await Promise.all([fetchTokens(), searchParams]);
  const query = parseListingQuery(params);

  return (
    <CatalogView
      tokens={tokens}
      query={query}
      title="Search"
      showHomeLink
      subtitle={
        query.search === ""
          ? "The catalogue, reordered."
          : `Tokens matching "${query.search}".`
      }
    />
  );
}
