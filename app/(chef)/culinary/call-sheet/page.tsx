/**
 * Call Sheet
 *
 * Unified hub for supplier phone outreach:
 * - Call Log: history of all AI-initiated vendor calls with results and recordings
 * - Vendors: the phone book (add/manage vendors with phone numbers for auto-calling)
 *
 * Gated behind the supplier_calling feature flag.
 * Redirects to /culinary/price-catalog if flag is off.
 */

import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getRecentCalls } from '@/lib/calling/twilio-actions'
import { listVendors } from '@/lib/vendors/actions'
import { Phone, Check, X, Clock, AlertCircle, Play, Mic } from '@/components/ui/icons'
import { formatDistanceToNow } from 'date-fns'
import { VendorDirectoryClient } from '@/app/(chef)/culinary/vendors/vendor-directory-client'
import { NationalVendorSearch } from '@/components/vendors/national-vendor-search'

export const metadata: Metadata = { title: 'Call Sheet' }

async function isCallingEnabled(chefId: string): Promise<boolean> {
  const db: any = createServerClient()
  const { data } = await db
    .from('chef_feature_flags')
    .select('enabled')
    .eq('chef_id', chefId)
    .eq('flag_name', 'supplier_calling')
    .maybeSingle()
  return data?.enabled === true
}

function StatusIcon({ status, result }: { status: string; result: 'yes' | 'no' | null }) {
  if (status === 'completed' && result === 'yes')
    return <Check className="w-4 h-4 text-emerald-400" />
  if (status === 'completed' && result === 'no') return <X className="w-4 h-4 text-rose-400" />
  if (status === 'completed') return <Phone className="w-4 h-4 text-stone-500" />
  if (status === 'no_answer' || status === 'busy')
    return <Phone className="w-4 h-4 text-amber-400" />
  if (status === 'failed') return <AlertCircle className="w-4 h-4 text-rose-500" />
  return <Clock className="w-4 h-4 text-stone-500" />
}

function statusLabel(status: string, result: 'yes' | 'no' | null): string {
  if (status === 'completed' && result === 'yes') return 'In stock'
  if (status === 'completed' && result === 'no') return 'Not available'
  if (status === 'completed') return 'No response'
  if (status === 'no_answer') return 'No answer'
  if (status === 'busy') return 'Line busy'
  if (status === 'failed') return 'Call failed'
  if (status === 'ringing') return 'Ringing'
  if (status === 'in_progress') return 'In progress'
  return 'Queued'
}

function statusColor(status: string, result: 'yes' | 'no' | null): string {
  if (status === 'completed' && result === 'yes') return 'text-emerald-400'
  if (status === 'completed' && result === 'no') return 'text-rose-400'
  if (status === 'failed') return 'text-rose-500'
  if (status === 'no_answer' || status === 'busy') return 'text-amber-400'
  return 'text-stone-400'
}

type Tab = 'log' | 'vendors'

export default async function CallSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const user = await requireChef()
  const enabled = await isCallingEnabled(user.tenantId!)
  if (!enabled) redirect('/culinary/price-catalog')

  const params = await searchParams
  const tab: Tab = params.tab === 'vendors' ? 'vendors' : 'log'

  const [calls, vendors] = await Promise.all([getRecentCalls(100), listVendors()])

  const vendorsWithPhone = (vendors as any[]).filter((v) => v.phone)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-950 rounded-lg">
            <Phone size={18} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-100">Call Sheet</h1>
            <p className="text-sm text-stone-500">
              {vendorsWithPhone.length} vendor{vendorsWithPhone.length !== 1 ? 's' : ''} with phone
              numbers
              {calls.length > 0 && ` · ${calls.length} call${calls.length !== 1 ? 's' : ''} logged`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-800">
        <Link
          href="/culinary/call-sheet?tab=log"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'log'
              ? 'text-stone-100 border-b-2 border-violet-400 -mb-px'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          Call Log
        </Link>
        <Link
          href="/culinary/call-sheet?tab=vendors"
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
            tab === 'vendors'
              ? 'text-stone-100 border-b-2 border-violet-400 -mb-px'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          Vendors
          {vendorsWithPhone.length === 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400">
              No phones
            </span>
          )}
        </Link>
      </div>

      {/* Tab: Call Log */}
      {tab === 'log' && (
        <>
          {vendorsWithPhone.length === 0 && (
            <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg px-5 py-4 text-sm text-amber-300">
              Add phone numbers to your vendors to enable auto-calling from the Food Catalog.{' '}
              <Link
                href="/culinary/call-sheet?tab=vendors"
                className="underline underline-offset-2 hover:text-amber-200"
              >
                Go to Vendors
              </Link>
            </div>
          )}

          {calls.length === 0 ? (
            <div className="bg-stone-900 rounded-xl border border-stone-700 px-6 py-12 text-center">
              <Phone className="w-8 h-8 text-stone-600 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">No calls yet.</p>
              <p className="text-stone-600 text-xs mt-1">
                Search for an ingredient in the{' '}
                <Link href="/culinary/price-catalog" className="underline underline-offset-2">
                  Food Catalog
                </Link>{' '}
                and use the Auto-call button.
              </p>
            </div>
          ) : (
            <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-800">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                      Vendor
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                      Ingredient
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                      Result
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                      Price Quoted
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                      Qty
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                      When
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {calls.map((call) => (
                    <tr key={call.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-stone-200">{call.vendor_name}</div>
                        <div className="text-xs text-stone-500">{call.vendor_phone}</div>
                      </td>
                      <td className="px-4 py-3.5 text-stone-300">{call.ingredient_name}</td>
                      <td className="px-4 py-3.5">
                        <div
                          className={`flex items-center gap-1.5 ${statusColor(call.status, call.result)}`}
                        >
                          <StatusIcon status={call.status} result={call.result} />
                          <span className="text-xs font-medium">
                            {statusLabel(call.status, call.result)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {call.price_quoted ? (
                          <span className="text-emerald-300 font-mono text-xs">
                            {call.price_quoted}
                          </span>
                        ) : (
                          <span className="text-stone-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {call.quantity_available ? (
                          <span className="text-stone-300 text-xs">{call.quantity_available}</span>
                        ) : (
                          <span className="text-stone-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-stone-500 text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3.5">
                        {call.recording_url ? (
                          <a
                            href={call.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 text-xs"
                          >
                            <Mic className="w-3 h-3" />
                            Play
                          </a>
                        ) : (
                          <span className="text-stone-700 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab: Vendors */}
      {tab === 'vendors' && (
        <div className="max-w-3xl space-y-10">
          {/* National directory search */}
          <div>
            <h2 className="text-base font-semibold text-stone-200 mb-1">Find Vendors</h2>
            <p className="text-sm text-stone-500 mb-4">
              Search hundreds of thousands of specialty food suppliers nationwide. Hit Add to put
              them on your Call Sheet.
            </p>
            <NationalVendorSearch />
          </div>

          {/* Chef's personal vendor list */}
          <div>
            <h2 className="text-base font-semibold text-stone-200 mb-1">Your Vendors</h2>
            <p className="text-sm text-stone-500 mb-4">
              Vendors with a phone number appear in the Auto-call panel when you search the Food
              Catalog.
            </p>
            <VendorDirectoryClient initialVendors={vendors as any} />
          </div>
        </div>
      )}
    </div>
  )
}
