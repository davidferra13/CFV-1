// Admin Overview — Platform command center
// Cross-tenant KPIs, live session count widget, quick-action tiles

import { requireAdmin } from '@/lib/auth/admin'
import { getPlatformOverviewStats } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Radio, Users, UserCheck, DollarSign, CalendarRange, Activity, Megaphone, ToggleLeft, TrendingUp, TrendingDown } from 'lucide-react'

function StatCard({
  label,
  value,
  sub,
  subLabel,
  trend,
}: {
  label: string
  value: string | number
  sub?: string | number
  subLabel?: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {sub !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up' && <TrendingUp size={12} className="text-green-500" />}
          {trend === 'down' && <TrendingDown size={12} className="text-red-500" />}
          <p className="text-xs text-slate-400">
            {subLabel}: <span className="font-medium text-slate-600">{sub}</span>
          </p>
        </div>
      )}
    </div>
  )
}

function QuickTile({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string
  icon: typeof Radio
  label: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-slate-200 px-4 py-4 hover:border-slate-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-orange-50 transition-colors">
          <Icon size={16} className="text-slate-600 group-hover:text-orange-500 transition-colors" />
        </div>
        <span className="font-medium text-sm text-slate-900">{label}</span>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </Link>
  )
}

function formatCents(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default async function AdminOverviewPage() {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  let stats = null
  try {
    stats = await getPlatformOverviewStats()
  } catch (err) {
    console.error('[Admin] Failed to load platform stats:', err)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
        <p className="text-sm text-slate-500 mt-1">
          Signed in as <span className="font-medium">{admin.email}</span>
        </p>
      </div>

      {/* Platform KPIs */}
      {stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Chefs"
            value={stats.totalChefs.toLocaleString()}
            sub={`+${stats.chefsThisMonth}`}
            subLabel="this month"
            trend="up"
          />
          <StatCard
            label="Total Clients"
            value={stats.totalClients.toLocaleString()}
            sub={`+${stats.clientsThisMonth}`}
            subLabel="this month"
            trend="up"
          />
          <StatCard
            label="Total Events"
            value={stats.totalEvents.toLocaleString()}
            sub={`+${stats.eventsThisMonth}`}
            subLabel="this month"
            trend="up"
          />
          <StatCard
            label="Platform GMV"
            value={formatCents(stats.totalGMV)}
            sub={formatCents(stats.gmvThisMonth)}
            subLabel="this month"
            trend="up"
          />
          <StatCard
            label="Avg Events / Chef"
            value={stats.avgEventsPerChef}
          />
          <StatCard
            label="Avg GMV / Chef"
            value={formatCents(stats.avgGMVPerChef)}
          />
          <StatCard
            label="GMV This Month"
            value={formatCents(stats.gmvThisMonth)}
          />
          <StatCard
            label="New Clients (Month)"
            value={stats.clientsThisMonth}
          />
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          Could not load platform statistics. Check server logs.
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickTile
            href="/admin/presence"
            icon={Radio}
            label="Live Presence"
            description="See who's on the site right now"
          />
          <QuickTile
            href="/admin/users"
            icon={Users}
            label="Chefs"
            description="View and manage all chef accounts"
          />
          <QuickTile
            href="/admin/clients"
            icon={UserCheck}
            label="Clients"
            description="All clients across every tenant"
          />
          <QuickTile
            href="/admin/analytics"
            icon={TrendingUp}
            label="Analytics"
            description="Platform growth and revenue trends"
          />
          <QuickTile
            href="/admin/financials"
            icon={DollarSign}
            label="Financials"
            description="GMV, ledger, and payment issues"
          />
          <QuickTile
            href="/admin/events"
            icon={CalendarRange}
            label="All Events"
            description="Every event across every chef"
          />
          <QuickTile
            href="/admin/system"
            icon={Activity}
            label="System Health"
            description="DB row counts and error signals"
          />
          <QuickTile
            href="/admin/communications"
            icon={Megaphone}
            label="Communications"
            description="Announcements and direct email"
          />
        </div>
      </div>
    </div>
  )
}
