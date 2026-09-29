import Link from "next/link";

import {
  EMPTY,
  formatCompactUsd,
  formatPercentage,
  formatPrice,
  formatSupply,
} from "@modules/catalog/domain/format";
import type { Token } from "@modules/catalog/domain/token";
import { Sparkline } from "@modules/catalog/ui/Sparkline";

type Props = {
  readonly token: Token;
};

const changeClass = (change: number | null) =>
  change === null || change === 0
    ? "text-content-muted"
    : change > 0
      ? "text-positive"
      : "text-negative";

function Figure({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="border-b border-border py-3">
      <dt className="text-xs text-content-muted">{label}</dt>
      <dd className="mt-1 tabular-nums">{value}</dd>
    </div>
  );
}

function Change({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number | null;
}) {
  return (
    <div className="border-b border-border py-3">
      <dt className="text-xs text-content-muted">{label}</dt>
      <dd className={`mt-1 tabular-nums ${changeClass(value)}`}>
        {formatPercentage(value)}
      </dd>
    </div>
  );
}

/**
 * Everything on this page comes from the listing payload already fetched, so a
 * token page costs no CoinGecko credit of its own. Server-rendered text, which
 * is what the project exists to demonstrate; the interactive chart lands beside
 * it later without moving any of these numbers to the client.
 */
export function TokenDetail({ token }: Props) {
  return (
    <main className="px-6 py-10">
      <Link
        href="/"
        className="text-sm text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        ← Back to the catalogue
      </Link>

      <header className="mt-4 flex flex-wrap items-center gap-3">
        {token.imageUrl !== null && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={token.imageUrl}
            alt=""
            width={40}
            height={40}
            decoding="async"
            className="size-10 rounded-full"
          />
        )}
        <h1 className="text-2xl font-semibold">{token.name}</h1>
        <span className="text-content-muted uppercase">{token.symbol}</span>
        {token.marketCapRank !== null && (
          <span className="rounded-md border border-border px-2 py-1 text-xs text-content-muted">
            Rank #{token.marketCapRank}
          </span>
        )}
      </header>

      <p className="mt-6 text-4xl font-semibold tabular-nums">
        {formatPrice(token.price)}
      </p>
      <p
        className={`mt-1 tabular-nums ${changeClass(token.priceChangePercentage24h)}`}
      >
        {formatPercentage(token.priceChangePercentage24h)} in the last 24 hours
      </p>

      {token.sparkline7d.length > 1 && (
        <div className="mt-6">
          <Sparkline
            prices={token.sparkline7d}
            trend={
              (token.priceChangePercentage7d ?? 0) > 0
                ? "up"
                : (token.priceChangePercentage7d ?? 0) < 0
                  ? "down"
                  : "flat"
            }
            label={`${token.name} recent price trend`}
          />
          {/* TODO(pablo): the interactive Lightweight Charts price chart goes
              here, beside these numbers rather than instead of them. ADR 0002. */}
        </div>
      )}

      <div className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
        <section aria-labelledby="market-heading">
          <h2 id="market-heading" className="text-sm font-medium">
            Market
          </h2>
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
                token.marketCapRank === null ? EMPTY : `#${token.marketCapRank}`
              }
            />
          </dl>
        </section>

        <section aria-labelledby="ranges-heading">
          <h2 id="ranges-heading" className="text-sm font-medium">
            Ranges
          </h2>
          <dl>
            <Figure label="High, 24 hours" value={formatPrice(token.high24h)} />
            <Figure label="Low, 24 hours" value={formatPrice(token.low24h)} />
            <Figure
              label="All-time high"
              value={formatPrice(token.allTimeHigh)}
            />
            <Figure
              label="All-time low"
              value={formatPrice(token.allTimeLow)}
            />
          </dl>
        </section>

        <section aria-labelledby="supply-heading">
          <h2 id="supply-heading" className="text-sm font-medium">
            Supply
          </h2>
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
        </section>

        <section aria-labelledby="changes-heading" className="sm:col-span-2">
          <h2 id="changes-heading" className="text-sm font-medium">
            Price change
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
            <Change label="1 hour" value={token.priceChangePercentage1h} />
            <Change label="24 hours" value={token.priceChangePercentage24h} />
            <Change label="7 days" value={token.priceChangePercentage7d} />
            <Change label="30 days" value={token.priceChangePercentage30d} />
          </dl>
        </section>
      </div>

      {/* TODO(pablo): "Where to buy" needs /coins/{id}?tickers=true, one call per
          token, ~1,071 a month at 250 tokens revalidated weekly. */}
    </main>
  );
}
