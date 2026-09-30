type Props = {
  readonly size?: number;
};

/**
 * The same mark as `app/icon.svg`, inline so it costs no request and inherits
 * the page's colours instead of hardcoding them.
 *
 * It is duplicated on purpose: the favicon has to be a standalone file with its
 * own background, because a browser tab has no theme to inherit from.
 */
export function Logo({ size = 28 }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      {/* The circle is what makes the inner ellipse read as a meridian. */}
      <g stroke="var(--color-border)" strokeWidth={2.5} fill="none">
        <circle cx="32" cy="32" r="20" />
        <ellipse cx="32" cy="32" rx="8.5" ry="20" />
        <line x1="12" y1="32" x2="52" y2="32" />
      </g>
      <path
        d="M13 41 L 23 34 L 31 38 L 41 23 L 51 28"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="41" cy="23" r="4.5" fill="var(--color-accent)" />
    </svg>
  );
}
