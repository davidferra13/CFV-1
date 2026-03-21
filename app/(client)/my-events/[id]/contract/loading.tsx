function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ContractLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-48" />
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-3">
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-3/4" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-5/6" />
        <Bone className="h-4 w-2/3" />
      </div>
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <Bone className="h-5 w-32" />
        <Bone className="h-32 w-full" />
        <Bone className="h-10 w-full" />
      </div>
    </div>
  )
}
