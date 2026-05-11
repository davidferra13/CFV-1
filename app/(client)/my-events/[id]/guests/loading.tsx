export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-5 w-32 bg-stone-800 rounded" />
      <div className="flex justify-between">
        <div>
          <div className="h-9 w-40 bg-stone-800 rounded" />
          <div className="h-5 w-24 bg-stone-800 rounded mt-1" />
        </div>
        <div className="h-10 w-28 bg-stone-800 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-stone-800 rounded-lg" />
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
