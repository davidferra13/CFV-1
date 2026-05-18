import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function RegisterLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <ContextLoader contextId="nav-commerce-register" size="sm" />
    </div>
  )
}
