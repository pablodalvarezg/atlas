import { sparklinePath } from "@modules/catalog/domain/sparkline";

const WIDTH = 120;
const HEIGHT = 32;

type Props = {
  readonly prices: readonly number[];
  /** Colours the line by direction, matching the change column next to it. */
  readonly trend: "up" | "down" | "flat";
  readonly label: string;
};

/**
 * A 7-day price line. The path is computed on the server, so this ships as
 * markup with no JavaScript behind it.
 */
export function Sparkline({ prices, trend, label }: Props) {
  const path = sparklinePath(prices, WIDTH, HEIGHT);

  if (path === null) return null;

  const stroke =
    trend === "up"
      ? "var(--color-positive)"
      : trend === "down"
        ? "var(--color-negative)"
        : "var(--color-content-muted)";

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label={label}
      // The line is decorative detail next to a number that already says it.
      className="overflow-visible"
      preserveAspectRatio="none"
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
