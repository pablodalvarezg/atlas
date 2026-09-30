import { describe, expect, it } from "vitest";

import { selectVenues, type VenueCandidate } from "@modules/markets/domain/venue"; // prettier-ignore

const candidate = (overrides: Partial<VenueCandidate>): VenueCandidate => ({
  exchangeId: "binance",
  exchangeName: "Binance",
  pair: "BTC/USDT",
  tradeUrl: "https://example.test/trade",
  trust: "green",
  volumeUsd: 1000,
  lastPriceUsd: 60000,
  isAnomaly: false,
  isStale: false,
  ...overrides,
});

describe("selectVenues", () => {
  it("keeps a venue Atlas is willing to point at", () => {
    expect(selectVenues([candidate({})])).toHaveLength(1);
  });

  it("drops a venue with no way to get there", () => {
    expect(selectVenues([candidate({ tradeUrl: null })])).toEqual([]);
  });

  it("drops anomalous and stale prices", () => {
    expect(selectVenues([candidate({ isAnomaly: true })])).toEqual([]);
    expect(selectVenues([candidate({ isStale: true })])).toEqual([]);
  });

  it("refuses an explicit red rating", () => {
    expect(selectVenues([candidate({ trust: "red" })])).toEqual([]);
  });

  it("keeps an unrated venue, because the free plan rates nothing", () => {
    // Measured: every ticker the Demo plan returns has trust_score null.
    // Treating absence as distrust emptied the section entirely.
    expect(selectVenues([candidate({ trust: null })])).toHaveLength(1);
  });

  it("shows one row per exchange, keeping its most liquid pair", () => {
    const venues = selectVenues([
      candidate({ pair: "BTC/USDT", volumeUsd: 100 }),
      candidate({ pair: "BTC/EUR", volumeUsd: 900 }),
    ]);

    // Five rows of the same exchange are not five places to buy.
    expect(venues).toHaveLength(1);
    expect(venues[0]?.pair).toBe("BTC/EUR");
  });

  it("puts rated venues first, then the most liquid, then the unrated", () => {
    const venues = selectVenues([
      candidate({ exchangeId: "unrated", trust: null, volumeUsd: 9999 }),
      candidate({ exchangeId: "a", trust: "yellow", volumeUsd: 8888 }),
      candidate({ exchangeId: "b", trust: "green", volumeUsd: 10 }),
      candidate({ exchangeId: "c", trust: "green", volumeUsd: 50 }),
    ]);

    expect(venues.map((venue) => venue.exchangeId)).toEqual([
      "c",
      "b",
      "a",
      "unrated",
    ]);
  });

  it("caps the list, because a wall of exchanges helps nobody", () => {
    const many = ["a", "b", "c", "d", "e", "f"].map((id) =>
      candidate({ exchangeId: id }),
    );

    expect(selectVenues(many, 3)).toHaveLength(3);
  });

  it("treats an unknown volume as the least liquid rather than the most", () => {
    const venues = selectVenues([
      candidate({ exchangeId: "unknown", volumeUsd: null }),
      candidate({ exchangeId: "known", volumeUsd: 1 }),
    ]);

    expect(venues.map((venue) => venue.exchangeId)).toEqual([
      "known",
      "unknown",
    ]);
  });
});
