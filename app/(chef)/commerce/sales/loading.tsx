import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function SalesLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ContextLoader contextId="nav-commerce-sales" size="sm" />
        <Bone className="h-5 w-10 rounded-full" />
      </div>
      <Bone className="h-80 w-full rounded-lg" />
    </div>
  )
}
