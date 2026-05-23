import { Card, CardContent } from '@/components/ui/card'

export default function ClientContributionLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-72 animate-pulse rounded bg-stone-800" />
        <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-stone-800" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item}>
            <CardContent className="p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-stone-800" />
              <div className="mt-3 h-7 w-32 animate-pulse rounded bg-stone-800" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="h-56 animate-pulse rounded bg-stone-900" />
        </CardContent>
      </Card>
    </div>
  )
}
