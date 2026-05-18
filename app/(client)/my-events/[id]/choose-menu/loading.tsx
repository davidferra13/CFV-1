function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ChooseMenuLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-3">
            <Bone className="h-5 w-40" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-3/4" />
            <Bone className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
