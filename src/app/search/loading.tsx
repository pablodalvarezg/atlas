import { TableSkeleton } from "@shared/ui/TableSkeleton";

/*
 * /search renders per request, so it is the route where a visitor can actually
 * wait. `/` is prerendered and never gets here.
 */
export default function SearchLoading() {
  return (
    <main className="px-6 py-10">
      <div className="mb-8 h-16" />
      <TableSkeleton />
    </main>
  );
}
