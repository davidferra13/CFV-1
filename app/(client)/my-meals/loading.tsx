export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-9 w-40 bg-stone-800 rounded" />
        <div className="h-5 w-72 bg-stone-800 rounded mt-2" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-8 w-24 bg-stone-800 rounded" />
        <div className="h-5 w-48 bg-stone-800 rounded" />
        <div className="h-8 w-24 bg-stone-800 rounded" />
      </div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-24 bg-stone-800 rounded-lg" />
      ))}
    </div>
  )
}
