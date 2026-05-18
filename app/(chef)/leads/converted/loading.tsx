import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-leads-converted" size="sm" />
      <Bone className="h-8 w-48" />
      <Bone className="h-4 w-72" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bone key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
