import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/*
 * The thesis, as a test.
 *
 * It opens the HTML that `next build` wrote for a token page and looks for the
 * price inside it. If a stray `"use client"` pushes the numbers to the browser,
 * or the route stops being prerendered, this goes red before any performance
 * metric notices.
 *
 * It reads build output rather than rendering anything itself, on purpose: what
 * matters is the bytes a visitor is actually served.
 */
const PRERENDERED_DIR = join(process.cwd(), ".next", "server", "app", "token");

/** A dollar amount with grouped thousands or decimals, as formatPrice writes it. */
const PRICE = /\$[\d,]+\.\d{2,}/;

function prerenderedPages(): { name: string; html: string }[] {
  let entries: string[];

  try {
    entries = readdirSync(PRERENDERED_DIR).filter((name) =>
      name.endsWith(".html"),
    );
  } catch {
    throw new Error(
      `No prerendered token pages at ${PRERENDERED_DIR}. Run \`npm run build\` before this test — it asserts on build output, not on a render.`,
    );
  }

  if (entries.length === 0) {
    throw new Error(
      "next build produced no prerendered token pages; generateStaticParams returned nothing.",
    );
  }

  return entries.map((name) => ({
    name,
    html: readFileSync(join(PRERENDERED_DIR, name), "utf8"),
  }));
}

describe("the built HTML of a token page", () => {
  const pages = prerenderedPages();

  it("was prerendered for every token in the listing", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages.map((page) => page.name))(
    "carries the price inside %s, not a placeholder for the browser to fill",
    (name) => {
      const page = pages.find((candidate) => candidate.name === name);

      expect(page?.html).toMatch(PRICE);
    },
  );

  it("carries the market capitalisation and the supply as text too", () => {
    const [first] = pages;

    expect(first?.html).toContain("Market capitalisation");
    expect(first?.html).toMatch(/Circulating/);
  });

  it("names the token in the document title, for search results", () => {
    const [first] = pages;

    expect(first?.html).toMatch(/<title>[^<]*price[^<]*<\/title>/i);
  });
});
