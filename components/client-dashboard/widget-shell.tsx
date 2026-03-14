import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ClientDashboardWidgetShell({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl">{title}</CardTitle>
        {description ? <p className="text-sm text-stone-400">{description}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
