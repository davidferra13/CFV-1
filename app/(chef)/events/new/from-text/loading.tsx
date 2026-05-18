import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function NewEventFromTextLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ContextLoader contextId="nav-events-new-from-text" size="sm" />
      <div>
        <Bone className="h-8 w-56" />
        <Bone className="h-4 w-80 mt-1" />
      </div>
      <Bone className="h-4 w-64" />
      <div className="space-y-4">
        <Bone className="h-32 w-full rounded-lg" />
        <Bone className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  )
}
