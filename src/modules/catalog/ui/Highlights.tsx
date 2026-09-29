import Link from "next/link";

import {
  formatCompactUsd,
  formatPercentage,
} from "@modules/catalog/domain/format";
import type { Highlights as HighlightsData } from "@modules/catalog/domain/highlights";
import type { Token } from "@modules/catalog/domain/token";

type Props = {
  readonly highlights: HighlightsData;
};

function Stat({
  label,
  value,
  note,
}: {
  readonly label: string;
  readonly value: string;
  readonly note: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <dt className="text-xs text-content-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
      <p className="mt-1 text-xs text-content-muted">{note}</p>
    </div>
  );
}

function MoverList({
  title,
  tokens,
  emptyNote,
}: {
  readonly title: string;
  readonly tokens: readonly Token[];
  readonly emptyNote: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="text-xs text-content-muted">{title}</h3>
      {tokens.length === 0 ? (
        <p className="mt-2 text-sm text-content-muted">{emptyNote}</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {tokens.map((token) => (
            <li
              key={token.id}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <Link
                href={`/token/${token.id}`}
                className="truncate rounded-sm hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {token.name}
              </Link>
              <span
                className={`tabular-nums ${
                  (token.priceChangePercentage24h ?? 0) > 0
                    ? "text-positive"
                    : "text-negative"
                }`}
              >
                {formatPercentage(token.priceChangePercentage24h)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * The headline numbers. Every figure here is derived from the catalogue already
 * fetched, so the section costs no CoinGecko credits.
 */
export function Highlights({ highlights }: Props) {
  // Named for what is actually summed. The market-wide totals are a different
  // endpoint and a different credit; claiming them here would be inventing data.
  const scope = `Across the ${highlights.tokenCount} tokens listed`;

  return (
    <section aria-labelledby="highlights-heading" className="mb-8">
      <h2 id="highlights-heading" className="sr-only">
        Market highlights
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Market cap"
          value={formatCompactUsd(highlights.listedMarketCap)}
          note={scope}
        />
        <Stat
          label="Volume 24h"
          value={formatCompactUsd(highlights.listedVolume24h)}
          note={scope}
        />
        <MoverList
          title="Top gainers 24h"
          tokens={highlights.topGainers}
          emptyNote="Nothing is up today."
        />
        <MoverList
          title="Top losers 24h"
          tokens={highlights.topLosers}
          emptyNote="Nothing is down today."
        />
      </dl>
    </section>
  );
}
