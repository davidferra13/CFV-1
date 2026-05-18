function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function PaymentPlanLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-48" />
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <Bone className="h-5 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-stone-700 p-3"
            >
              <div className="space-y-1">
                <Bone className="h-4 w-28" />
                <Bone className="h-3 w-20" />
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
