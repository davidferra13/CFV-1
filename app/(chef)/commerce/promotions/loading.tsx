import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function PromotionsLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <ContextLoader contextId="nav-commerce-promotions" size="sm" />
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <Bone className="h-64 w-full rounded-lg" />
    </div>
  )
}
