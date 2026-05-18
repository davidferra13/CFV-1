function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ProposalLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-40" />
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <Bone className="h-5 w-36" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-3/4" />
      </div>
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <Bone className="h-5 w-28" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Bone className="h-4 w-1/2" />
              <Bone className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-stone-700 pt-3">
          <Bone className="h-5 w-16" />
          <Bone className="h-5 w-24" />
        </div>
      </div>
      <div className="flex gap-3">
        <Bone className="h-10 flex-1 rounded-lg" />
        <Bone className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  )
}
