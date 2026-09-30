import { describe, expect, it } from "vitest";

import {
  downsample,
  type PricePoint,
  sliceRange,
  toCompleteDays,
  toRangedHistory,
} from "@modules/catalog/domain/price-history";

const DAY = 86_400_000;
const at = (day: number, hour = 0): number => day * DAY + hour * 3_600_000;
const point = (ms: number, price: number): PricePoint => ({ at: ms, price });

describe("toCompleteDays", () => {
  it("drops the day in progress, so a half day is never drawn as a day", () => {
    const history = [
      point(at(9, 12), 1),
      point(at(10, 0), 2),
      point(at(10, 13), 3),
    ];

    // "Now" is midday on day 10, so only day 9 is complete.
    expect(toCompleteDays(history, at(10, 13))).toEqual([point(at(9, 12), 1)]);
  });

  it("keeps everything when the whole series is already in the past", () => {
    const history = [point(at(1), 1), point(at(2), 2)];

    expect(toCompleteDays(history, at(5))).toHaveLength(2);
  });
});

describe("sliceRange", () => {
  const history = Array.from({ length: 31 }, (_, day) => point(at(day), day));

  it("measures back from the end of the series, not from now", () => {
    // The series ends on day 30, so 7d is days 23 to 30 inclusive.
    expect(sliceRange(history, "7d")).toHaveLength(8);
  });

  it("returns the whole series for the widest range", () => {
    expect(sliceRange(history, "30d")).toHaveLength(31);
  });

  it("copes with an empty series", () => {
    expect(sliceRange([], "7d")).toEqual([]);
  });
});

describe("downsample", () => {
  const history = Array.from({ length: 720 }, (_, index) =>
    point(index, index),
  );

  it("thins a month of hourly points down to something a path can hold", () => {
    expect(downsample(history, 180)).toHaveLength(180);
  });

  it("always keeps the first and the last point", () => {
    const thinned = downsample(history, 10);

    expect(thinned[0]).toEqual(history[0]);
    expect(thinned.at(-1)).toEqual(history.at(-1));
  });

  it("leaves a series that is already short enough alone", () => {
    const short = history.slice(0, 24);

    expect(downsample(short, 180)).toEqual(short);
  });
});

describe("toRangedHistory", () => {
  const history = Array.from({ length: 720 }, (_, index) =>
    point(index * 3_600_000, 1234.5678901234 + index),
  );

  it("ships each range already sliced, so the client receives no spare points", () => {
    const ranged = toRangedHistory(history, 120);

    expect(ranged["1d"].length).toBeLessThanOrEqual(25);
    expect(ranged["7d"]).toHaveLength(120);
    expect(ranged["30d"]).toHaveLength(120);
  });

  it("drops precision no chart can draw", () => {
    // Upstream sends seventeen significant digits; eight is past the last pixel.
    expect(toRangedHistory(history, 120)["30d"][0]?.price).toBe(1234.5679);
  });
});
