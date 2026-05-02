export default function ChefTipsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-6 w-6 rounded bg-stone-800" />
        <div className="space-y-1">
          <div className="h-5 w-24 rounded bg-stone-800" />
          <div className="h-3 w-40 rounded bg-stone-800" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-stone-700 bg-stone-800/50 p-3">
            <div className="h-3 w-16 rounded bg-stone-700 mb-2" />
            <div className="h-7 w-10 rounded bg-stone-700" />
          </div>
        ))}
      </div>
      <div className="h-10 rounded-md bg-stone-800" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-stone-700/50 bg-stone-800/40 p-4">
            <div className="h-4 w-3/4 rounded bg-stone-700 mb-2" />
            <div className="h-3 w-1/4 rounded bg-stone-700" />
          </div>
        ))}
      </div>
    </div>
  )
}
