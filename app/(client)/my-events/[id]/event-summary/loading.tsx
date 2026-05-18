function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function EventSummaryLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bone className="h-8 w-56" />
        <Bone className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-3">
            <Bone className="h-5 w-28" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
