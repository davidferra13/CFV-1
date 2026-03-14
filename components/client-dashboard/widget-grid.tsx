export function ClientDashboardWidgetGrid({
  children,
  className = 'space-y-8',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={className}>{children}</div>
}
