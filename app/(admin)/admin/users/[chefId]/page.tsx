// Admin Chef Detail — full view of a single chef's account

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, CalendarRange, Users, DollarSign } from 'lucide-react'

function formatCents(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  proposed: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  paid: 'bg-indigo-100 text-indigo-700',
  confirmed: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default async function AdminChefDetailPage({ params }: { params: { chefId: string } }) {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const supabase = createAdminClient()

  const { data: chef } = await supabase
    .from('chefs')
    .select('id, business_name, email, created_at, phone')
    .eq('id', params.chefId)
    .single()

  if (!chef) notFound()

  const email = chef.email

  const [eventsResult, clientsResult, ledgerResult] = await Promise.all([
    supabase
      .from('events')
      .select('id, occasion, status, event_date, quoted_price_cents, guest_count')
      .eq('tenant_id', params.chefId)
      .order('event_date', { ascending: false })
      .limit(50),
    supabase
      .from('clients')
      .select('id, full_name, email, created_at')
      .eq('tenant_id', params.chefId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('ledger_entries')
      .select('id, entry_type, amount_cents, description, created_at')
      .eq('tenant_id', params.chefId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const events = eventsResult.data ?? []
  const clients = clientsResult.data ?? []
  const ledger = ledgerResult.data ?? []

  const totalGMV = ledger.filter((l) => l.entry_type === 'payment').reduce((s, l) => s + (l.amount_cents ?? 0), 0)
  // 'expense' is not in the current entry_type enum — returns 0 until schema adds it
  const totalExpenses = ledger.filter((l) => (l.entry_type as string) === 'expense').reduce((s, l) => s + (l.amount_cents ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/admin/users" className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-3">
          <ArrowLeft size={12} /> Back to Chefs
        </Link>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-100 rounded-xl">
            <User size={24} className="text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{chef.business_name ?? 'Unnamed Chef'}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{email ?? 'Email unavailable'}</p>
            <p className="text-xs text-slate-400 mt-1">
              Joined {new Date(chef.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-green-500" />
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">GMV</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{formatCents(totalGMV)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarRange size={14} className="text-blue-500" />
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Events</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{events.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-purple-500" />
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Clients</p>
          </div>
          <p className="text-xl font-bold text-slate-900">{clients.length}</p>
        </div>
      </div>

      {/* Events */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Recent Events</h2>
        </div>
        {events.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Date</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-900 font-medium">{event.occasion ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[event.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {event.event_date ? new Date(event.event_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      {event.quoted_price_cents ? formatCents(event.quoted_price_cents) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clients */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Clients ({clients.length})</h2>
        </div>
        {clients.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No clients yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {clients.map((client) => (
              <div key={client.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{(client as {full_name?: string | null}).full_name ?? 'Unnamed'}</p>
                  <p className="text-xs text-slate-400">{client.email ?? '—'}</p>
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(client.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ledger (last 50) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Ledger (last 50 entries)</h2>
          <span className="text-xs text-slate-400">Expenses: {formatCents(totalExpenses)}</span>
        </div>
        {ledger.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No ledger entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Description</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Amount</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium text-slate-600 uppercase">{entry.entry_type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 text-xs">{entry.description ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                      {formatCents(entry.amount_cents ?? 0)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
