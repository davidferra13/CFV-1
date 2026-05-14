function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ChefsLoading() {
  return (
    <div className="min-h-screen bg-stone-900">
      {/* Header skeleton */}
      <div className="border-b border-stone-800 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Bone className="h-8 w-40" />
          <Bone className="h-5 w-24" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="border-b border-stone-800 px-4 py-3">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-stone-700 bg-stone-900/95 p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <Bone className="h-10 flex-[2] rounded-xl" />
              <Bone className="h-10 flex-[1.5] rounded-xl" />
              <Bone className="h-10 flex-1 rounded-xl" />
              <Bone className="h-10 w-28 rounded-xl" />
            </div>
          </div>
          {/* Quick chips */}
          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Bone key={i} className="h-8 w-28 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Results skeleton */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Bone className="h-5 w-32" />
          <Bone className="h-5 w-20" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-stone-900 ring-1 ring-stone-800">
              <Bone className="aspect-[3/4] w-full" />
              <div className="space-y-3 p-4">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-full" />
                <Bone className="h-10 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
