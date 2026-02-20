import type { NetworkInsights } from '@/lib/network/actions'

interface NetworkInsightsProps {
  insights: NetworkInsights
}

export function NetworkInsights({ insights }: NetworkInsightsProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Inquiries" value={insights.inquiries_total} sub={`${insights.inquiries_shared} shared / ${insights.inquiries_unshared} unshared`} />
        <StatCard label="Dinners/Events" value={insights.dinners_total} sub={`${insights.dinner_dates_shared} dates shared / ${insights.dinner_dates_unshared} unshared`} />
        <StatCard label="Clients" value={insights.clients_total} sub={`${insights.clients_shared} shared / ${insights.clients_unshared} unshared`} />
        <StatCard label="Direct Shares" value={insights.shares_sent_total + insights.shares_received_total} sub={`${insights.shares_open} open, ${insights.shares_accepted} accepted, ${insights.shares_passed} passed`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-stone-200 p-4 bg-white">
          <h4 className="text-sm font-semibold text-stone-900">Inquiry Coverage Gaps</h4>
          <p className="text-xs text-stone-500 mt-0.5">
            Inquiries not yet referenced in a help/share outreach.
          </p>
          {insights.unshared_inquiry_ids.length === 0 ? (
            <p className="text-sm text-emerald-700 mt-3">All inquiries are covered by outreach.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {insights.unshared_inquiry_ids.map((inquiryId) => (
                <li key={inquiryId} className="text-xs text-stone-600 font-mono bg-stone-50 rounded px-2 py-1">
                  {inquiryId}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-stone-200 p-4 bg-white">
          <h4 className="text-sm font-semibold text-stone-900">Client Sharing Gaps</h4>
          <p className="text-xs text-stone-500 mt-0.5">
            Clients not yet matched to a direct contact share.
          </p>
          {insights.unshared_client_names.length === 0 ? (
            <p className="text-sm text-emerald-700 mt-3">All clients are covered by sharing activity.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {insights.unshared_client_names.map((name) => (
                <li key={name} className="text-sm text-stone-700 bg-stone-50 rounded px-2 py-1">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-lg border border-stone-200 p-4 bg-white">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-2xl font-semibold text-stone-900 mt-1">{value}</p>
      <p className="text-xs text-stone-500 mt-1">{sub}</p>
    </div>
  )
}
