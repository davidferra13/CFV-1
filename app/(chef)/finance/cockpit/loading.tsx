import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

export default function FinancialCockpitLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-finance-cockpit" size="sm" className="items-start py-0" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item}>
            <CardContent className="space-y-3 p-5">
              <div className="h-4 w-28 loading-bone loading-bone-dark" />
              <div className="h-8 w-32 loading-bone loading-bone-dark" />
              <div className="h-4 w-full loading-bone loading-bone-dark" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-6 w-40 loading-bone loading-bone-dark" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-20 w-full loading-bone loading-bone-dark" />
          <div className="h-20 w-full loading-bone loading-bone-dark" />
        </CardContent>
      </Card>
    </div>
  )
}
