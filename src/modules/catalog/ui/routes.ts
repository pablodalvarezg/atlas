/**
 * Refined views — search, a different ordering — live on their own route so `/`
 * can stay prerendered: reading `searchParams` is what makes a route render per
 * request, and `/` never reads them.
 *
 * One constant, because two copies drift.
 */
export const REFINED_PATH = "/search";
