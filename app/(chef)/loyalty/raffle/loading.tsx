import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function RaffleLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-loyalty-raffle" size="sm" />
      <Bone className="h-8 w-48" />
      <Bone className="h-4 w-72" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-stone-800 bg-stone-900/60 p-4">
            <div className="flex items-center justify-between">
              <Bone className="h-5 w-40" />
              <Bone className="h-5 w-20" />
            </div>
            <Bone className="mt-2 h-4 w-64" />
          </div>
        ))}
      </div>
    </div>
  )
}
