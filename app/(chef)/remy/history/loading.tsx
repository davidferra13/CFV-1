// Loading skeleton for Remy history page
function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Search bar */}
      <Bone className="h-10 w-full rounded-lg" />

      {/* Date group header */}
      <Bone className="h-5 w-20" />

      {/* Conversation cards */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-xl border border-stone-800 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Bone className="h-5 w-48" />
            <Bone className="h-4 w-20" />
          </div>
          <Bone className="h-4 w-full" />
          <div className="flex gap-2">
            <Bone className="h-5 w-16 rounded-full" />
            <Bone className="h-5 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
