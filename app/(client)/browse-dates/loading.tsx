export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-9 w-44 bg-stone-800 rounded" />
        <div className="h-5 w-72 bg-stone-800 rounded mt-2" />
      </div>
      <div className="h-8 w-64 bg-stone-800 rounded mx-auto" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-12 bg-stone-800 rounded" />
        ))}
      </div>
    </div>
  )
}
