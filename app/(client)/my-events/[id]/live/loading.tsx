function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function LiveLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bone className="h-8 w-40" />
        <Bone className="h-3 w-3 rounded-full" />
      </div>
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <Bone className="h-5 w-36" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-3/4" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-stone-700 bg-stone-900 p-4 space-y-2">
            <Bone className="h-4 w-1/2" />
            <Bone className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
