import { env } from "@shared/config/env";

export const site = {
  name: "Atlas",
  description:
    "Public token catalogue. Find a token, understand what it is, and leave for the right place to buy it.",
  url: env.NEXT_PUBLIC_SITE_URL,
  language: "en",
  // Region matters: plain `en` leaves grouping and currency placement to the
  // runtime, `en-US` pins 1200 to "$1,200.00". Number and date formatting lives
  // in catalog/domain and is tested there against this tag.
  locale: "en-US",
} as const;
