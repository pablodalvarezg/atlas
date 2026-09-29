import { describe, expect, it } from "vitest";

import { sparklinePath } from "@modules/catalog/domain/sparkline";

describe("sparklinePath", () => {
  it("draws nothing when there is no line to draw", () => {
    expect(sparklinePath([], 100, 20)).toBeNull();
    expect(sparklinePath([42], 100, 20)).toBeNull();
  });

  it("puts the lowest price on the floor and the highest on the ceiling", () => {
    // SVG's y grows downward, so the high price is the one at y=0.
    expect(sparklinePath([1, 2], 100, 20)).toBe("M0.00,20.00 L100.00,0.00");
  });

  it("spreads the points evenly across the width", () => {
    expect(sparklinePath([1, 2, 3], 100, 20)).toBe(
      "M0.00,20.00 L50.00,10.00 L100.00,0.00",
    );
  });

  it("centres a flat series instead of dividing by zero", () => {
    expect(sparklinePath([5, 5, 5], 100, 20)).toBe(
      "M0.00,10.00 L50.00,10.00 L100.00,10.00",
    );
  });

  it("scales a real-shaped series into the box", () => {
    const path = sparklinePath([10, 30, 20], 60, 30);

    expect(path).toBe("M0.00,30.00 L30.00,0.00 L60.00,15.00");
  });
});
