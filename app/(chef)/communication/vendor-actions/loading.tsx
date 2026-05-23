import { ContextLoader } from '@/components/ui/context-loader'

export default function LoadingVendorCallActions() {
  return (
    <div className="min-h-screen bg-stone-900 px-6 py-8">
      <ContextLoader contextId="communication-vendor-actions" size="sm" />
    </div>
  )
}
