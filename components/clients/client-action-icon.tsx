import {
  AlertTriangle,
  Calendar,
  Gift,
  MessageCircle,
  RefreshCw,
  Sparkles,
} from '@/components/ui/icons'
import {
  getClientActionIconKey,
  type ClientActionIconKey,
  type ClientActionType,
} from '@/lib/clients/action-vocabulary'

const ICON_COMPONENTS: Record<ClientActionIconKey, React.ComponentType<{ className?: string }>> = {
  alert_triangle: AlertTriangle,
  message_circle: MessageCircle,
  calendar: Calendar,
  refresh: RefreshCw,
  gift: Gift,
  sparkles: Sparkles,
}

export function ClientActionIcon({
  actionType,
  className,
}: {
  actionType: ClientActionType
  className?: string
}) {
  const iconKey = getClientActionIconKey(actionType)
  const Icon = ICON_COMPONENTS[iconKey]
  return <Icon className={className} />
}
