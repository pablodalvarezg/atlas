"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  readonly href: string;
  readonly label: string;
};

type Props = {
  readonly links: readonly NavLink[];
};

/*
 * Client only for the highlight.
 *
 * A layout does not receive the pathname on the server — the alternative is
 * `headers()`, which would opt every route out of prerendering to colour a link.
 * So the links render as plain anchors either way, and JavaScript adds the
 * "you are here". Without it the nav still navigates; it just does not point at
 * itself.
 */
export function SiteNav({ links }: Props) {
  const pathname = usePathname();

  return (
    // Wraps: at 360 px the three presets are 425 px of content against 312 px
    // of room, so a single row would push the whole page sideways.
    <nav
      aria-label="Catalogue presets"
      className="flex flex-wrap items-center gap-1"
    >
      {links.map((link) => {
        const active = pathname === link.href;
        const shared = "rounded-md px-3 py-1.5 text-sm transition-colors";

        // The page you are on is not somewhere to go. Rendering it as text
        // rather than a disabled link removes the click, the focus stop and the
        // pointless re-navigation in one move.
        return active ? (
          <span
            key={link.href}
            aria-current="page"
            className={`${shared} bg-surface-muted font-medium text-content`}
          >
            {link.label}
          </span>
        ) : (
          <Link
            key={link.href}
            href={link.href}
            className={`${shared} text-content-muted hover:bg-surface-muted hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
