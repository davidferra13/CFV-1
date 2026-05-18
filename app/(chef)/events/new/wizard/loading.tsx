import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function EventWizardLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-8">
      <ContextLoader contextId="nav-events-new-wizard" size="sm" />
      <div className="space-y-2">
        <Bone className="h-8 w-56" />
        <Bone className="h-4 w-72" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-2 w-16 rounded-full" />
        ))}
      </div>
      <div className="space-y-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-4 w-24" />
            <Bone className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <Bone className="h-10 w-full rounded-lg" />
    </div>
  )
}
