import { describe, expect, it } from "vitest";

import {
  convertFromUsd,
  formatCurrency,
} from "@modules/currency/domain/currency";

// One bitcoin is 100 dollars or 200 of the other thing, so a dollar is two.
const rates = { usd: 100, eur: 200, jpy: 0 } as const;

describe("convertFromUsd", () => {
  it("crosses through bitcoin, which cancels out", () => {
    expect(convertFromUsd(10, "eur", rates)).toBe(20);
  });

  it("returns the same amount for the currency it started in", () => {
    expect(convertFromUsd(10, "usd", rates)).toBe(10);
  });

  it("needs the dollar leg, because every conversion crosses through it", () => {
    expect(convertFromUsd(10, "eur", { eur: 200 })).toBeNull();
  });

  it("says it does not know rather than returning a wrong number", () => {
    expect(convertFromUsd(10, "clp", rates)).toBeNull();
    expect(convertFromUsd(10, "eur", { eur: 200 })).toBeNull();
    expect(convertFromUsd(10, "eur", { usd: 0, eur: 200 })).toBeNull();
  });

  it("carries a zero rate through instead of treating it as missing", () => {
    // A currency quoted at zero is upstream's problem to report, not ours to
    // hide: it converts to zero, which is visibly wrong rather than silently.
    expect(convertFromUsd(10, "jpy", rates)).toBe(0);
  });
});

describe("formatCurrency", () => {
  it("uses the decimals the currency actually has", () => {
    expect(formatCurrency(1234.5, "usd", "en-US")).toBe("$1,234.50");
    // Yen has none, so two would be invented precision.
    expect(formatCurrency(1234, "jpy", "en-US")).toBe("¥1,234");
  });

  it("opens up decimals below one, so small values do not round to zero", () => {
    expect(formatCurrency(0.004, "jpy", "en-US")).toBe("¥0.004");
  });
});
