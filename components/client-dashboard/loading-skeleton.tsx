import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function ClientDashboardLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-stone-700" />
            <div className="h-4 w-72 animate-pulse rounded bg-stone-800" />
          </CardHeader>
          <CardContent>
            <div className="h-20 animate-pulse rounded bg-stone-800" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
