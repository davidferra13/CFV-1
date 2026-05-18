function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function PayLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-36" />
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <div className="flex justify-between">
          <Bone className="h-5 w-28" />
          <Bone className="h-6 w-24" />
        </div>
        <Bone className="h-px w-full" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Bone className="h-4 w-1/3" />
              <Bone className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
      <Bone className="h-12 w-full rounded-lg" />
    </div>
  )
}
