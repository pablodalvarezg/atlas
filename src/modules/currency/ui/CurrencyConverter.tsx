"use client";

import { useId, useState } from "react";

import { SegmentedControl } from "@shared/ui/SegmentedControl";
import {
  type BitcoinRates,
  CURRENCIES,
  CURRENCY_LABEL,
  type CurrencyCode,
  convertFromUsd,
  formatCurrency,
} from "@modules/currency/domain/currency";

type Props = {
  readonly symbol: string;
  /** The token's price in USD, which is what the catalogue is fetched in. */
  readonly priceUsd: number | null;
  readonly rates: BitcoinRates;
  /** Passed down rather than imported: domain owns no locale of its own. */
  readonly locale: string;
};

/*
 * Nine currencies, so they are all on screen as pills rather than hidden behind
 * a dropdown. A select would be one more click, a browser-drawn popover nobody
 * can style, and a list you have to open to know what is in it.
 *
 * The amount is a text input with `inputMode="decimal"` rather than
 * `type="number"`: it keeps the numeric keypad on a phone without Chrome's
 * spinner buttons, which are the other native widget that cannot be styled.
 */
const PRESET_AMOUNTS = ["1", "10", "100"] as const;

export function CurrencyConverter({ symbol, priceUsd, rates, locale }: Props) {
  const amountId = useId();

  const [amount, setAmount] = useState("1");
  const [currency, setCurrency] = useState<CurrencyCode>("usd");

  // Every conversion crosses through USD, so without it nothing here can be
  // computed and the panel would render a permanent em dash.
  const available =
    rates.usd === undefined
      ? []
      : CURRENCIES.filter((code) => rates[code] !== undefined);

  if (priceUsd === null || available.length === 0) return null;

  // Commas and spaces are how people type thousands; stripping them beats
  // rejecting the input.
  const parsed = Number.parseFloat(amount.replace(/[\s,]/g, ""));
  const valid = Number.isFinite(parsed) && parsed >= 0;

  const converted = valid
    ? convertFromUsd(parsed * priceUsd, currency, rates)
    : null;
  const unitRate = convertFromUsd(priceUsd, currency, rates);

  return (
    <section aria-labelledby="converter-heading">
      <h2 id="converter-heading" className="text-sm font-medium">
        Convert
      </h2>

      <div className="mt-3 rounded-xl border border-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div>
            <label
              htmlFor={amountId}
              className="text-xs font-medium text-content-muted"
            >
              Amount
            </label>

            <div className="mt-1.5 flex items-center rounded-lg border border-border bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
              <input
                id={amountId}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={!valid}
                aria-describedby={`${amountId}-unit`}
                className="w-36 bg-transparent px-3 py-2.5 text-lg font-medium tabular-nums outline-none"
              />
              <span className="pr-3 text-sm font-medium text-content-muted uppercase">
                {symbol}
              </span>
            </div>

            <div className="mt-2 flex gap-1">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  disabled={amount === preset}
                  className="cursor-pointer rounded-md px-2 py-0.5 text-xs text-content-muted transition-colors not-disabled:hover:bg-surface-muted not-disabled:hover:text-content disabled:cursor-default disabled:bg-surface-muted disabled:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div aria-hidden="true" className="text-2xl text-content-muted">
            =
          </div>

          <div>
            <p className="text-xs font-medium text-content-muted">Value</p>
            <p
              className="mt-1.5 py-2.5 text-3xl font-semibold tabular-nums"
              // Announced when it changes, so a screen reader hears the answer
              // without hunting for it.
              aria-live="polite"
            >
              {converted === null
                ? "—"
                : formatCurrency(converted, currency, locale)}
            </p>
          </div>
        </div>

        <fieldset className="mt-4 border-t border-border pt-4">
          <legend className="sr-only">Currency</legend>

          <SegmentedControl
            label="Currency"
            options={available.map((code) => ({
              value: code,
              label: code.toUpperCase(),
              description: CURRENCY_LABEL[code],
            }))}
            value={currency}
            onChange={setCurrency}
            className="flex flex-wrap gap-1.5"
            optionClassName={(active) =>
              `rounded-lg border px-3 py-1.5 text-xs font-medium tracking-wide uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "cursor-pointer border-border text-content-muted hover:border-content-muted hover:text-content"
              }`
            }
          />
        </fieldset>

        <p
          id={`${amountId}-unit`}
          className="mt-4 text-xs text-content-muted tabular-nums"
        >
          {unitRate !== null && (
            <>
              1 <span className="uppercase">{symbol}</span> ={" "}
              {formatCurrency(unitRate, currency, locale)}.{" "}
            </>
          )}
          Rates refresh every six hours and are for information. This is not a
          quote and Atlas is not a broker.
        </p>
      </div>
    </section>
  );
}
