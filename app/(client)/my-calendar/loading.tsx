export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-9 w-36 bg-stone-800 rounded" />
        <div className="h-5 w-64 bg-stone-800 rounded mt-2" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 bg-stone-800 rounded-lg" />
        <div className="h-6 w-40 bg-stone-800 rounded" />
        <div className="h-10 w-10 bg-stone-800 rounded-lg" />
      </div>
      <div className="h-80 bg-stone-800 rounded-lg" />
    </div>
  )
}
