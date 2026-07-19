// Loading placeholders that hold the layout so nothing jumps when data lands.

export function SkeletonRows({ rows = 4, height = 'h-16' }: { rows?: number; height?: string }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${height} animate-pulse rounded-xl border border-white/5 bg-surface-elevated`} />
      ))}
    </div>
  );
}

export function SkeletonBlock({ className = 'h-32' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl border border-white/5 bg-surface-elevated ${className}`} aria-hidden="true" />;
}
