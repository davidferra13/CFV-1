// Loading skeleton for Remy settings page
function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8">
      {/* Personality section */}
      <div className="space-y-4">
        <Bone className="h-6 w-40" />
        <Bone className="h-4 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-stone-800 p-4 space-y-2">
              <Bone className="h-5 w-32" />
              <Bone className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Signal toggles section */}
      <div className="space-y-4">
        <Bone className="h-6 w-48" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="space-y-1">
              <Bone className="h-4 w-36" />
              <Bone className="h-3 w-56" />
            </div>
            <Bone className="h-6 w-11 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
