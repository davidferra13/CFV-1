'use client'
// Notification Tier Customization
// Per-action tier overrides (critical/alert/info) with grouped display.
// Saves immediately on change via server actions.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  updateNotificationTier,
  resetNotificationTier,
  resetAllNotificationTiers,
  type TierMapEntry,
} from '@/lib/notifications/tier-actions'
import { CATEGORY_LABELS, type NotificationCategory } from '@/lib/notifications/types'
import {
  TIER_LABELS,
  TIER_DESCRIPTIONS,
  type NotificationTier,
} from '@/lib/notifications/tier-config'

// Human-readable labels for notification actions
const ACTION_LABELS: Record<string, string> = {
  new_inquiry: 'New inquiry received',
  inquiry_reply: 'Client replied to inquiry',
  inquiry_expired: 'Inquiry expired',
  follow_up_due: 'Follow-up due',
  wix_submission: 'Wix form submission',
  new_guest_lead: 'New guest lead',
  quote_accepted: 'Quote accepted',
  quote_rejected: 'Quote rejected',
  quote_expiring: 'Quote expiring',
  quote_sent_to_client: 'Quote sent to client',
  quote_expiring_soon: 'Quote expiring soon',
  proposal_accepted: 'Proposal accepted',
  event_paid: 'Event payment received',
  event_completed: 'Event completed',
  event_cancelled: 'Event cancelled',
  event_proposed_to_client: 'Event proposed to client',
  event_confirmed_to_client: 'Event confirmed to client',
  event_reminder_7d: 'Event reminder (7 days)',
  event_reminder_2d: 'Event reminder (2 days)',
  event_reminder_1d: 'Event reminder (1 day)',
  photos_ready: 'Event photos ready',
  menu_preferences_submitted: 'Menu preferences submitted',
  meal_request_scheduled_to_client: 'Meal request scheduled',
  meal_request_declined_to_client: 'Meal request declined',
  meal_request_fulfilled_to_client: 'Meal request fulfilled',
  meal_recommendation_sent_to_client: 'Meal recommendation sent',
  meal_recommendation_approved: 'Meal recommendation approved',
  meal_recommendation_revision_requested: 'Meal recommendation revision requested',
  client_meal_feedback_submitted: 'Client meal feedback',
  menu_approved: 'Menu approved',
  menu_revision_requested: 'Menu revision requested',
  contract_signed: 'Contract signed',
  contract_voided: 'Contract voided',
  inquiry_quoted_to_client: 'Inquiry quoted to client',
  inquiry_converted_to_client: 'Inquiry converted to event',
  inquiry_declined_to_client: 'Inquiry declined',
  inquiry_expired_to_client: 'Inquiry expired (client)',
  event_cancelled_to_client: 'Event cancelled (client)',
  event_completed_to_client: 'Event completed (client)',
  event_in_progress_to_client: 'Event in progress (client)',
  event_paid_to_client: 'Payment confirmed (client)',
  payment_received: 'Payment received',
  payment_failed: 'Payment failed',
  refund_processed: 'Refund processed',
  dispute_created: 'Dispute created',
  gift_card_purchased: 'Gift card purchased',
  payment_due_approaching: 'Payment due approaching',
  payment_overdue: 'Payment overdue',
  dispute_funds_withdrawn: 'Dispute funds withdrawn',
  refund_processed_to_client: 'Refund processed (client)',
  new_message: 'New chat message',
  new_chat_message_to_client: 'New message (client)',
  client_signup: 'New client signed up',
  review_submitted: 'Review submitted',
  client_on_payment_page: 'Client viewing payment page',
  client_viewed_quote: 'Client viewed quote',
  quote_viewed_after_delay: 'Quote viewed after delay',
  client_viewed_proposal: 'Client viewed proposal',
  client_portal_visit: 'Client visited portal',
  guest_rsvp_received: 'Guest RSVP received',
  guest_dietary_alert: 'Guest dietary alert',
  client_allergy_changed: 'Client allergy changed',
  reward_redeemed_by_client: 'Reward redeemed by client',
  points_awarded: 'Points awarded',
  tier_upgraded: 'Loyalty tier upgraded',
  gift_card_redeemed: 'Gift card redeemed',
  raffle_entry_earned: 'Raffle entry earned',
  raffle_winner: 'Raffle winner',
  raffle_new_round: 'New raffle round',
  raffle_drawn_chef: 'Raffle drawn (chef)',
  goal_nudge: 'Goal nudge',
  goal_milestone: 'Goal milestone reached',
  goal_weekly_digest: 'Goal weekly digest',
  insurance_expiring_30d: 'Insurance expiring (30 days)',
  insurance_expiring_7d: 'Insurance expiring (7 days)',
  cert_expiring_90d: 'Certification expiring (90 days)',
  cert_expiring_30d: 'Certification expiring (30 days)',
  cert_expiring_7d: 'Certification expiring (7 days)',
  new_negative_mention: 'New negative mention',
  recall_alert_matched: 'Food recall alert',
  capacity_limit_approaching: 'Capacity limit approaching',
  relationship_cooling: 'Client relationship cooling',
  burnout_risk_high: 'Burnout risk high',
  no_education_logged_90d: 'No education logged (90 days)',
  quarterly_checkin_due: 'Quarterly check-in due',
  staff_assignment: 'Staff assignment',
  task_assigned: 'Task assigned',
  schedule_change: 'Schedule change',
  order_status: 'Order status update',
  low_stock: 'Low stock alert',
  guest_comp: 'Guest comp',
  system_alert: 'System alert',
}

