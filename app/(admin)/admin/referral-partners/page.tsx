// Admin Referral Partners - platform-wide view of all referral partners across all tenants

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/db/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Handshake, Globe, ExternalLink } from '@/components/ui/icons'

const PARTNER_TYPE_LABELS: Record<string, string> = {
  airbnb_host: 'Airbnb Host',
  business: 'Business',
  platform: 'Platform',
  individual: 'Individual',
  venue: 'Venue',
  other: 'Other',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-900 text-green-700',
  inactive: 'bg-stone-800 text-stone-500',
}

export default async function AdminReferralPartnersPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const db: any = createAdminClient()

  // Fetch all referral partners across all tenants
  const { data: rawPartners, error } = await db
    .from('referral_partners')
    .select(
      'id, tenant_id, name, partner_type, status, email, website, is_showcase_visible, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(500)

  const partners = (rawPartners as any[]) ?? []

  // Get chef names for context
  const tenantIds = [...new Set(partners.map((p) => p.tenant_id).filter(Boolean))] as string[]
  let chefMap: Record<string, string> = {}
  if (tenantIds.length > 0) {
    const { data: chefs } = await db.from('chefs').select('id, business_name').in('id', tenantIds)
    chefMap = Object.fromEntries(
      (chefs ?? []).map((c: any) => [c.id, c.business_name ?? 'Unnamed'])
    )
  }

  // Stats
  const activeCount = partners.filter((p) => p.status === 'active').length
  const showcaseCount = partners.filter((p) => p.is_showcase_visible).length
  const typeBreakdown = partners.reduce((acc: Record<string, number>, p) => {
    acc[p.partner_type] = (acc[p.partner_type] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-teal-950 rounded-lg">
          <Handshake size={18} className="text-teal-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100">Referral Partners</h1>
          <p className="text-sm text-stone-500">All partners across every chef tenant</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          Failed to load referral partners.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-stone-900 rounded-xl border border-stone-700 px-4 py-3">
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide mb-1">
            Total Partners
          </p>
          <p className="text-2xl font-bold text-stone-100">{partners.length}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-stone-700 px-4 py-3">
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide mb-1">Active</p>
          <p className="text-2xl font-bold text-green-700">{activeCount}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-stone-700 px-4 py-3">
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide mb-1">
            In Showcase
          </p>
          <p className="text-2xl font-bold text-brand-700">{showcaseCount}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-stone-700 px-4 py-3">
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide mb-1">
            Chef Tenants
          </p>
          <p className="text-2xl font-bold text-stone-100">{tenantIds.length}</p>
        </div>
      </div>

      {/* Type breakdown */}
      {Object.keys(typeBreakdown).length > 0 && (
        <div className="bg-stone-900 rounded-xl border border-stone-700 p-4">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
            By Type
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(typeBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 text-stone-300 rounded-lg text-xs font-medium"
                >
                  {PARTNER_TYPE_LABELS[type] ?? type}
                  <span className="bg-slate-300 text-stone-400 rounded-full px-1.5 py-0.5 text-xxs font-bold">
                    {count}
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Partners Table */}
      <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-800 bg-stone-800">
          <h2 className="text-sm font-semibold text-stone-300">
            All Referral Partners ({partners.length})
          </h2>
        </div>
        {partners.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            No referral partners found across any chef.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">
                    Partner Name
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">Chef</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">
                    Contact
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-stone-500">
                    Showcase
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {partners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-stone-800">
                    <td className="px-4 py-2.5 font-medium text-stone-100">
                      <div className="flex items-center gap-1.5">
                        {partner.name}
                        {partner.website && (
                          <a
                            href={partner.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-stone-400"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-stone-500">
                      <Link
                        href={`/admin/users/${partner.tenant_id}`}
                        className="hover:text-brand-600 hover:underline"
                      >
                        {chefMap[partner.tenant_id] ?? '-'}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-stone-400">
                      {PARTNER_TYPE_LABELS[partner.partner_type] ?? partner.partner_type}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[partner.status] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {partner.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{partner.email ?? '-'}</td>
                    <td className="px-4 py-2.5 text-center">
                      {partner.is_showcase_visible ? (
                        <span title="Visible in showcase">
                          <Globe size={14} className="text-brand-500 mx-auto" />
                        </span>
                      ) : (
                        <span className="text-slate-200">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {new Date(partner.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
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
