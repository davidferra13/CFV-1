export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-9 w-48 bg-stone-800 rounded" />
        <div className="h-5 w-80 bg-stone-800 rounded mt-2" />
      </div>
      <div className="flex gap-1 bg-stone-800/50 rounded-lg p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 h-10 bg-stone-800 rounded-md" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-stone-800 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
