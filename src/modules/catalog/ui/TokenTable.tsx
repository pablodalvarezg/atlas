import Link from "next/link";

import {
  EMPTY,
  formatCompactUsd,
  formatPercentage,
  formatPrice,
} from "@modules/catalog/domain/format";
import {
  type ListingQuery,
  type SortKey,
  sortQuery,
} from "@modules/catalog/domain/listing";
import type { Token } from "@modules/catalog/domain/token";
import { REFINED_PATH } from "@modules/catalog/ui/routes";
import { Sparkline } from "@modules/catalog/ui/Sparkline";

type Props = {
  readonly tokens: readonly Token[];
  readonly query: ListingQuery;
};

/*
 * Ten columns have to survive 360 px, so the order they drop in is a decision
 * rather than an accident. Name, price and the 24h move are what the page is
 * for and never leave. Rank goes first because the row order already carries
 * it. The longer windows and the volume follow. The sparkline is last in and
 * first out: it repeats what the 7d column already says in words.
 */
const ALWAYS = "";

const COLUMNS: readonly {
  key: SortKey;
  label: string;
  align: "left" | "right";
  visibility: string;
}[] = [
  { key: "rank", label: "#", align: "right", visibility: "hidden sm:table-cell" }, // prettier-ignore
  { key: "name", label: "Token", align: "left", visibility: ALWAYS },
  { key: "price", label: "Price", align: "right", visibility: ALWAYS },
  { key: "change1h", label: "1h", align: "right", visibility: "hidden lg:table-cell" }, // prettier-ignore
  { key: "change", label: "24h", align: "right", visibility: ALWAYS },
  { key: "change7d", label: "7d", align: "right", visibility: "hidden md:table-cell" }, // prettier-ignore
  { key: "change30d", label: "30d", align: "right", visibility: "hidden lg:table-cell" }, // prettier-ignore
  { key: "volume", label: "Volume 24h", align: "right", visibility: "hidden xl:table-cell" }, // prettier-ignore
  { key: "marketCap", label: "Market cap", align: "right", visibility: "hidden md:table-cell" }, // prettier-ignore
];

const trendOf = (change: number | null) =>
  change === null || change === 0 ? "flat" : change > 0 ? "up" : "down";

const changeClass = (change: number | null) =>
  change === null || change === 0
    ? "text-content-muted"
    : change > 0
      ? "text-positive"
      : "text-negative";

function ChangeCell({
  change,
  visibility,
}: {
  readonly change: number | null;
  readonly visibility: string;
}) {
  return (
    <td
      className={`px-2 py-3 text-right tabular-nums ${changeClass(change)} ${visibility}`}
    >
      {formatPercentage(change)}
    </td>
  );
}

export function TokenTable({ tokens, query }: Props) {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">
        The token catalogue. Every column heading is a link that reorders it.
      </caption>
      <thead>
        <tr className="border-b border-border text-content-muted">
          {COLUMNS.map((column) => {
            const active = query.sort === column.key;

            return (
              <th
                key={column.key}
                scope="col"
                // Announces the current ordering, so the arrow is not the only
                // thing saying which column is in use.
                aria-sort={
                  active
                    ? query.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                className={`py-3 font-medium ${column.align === "right" ? "text-right" : "text-left"} ${column.visibility}`}
              >
                <Link
                  href={`${REFINED_PATH}?${sortQuery(query, column.key)}`}
                  className="inline-flex items-center gap-1 rounded-sm px-2 hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {/* The rank column's label is a glyph, so the link needs a
                      name a screen reader can actually read out. */}
                  {column.key === "rank" && (
                    <span className="sr-only">Rank</span>
                  )}
                  <span aria-hidden={column.key === "rank"}>
                    {column.label}
                  </span>
                  <span aria-hidden="true" className="text-xs">
                    {active ? (query.direction === "asc" ? "▲" : "▼") : ""}
                  </span>
                </Link>
              </th>
            );
          })}
          <th
            scope="col"
            className="hidden py-3 text-right font-medium 2xl:table-cell"
          >
            Trend
          </th>
        </tr>
      </thead>
      <tbody>
        {tokens.length === 0 ? (
          <tr>
            <td
              colSpan={COLUMNS.length + 1}
              className="py-12 text-center text-content-muted"
            >
              No token matches {`"${query.search}"`}.
            </td>
          </tr>
        ) : (
          tokens.map((token) => (
            <tr
              key={token.id}
              className="border-b border-border last:border-0 hover:bg-surface-muted"
            >
              <td className="hidden px-2 py-3 text-right text-content-muted tabular-nums sm:table-cell">
                {token.marketCapRank ?? EMPTY}
              </td>
              <td className="px-2 py-3">
                <Link
                  href={`/token/${token.id}`}
                  className="inline-flex items-center gap-2 rounded-sm hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {token.imageUrl !== null && (
                    // Plain <img>: next/image is a client component, and with
                    // `unoptimized` it ships 8.5 KB gz of JavaScript to render a
                    // 20 px icon it does not optimise.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={token.imageUrl}
                      alt=""
                      width={20}
                      height={20}
                      loading="lazy"
                      decoding="async"
                      className="size-5 rounded-full"
                    />
                  )}
                  <span className="font-medium">{token.name}</span>
                  <span className="text-content-muted uppercase">
                    {token.symbol}
                  </span>
                </Link>
              </td>
              <td className="px-2 py-3 text-right tabular-nums">
                {formatPrice(token.price)}
              </td>
              <ChangeCell
                change={token.priceChangePercentage1h}
                visibility="hidden lg:table-cell"
              />
              <ChangeCell
                change={token.priceChangePercentage24h}
                visibility={ALWAYS}
              />
              <ChangeCell
                change={token.priceChangePercentage7d}
                visibility="hidden md:table-cell"
              />
              <ChangeCell
                change={token.priceChangePercentage30d}
                visibility="hidden lg:table-cell"
              />
              <td className="hidden px-2 py-3 text-right tabular-nums xl:table-cell">
                {formatCompactUsd(token.totalVolume24h)}
              </td>
              <td className="hidden px-2 py-3 text-right tabular-nums md:table-cell">
                {formatCompactUsd(token.marketCap)}
              </td>
              <td className="hidden px-2 py-3 2xl:table-cell">
                <div className="flex justify-end">
                  {/* Coloured by the 7d move, which is the window the line
                      actually draws. */}
                  <Sparkline
                    prices={token.sparkline7d}
                    trend={trendOf(token.priceChangePercentage7d)}
                    label={`${token.name} recent price trend`}
                  />
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
