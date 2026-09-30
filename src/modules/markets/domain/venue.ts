/**
 * Where a token can be bought.
 *
 * `VenueCandidate` is everything upstream offered; `Venue` is what Atlas is
 * willing to send a visitor to. The gap between the two is this file, and it is
 * the module's whole reason to exist: a catalogue whose job is to point outwards
 * is responsible for where it points.
 */
export type VenueCandidate = {
  readonly exchangeId: string;
  readonly exchangeName: string;
  readonly pair: string;
  readonly tradeUrl: string | null;
  /** CoinGecko's own rating: "green", "yellow", "red", or absent. */
  readonly trust: string | null;
  readonly volumeUsd: number | null;
  readonly lastPriceUsd: number | null;
  readonly isAnomaly: boolean;
  readonly isStale: boolean;
};

export type VenueTrust = "green" | "yellow" | null;

export type Venue = {
  readonly exchangeId: string;
  readonly exchangeName: string;
  readonly pair: string;
  readonly tradeUrl: string;
  readonly trust: VenueTrust;
  readonly volumeUsd: number | null;
  readonly lastPriceUsd: number | null;
};

/*
 * Ranking, not filtering.
 *
 * Measured against the Demo plan on 2026-09-29: all 100 tickers returned for
 * bitcoin carry `trust_score: null`. The rating is simply not part of what the
 * free plan sends, so treating an absent score as untrustworthy would discard
 * every venue and leave the page with nothing — which is what it did before this
 * was measured. An explicit "red" is still a refusal; silence is not.
 */
const TRUST_RANK: Record<string, number> = { green: 0, yellow: 1 };
const UNRATED_RANK = 2;

const rankOf = (trust: VenueTrust) =>
  trust === null ? UNRATED_RANK : (TRUST_RANK[trust] ?? UNRATED_RANK);

const asTrust = (trust: string | null): VenueTrust =>
  trust === "green" || trust === "yellow" ? trust : null;

const isPresentable = (
  candidate: VenueCandidate,
): candidate is VenueCandidate & { tradeUrl: string } =>
  // A price flagged as anomalous or stale is not a price to send someone at.
  !candidate.isAnomaly &&
  !candidate.isStale &&
  candidate.tradeUrl !== null &&
  // The one rating that is a refusal rather than an absence.
  candidate.trust !== "red";

/**
 * Picks the venues worth showing: one row per exchange, the most liquid pair for
 * each, rated venues ahead of unrated ones.
 */
export function selectVenues(
  candidates: readonly VenueCandidate[],
  limit = 5,
): Venue[] {
  const bestPerExchange = new Map<string, Venue>();

  for (const candidate of candidates) {
    if (!isPresentable(candidate)) continue;

    const venue: Venue = {
      exchangeId: candidate.exchangeId,
      exchangeName: candidate.exchangeName,
      pair: candidate.pair,
      tradeUrl: candidate.tradeUrl,
      trust: asTrust(candidate.trust),
      volumeUsd: candidate.volumeUsd,
      lastPriceUsd: candidate.lastPriceUsd,
    };

    // The same exchange lists a token against several quote currencies. Showing
    // five rows of one exchange is not five places to buy.
    const incumbent = bestPerExchange.get(venue.exchangeId);

    if (
      incumbent === undefined ||
      (venue.volumeUsd ?? 0) > (incumbent.volumeUsd ?? 0)
    ) {
      bestPerExchange.set(venue.exchangeId, venue);
    }
  }

  return [...bestPerExchange.values()]
    .sort(
      (a, b) =>
        rankOf(a.trust) - rankOf(b.trust) ||
        (b.volumeUsd ?? 0) - (a.volumeUsd ?? 0),
    )
    .slice(0, limit);
}
