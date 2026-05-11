export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-9 w-40 bg-stone-800 rounded" />
        <div className="h-5 w-64 bg-stone-800 rounded mt-2" />
      </div>
      <div className="h-32 bg-stone-800 rounded-lg" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-28 bg-stone-800 rounded-lg" />
      ))}
    </div>
  )
}
