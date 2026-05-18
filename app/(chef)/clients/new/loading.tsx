import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function NewClientLoading() {
  return (
    <div className="max-w-3xl mx-auto py-10 space-y-6">
      <ContextLoader contextId="nav-clients-new" size="sm" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-4 w-24" />
            <Bone className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Bone className="h-10 w-32 rounded-lg mt-4" />
      </div>
    </div>
  )
}
