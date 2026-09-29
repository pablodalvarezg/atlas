/**
 * Turns a price series into the `d` attribute of an SVG `<path>`.
 *
 * This is a polyline, not a chart: no axes, no legend, no interaction. That is
 * the whole reason it belongs here instead of in a charting library — it is a
 * pure function over numbers, so it renders on the server, ships no JavaScript,
 * and can be asserted in a unit test.
 *
 * Returns null when there is nothing to draw, so the caller renders no element
 * at all rather than an empty one.
 */
export function sparklinePath(
  prices: readonly number[],
  width: number,
  height: number,
): string | null {
  if (prices.length < 2) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min;
  const stepX = width / (prices.length - 1);

  return prices
    .map((price, index) => {
      const x = index * stepX;
      // SVG's y axis grows downward, so the highest price gets the smallest y.
      // A flat series has nothing to scale against: draw it down the middle
      // rather than dividing by zero or pinning it to the floor.
      const y =
        span === 0 ? height / 2 : height - ((price - min) / span) * height;

      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
