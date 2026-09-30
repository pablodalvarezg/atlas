import { describe, expect, it } from "vitest";

import {
  EMPTY,
  formatCompactUsd,
  formatHour,
  formatPercentage,
  formatPrice,
  formatShortDate,
  formatSupply,
} from "@modules/catalog/domain/format";

describe("formatPrice", () => {
  it("shows two decimals above a dollar", () => {
    expect(formatPrice(1234.5)).toBe("$1,234.50");
  });

  it("opens up decimals for the long tail, instead of rounding it to $0.00", () => {
    expect(formatPrice(0.5)).toBe("$0.5000");
    expect(formatPrice(0.00001234)).toBe("$0.00001234");
  });

  it("renders a missing price as an empty cell", () => {
    expect(formatPrice(null)).toBe(EMPTY);
  });
});

describe("formatCompactUsd", () => {
  it("compacts twelve digits into something a column can hold", () => {
    expect(formatCompactUsd(1_230_000_000_000)).toBe("$1.23T");
    expect(formatCompactUsd(45_600_000_000)).toBe("$45.6B");
  });

  it("renders a missing market cap as an empty cell", () => {
    expect(formatCompactUsd(null)).toBe(EMPTY);
  });
});

describe("formatPercentage", () => {
  it("always carries a sign, so a gain never reads as a loss", () => {
    expect(formatPercentage(2.5)).toBe("+2.50%");
    expect(formatPercentage(-1.25)).toBe("-1.25%");
  });

  it("leaves zero unsigned", () => {
    expect(formatPercentage(0)).toBe("0.00%");
  });

  it("renders a missing change as an empty cell", () => {
    expect(formatPercentage(null)).toBe(EMPTY);
  });
});

describe("formatSupply", () => {
  it("compacts the supply", () => {
    expect(formatSupply(19_500_000)).toBe("19.5M");
  });

  it("renders an unknown supply as an empty cell", () => {
    // A coin with no max supply is not a coin with a max supply of zero.
    expect(formatSupply(null)).toBe(EMPTY);
  });
});

describe("chart axis labels", () => {
  // Fixed instants in UTC, so the assertions do not move with the machine.
  const noonUtc = Date.UTC(2026, 2, 12, 12, 0, 0);

  it("labels a one-day window by the hour", () => {
    expect(formatHour(noonUtc)).toBe("12 PM");
  });

  it("labels a multi-day window by the day", () => {
    expect(formatShortDate(noonUtc)).toBe("Mar 12");
  });

  it("pins both to UTC, so the chart does not shift with the reader", () => {
    // The series itself is cut on UTC day boundaries; labelling it in a local
    // zone would put the last point on a different day than the cut.
    expect(formatShortDate(Date.UTC(2026, 2, 12, 23, 30))).toBe("Mar 12");
  });
});
