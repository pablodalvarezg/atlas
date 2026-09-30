import type { ListingQuery } from "@modules/catalog/domain/listing";
import { REFINED_PATH } from "@modules/catalog/ui/routes";

type Props = {
  readonly query: ListingQuery;
};

/**
 * A plain GET form. Submitting it puts the search in the URL and the server
 * returns the filtered page — no client component, no state, works with
 * JavaScript off.
 */
export function SearchForm({ query }: Props) {
  return (
    <form
      method="get"
      action={REFINED_PATH}
      role="search"
      className="flex gap-2"
    >
      <label htmlFor="token-search" className="sr-only">
        Search tokens by name or symbol
      </label>
      <input
        id="token-search"
        type="search"
        name="q"
        defaultValue={query.search}
        placeholder="Search by name or symbol"
        className="w-full max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-content-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      {/* The current ordering and preset ride along, so searching resets
          neither the column nor which catalogue you are in. */}
      <input type="hidden" name="sort" value={query.sort} />
      <input type="hidden" name="dir" value={query.direction} />
      {query.preset !== "" && (
        <input type="hidden" name="preset" value={query.preset} />
      )}
      <button
        type="submit"
        className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Search
      </button>
    </form>
  );
}
