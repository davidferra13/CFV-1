// Queue Icon - Maps icon name strings to Lucide components
// Avoids dynamic imports while keeping providers decoupled from React.

import {
  MessageSquare,
  MessageSquareDashed,
  Clock,
  ClipboardCheck,
  UtensilsCrossed,
  Receipt,
  DollarSign,
  ShoppingCart,
  ListChecks,
  Wrench,
  Package,
  MapPin,
  ChefHat,
  PackageCheck,
  FileEdit,
  Timer,
  ArrowRightCircle,
  PenLine,
  Send,
  Calculator,
  ClipboardList,
  HeartHandshake,
  Star,
  UserPlus,
  Cake,
  Gift,
  Leaf,
  PhoneCall,
  CircleDot,
} from '@/components/ui/icons'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  MessageSquareDashed,
  Clock,
  ClipboardCheck,
  UtensilsCrossed,
  Receipt,
  DollarSign,
  ShoppingCart,
  ListChecks,
  Wrench,
  Package,
  MapPin,
  ChefHat,
  PackageCheck,
  FileEdit,
  Timer,
  ArrowRightCircle,
  PenLine,
  Send,
  Calculator,
  ClipboardList,
  HeartHandshake,
  Star,
  UserPlus,
  Cake,
  Gift,
  Leaf,
  PhoneCall,
  CircleDot,
}

interface Props {
  name: string
  className?: string
}

export function QueueIcon({ name, className = 'h-4 w-4' }: Props) {
  const Icon = ICON_MAP[name] ?? CircleDot
  return <Icon className={className} />
}
