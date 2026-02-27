'use client'

import { useState, useTransition } from 'react'
import {
  Gift,
  Users,
  ChevronDown,
  ChevronUp,
  Star,
  AlertCircle,
  Copy,
  Check,
  Send,
  Tag,
  X,
} from 'lucide-react'
import { type HolidayOutreachSuggestion } from '@/lib/holidays/outreach-types'
import {
  sendHolidayOutreachToClient,
  createHolidayPromoCode,
} from '@/lib/holidays/outreach-actions'
import { formatHolidayDate } from '@/lib/holidays/upcoming'

interface HolidayOutreachPanelProps {
  suggestions: HolidayOutreachSuggestion[]
}

export function HolidayOutreachPanel({ suggestions }: HolidayOutreachPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(
    suggestions.length > 0 ? suggestions[0].upcoming.holiday.key : null
  )

  if (suggestions.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-900">
          <Gift className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">Holiday Outreach</h3>
          <p className="text-xs text-amber-700 mt-0.5">
            {suggestions.length} holiday{suggestions.length !== 1 ? 's' : ''} in outreach window
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          {suggestions.length} active
        </span>
      </div>

      {/* Suggestions list */}
      <div className="divide-y divide-amber-100">
        {suggestions.map((s) => (
          <HolidaySuggestionRow
            key={s.upcoming.holiday.key}
            suggestion={s}
            isExpanded={expanded === s.upcoming.holiday.key}
            onToggle={() =>
              setExpanded(expanded === s.upcoming.holiday.key ? null : s.upcoming.holiday.key)
            }
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

interface HolidaySuggestionRowProps {
  suggestion: HolidayOutreachSuggestion
  isExpanded: boolean
  onToggle: () => void
}

function HolidaySuggestionRow({ suggestion, isExpanded, onToggle }: HolidaySuggestionRowProps) {
  const { upcoming, pastClients, premiumPricing, outreachHook, menuNotes } = suggestion
  const { holiday, date, daysUntil, isUrgent } = upcoming

  const dateLabel = formatHolidayDate(new Date(date), daysUntil)

  // Promo code state
  const [showPromoForm, setShowPromoForm] = useState(false)
  const [promoCode, setPromoCode] = useState(
    `${holiday.name
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 10)}${new Date().getFullYear() % 100}`
  )
  const [promoDiscount, setPromoDiscount] = useState('10')
  const [promoExpiry, setPromoExpiry] = useState(() => {
    const d = new Date(date)
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [promoResult, setPromoResult] = useState<string | null>(null)
  const [isPendingPromo, startPromoTransition] = useTransition()

  function handleCreatePromo() {
    startPromoTransition(async () => {
      const result = await createHolidayPromoCode({
        holidayName: holiday.name,
        code: promoCode,
        discountPercent: parseInt(promoDiscount) || undefined,
        maxRedemptions: 50,
        expiresAt: promoExpiry,
      })
      if (result.ok) {
        setPromoResult(result.code ?? promoCode)
        setShowPromoForm(false)
      } else {
        setPromoResult(`Error: ${result.error}`)
      }
    })
  }

  return (
    <div>
      {/* Row header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-amber-900/60 transition-colors"
      >
        {/* Urgency dot */}
        <div className="mt-1 flex-shrink-0">
          {isUrgent ? (
            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-red-800" />
          ) : (
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-amber-900">{holiday.name}</span>
            {premiumPricing && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-900 border border-yellow-300 px-2 py-0.5 text-xs font-medium text-yellow-800">
                <Star className="h-3 w-3" />
                Premium date
              </span>
            )}
            {isUrgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-900 border border-red-300 px-2 py-0.5 text-xs font-medium text-red-700">
                <AlertCircle className="h-3 w-3" />
                Urgent
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-amber-700">{dateLabel}</span>
            {pastClients.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                <Users className="h-3 w-3" />
                {pastClients.length} past client{pastClients.length !== 1 ? 's' : ''} to reach out
                to
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-amber-500">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-amber-100">
          {/* Outreach hook */}
          <OutreachHookBlock hook={outreachHook} holidayName={holiday.name} />

          {/* Menu idea */}
          <div className="rounded-lg bg-stone-900 border border-amber-200 px-4 py-3">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
              Menu Direction
            </p>
            <p className="text-sm text-stone-300">{menuNotes}</p>
          </div>

          {/* Promo code section */}
          <div className="rounded-lg bg-stone-900 border border-amber-200 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                Promo Code
              </p>
              {!showPromoForm && !promoResult && (
                <button
                  type="button"
                  onClick={() => setShowPromoForm(true)}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 transition-colors"
                >
                  <Tag className="h-3.5 w-3.5" />
                  Create promo code
                </button>
              )}
              {showPromoForm && (
                <button
                  type="button"
                  title="Close promo code form"
                  onClick={() => setShowPromoForm(false)}
                  className="text-stone-300 hover:text-stone-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {promoResult && !promoResult.startsWith('Error:') && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-amber-900 bg-amber-950 border border-amber-200 px-2 py-1 rounded">
                  {promoResult}
                </span>
                <span className="text-xs text-green-700">Created! Share with clients.</span>
              </div>
            )}
            {promoResult?.startsWith('Error:') && (
              <p className="text-xs text-red-600">{promoResult}</p>
            )}

            {showPromoForm && (
              <div className="space-y-2 mt-1">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label
                      htmlFor={`promo-code-${holiday.key}`}
                      className="text-xs text-stone-500 mb-1 block"
                    >
                      Code
                    </label>
                    <input
                      id={`promo-code-${holiday.key}`}
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="w-full rounded border border-stone-700 px-2 py-1.5 text-sm font-mono"
                      placeholder="HOLIDAY25"
                    />
                  </div>
                  <div className="w-20">
                    <label
                      htmlFor={`promo-pct-${holiday.key}`}
                      className="text-xs text-stone-500 mb-1 block"
                    >
                      Discount %
                    </label>
                    <input
                      id={`promo-pct-${holiday.key}`}
                      type="number"
                      min={1}
                      max={50}
                      value={promoDiscount}
                      onChange={(e) => setPromoDiscount(e.target.value)}
                      className="w-full rounded border border-stone-700 px-2 py-1.5 text-sm"
                      placeholder="10"
                    />
                  </div>
                  <div className="w-32">
                    <label
                      htmlFor={`promo-exp-${holiday.key}`}
                      className="text-xs text-stone-500 mb-1 block"
                    >
                      Expires
                    </label>
                    <input
                      id={`promo-exp-${holiday.key}`}
                      type="date"
                      value={promoExpiry}
                      onChange={(e) => setPromoExpiry(e.target.value)}
                      className="w-full rounded border border-stone-700 px-2 py-1.5 text-sm"
                      title="Promo code expiry date"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCreatePromo}
                  disabled={isPendingPromo}
                  className="flex items-center gap-1.5 rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  <Tag className="h-3.5 w-3.5" />
                  {isPendingPromo ? 'Creating…' : 'Create code'}
                </button>
              </div>
            )}

            {!showPromoForm && !promoResult && (
              <p className="text-xs text-stone-500">
                Create a shareable discount code to include in your outreach.
              </p>
            )}
          </div>

          {/* Past client list */}
          {pastClients.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
                Clients to reach out to
              </p>
              <ul className="space-y-1.5">
                {pastClients.slice(0, 6).map((client) => (
                  <ClientOutreachRow
                    key={client.clientId}
                    client={client}
                    holidayName={holiday.name}
                    outreachHook={outreachHook}
                  />
                ))}
                {pastClients.length > 6 && (
                  <li className="text-xs text-amber-600 pl-1">+{pastClients.length - 6} more</li>
                )}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg bg-stone-900 border border-amber-100 px-4 py-3">
              <p className="text-sm text-stone-500">
                No past clients found near this holiday — this is a fresh opportunity to build the
                tradition with new clients.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

interface ClientOutreachRowProps {
  client: { clientId: string; clientName: string; lastEventDate: string; totalEvents: number }
  holidayName: string
  outreachHook: string
}

function ClientOutreachRow({ client, holidayName, outreachHook }: ClientOutreachRowProps) {
  const [showSendForm, setShowSendForm] = useState(false)
  const [channel, setChannel] = useState<'email' | 'sms'>('email')
  const [message, setMessage] = useState(outreachHook)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    startTransition(async () => {
      setStatus('sending')
      const result = await sendHolidayOutreachToClient({
        clientId: client.clientId,
        body: message,
        holidayName,
        channel,
      })
      setStatus(result.ok ? 'sent' : 'error')
      if (result.ok) setShowSendForm(false)
    })
  }

  return (
    <li className="rounded-lg bg-stone-900 border border-amber-100 px-3 py-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-stone-200">{client.clientName}</span>
          <span className="ml-2 text-xs text-stone-300">
            booked{' '}
            {new Date(client.lastEventDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {client.totalEvents > 1 && (
            <span className="text-xs text-amber-600 font-medium">{client.totalEvents}× client</span>
          )}
          {status === 'sent' ? (
            <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
              <Check className="h-3 w-3" /> Sent
            </span>
          ) : (
            <button
              onClick={() => setShowSendForm(!showSendForm)}
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
            >
              <Send className="h-3 w-3" />
              Send
            </button>
          )}
        </div>
      </div>

      {showSendForm && status !== 'sent' && (
        <div className="mt-2 space-y-2 border-t border-amber-50 pt-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setChannel('email')}
              className={`px-2 py-1 text-xs rounded border transition-colors ${channel === 'email' ? 'bg-amber-900 border-amber-300 text-amber-800 font-semibold' : 'border-stone-700 text-stone-500 hover:border-stone-600'}`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setChannel('sms')}
              className={`px-2 py-1 text-xs rounded border transition-colors ${channel === 'sms' ? 'bg-amber-900 border-amber-300 text-amber-800 font-semibold' : 'border-stone-700 text-stone-500 hover:border-stone-600'}`}
            >
              SMS
            </button>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            aria-label="Outreach message"
            placeholder="Your outreach message…"
            className="w-full rounded border border-stone-700 px-2 py-1.5 text-sm resize-none"
          />
          {status === 'error' && (
            <p className="text-xs text-red-600">Send failed — check client contact info.</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending || !message.trim()}
              className="flex items-center gap-1.5 rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-3 w-3" />
              {isPending ? 'Sending…' : 'Send now'}
            </button>
            <button
              type="button"
              onClick={() => setShowSendForm(false)}
              className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

// ---------------------------------------------------------------------------

interface OutreachHookBlockProps {
  hook: string
  holidayName: string
}

function OutreachHookBlock({ hook, holidayName }: OutreachHookBlockProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(hook).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-lg bg-stone-900 border border-amber-200 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1.5">
          Outreach Message — {holidayName}
        </p>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <p className="text-sm text-stone-300 italic leading-relaxed">&ldquo;{hook}&rdquo;</p>
    </div>
  )
}
