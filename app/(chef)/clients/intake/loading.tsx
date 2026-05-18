import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function IntakeLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <ContextLoader contextId="nav-clients-intake" size="sm" />
          <Bone className="h-4 w-80 mt-1" />
        </div>
      </div>
      <Bone className="h-64 w-full rounded-lg" />
    </div>
  )
}
