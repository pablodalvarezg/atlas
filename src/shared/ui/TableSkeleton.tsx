import { Skeleton } from "@shared/ui/Skeleton";

type Props = {
  readonly rows?: number;
};

/**
 * Mirrors the real table's shape so the page does not jump when the data lands.
 * Matching the row height is the whole job: a skeleton of the wrong size trades
 * a blank screen for a layout shift, which is worse and shows up in CLS.
 */
export function TableSkeleton({ rows = 10 }: Props) {
  return (
    <div role="status" aria-label="Loading tokens">
      <div className="flex items-center gap-4 border-b border-border py-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="ml-auto h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-border py-3 last:border-0"
        >
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
