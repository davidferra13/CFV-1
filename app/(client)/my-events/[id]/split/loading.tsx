function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function SplitLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-40" />
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <div className="flex justify-between">
          <Bone className="h-5 w-28" />
          <Bone className="h-5 w-24" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-stone-700 p-3"
            >
              <div className="flex items-center gap-3">
                <Bone className="h-8 w-8 rounded-full" />
                <Bone className="h-4 w-28" />
              </div>
              <Bone className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
      <Bone className="h-10 w-full rounded-lg" />
    </div>
  )
}
