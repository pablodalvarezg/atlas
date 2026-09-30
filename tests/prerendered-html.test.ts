import { describe, expect, it } from "vitest";

import { prerenderedPages } from "./build-output";

/*
 * The thesis, as a test.
 *
 * It opens the HTML that `next build` wrote for a token page and looks for the
 * price inside it. It reads build output rather than rendering anything, because
 * what matters is the bytes a visitor is served.
 *
 * What it catches: the route ceasing to be prerendered, and data moving to a
 * browser-side fetch so the server has nothing to render. What it does not
 * catch, despite the obvious phrasing: a stray `"use client"`. Client components
 * are still server-rendered into the initial HTML.
 */
const PRICE = /\$[\d,]+\.\d{2,}/;

const pages = prerenderedPages("/token/");

describe("the built HTML of a token page", () => {
  it("was prerendered for the tokens the build was asked to prerender", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages.map((page) => page.route))(
    "carries the price inside %s, not a placeholder for the browser to fill",
    (route) => {
      const page = pages.find((candidate) => candidate.route === route);

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

  it("is a real token page, not a not-found shell", () => {
    // ISR writes soft-404 shells into the same directory at runtime. Reading the
    // prerender manifest is what keeps them out, and this is the assertion that
    // notices if that ever stops working.
    //
    // It matches rendered markup, not the string: every token page embeds its
    // segment's not-found component in the RSC payload so client navigation can
    // show it without a round trip, so a plain substring search is always true.
    for (const page of pages) {
      expect(
        page.html,
        `${page.route} rendered the not-found body`,
      ).not.toMatch(/>Token not found</);
    }
  });
});
