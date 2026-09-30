"use client";

import { useId, useRef } from "react";

type Option<T extends string> = {
  readonly value: T;
  readonly label: string;
  /** Read out instead of the label when the label is an abbreviation. */
  readonly description?: string;
};

type Props<T extends string> = {
  readonly label: string;
  readonly options: readonly Option<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly className?: string;
  readonly optionClassName: (active: boolean) => string;
};

/*
 * A radio group that behaves like one.
 *
 * The obvious version — buttons with `role="radio"` and `disabled` on the
 * selected one — looks right and breaks the keyboard twice over: a disabled
 * element cannot hold focus, so selecting an option throws focus to <body>, and
 * `role="radiogroup"` promises arrow keys that nothing implements.
 *
 * So: roving tabindex, one tab stop for the whole group, arrows to move between
 * options, and `aria-disabled` on the selected one rather than `disabled` — it
 * still refuses the click, but it can still be focused.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className = "",
  optionClassName,
}: Props<T>) {
  const group = useRef<HTMLDivElement>(null);
  const name = useId();

  const move = (from: number, step: number) => {
    const next = options[(from + step + options.length) % options.length];
    if (next === undefined) return;

    onChange(next.value);
    // The newly selected option is the only tab stop, so focus follows it.
    // Scoped to this group rather than looked up by a global id built from the
    // label, which would contain spaces and collide across two controls.
    group.current
      ?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)
      ?.focus();
  };

  return (
    <div ref={group} role="radiogroup" aria-label={label} className={className}>
      {options.map((option, index) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            id={`${name}-${option.value}`}
            data-value={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={active}
            aria-label={option.description}
            title={option.description}
            // Roving tabindex: tab reaches the group once and lands on the
            // option in use, then arrows move within it.
            tabIndex={active ? 0 : -1}
            onClick={() => {
              if (!active) onChange(option.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(index, 1);
              }
              if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(index, -1);
              }
            }}
            className={optionClassName(active)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
