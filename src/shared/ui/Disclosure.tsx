type Props = {
  readonly title: string;
  /** Anchor target, for a link that points straight at this section. */
  readonly id?: string;
  /**
   * The one figure worth seeing without opening the section. Hidden once it is
   * open, because it is repeated inside.
   */
  readonly preview?: React.ReactNode;
  readonly defaultOpen?: boolean;
  readonly children: React.ReactNode;
};

/**
 * A collapsible section, on `<details>`.
 *
 * Native rather than a client component with state, for three reasons: it opens
 * without JavaScript, the keyboard and screen-reader behaviour comes free and
 * correct, and there is no third `"use client"` for something the platform
 * already does.
 *
 * The open and close animation lives in globals.css, on `::details-content`.
 * Browsers without it open instantly, which is the right thing to lose.
 */
export function Disclosure({
  title,
  id,
  preview,
  defaultOpen = false,
  children,
}: Props) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className="group scroll-mt-6 border-b border-border last:border-0"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 py-3 text-sm font-medium select-none marker:content-[''] hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        {title}

        {preview !== undefined && (
          <span className="ml-auto flex items-baseline gap-1.5 text-xs font-normal tabular-nums group-open:hidden">
            {preview}
          </span>
        )}

        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          aria-hidden="true"
          // Pushed right by the preview when there is one; by itself when there
          // is not, and once the preview hides on open.
          className={`shrink-0 text-content-muted transition-transform duration-200 group-open:rotate-180 ${
            preview === undefined ? "ml-auto" : "group-open:ml-auto"
          }`}
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>

      <div className="pb-3">{children}</div>
    </details>
  );
}
