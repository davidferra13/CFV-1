export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-9 w-40 bg-stone-800 rounded" />
        <div className="h-5 w-72 bg-stone-800 rounded mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 bg-stone-800 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
