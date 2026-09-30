import { summariseCatalog } from "@modules/catalog/domain/highlights";
import { type ListingQuery, listTokens } from "@modules/catalog/domain/listing";
import type { Token } from "@modules/catalog/domain/token";
import { Highlights } from "@modules/catalog/ui/Highlights";
import { SearchForm } from "@modules/catalog/ui/SearchForm";
import { TokenTable } from "@modules/catalog/ui/TokenTable";

type Props = {
  readonly tokens: readonly Token[];
  readonly query: ListingQuery;
  readonly title: string;
  readonly subtitle: string;
};

/**
 * The catalogue itself, shared by the prerendered default listing and the
 * per-request refined one. Both render the same markup from the same fetch;
 * only where the query came from differs.
 */
export function CatalogView({ tokens, query, title, subtitle }: Props) {
  return (
    <main className="px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          {/* No back link: the site header carries the navigation, and an extra
              line here shifted the heading on some routes and not others. */}
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 max-w-[75ch] text-sm text-content-muted">
            {subtitle}
          </p>
        </div>
        <SearchForm query={query} />
      </header>

      <Highlights highlights={summariseCatalog(tokens)} />

      <TokenTable tokens={listTokens(tokens, query)} query={query} />
    </main>
  );
}
