/** Route-level loading UI — skeleton matching the app's card language. */
export default function Loading() {
  return (
    <div className="py-5" aria-hidden>
      <div className="h-40 animate-pulse rounded-[26px] bg-surface-2 md:h-48" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[18px] border border-border bg-surface px-2.5 py-2"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="h-11 w-11 animate-pulse rounded-[28%] bg-surface-2" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/5 animate-pulse rounded-full bg-surface-2" />
              <div className="h-2.5 w-1/4 animate-pulse rounded-full bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
