import type { Venue } from "@modules/markets/domain/venue";

type Props = {
  readonly tokenName: string;
  readonly venues: readonly Venue[];
};

/**
 * The exit. This is the point of the whole catalogue: find a token, understand
 * it, leave for the right place to buy it.
 *
 * It renders the list and nothing around it — no section, no heading. Whatever
 * contains it is the page's decision, which is how the same component sits
 * inside the token page's disclosure rail without markets/ knowing that rail
 * exists.
 *
 * Plain anchors, rendered on the server. Phase 2 routes them through an
 * outbound endpoint to count clicks; until then they go straight out.
 */
export function WhereToBuy({ tokenName, venues }: Props) {
  if (venues.length === 0) {
    return (
      <p className="text-sm text-content-muted">
        No venue we can vouch for lists {tokenName} right now.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {venues.map((venue) => (
          <li
            key={venue.exchangeId}
            className="flex flex-wrap items-center justify-between gap-2 py-2.5"
          >
            <div>
              <p className="text-sm font-medium">{venue.exchangeName}</p>
              <p className="text-xs text-content-muted">{venue.pair}</p>
            </div>
            <a
              href={venue.tradeUrl}
              target="_blank"
              // noreferrer with noopener: the exchange has no business knowing
              // which page sent the visitor. nofollow because a catalogue
              // linking out is not an endorsement for a crawler.
              rel="noopener noreferrer nofollow"
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium whitespace-nowrap hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Buy on {venue.exchangeName}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-content-muted">
        Listed by reported liquidity. Atlas does not take a fee and this is not
        financial advice.
      </p>
    </>
  );
}
