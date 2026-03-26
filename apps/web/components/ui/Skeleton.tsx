export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-auctorum-surface-2 rounded ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-auctorum-surface-1 border border-auctorum-border space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
