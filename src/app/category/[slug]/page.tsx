import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  CatalogView,
  DEFAULT_LISTING_QUERY,
  fetchCategoryTokens,
  findPreset,
  PRESETS,
} from "@modules/catalog";

/*
 * Prerendered like `/`: a preset reads no searchParams, so it keeps the edge
 * cache. The upstream call behind it revalidates hourly rather than every ten
 * minutes — see the repository for why a category's top ten can afford that.
 */
export const revalidate = 3600;

/** Only the presets Atlas defines. An unknown slug is a 404, not a fetch. */
export const dynamicParams = false;

export function generateStaticParams() {
  return PRESETS.map((preset) => ({ slug: preset.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const preset = findPreset(slug);

  if (preset === undefined) return { title: "Not found" };

  return {
    title: preset.title,
    description: preset.description,
    alternates: { canonical: `/category/${preset.slug}` },
  };
}

export default async function CategoryPage({
  params,
}: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const preset = findPreset(slug);

  if (preset === undefined) notFound();

  const tokens = await fetchCategoryTokens(preset.categoryId, preset.count);

  return (
    <CatalogView
      tokens={tokens}
      // The slug rides along, so a sort link from here lands back in this preset
      // rather than on the global listing.
      query={{ ...DEFAULT_LISTING_QUERY, preset: preset.slug }}
      title={preset.title}
      subtitle={preset.description}
    />
  );
}
