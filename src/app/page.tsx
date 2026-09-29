import { site } from "@shared/config/site";

export default function CatalogPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{site.name}</h1>
      <p className="mt-2 max-w-prose text-content-muted">{site.description}</p>
      {/* The catalogue itself lands with the catalog module. */}
    </main>
  );
}
