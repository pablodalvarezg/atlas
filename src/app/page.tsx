import {
  CatalogView,
  DEFAULT_LISTING_QUERY,
  fetchTokens,
} from "@modules/catalog";
import { site } from "@shared/config/site";

/*
 * ISR. This route deliberately does not read `searchParams`: doing so is a
 * runtime API, and it would push the page to per-request rendering and forfeit
 * the edge cache. Refined views live at /search instead, so the URL that gets
 * indexed and receives most of the traffic stays prerendered.
 *
 * 600 s matches the upstream fetch's window, so the page never outlives the
 * data inside it.
 */
export const revalidate = 600;

export default async function CatalogPage() {
  const tokens = await fetchTokens();

  return (
    <CatalogView
      tokens={tokens}
      query={DEFAULT_LISTING_QUERY}
      title={site.name}
      subtitle={site.description}
    />
  );
}
