import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function IntelligenceLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-clients-intelligence" size="sm" />
      <Bone className="h-96 w-full rounded-lg" />
    </div>
  )
}
