// Loading skeleton for Remy concierge chat
function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function Loading() {
  return (
    <div className="flex h-full bg-stone-900">
      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-stone-800 px-4 py-3">
          <Bone className="h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Bone className="h-4 w-16" />
            <Bone className="h-3 w-24" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-4">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex gap-3">
              <Bone className="h-10 w-10 rounded-full shrink-0" />
              <Bone className="h-20 w-3/4 rounded-2xl rounded-tl-sm" />
            </div>
            <div className="flex justify-end">
              <Bone className="h-12 w-1/2 rounded-2xl rounded-tr-sm" />
            </div>
            <div className="flex gap-3">
              <Bone className="h-10 w-10 rounded-full shrink-0" />
              <Bone className="h-16 w-2/3 rounded-2xl rounded-tl-sm" />
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-stone-800 px-4 py-3">
          <div className="mx-auto max-w-2xl flex items-end gap-2">
            <Bone className="h-12 flex-1 rounded-xl" />
            <Bone className="h-10 w-10 rounded-xl shrink-0" />
          </div>
        </div>
      </div>

      {/* Context sidebar skeleton (desktop only) */}
      <div className="hidden lg:block w-80 border-l border-stone-800 p-4 space-y-4">
        <Bone className="h-4 w-20 mb-4" />
        <div className="space-y-2">
          <Bone className="h-14 w-full rounded-lg" />
          <Bone className="h-14 w-full rounded-lg" />
          <Bone className="h-14 w-full rounded-lg" />
        </div>
        <Bone className="h-4 w-24 mt-4" />
        <div className="space-y-2">
          <Bone className="h-10 w-full rounded-lg" />
          <Bone className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
