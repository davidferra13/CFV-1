/**
 * Call Sheet
 *
 * The calling hub. Search for an ingredient, see every vendor that can
 * supply it (your saved contacts first, then nearby vendors from the
 * national directory), toggle who to call, and fire them all at once.
 *
 * No "add vendor" step required. The system knows who to call.
 *
 * Gated behind the supplier_calling feature flag.
 */

import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getRecentCalls } from '@/lib/calling/twilio-actions'
import { listVendors } from '@/lib/vendors/actions'
import { Phone, Check, X, Clock, AlertCircle, Mic, Users } from '@/components/ui/icons'
import { formatDistanceToNow } from 'date-fns'
import { CallHub } from '@/components/calling/call-hub'
import { NationalVendorSearch } from '@/components/vendors/national-vendor-search'
import { VendorDirectoryClient } from '@/app/(chef)/culinary/vendors/vendor-directory-client'

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

async function getNationalVendorCount(state: string): Promise<number> {
  const db: any = createServerClient()
  const { count } = await db
    .from('national_vendors')
    .select('*', { count: 'exact', head: true })
    .eq('state', state.toUpperCase())
    .not('phone', 'is', null)
    .neq('phone', '')
  return count ?? 0
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

type Tab = 'call' | 'log' | 'vendors'

export default async function CallSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const user = await requireChef()
  const enabled = await isCallingEnabled(user.tenantId!)
  if (!enabled) redirect('/culinary/price-catalog')

  const params = await searchParams
  const rawTab = params.tab
  const tab: Tab = rawTab === 'log' ? 'log' : rawTab === 'vendors' ? 'vendors' : 'call'

  const db: any = createServerClient()
  const { data: chef } = await db
    .from('chefs')
    .select('home_state')
    .eq('id', user.tenantId!)
    .single()
  const chefState = chef?.home_state || 'MA'

  const [calls, vendors, nationalCount] = await Promise.all([
    getRecentCalls(100),
    listVendors(),
    getNationalVendorCount(chefState),
  ])

  const savedWithPhone = (vendors as any[]).filter((v) => v.phone)
  const addedVendorIds = new Set(savedWithPhone.map((v: any) => v.id as string))

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
              {savedWithPhone.length > 0
                ? `${savedWithPhone.length} saved vendor${savedWithPhone.length !== 1 ? 's' : ''}`
                : 'No saved vendors'}
              {nationalCount > 0 && ` + ${nationalCount.toLocaleString()} nearby in directory`}
              {calls.length > 0 && ` · ${calls.length} call${calls.length !== 1 ? 's' : ''} logged`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-800">
        <Link
          href="/culinary/call-sheet"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'call'
              ? 'text-stone-100 border-b-2 border-violet-400 -mb-px'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          Call
        </Link>
        <Link
          href="/culinary/call-sheet?tab=log"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'log'
              ? 'text-stone-100 border-b-2 border-violet-400 -mb-px'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          Call Log
          {calls.length > 0 && (
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
              {calls.length}
            </span>
          )}
        </Link>
        <Link
          href="/culinary/call-sheet?tab=vendors"
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
            tab === 'vendors'
              ? 'text-stone-100 border-b-2 border-violet-400 -mb-px'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          My Vendors
        </Link>
      </div>

      {/* Tab: Call (primary) */}
      {tab === 'call' && <CallHub />}

      {/* Tab: Call Log */}
      {tab === 'log' && (
        <>
          {calls.length === 0 ? (
            <div className="bg-stone-900 rounded-xl border border-stone-700 px-6 py-12 text-center">
              <Phone className="w-8 h-8 text-stone-600 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">No calls yet.</p>
              <p className="text-stone-600 text-xs mt-1">
                Use the{' '}
                <Link
                  href="/culinary/call-sheet"
                  className="underline underline-offset-2 hover:text-stone-400"
                >
                  Call tab
                </Link>{' '}
                to search for an ingredient and call vendors.
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
                    <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                      Recording
                    </th>
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
                            Listen
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

      {/* Tab: My Vendors */}
      {tab === 'vendors' && (
        <div className="max-w-3xl space-y-10">
          <div>
            <h2 className="text-base font-semibold text-stone-200 mb-1">Add from Directory</h2>
            <p className="text-sm text-stone-500 mb-4">
              Search hundreds of thousands of specialty food suppliers nationwide and save your
              regulars for quick access.
            </p>
            <NationalVendorSearch addedVendorIds={addedVendorIds} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-stone-200 mb-1">Saved Vendors</h2>
            <p className="text-sm text-stone-500 mb-4">
              Saved vendors are auto-selected when you search for relevant ingredients in the Call
              tab.
            </p>
            <VendorDirectoryClient initialVendors={vendors as any} />
          </div>
        </div>
      )}
    </div>
  )
}
