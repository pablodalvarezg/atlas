import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { BUILD_DIR, prerenderedPages } from "./build-output";

/*
 * The performance budget, as a test. This is the feature, not the verification.
 *
 * It measures the JavaScript a token page actually loads, from the build output,
 * and fails when the page grows past its budget. No browser and no Lighthouse:
 * bytes are deterministic, so they do not need either, and a test that runs in
 * two seconds is a test that runs on every commit.
 *
 * Lighthouse still has a job — LCP and CLS depend on a real browser over a real
 * network — but those thresholds have to come from the first deploy's
 * measurement. `TODO(pablo):` add that job once Atlas is on Vercel.
 */
/*
 * Raised from 186,000 to 300,000 on 2026-09-29, deliberately, when the price
 * chart moved to shadcn/ui over Recharts. Both sides measured:
 *
 *   server-rendered SVG chart    177,054 bytes gzipped
 *   shadcn/ui over Recharts      288,986 bytes gzipped   (+63%)
 *
 * The budget did its job. This test went red first, and the number moved as a
 * recorded decision rather than a quiet edit. ADR 0003 has the reasoning.
 *
 * 177,054 of that total is Next's framework floor — React and the router — on a
 * page with no interactive component at all. Recharts is the other 112,000.
 *
 * Trimmed back to 290,000 on 2026-09-30: cutting shadcn's multi-series config
 * chain, which Atlas never had a second series for, returned 8,619 bytes.
 *
 * It only goes down from here. Whatever pushes it up next has to argue for
 * itself the same way Recharts did.
 */
const JS_BUDGET_GZIP_BYTES = 290_000;

/*
 * The HTML carries the data, so this is the number the case study quotes.
 *
 * It has moved twice in one day, in both directions, and the round trip is the
 * point: 9,506 with a server-rendered chart, up to 16,000 when that chart grew
 * pre-formatted hover readings, then back to 9,259 once the chart moved to
 * Recharts and the slicing moved back to the server.
 *
 * That last step is the one worth remembering. Handing a client component thirty
 * days of raw hourly prices cost about 8,000 bytes; handing it the three ranges
 * already sliced, thinned and rounded cost none of them, and the arithmetic
 * stayed in domain/ where it is tested.
 *
 * Down again to 10,000 on 2026-09-30, after the same trim.
 *
 * A budget that only ever ratchets upward is not a budget.
 */
const HTML_BUDGET_GZIP_BYTES = 10_000;

/** The first page the BUILD prerendered -- never one ISR wrote later. */
function aTokenPage() {
  const page = prerenderedPages("/token/")[0];

  if (page === undefined) {
    throw new Error("next build prerendered no token page to measure.");
  }

  return page;
}

function scriptBytes(html: string): { gzip: number; count: number } {
  const sources = new Set(
    [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]),
  );

  let gzip = 0;
  let count = 0;

  for (const source of sources) {
    if (source === undefined) continue;

    const relative = source.replace(/^\//, "").split("?")[0] ?? "";
    const onDisk = join(BUILD_DIR, relative.replace(/^_next\//, ""));

    // A script the page references but the build did not emit would silently
    // count as zero bytes, which is the failure mode this guards against.
    expect(existsSync(onDisk), `${source} is referenced but not in the build`).toBe(true); // prettier-ignore

    gzip += gzipSync(readFileSync(onDisk)).length;
    count += 1;
  }

  return { gzip, count };
}

describe("the performance budget of a token page", () => {
  const page = aTokenPage();

  it("loads at least one script, so a zero reading means a broken measurement", () => {
    expect(scriptBytes(page.html).count).toBeGreaterThan(0);
  });

  it("stays within the JavaScript budget", () => {
    const { gzip } = scriptBytes(page.html);

    expect(
      gzip,
      `${page.route} loads ${gzip} bytes of gzipped JavaScript, over the ${JS_BUDGET_GZIP_BYTES} budget. Raising the budget is a decision, not a fix: see docs/adr/0002.`,
    ).toBeLessThanOrEqual(JS_BUDGET_GZIP_BYTES);
  });

  it("keeps the HTML small even though the data is inside it", () => {
    const gzip = gzipSync(page.html).length;

    expect(gzip).toBeLessThanOrEqual(HTML_BUDGET_GZIP_BYTES);
  });
});