const TIER_COLORS: Record<NotificationTier, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  alert: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  info: 'bg-brand-500/20 text-brand-400 border-brand-500/30',
}

const TIER_DOT_COLORS: Record<NotificationTier, string> = {
  critical: 'bg-red-400',
  alert: 'bg-amber-400',
  info: 'bg-brand-400',
}

// Group order for display
const CATEGORY_ORDER: NotificationCategory[] = [
  'inquiry',
  'quote',
  'event',
  'payment',
  'chat',
  'client',
  'lead',
  'loyalty',
  'goals',
  'protection',
  'wellbeing',
  'ops',
  'system',
]

type Props = {
  initialTierMap: TierMapEntry[]
}

export function NotificationTierSettings({ initialTierMap }: Props) {
  const [tierMap, setTierMap] = useState<TierMapEntry[]>(initialTierMap)
  const [isPending, startTransition] = useTransition()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const overrideCount = tierMap.filter((e) => e.isOverridden).length

  // Group entries by category
  const grouped = new Map<NotificationCategory, TierMapEntry[]>()
  for (const entry of tierMap) {
    const existing = grouped.get(entry.category) ?? []
    existing.push(entry)
    grouped.set(entry.category, existing)
  }

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedCategories(new Set(CATEGORY_ORDER))
  }

  const collapseAll = () => {
    setExpandedCategories(new Set())
  }

  const handleTierChange = (action: string, newTier: NotificationTier) => {
    const previous = [...tierMap]
    const entry = tierMap.find((e) => e.action === action)
    if (!entry || entry.currentTier === newTier) return

    // Optimistic update
    setTierMap((prev) =>
      prev.map((e) =>
        e.action === action
          ? {
              ...e,
              currentTier: newTier,
              isOverridden: newTier !== e.defaultTier,
            }
          : e
      )
    )

    startTransition(async () => {
      try {
        const result = await updateNotificationTier(action, newTier)
        if (result.error) {
          setTierMap(previous)
          toast.error(`Failed to update tier: ${result.error}`)
        }
      } catch {
        setTierMap(previous)
        toast.error('Failed to update notification tier')
      }
    })
  }

  const handleReset = (action: string) => {
    const previous = [...tierMap]
    const entry = tierMap.find((e) => e.action === action)
    if (!entry || !entry.isOverridden) return

    // Optimistic update
    setTierMap((prev) =>
      prev.map((e) =>
        e.action === action ? { ...e, currentTier: e.defaultTier, isOverridden: false } : e
      )
    )

    startTransition(async () => {
      try {
        const result = await resetNotificationTier(action)
        if (result.error) {
          setTierMap(previous)
          toast.error(`Failed to reset tier: ${result.error}`)
        }
      } catch {
        setTierMap(previous)
        toast.error('Failed to reset notification tier')
      }
    })
  }

  const handleResetAll = () => {
    if (overrideCount === 0) return

    const previous = [...tierMap]

    // Optimistic update
    setTierMap((prev) =>
      prev.map((e) => ({ ...e, currentTier: e.defaultTier, isOverridden: false }))
    )

    startTransition(async () => {
      try {
        const result = await resetAllNotificationTiers()
        if (result.error) {
          setTierMap(previous)
          toast.error(`Failed to reset all tiers: ${result.error}`)
        } else {
          toast.success('All notification tiers reset to defaults')
        }
      } catch {
        setTierMap(previous)
        toast.error('Failed to reset notification tiers')
      }
    })
  }

  return (
    <section className="rounded-xl border border-stone-700 bg-stone-900">
      <div className="border-b border-stone-700 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-stone-100">
              Notification Tier Customization
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Override the default priority tier for each notification action. Tiers determine which
              delivery channels fire by default.
            </p>
          </div>
          {overrideCount > 0 && (
            <button
              type="button"
              onClick={handleResetAll}
              disabled={isPending}
              className="shrink-0 rounded-md border border-stone-600 bg-stone-800 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-700 disabled:opacity-50 transition-colors"
            >
              Reset all ({overrideCount})
            </button>
          )}
        </div>

        {/* Tier legend */}
        <div className="mt-3 flex flex-wrap gap-3">
          {(['critical', 'alert', 'info'] as const).map((t) => (
            <div key={t} className="flex items-center gap-1.5 text-xs text-stone-400">
              <span className={`inline-block h-2 w-2 rounded-full ${TIER_DOT_COLORS[t]}`} />
              <span className="font-medium">{TIER_LABELS[t]}:</span>
              <span>{TIER_DESCRIPTIONS[t]}</span>
            </div>
          ))}
        </div>

        {/* Expand/collapse controls */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            Expand all
          </button>
          <span className="text-xs text-stone-600">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="divide-y divide-stone-800">
        {CATEGORY_ORDER.map((cat) => {
          const entries = grouped.get(cat)
          if (!entries || entries.length === 0) return null
          const isExpanded = expandedCategories.has(cat)
          const catOverrides = entries.filter((e) => e.isOverridden).length

          return (
            <div key={cat}>
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-stone-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`h-4 w-4 text-stone-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm font-medium text-stone-200">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                  <span className="text-xs text-stone-500">({entries.length} actions)</span>
                  {catOverrides > 0 && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                      {catOverrides} customized
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-stone-800/50 bg-stone-950/30">
                  {entries.map((entry) => (
                    <div
                      key={entry.action}
                      className="flex items-center justify-between gap-4 px-5 py-2.5 hover:bg-stone-800/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`inline-block h-2 w-2 shrink-0 rounded-full ${TIER_DOT_COLORS[entry.currentTier]}`}
                        />
                        <span className="text-sm text-stone-300 truncate">
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                        {entry.isOverridden && (
                          <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                            customized
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={entry.currentTier}
                          onChange={(e) =>
                            handleTierChange(entry.action, e.target.value as NotificationTier)
                          }
                          disabled={isPending}
                          className={`rounded border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${TIER_COLORS[entry.currentTier]} bg-transparent`}
                        >
                          <option value="critical" className="bg-stone-900 text-stone-200">
                            Critical
                          </option>
                          <option value="alert" className="bg-stone-900 text-stone-200">
                            Alert
                          </option>
                          <option value="info" className="bg-stone-900 text-stone-200">
                            Info
                          </option>
                        </select>

                        {entry.isOverridden && (
                          <button
                            type="button"
                            onClick={() => handleReset(entry.action)}
                            disabled={isPending}
                            className="text-xs text-stone-500 hover:text-stone-300 disabled:opacity-50 transition-colors"
                            title={`Reset to default (${TIER_LABELS[entry.defaultTier]})`}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t border-stone-800 px-5 py-3">
        <p className="text-xs text-stone-400">
          Tier changes take effect immediately for future notifications. Existing notifications are
          not affected. Channel overrides (per-category email/push/SMS toggles above) still apply on
          top of tier defaults.
        </p>
      </div>
    </section>
  )
}
