import { env } from "@shared/config/env";

export const site = {
  name: "Atlas",
  description:
    "Public token catalogue. Find a token, understand what it is, and leave for the right place to buy it.",
  url: env.NEXT_PUBLIC_SITE_URL,
  // Region matters: plain `en` leaves grouping and currency placement to the
  // runtime, `en-US` pins 1200 to "$1,200.00". It doubles as the `lang`
  // attribute, since a BCP-47 tag is what that expects.
  //
  // Number and date formatting lives in catalog/domain, which cannot import this
  // file: domain is pure TypeScript, and this module reads the environment at
  // import time. Domain owns its own locale constant and is tested against it.
  locale: "en-US",
} as const;
