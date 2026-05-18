import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function PresenceLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Bone className="h-4 w-16" />
        <div className="flex items-center gap-3 mt-1">
          <ContextLoader contextId="nav-clients-presence" size="sm" />
          <Bone className="h-4 w-24" />
        </div>
        <Bone className="h-4 w-96 mt-1" />
      </div>
      <Bone className="h-80 w-full rounded-lg" />
    </div>
  )
}
