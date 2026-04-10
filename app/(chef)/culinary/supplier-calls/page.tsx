/**
 * Supplier Call Log
 *
 * Shows all AI-initiated vendor calls with their results, captured prices,
 * and quantities. Only visible when the supplier_calling flag is enabled.
 */

import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getRecentCalls } from '@/lib/calling/twilio-actions'
import { Phone, Check, X, Clock, AlertCircle, Play } from '@/components/ui/icons'
import { formatDistanceToNow } from 'date-fns'

export const metadata: Metadata = { title: 'Supplier Call Log' }

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

function StatusLabel({ status, result }: { status: string; result: 'yes' | 'no' | null }) {
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

function statusColor(status: string, result: 'yes' | 'no' | null) {
  if (status === 'completed' && result === 'yes') return 'text-emerald-400'
  if (status === 'completed' && result === 'no') return 'text-rose-400'
  if (status === 'failed') return 'text-rose-500'
  if (status === 'no_answer' || status === 'busy') return 'text-amber-400'
  return 'text-stone-400'
}

export default async function SupplierCallLogPage() {
  const user = await requireChef()
  const enabled = await isCallingEnabled(user.tenantId!)

  if (!enabled) redirect('/culinary/price-catalog')

  const calls = await getRecentCalls(50)

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-violet-950 rounded-lg">
          <Phone size={18} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100">Supplier Call Log</h1>
          <p className="text-sm text-stone-500">AI-initiated vendor calls and their results</p>
        </div>
      </div>

      {calls.length === 0 ? (
        <div className="bg-stone-900 rounded-xl border border-stone-700 px-6 py-12 text-center">
          <Phone className="w-8 h-8 text-stone-600 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">No supplier calls yet.</p>
          <p className="text-stone-600 text-xs mt-1">
            Use the Auto-call button in the price catalog when an ingredient is not found.
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
                  Price
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Quantity
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
                        <StatusLabel status={call.status} result={call.result} />
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
                        <Play className="w-3 h-3" />
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
    </div>
  )
}
