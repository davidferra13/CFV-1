import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function VirtualTerminalLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ContextLoader contextId="nav-commerce-virtual-terminal" size="sm" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-4 w-24" />
            <Bone className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Bone className="h-12 w-full rounded-lg mt-4" />
      </div>
    </div>
  )
}
