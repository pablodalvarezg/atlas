import { describe, expect, it } from "vitest";

import { parseEnv } from "@shared/config/env";

describe("parseEnv", () => {
  it("falls back to localhost when no site URL is set", () => {
    expect(parseEnv({}).NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("rejects a site URL that is not a URL", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SITE_URL: "atlas" })).toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    );
  });

  it("treats a blank variable as unset, because .env.example ships blanks", () => {
    const parsed = parseEnv({
      COINGECKO_API_KEY: "",
      NEXT_PUBLIC_SITE_URL: "",
      ATLAS_TOKEN_COUNT: "",
    });

    expect(parsed.COINGECKO_API_KEY).toBeUndefined();
    expect(parsed.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
    expect(parsed.ATLAS_TOKEN_COUNT).toBe(10);
  });

  it("defaults to the cheap development budget", () => {
    const parsed = parseEnv({});

    expect(parsed.ATLAS_TOKEN_COUNT).toBe(10);
    expect(parsed.ATLAS_LISTING_REVALIDATE_SECONDS).toBe(600);
  });

  it("takes the production budget from the environment", () => {
    // Production raises the token count only; 600 s is already the default.
    const parsed = parseEnv({
      ATLAS_TOKEN_COUNT: "250",
      ATLAS_LISTING_REVALIDATE_SECONDS: "900",
    });

    expect(parsed.ATLAS_TOKEN_COUNT).toBe(250);
    expect(parsed.ATLAS_LISTING_REVALIDATE_SECONDS).toBe(900);
  });

  it("refuses more tokens than /coins/markets returns in one call", () => {
    expect(() => parseEnv({ ATLAS_TOKEN_COUNT: "251" })).toThrow(
      /ATLAS_TOKEN_COUNT/,
    );
  });

  it("refuses to revalidate faster than upstream changes", () => {
    expect(() => parseEnv({ ATLAS_LISTING_REVALIDATE_SECONDS: "30" })).toThrow(
      /ATLAS_LISTING_REVALIDATE_SECONDS/,
    );
  });
});
