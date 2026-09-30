import { describe, expect, it } from "vitest";

import { parseEnv } from "@shared/config/env-schema";

describe("parseEnv", () => {
  it("defaults to the cheap development budget and a localhost origin", () => {
    const parsed = parseEnv({});

    expect(parsed.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
    expect(parsed.ATLAS_TOKEN_COUNT).toBe(10);
    expect(parsed.ATLAS_LISTING_REVALIDATE_SECONDS).toBe(600);
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

  it("lets a build prerender fewer token pages than the listing shows", () => {
    // Each prerendered page costs one tickers call, so this is the build bill.
    const parsed = parseEnv({
      ATLAS_TOKEN_COUNT: "250",
      ATLAS_PRERENDERED_TOKEN_COUNT: "25",
    });

    expect(parsed.ATLAS_PRERENDERED_TOKEN_COUNT).toBe(25);
  });

  it("allows prerendering nothing, which makes a build cost one credit", () => {
    expect(
      parseEnv({ ATLAS_PRERENDERED_TOKEN_COUNT: "0" })
        .ATLAS_PRERENDERED_TOKEN_COUNT,
    ).toBe(0);
  });

  it("takes the production token count from the environment", () => {
    expect(parseEnv({ ATLAS_TOKEN_COUNT: "250" }).ATLAS_TOKEN_COUNT).toBe(250);
  });

  it("rejects a site URL that is not a URL", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SITE_URL: "atlas" })).toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    );
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

  it("trims the API key, so a padded one does not 401 on every call", () => {
    expect(parseEnv({ COINGECKO_API_KEY: "  abc  " }).COINGECKO_API_KEY).toBe(
      "abc",
    );
    expect(() => parseEnv({ COINGECKO_API_KEY: "   " })).toThrow(
      /COINGECKO_API_KEY/,
    );
  });

  describe("on a production deploy", () => {
    it("refuses to ship the localhost fallback in canonical URLs", () => {
      expect(() => parseEnv({ VERCEL_ENV: "production" })).toThrow(
        /NEXT_PUBLIC_SITE_URL must be set/,
      );
    });

    it("accepts an explicit origin", () => {
      const parsed = parseEnv({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "https://atlas.example",
      });

      expect(parsed.NEXT_PUBLIC_SITE_URL).toBe("https://atlas.example");
    });

    it("leaves CI and local production builds alone", () => {
      // Neither is a deploy: VERCEL_ENV is absent, so the guard must not fire.
      expect(() => parseEnv({ NODE_ENV: "production" })).not.toThrow();
    });
  });
});
