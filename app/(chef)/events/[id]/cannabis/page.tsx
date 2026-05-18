// Cannabis Event Detail Tab - /events/[id]/cannabis
// Combines compliance checklist, dosing control, control packet link,
// and cannabis ledger entries for this specific event.
// Access gated: requirePro + hasCannabisAccess.

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { requirePro } from '@/lib/billing/require-pro'
import { hasCannabisAccess, getCannabisEventDetails } from '@/lib/chef/cannabis-actions'
import { getEventById } from '@/lib/events/actions'
import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'
import { createServerClient } from '@/lib/db/server'

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const CATEGORY_LABELS: Record<string, string> = {
  cannabis_friendly: 'Cannabis Friendly',
  infused_menu: 'Infused Menu',
  cbd_only: 'CBD Only',
  micro_dose: 'Micro Dose',
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  payment: 'Payment',
  deposit: 'Deposit',
  installment: 'Installment',
  final_payment: 'Final Payment',
  tip: 'Tip',
  refund: 'Refund',
  adjustment: 'Adjustment',
  add_on: 'Add-On',
  credit: 'Credit',
}

export async function generateMetadata() {
  return { title: 'Event Cannabis | ChefFlow' }
}

export default async function EventCannabisTabPage({ params }: { params: { id: string } }) {
  const user = await requirePro('cannabis-portal')
  const hasAccess = await hasCannabisAccess(user.id)

  if (!hasAccess) {
    redirect(`/events/${params.id}`)
  }

  const event = await getEventById(params.id)
  if (!event) {
    notFound()
  }

  // Fetch cannabis details and ledger entries for this event in parallel
  const [cannabisDetails, ledgerEntries, expenses] = await Promise.all([
    getCannabisEventDetails(params.id).catch(() => null),
    fetchEventLedgerEntries(params.id, (event as any).tenant_id),
    fetchEventExpenses(params.id, (event as any).tenant_id),
  ])

  const totalRevenue = ledgerEntries.reduce((sum: number, e: any) => sum + (e.amount_cents ?? 0), 0)
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount_cents ?? 0), 0)
  const netProfit = totalRevenue - totalExpenses

  const isActive = !['completed', 'cancelled'].includes(event.status)

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <CannabisPortalHeader
          title="Cannabis Details"
          subtitle={`${event.occasion || 'Cannabis Event'} - ${new Date(event.event_date).toLocaleDateString('en-US')}`}
          backHref={`/events/${params.id}`}
          backLabel="Event Detail"
          actions={
            <div className="flex items-center gap-2">
              {isActive && (
                <Link
                  href={`/cannabis/events/${params.id}/control-packet`}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #2d5a30 0%, #4a7c4e 100%)',
                    color: '#e8f5e9',
                    boxShadow: '0 0 12px rgba(74, 124, 78, 0.3)',
                  }}
                >
                  Control Packet
                </Link>
              )}
              <Link
                href="/events/cannabis"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                style={{
                  background: 'rgba(45, 122, 90, 0.25)',
                  color: '#d2e8d4',
                  border: '1px solid rgba(106, 170, 110, 0.35)',
                }}
              >
                All Cannabis Events
              </Link>
            </div>
          }
        />

        {/* Cannabis Category and Compliance Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Dosing / Category Card */}
          <div
            className="rounded-xl p-5"
            style={{
              background: '#0f1a0f',
              border: '1px solid rgba(74, 124, 78, 0.15)',
            }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: '#4a7c4e' }}
            >
              Dosing Category
            </h3>
            {cannabisDetails ? (
              <div className="space-y-2">
                <p className="text-sm font-medium" style={{ color: '#e8f5e9' }}>
                  {CATEGORY_LABELS[cannabisDetails.cannabis_category] ??
                    cannabisDetails.cannabis_category}
                </p>
                {cannabisDetails.compliance_notes && (
                  <p className="text-xs" style={{ color: '#6aaa6e' }}>
                    {cannabisDetails.compliance_notes}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#6aaa6e' }}>
                No cannabis details configured for this event.
              </p>
            )}
          </div>

          {/* Compliance Checklist Card */}
          <div
            className="rounded-xl p-5"
            style={{
              background: '#0f1a0f',
              border: '1px solid rgba(74, 124, 78, 0.15)',
            }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: '#4a7c4e' }}
            >
              Compliance Checklist
            </h3>
            <ul className="space-y-2">
              <ComplianceItem
                label="Guest consent confirmed"
                done={cannabisDetails?.guest_consent_confirmed ?? false}
              />
              <ComplianceItem
                label="Control packet created"
                done={isActive}
                href={`/cannabis/events/${params.id}/control-packet`}
              />
              <ComplianceItem
                label="Compliance acknowledged"
                done={cannabisDetails?.compliance_placeholder_acknowledged ?? false}
              />
            </ul>
          </div>
        </div>

        {/* Control Packet Quick Access */}
        {isActive && (
          <div
            className="rounded-xl p-4 mb-6"
            style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#d2e8d4' }}>
                  Seating and Dose Control Packet
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#8ebf92' }}>
                  Snapshot versioning, reconciliation, photo evidence, and immutable archival.
                </p>
              </div>
              <Link
                href={`/cannabis/events/${params.id}/control-packet`}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0"
                style={{
                  background: 'rgba(45, 122, 90, 0.25)',
                  color: '#d2e8d4',
                  border: '1px solid rgba(106, 170, 110, 0.35)',
                }}
              >
                Open Packet
              </Link>
            </div>
          </div>
        )}

        {/* Event Financial Summary */}
        <div className="mb-6">
          <h3
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: '#4a7c4e' }}
          >
            Event Financials (Cannabis Ledger)
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Revenue', value: totalRevenue, color: '#8bc34a' },
              { label: 'Expenses', value: totalExpenses, color: '#ef9a9a' },
              {
                label: 'Net',
                value: netProfit,
                color: netProfit >= 0 ? '#8bc34a' : '#ef9a9a',
              },
            ].map((t) => (
              <div
                key={t.label}
                className="rounded-xl p-4"
                style={{
                  background: '#0f1a0f',
                  border: '1px solid rgba(74, 124, 78, 0.15)',
                }}
              >
                <p className="text-xs mb-1" style={{ color: '#4a7c4e' }}>
                  {t.label}
                </p>
                <p className="text-lg font-semibold" style={{ color: t.color }}>
                  {formatCents(t.value)}
                </p>
              </div>
            ))}
          </div>

          {ledgerEntries.length === 0 ? (
            <div
              className="rounded-xl p-6 text-center text-sm"
              style={{
                background: '#0f1a0f',
                border: '1px solid rgba(74, 124, 78, 0.15)',
                color: '#6aaa6e',
              }}
            >
              No ledger entries for this event yet. Payments and expenses will appear here.
            </div>
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: '#0f1a0f',
                border: '1px solid rgba(74, 124, 78, 0.15)',
              }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(74, 124, 78, 0.15)' }}>
                    {['Date', 'Type', 'Amount'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: '#4a7c4e' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry: any, i: number) => (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom:
                          i < ledgerEntries.length - 1
                            ? '1px solid rgba(74, 124, 78, 0.08)'
                            : 'none',
                      }}
                    >
                      <td className="px-4 py-3 text-xs" style={{ color: '#6aaa6e' }}>
                        {formatDate(entry.received_at)}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#e8f5e9' }}>
                        {ENTRY_TYPE_LABELS[entry.entry_type] ?? entry.entry_type}
                        {entry.is_refund && (
                          <span className="ml-1 text-xs" style={{ color: '#ef9a9a' }}>
                            (refund)
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-medium"
                        style={{
                          color: entry.is_refund
                            ? '#ef9a9a'
                            : entry.amount_cents < 0
                              ? '#ef9a9a'
                              : '#8bc34a',
                        }}
                      >
                        {entry.amount_cents < 0 ? '-' : ''}
                        {formatCents(Math.abs(entry.amount_cents))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Link to full ledger */}
        <div className="text-center">
          <Link
            href="/events/cannabis/ledger"
            className="text-xs underline underline-offset-2"
            style={{ color: '#4a7c4e' }}
          >
            View full cannabis ledger (all events)
          </Link>
        </div>
      </div>
    </CannabisPageWrapper>
  )
}

function ComplianceItem({ label, done, href }: { label: string; done: boolean; href?: string }) {
  const content = (
    <li className="flex items-center gap-2">
      <span
        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0"
        style={{
          background: done ? 'rgba(139, 195, 74, 0.2)' : 'rgba(74, 124, 78, 0.1)',
          border: `1px solid ${done ? '#8bc34a' : 'rgba(74, 124, 78, 0.3)'}`,
          color: done ? '#8bc34a' : '#4a7c4e',
        }}
      >
        {done ? '✓' : ''}
      </span>
      <span className="text-sm" style={{ color: done ? '#e8f5e9' : '#6aaa6e' }}>
        {label}
      </span>
    </li>
  )

  if (href && !done) {
    return (
      <Link href={href} className="block hover:opacity-80 transition-opacity">
        {content}
      </Link>
    )
  }

  return content
}

async function fetchEventLedgerEntries(eventId: string, tenantId: string) {
  try {
    const db: any = createServerClient()
    const { data } = await db
      .from('ledger_entries')
      .select('*')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('received_at', { ascending: false })
      .limit(100)

    return data ?? []
  } catch {
    return []
  }
}

async function fetchEventExpenses(eventId: string, tenantId: string) {
  try {
    const db: any = createServerClient()
    const { data } = await db
      .from('expenses')
      .select('amount_cents')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)

    return data ?? []
  } catch {
    return []
  }
}
