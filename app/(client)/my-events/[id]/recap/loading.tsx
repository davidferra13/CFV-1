export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-5 w-32 bg-stone-800 rounded" />
      <div>
        <div className="h-9 w-64 bg-stone-800 rounded" />
        <div className="flex gap-4 mt-2">
          <div className="h-5 w-40 bg-stone-800 rounded" />
          <div className="h-5 w-32 bg-stone-800 rounded" />
        </div>
      </div>
      <div className="h-64 bg-stone-800 rounded-lg" />
      <div className="h-48 bg-stone-800 rounded-lg" />
    </div>
  )
}
