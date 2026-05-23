export default function IntelligenceLoading() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto p-6">
      <div>
        <div className="h-8 w-48 rounded bg-stone-800 animate-pulse" />
        <div className="h-4 w-72 rounded bg-stone-800/60 animate-pulse mt-2" />
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 rounded-lg bg-stone-800 animate-pulse" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-20 rounded-xl border border-stone-700/40 bg-stone-800/50 animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}
