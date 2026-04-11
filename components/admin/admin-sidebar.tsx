'use client'

// Admin Portal Sidebar - standalone nav separate from the chef sidebar
// Minimal, always-expanded, dark theme to distinguish from chef portal

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Radio,
  Users,
  UserCheck,
  BarChart3,
  DollarSign,
  CalendarRange,
  ScrollText,
  Activity,
  Megaphone,
  ToggleLeft,
  Handshake,
  MessageSquare,
  MessagesSquare,
  Sparkles,
  Shield,
  LogOut,
  Leaf,
  Rocket,
  ClipboardList,
  ShieldAlert,
} from 'lucide-react'
import { signOut } from '@/lib/auth/actions'

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/presence', label: 'Live Presence', icon: Radio },
  { href: '/admin/users', label: 'Chefs', icon: Users },
  { href: '/admin/clients', label: 'Clients', icon: UserCheck },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/financials', label: 'Financials', icon: DollarSign },
  { href: '/admin/events', label: 'All Events', icon: CalendarRange },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/system', label: 'System Health', icon: Activity },
  { href: '/admin/hub', label: 'Dinner Circles', icon: MessagesSquare },
  { href: '/admin/communications', label: 'Communications', icon: Megaphone },
  { href: '/admin/flags', label: 'Feature Flags', icon: ToggleLeft },
  { href: '/admin/referral-partners', label: 'Referral Partners', icon: Handshake },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/admin/animations', label: 'Animations', icon: Sparkles },
  // { href: '/admin/cannabis', label: 'Cannabis Tier', icon: Leaf }, // hidden - feature disabled
  { href: '/admin/beta', label: 'Early Signups', icon: Rocket },
  { href: '/admin/beta-surveys', label: 'Surveys', icon: ClipboardList },
  { href: '/admin/silent-failures', label: 'Silent Failures', icon: ShieldAlert },
]

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string
  label: string
  icon: typeof LayoutDashboard
  exact?: boolean
}) {
  const pathname = usePathname()
  const isActive = exact
    ? pathname === href
    : pathname === href || (pathname?.startsWith(href + '/') ?? false)

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-stone-900/15 text-white'
          : 'text-slate-300 hover:bg-stone-800/10 hover:text-white'
      }`}
    >
      <Icon size={16} className="shrink-0" />
      <span>{label}</span>
    </Link>
  )
}

export function AdminSidebar({ adminEmail }: { adminEmail: string }) {
  return (
    <div className="fixed inset-y-0 left-0 w-52 bg-slate-900 border-r border-slate-700 flex flex-col z-40">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={16} className="text-orange-400" />
          <span className="text-white font-semibold text-sm">Admin Panel</span>
        </div>
        <p className="text-slate-400 text-xs truncate">{adminEmail}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-700">
        <button
          type="button"
          onClick={async () => {
            try {
              await signOut()
            } catch (e) {
              console.error('[sign-out]', e)
            }
            window.location.href = '/'
          }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-stone-800/10 hover:text-white transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
