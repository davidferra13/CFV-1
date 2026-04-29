// Admin Navigation Configuration
// Admin-owned navigation definition, separated from chef navigation.
// This is the admin control plane's single source of truth for nav items.

import type { LucideIcon } from '@/components/ui/icons'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  Broadcast,
  CalendarDays,
  ChatDots,
  ClipboardCheck,
  Contact,
  CreditCard,
  DollarSign,
  FlagBanner,
  Handshake,
  LayoutDashboard,
  Leaf,
  List,
  Mail,
  MessagesSquare,
  NotebookIcon,
  Scales,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  TreeStructure,
  Users,
  WifiHigh,
} from '@/components/ui/icons'

export type AdminNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export type AdminNavGroup = {
  id: string
  label: string
  items: AdminNavItem[]
}

// Admin primary links (top of sidebar)
export const adminPrimaryLinks: AdminNavItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/pulse', label: 'Pulse', icon: ShieldAlert },
  { href: '/admin/inquiries', label: 'All Inquiries', icon: ShieldAlert },
]

// Admin nav groups (collapsible sections)
export const adminNavGroups: AdminNavGroup[] = [
  {
    id: 'platform',
    label: 'Platform',
    items: [
      { href: '/admin/users', label: 'Chefs', icon: Users },
      { href: '/admin/clients', label: 'Clients', icon: Contact },
      { href: '/admin/directory', label: 'Directory', icon: TreeStructure },
      { href: '/admin/directory-listings', label: 'Directory Listings', icon: List },
      { href: '/admin/beta', label: 'Early Signups', icon: Star },
      { href: '/admin/launch-readiness', label: 'Launch Readiness', icon: ClipboardCheck },
      { href: '/admin/flags', label: 'Feature Flags', icon: FlagBanner },
      { href: '/admin/hub', label: 'Dinner Circle Groups', icon: Users },
      { href: '/admin/referral-partners', label: 'Referral Partners', icon: Handshake },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { href: '/admin/events', label: 'All Events', icon: CalendarDays },
      { href: '/admin/command-center', label: 'Command Center', icon: Broadcast },
      { href: '/admin/communications', label: 'Communications', icon: Mail },
      { href: '/admin/conversations', label: 'Conversations', icon: ChatDots },
      { href: '/admin/notifications', label: 'Notifications', icon: BellRing },
      { href: '/admin/social', label: 'Social Feed', icon: MessagesSquare },
    ],
  },
  {
    id: 'finance-compliance',
    label: 'Finance & Compliance',
    items: [
      { href: '/admin/financials', label: 'Financials', icon: DollarSign },
      { href: '/admin/reconciliation', label: 'Reconciliation', icon: Scales },
      { href: '/admin/system/payments', label: 'System Payments', icon: CreditCard },
      { href: '/admin/cannabis', label: 'Cannabis', icon: Leaf },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/audit', label: 'Audit Log', icon: NotebookIcon },
      { href: '/admin/remy-activity', label: 'Remy Activity', icon: ShieldAlert },
      { href: '/admin/openclaw/health', label: 'Data Engine Health', icon: Activity },
      { href: '/admin/feedback', label: 'Feedback', icon: Star },
      { href: '/admin/presence', label: 'Live Presence', icon: WifiHigh },
      { href: '/admin/silent-failures', label: 'Silent Failures', icon: AlertTriangle },
      { href: '/admin/beta-surveys', label: 'Surveys', icon: ClipboardCheck },
      { href: '/admin/system', label: 'System Health', icon: ShieldCheck },
    ],
  },
]

// Admin bottom links
export const adminBottomLinks: AdminNavItem[] = [
  { href: '/dashboard', label: 'Chef Portal', icon: LayoutDashboard },
  { href: '/settings', label: 'Settings', icon: Settings },
]
