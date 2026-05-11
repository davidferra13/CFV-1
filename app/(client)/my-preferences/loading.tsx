export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-9 w-52 bg-stone-800 rounded" />
        <div className="h-5 w-96 bg-stone-800 rounded mt-2" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-32 bg-stone-800 rounded-lg" />
      ))}
    </div>
  )
}
