export default function LoadingOperationalLoad() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="h-3 w-32 loading-bone loading-bone-muted rounded" />
        <div className="h-8 w-56 loading-bone loading-bone-muted rounded mt-2" />
        <div className="h-4 w-80 loading-bone loading-bone-muted rounded mt-2" />
      </div>

      {/* Calendar skeleton */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-md loading-bone loading-bone-muted"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
