export default function CircleDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="h-12 w-64 animate-pulse rounded-lg bg-stone-800" />
      <div className="h-10 animate-pulse rounded-lg bg-stone-800/50" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-stone-800/50" />
        ))}
      </div>
    </div>
  )
}
