function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ApproveMenuLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-48" />
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <Bone className="h-5 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="space-y-1 flex-1">
              <Bone className="h-4 w-2/3" />
              <Bone className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Bone className="h-10 flex-1 rounded-lg" />
        <Bone className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  )
}
