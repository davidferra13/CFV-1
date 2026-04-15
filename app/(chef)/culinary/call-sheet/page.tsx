/**
 * Call Sheet - AI Admin Voice System
 *
 * The full AI calling hub. Handles all vendor/venue/equipment calls.
 * Inbound voicemail. Full transcript log. Per-call audio playback.
 *
 * HARD RULE: This system never calls clients.
 * Clients receive email and SMS. Voice is for vendors and businesses only.
 *
 * Gated behind the supplier_calling feature flag.
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getRecentCalls, getRecentAiCalls, getRoutingRules } from '@/lib/calling/twilio-actions'
import { listVendors } from '@/lib/vendors/actions'
import {
  Phone,
  Check,
  X,
  Clock,
  AlertCircle,
  Mic,
  Users,
  Settings,
  Inbox,
  ArrowDownRight,
  ArrowUpRight,
} from '@/components/ui/icons'
import { formatDistanceToNow } from 'date-fns'
import { CallHub } from '@/components/calling/call-hub'
import { CallLog } from '@/components/calling/call-log'
import { NationalVendorSearch } from '@/components/vendors/national-vendor-search'
import { VendorDirectoryClient } from '@/app/(chef)/culinary/vendors/vendor-directory-client'
import { CallSettingsForm } from '@/components/calling/call-settings-form'
import { CallAccessRequest } from '@/components/calling/call-access-request'

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

function StatusIcon({ status, result }: { status: string; result?: 'yes' | 'no' | null }) {
  if (status === 'completed' && result === 'yes')
    return <Check className="w-4 h-4 text-emerald-400" />
  if (status === 'completed' && result === 'no') return <X className="w-4 h-4 text-rose-400" />
  if (status === 'completed') return <Check className="w-4 h-4 text-stone-400" />
  if (status === 'voicemail') return <Mic className="w-4 h-4 text-violet-400" />
  if (status === 'no_answer' || status === 'busy')
    return <Phone className="w-4 h-4 text-amber-400" />
  if (status === 'failed') return <AlertCircle className="w-4 h-4 text-rose-500" />
  return <Clock className="w-4 h-4 text-stone-500" />
}

function statusLabel(status: string, result?: 'yes' | 'no' | null): string {
  if (status === 'completed' && result === 'yes') return 'In stock'
  if (status === 'completed' && result === 'no') return 'Not available'
  if (status === 'completed') return 'Completed'
  if (status === 'voicemail') return 'Voicemail'
  if (status === 'no_answer') return 'No answer'
  if (status === 'busy') return 'Line busy'
  if (status === 'failed') return 'Call failed'
  if (status === 'ringing') return 'Ringing'
  if (status === 'in_progress') return 'In progress'
  return 'Queued'
}

function statusColor(status: string, result?: 'yes' | 'no' | null): string {
  if (status === 'completed' && result === 'yes') return 'text-emerald-400'
  if (status === 'completed' && result === 'no') return 'text-rose-400'
  if (status === 'voicemail') return 'text-violet-400'
  if (status === 'failed') return 'text-rose-500'
  if (status === 'no_answer' || status === 'busy') return 'text-amber-400'
  return 'text-stone-400'
}

const ROLE_LABELS: Record<string, string> = {
  vendor_availability: 'Availability',
  vendor_delivery: 'Delivery',
  venue_confirmation: 'Venue',
  equipment_rental: 'Equipment',
  inbound_vendor_callback: 'Vendor CB',
  inbound_voicemail: 'Voicemail',
  inbound_unknown: 'Inbound',
}

const ROLE_COLORS: Record<string, string> = {
  vendor_availability: 'bg-violet-950 text-violet-300',
  vendor_delivery: 'bg-blue-950 text-blue-300',
  venue_confirmation: 'bg-teal-950 text-teal-300',
  equipment_rental: 'bg-orange-950 text-orange-300',
  inbound_vendor_callback: 'bg-amber-950 text-amber-300',
  inbound_voicemail: 'bg-purple-950 text-purple-300',
  inbound_unknown: 'bg-stone-800 text-stone-400',
}

type Tab = 'call' | 'log' | 'inbox' | 'vendors' | 'settings'

export default async function CallSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const user = await requireChef()
  const enabled = await isCallingEnabled(user.tenantId!)

  if (!enabled) {
    return (
      <div className="max-w-5xl">
        <CallAccessRequest />
      </div>
    )
  }

  const params = await searchParams
  const rawTab = params.tab
  const tab: Tab =
    rawTab === 'log'
      ? 'log'
      : rawTab === 'inbox'
        ? 'inbox'
        : rawTab === 'vendors'
          ? 'vendors'
          : rawTab === 'settings'
            ? 'settings'
            : 'call'

  const db: any = createServerClient()
  const { data: chef } = await db
    .from('chefs')
    .select('home_state')
    .eq('id', user.tenantId!)
    .single()
  const chefState = chef?.home_state || 'MA'

  const [calls, aiCalls, vendors, nationalCount, routingRules] = await Promise.all([
    getRecentCalls(100),
    getRecentAiCalls(100),
    listVendors(),
    getNationalVendorCount(chefState),
    getRoutingRules(),
  ])

  const savedWithPhone = (vendors as any[]).filter((v) => v.phone)
  const addedVendorIds = new Set(savedWithPhone.map((v: any) => v.id as string))

  const inboxItems = aiCalls.filter(
    (c) => c.direction === 'inbound' && ['inbound_voicemail', 'inbound_unknown'].includes(c.role)
  )
  const inboxCount = inboxItems.length

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-violet-950 rounded-lg mt-0.5">
          <Phone size={18} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100">Call Sheet</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Type an ingredient and ChefFlow calls your suppliers to check availability and get
            prices. You hear back in minutes, not hours.
          </p>
          <p className="text-xs text-stone-600 mt-1.5">
            {savedWithPhone.length > 0
              ? `${savedWithPhone.length} saved vendor${savedWithPhone.length !== 1 ? 's' : ''}`
              : 'No saved vendors'}
            {nationalCount > 0 && ` + ${nationalCount.toLocaleString()} in directory`}
            {calls.length > 0 && ` · ${calls.length} call${calls.length !== 1 ? 's' : ''} logged`}
            {' · '}
            <span className="text-stone-600">Calls billed via your Twilio account</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-800 overflow-x-auto">
        {[
          { key: 'call' as Tab, label: 'Call' },
          {
            key: 'log' as Tab,
            label: 'Call Log',
            badge: calls.length > 0 ? String(calls.length) : null,
          },
          {
            key: 'inbox' as Tab,
            label: 'Inbox',
            badge: inboxCount > 0 ? String(inboxCount) : null,
            alert: inboxCount > 0,
          },
          { key: 'vendors' as Tab, label: 'My Vendors', icon: 'users' as const },
          { key: 'settings' as Tab, label: 'Settings', icon: 'settings' as const },
        ].map(({ key, label, badge, alert, icon }) => (
          <Link
            key={key}
            href={`/culinary/call-sheet${key !== 'call' ? `?tab=${key}` : ''}`}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              tab === key
                ? 'text-stone-100 border-b-2 border-violet-400 -mb-px'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {icon === 'users' && <Users className="w-3.5 h-3.5" />}
            {icon === 'settings' && <Settings className="w-3.5 h-3.5" />}
            {label}
            {badge && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${alert ? 'bg-amber-900 text-amber-300' : 'bg-stone-800 text-stone-400'}`}
              >
                {badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Tab: Call */}
      {tab === 'call' && <CallHub tenantId={user.tenantId ?? user.entityId} />}

      {/* Tab: Call Log */}
      {tab === 'log' && <CallLog calls={calls as any} aiCalls={aiCalls as any} />}

      {/* Tab: Inbox */}
      {tab === 'inbox' && (
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            Inbound calls that left a voicemail or need a callback. Everything is transcribed and
            logged.
          </p>
          {inboxItems.length === 0 ? (
            <div className="bg-stone-900 rounded-xl border border-stone-700 px-6 py-12 text-center">
              <Inbox className="w-8 h-8 text-stone-600 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">Nothing here yet.</p>
              <p className="text-stone-600 text-xs mt-1">
                Inbound calls and voicemails appear here when your AI number receives a call.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inboxItems.map((call) => (
                <div key={call.id} className="bg-stone-900 rounded-xl border border-stone-700 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-stone-800 rounded-lg mt-0.5">
                        {call.role === 'inbound_voicemail' ? (
                          <Mic className="w-4 h-4 text-violet-400" />
                        ) : (
                          <Phone className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-semibold text-stone-100">
                            {call.contact_name || call.contact_phone || 'Unknown caller'}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[call.role] || 'bg-stone-800 text-stone-400'}`}
                          >
                            {ROLE_LABELS[call.role] || call.role}
                          </span>
                        </div>
                        {call.full_transcript ? (
                          <p className="text-sm text-stone-300 leading-relaxed">
                            &ldquo;{call.full_transcript}&rdquo;
                          </p>
                        ) : (
                          <p className="text-sm text-stone-500 italic">
                            No transcription available.
                          </p>
                        )}
                        <p className="text-xs text-stone-600 mt-2">
                          {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                          {call.contact_phone && ` · ${call.contact_phone}`}
                        </p>
                      </div>
                    </div>
                    {call.recording_url && (
                      <a
                        href={call.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 border border-violet-800 rounded-lg px-3 py-1.5"
                      >
                        <Mic className="w-3 h-3" />
                        Listen
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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

      {/* Tab: Settings */}
      {tab === 'settings' && (
        <div className="max-w-xl">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-stone-200 mb-1">Voice System Settings</h2>
            <p className="text-sm text-stone-500">
              Configure active hours, AI voice, SMS alerts, and which roles are enabled.
            </p>
          </div>
          <CallSettingsForm initialRules={routingRules} />
        </div>
      )}
    </div>
  )
}
