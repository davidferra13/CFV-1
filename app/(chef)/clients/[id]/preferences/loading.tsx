import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ClientPreferencesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Bone className="h-4 w-36" />
        <ContextLoader contextId="nav-client-preferences" size="sm" className="mt-1" />
        <Bone className="h-4 w-80 mt-1" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-4 w-32" />
            <Bone className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
