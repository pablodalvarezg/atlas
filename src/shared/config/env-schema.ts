import { z } from "zod";

/*
 * The schema and its parser, with no environment read of their own. This module
 * is pure so tests can exercise it without the ambient shell environment
 * deciding whether the suite loads, and so `env.ts` stays the one place that
 * touches `process.env`.
 */

/** `.env.example` ships blank values, so unset and empty mean the same thing. */
const blankAsUnset = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const envSchema = z.object({
  // Trimmed before the length check: a padded key passes `min(1)` intact and
  // then 401s on every upstream call, which reads like an outage, not a typo.
  // TODO(pablo): make this required once the key is wired into catalog/data.
  COINGECKO_API_KEY: blankAsUnset(z.string().trim().min(1).optional()),

  // Canonical origin. Needed for canonical URLs, sitemap and Open Graph.
  NEXT_PUBLIC_SITE_URL: blankAsUnset(z.url().default("http://localhost:3000")),

  /*
   * The two knobs that spend the CoinGecko Demo quota (10,000 credits/month).
   * Only the token count differs between development and production; the
   * interval below is 600 s everywhere, which is already its default.
   *
   * A call to /coins/markets costs one credit whether it returns 10 coins or
   * 250, so this number does not change what the listing costs. What it does
   * change is the per-token detail calls a build makes — one each — plus build
   * time and payload size. 250 is the endpoint's documented maximum.
   */
  ATLAS_TOKEN_COUNT: blankAsUnset(
    z.coerce.number().int().min(1).max(250).default(10),
  ),

  /*
   * This one is what actually spends the quota, so 600 s is the chosen value in
   * every environment: 4,320 calls/month, 43% of the cap. 300 s was considered
   * and dropped — 8,640 calls is 86%, and with per-token detail calls on top it
   * leaves about one CI build of headroom a month. Both figures are ceilings
   * rather than forecasts, since ISR revalidates on request and an untrafficked
   * page costs nothing. Floor is 60 s: the Demo plan's data is no fresher.
   */
  ATLAS_LISTING_REVALIDATE_SECONDS: blankAsUnset(
    z.coerce.number().int().min(60).default(600),
  ),
});

export type Env = z.infer<typeof envSchema>;

/** Validates a raw environment. Pure: the caller supplies the source. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }

  /*
   * A production deploy that forgets the canonical origin would silently fall
   * back to localhost and ship it inside canonical URLs, the sitemap and
   * og:url — broken in the one way a catalogue cannot afford, and invisible.
   * Keyed on VERCEL_ENV rather than NODE_ENV so that CI builds and local
   * production builds, which are not deploys, stay unaffected.
   */
  if (
    source.VERCEL_ENV === "production" &&
    !source.NEXT_PUBLIC_SITE_URL?.trim()
  ) {
    throw new Error(
      "Invalid environment:\nNEXT_PUBLIC_SITE_URL must be set on a production deploy. " +
        "Without it the localhost default ends up in canonical URLs and the sitemap.",
    );
  }

  return result.data;
}
