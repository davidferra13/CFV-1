// Cannabis Ledger - Chef Portal
// All ledger entries scoped to cannabis events.

import { getCannabisLedger } from '@/lib/chef/cannabis-actions'
import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'

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

export default async function CannabisLedgerPage() {
  let ledgerData: Awaited<ReturnType<typeof getCannabisLedger>>
  try {
    ledgerData = await getCannabisLedger()
  } catch (err) {
    return (
      <CannabisPageWrapper>
        <div className="px-6 py-8 max-w-3xl mx-auto">
          <CannabisPortalHeader
            title="Cannabis Ledger"
            subtitle="Financial record for all cannabis events"
            backHref="/cannabis"
            backLabel="Cannabis Hub"
          />
          <div
            className="rounded-xl p-8 text-center"
            style={{
              background: '#1a0f0f',
              border: '1px solid rgba(239, 154, 154, 0.3)',
            }}
          >
            <p className="text-sm" style={{ color: '#ef9a9a' }}>
              Failed to load ledger data. Please try again later.
            </p>
          </div>
        </div>
      </CannabisPageWrapper>
    )
  }

  const { entries, totals } = ledgerData

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <CannabisPortalHeader
          title="Cannabis Ledger"
          subtitle="Financial record for all cannabis events"
          backHref="/cannabis"
          backLabel="Cannabis Hub"
        />

        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Revenue', value: totals.revenue, color: '#8bc34a' },
            { label: 'Expenses', value: totals.expenses, color: '#ef9a9a' },
            {
              label: 'Net Profit',
              value: totals.profit,
              color: totals.profit >= 0 ? '#8bc34a' : '#ef9a9a',
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

        {/* Tax context: why this ledger exists */}
        <div
          className="rounded-xl p-4 mb-6 text-xs leading-relaxed"
          style={{
            background: 'rgba(74, 124, 78, 0.08)',
            border: '1px solid rgba(74, 124, 78, 0.15)',
            color: '#8fb791',
          }}
        >
          <p className="font-semibold mb-1" style={{ color: '#a5d6a7' }}>
            Why a separate cannabis ledger?
          </p>
          <p>
            Under IRC Section 280E, businesses trafficking in controlled substances face limitations
            on standard business deductions. This ledger isolates cannabis event financials so your
            accountant can correctly separate cannabis-related revenue and expenses during tax
            filing. These numbers also appear in your main financial summary; this view filters to
            cannabis events only.
          </p>
        </div>

        {entries.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              background: '#0f1a0f',
              border: '1px solid rgba(74, 124, 78, 0.15)',
            }}
          >
            <div className="text-3xl mb-3">💚</div>
            <p className="text-sm" style={{ color: '#6aaa6e' }}>
              No ledger entries yet. Revenue and expenses for cannabis events will appear here.
            </p>
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
                  {['Date', 'Type', 'Event', 'Amount'].map((h) => (
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
                {(entries as any[]).map((entry, i) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom:
                        i < entries.length - 1 ? '1px solid rgba(74, 124, 78, 0.08)' : 'none',
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
                    <td className="px-4 py-3 text-xs" style={{ color: '#6aaa6e' }}>
                      {(entry.event_info as any)?.occasion ?? '-'}
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
    </CannabisPageWrapper>
  )
}
