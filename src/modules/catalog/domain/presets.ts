/**
 * Catalogue presets: a named slice of the market, reachable from the header.
 *
 * The slug is Atlas's URL; the category id is CoinGecko's. Keeping them apart
 * means a provider that renames a category costs one line here instead of a
 * dead link that was already indexed.
 *
 * Both ids were verified against /coins/categories/list on 2026-09-29.
 */
export type Preset = {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly categoryId: string;
  readonly count: number;
};

export const PRESETS: readonly Preset[] = [
  {
    slug: "rwa",
    title: "Real world assets",
    description:
      "The ten largest tokens backed by assets that exist off-chain, by market capitalisation.",
    categoryId: "real-world-assets-rwa",
    count: 10,
  },
  {
    slug: "exchange-tokens",
    title: "Exchange tokens",
    description:
      "The ten largest tokens issued by centralised exchanges, by market capitalisation.",
    categoryId: "centralized-exchange-token-cex",
    count: 10,
  },
];

export function findPreset(slug: string): Preset | undefined {
  return PRESETS.find((preset) => preset.slug === slug);
}
