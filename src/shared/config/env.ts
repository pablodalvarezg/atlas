import "server-only";

import { parseEnv } from "@shared/config/env-schema";

export type { Env } from "@shared/config/env-schema";

/*
 * The single place that reads `process.env`.
 *
 * `server-only` is what keeps it there. Without it, one `"use client"` component
 * importing anything that reaches this module drags Zod's whole runtime into the
 * browser bundle — measured at 392 KB, on a project whose thesis is JavaScript
 * bytes — and reads `process.env` through Next's empty client shim, so the values
 * would silently be the defaults rather than the configured ones. Note that
 * passing the whole `process.env` object, as below, is deliberately not the
 * member-expression form (`process.env.NEXT_PUBLIC_X`) that Next inlines into
 * client bundles: there is no client-side fallback here on purpose.
 *
 * Next resolves `server-only` internally, so it needs no entry in package.json.
 * A client component that reaches this module fails the build instead.
 */
export const env = parseEnv(process.env);
