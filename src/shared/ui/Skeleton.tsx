type Props = {
  readonly className?: string;
};

/**
 * A placeholder block. Pure CSS, no JavaScript: a skeleton that needed a client
 * component to animate would cost more than the wait it covers.
 *
 * `motion-reduce` turns the pulse off rather than leaving it running for someone
 * who asked the system not to animate.
 */
export function Skeleton({ className = "" }: Props) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none ${className}`}
    />
  );
}
