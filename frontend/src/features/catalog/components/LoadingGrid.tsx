export function LoadingGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="mf-glass-card rounded-lg p-3">
          <div className="shell-surface-inset aspect-[4/3] animate-pulse rounded-md" />
          <div className="mt-4 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-[var(--shell-accent-soft)]" />
            <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--shell-border-strong)]" />
            <div className="mt-4 flex gap-2">
              <div className="h-7 w-20 animate-pulse rounded-full bg-[var(--shell-border-soft)]" />
              <div className="h-7 w-24 animate-pulse rounded-full bg-[var(--shell-border-soft)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
