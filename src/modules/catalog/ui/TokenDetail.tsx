import Link from "next/link";

import {
  EMPTY,
  formatCompactUsd,
  formatPercentage,
  formatPrice,
  formatSupply,
} from "@modules/catalog/domain/format";
import type { Token } from "@modules/catalog/domain/token";
import { Disclosure } from "@shared/ui/Disclosure";

type Props = {
  readonly token: Token;
  /**
   * The price chart, passed in rather than imported so the page decides whether
   * the history was worth fetching.
   */
  readonly chart?: React.ReactNode;
  /**
   * The venues list, rendered as the last item of the rail. Passed in rather
   * than imported: it belongs to the markets module, and catalog's ui layer has
   * no business reaching into another one. The page composes them.
   */
  readonly venues?: React.ReactNode;
  /**
   * How many venues that list holds, for the collapsed summary. Passed as a
   * number rather than read off `venues.props`: reaching into a React element's
   * props couples this to another module's prop names and breaks the moment the
   * element is wrapped in anything.
   */
  readonly venueCount?: number;
  /** The fiat converter, under the chart and the same width as it. */
  readonly converter?: React.ReactNode;
};

const changeClass = (change: number | null) =>
  change === null || change === 0
    ? "text-content-muted"
    : change > 0
      ? "text-positive"
      : "text-negative";

/** The collapsed summary of a section: what it is, and its headline figure. */
function Preview({
  label,
  value,
  className = "",
}: {
  readonly label: string;
  /** Omitted when the label already says everything, as in "Sold in 5 markets". */
  readonly value?: string;
  readonly className?: string;
}) {
  return (
    <>
      <span className="text-content-muted">{label}</span>
      {value !== undefined && <span className={className}>{value}</span>}
    </>
  );
}

/** One label-and-value row in the stats rail. */
function Figure({
  label,
  value,
  className = "",
}: {
  readonly label: string;
  readonly value: string;
  readonly className?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt className="text-content-muted">{label}</dt>
      <dd className={`text-right tabular-nums ${className}`}>{value}</dd>
    </div>
  );
}

/**
 * Everything on this page comes from the listing payload already fetched, so a
 * token page's figures cost no CoinGecko credit of their own; its venues and
 * price history do. Server-rendered text, which is what the project exists to
 * demonstrate, with the chart beside it rather than instead of it.
 */
export function TokenDetail({
  token,
  chart,
  venues,
  venueCount = 0,
  converter,
}: Props) {
  return (
    <main className="px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="text-sm text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        ← Back to the catalogue
      </Link>

      {/*
        The shape of a coin page anywhere: a rail of collapsed figures on the
        left, the chart and the converter taking the rest. 35/65 in fr rather
        than percentages, because fr accounts for the gap and percentages do not
        — two columns of 35% and 65% plus a gap overflow the row.

        Below lg they stack, because a chart in a 320 px column is not a chart.
      */}
      <div className="mt-4 grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,35fr)_minmax(0,65fr)]">
        <div>
          {/* A div, not a header: the page has one header and it is the site's. */}
          <div className="flex flex-wrap items-center gap-3">
            {token.imageUrl !== null && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={token.imageUrl}
                alt=""
                width={32}
                height={32}
                decoding="async"
                className="size-8 rounded-full"
              />
            )}
            <h1 className="text-xl font-semibold">{token.name}</h1>
            <span className="text-sm text-content-muted uppercase">
              {token.symbol}
            </span>
            {token.marketCapRank !== null && (
              <span className="rounded-md border border-border px-2 py-0.5 text-xs text-content-muted">
                #{token.marketCapRank}
              </span>
            )}
          </div>

          <p className="mt-4 text-4xl font-semibold tabular-nums">
            {formatPrice(token.price)}
          </p>
          <p
            className={`mt-1 text-sm tabular-nums ${changeClass(token.priceChangePercentage24h)}`}
          >
            {formatPercentage(token.priceChangePercentage24h)} in the last 24
            hours
          </p>

          <div className="mt-6">
            <Disclosure
              title="Market"
              defaultOpen
              preview={
                <Preview
                  // "Cap" rather than "Market capitalisation": the summary line
                  // is narrow and the section title already said Market.
                  label="Cap"
                  value={formatCompactUsd(token.marketCap)}
                />
              }
            >
              <dl>
                <Figure
                  label="Market capitalisation"
                  value={formatCompactUsd(token.marketCap)}
                />
                <Figure
                  label="Volume, 24 hours"
                  value={formatCompactUsd(token.totalVolume24h)}
                />
                <Figure
                  label="Rank"
                  value={
                    token.marketCapRank === null
                      ? EMPTY
                      : `#${token.marketCapRank}`
                  }
                />
              </dl>
            </Disclosure>

            <Disclosure
              title="Price change"
              preview={
                <Preview
                  label="1h"
                  value={formatPercentage(token.priceChangePercentage1h)}
                  className={changeClass(token.priceChangePercentage1h)}
                />
              }
            >
              <dl>
                <Figure
                  label="1 hour"
                  value={formatPercentage(token.priceChangePercentage1h)}
                  className={changeClass(token.priceChangePercentage1h)}
                />
                <Figure
                  label="24 hours"
                  value={formatPercentage(token.priceChangePercentage24h)}
                  className={changeClass(token.priceChangePercentage24h)}
                />
                <Figure
                  label="7 days"
                  value={formatPercentage(token.priceChangePercentage7d)}
                  className={changeClass(token.priceChangePercentage7d)}
                />
                <Figure
                  label="30 days"
                  value={formatPercentage(token.priceChangePercentage30d)}
                  className={changeClass(token.priceChangePercentage30d)}
                />
              </dl>
            </Disclosure>

            <Disclosure
              title="Ranges"
              preview={
                <Preview label="ATH" value={formatPrice(token.allTimeHigh)} />
              }
            >
              <dl>
                <Figure
                  label="High, 24 hours"
                  value={formatPrice(token.high24h)}
                />
                <Figure
                  label="Low, 24 hours"
                  value={formatPrice(token.low24h)}
                />
                <Figure
                  label="All-time high"
                  value={formatPrice(token.allTimeHigh)}
                />
                <Figure
                  label="All-time low"
                  value={formatPrice(token.allTimeLow)}
                />
              </dl>
            </Disclosure>

            <Disclosure
              title="Supply"
              preview={
                <Preview
                  label="Total"
                  value={formatSupply(token.totalSupply)}
                />
              }
            >
              <dl>
                <Figure
                  label="Circulating"
                  value={formatSupply(token.circulatingSupply)}
                />
                <Figure label="Total" value={formatSupply(token.totalSupply)} />
                <Figure
                  label="Maximum"
                  // A coin with no cap is not a coin capped at zero.
                  value={formatSupply(token.maxSupply)}
                />
              </dl>
            </Disclosure>

            {/* The exit, in the same rail as the figures. Open by default so the
                table's "Buy Now" links, which point at #where-to-buy, land on
                something visible rather than on a collapsed summary. */}
            {venues !== undefined && (
              <Disclosure
                title="Where to buy"
                id="where-to-buy"
                preview={
                  <Preview
                    label={
                      venueCount === 0
                        ? "No markets listed"
                        : `Sold in ${venueCount} market${venueCount === 1 ? "" : "s"}`
                    }
                  />
                }
                defaultOpen
              >
                {venues}
              </Disclosure>
            )}
          </div>
        </div>

        {/* `min-w-0` or the chart's intrinsic width blows the grid track out
            and brings the horizontal scroll back. */}
        <div className="min-w-0 space-y-12">
          {chart}
          {converter}
        </div>
      </div>
    </main>
  );
}
