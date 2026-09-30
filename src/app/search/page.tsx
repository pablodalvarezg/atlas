import type { Metadata } from "next";

import {
  CatalogView,
  fetchCategoryTokens,
  fetchTokens,
  findPreset,
  parseListingQuery,
} from "@modules/catalog";

/*
 * The refined listing: search, filter and ordering, all read off the query
 * string. Reading `searchParams` is a runtime API, so this route renders per
 * request — which is correct, because there is no finite set of query strings to
 * prerender.
 *
 * It costs no extra CoinGecko credits. The upstream URL depends only on which
 * catalogue is being shown, not on the query, so every variant of this page
 * shares a Data Cache entry with `/` or with the preset it came from; filtering
 * and ordering happen in catalog/domain over the list already fetched.
 * Delegating the search to the API instead would make each new term its own
 * cache entry, and a crawler walking the search box would drain the quota.
 */
export const metadata: Metadata = {
  title: "Search",
  // Infinitely many parameter combinations, all of them thin variants of a page
  // that is already indexed. Letting a crawler in wastes budget and splits the
  // signal.
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const query = parseListingQuery(await searchParams);

  // A reader who reordered a preset stays in that preset. An unknown slug falls
  // back to the whole catalogue rather than 404ing a search.
  const preset = query.preset === "" ? undefined : findPreset(query.preset);

  const tokens =
    preset === undefined
      ? await fetchTokens()
      : await fetchCategoryTokens(preset.categoryId, preset.count);

  return (
    <CatalogView
      tokens={tokens}
      query={preset === undefined ? { ...query, preset: "" } : query}
      title={preset === undefined ? "Search" : preset.title}
      subtitle={
        query.search === ""
          ? (preset?.description ?? "The catalogue, reordered.")
          : `Tokens matching "${query.search}".`
      }
    />
  );
}
