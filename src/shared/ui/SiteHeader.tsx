import Link from "next/link";

import { Logo } from "@shared/ui/Logo";
import { SiteNav } from "@shared/ui/SiteNav";

type NavLink = {
  readonly href: string;
  readonly label: string;
};

type Props = {
  readonly siteName: string;
  /** Passed in by the layout: shared/ has no business knowing the catalogue. */
  readonly links: readonly NavLink[];
};

export function SiteHeader({ siteName, links }: Props) {
  return (
    <header className="border-b border-border">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Logo size={26} />
          <span className="text-lg font-semibold tracking-tight">
            {siteName}
          </span>
        </Link>

        <SiteNav links={links} />
      </div>
    </header>
  );
}
