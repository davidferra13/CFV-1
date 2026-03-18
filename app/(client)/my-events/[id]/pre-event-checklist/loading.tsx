function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function ChecklistLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-56" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-stone-700 bg-stone-900 p-4"
          >
            <Bone className="h-5 w-5 rounded" />
            <Bone className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}
