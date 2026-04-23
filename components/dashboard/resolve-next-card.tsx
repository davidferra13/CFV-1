import type { DashboardResolveNextTask } from '@/lib/interface/action-layer'
import { ActionSurfaceCard } from '@/components/dashboard/action-surface-card'

export function ResolveNextCard({ task }: { task: DashboardResolveNextTask }) {
  return <ActionSurfaceCard sectionLabel="Resolve Next" task={task} />
}
