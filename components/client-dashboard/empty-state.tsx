import { Card, CardContent } from '@/components/ui/card'

export function ClientDashboardEmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <p className="text-sm text-stone-400">{message}</p>
      </CardContent>
    </Card>
  )
}
