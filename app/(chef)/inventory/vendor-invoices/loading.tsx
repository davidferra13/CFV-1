import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function VendorInvoicesLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-vendor-invoices" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-20" />
        <Bone className="h-8 w-48 mt-1" />
        <Bone className="h-4 w-64 mt-1" />
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <Bone className="h-5 w-36" />
          <Bone className="h-10 w-full" />
          <Bone className="h-9 w-32" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0 divide-y divide-stone-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 space-y-1">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-28" />
              </div>
              <Bone className="h-4 w-20" />
              <Bone className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
