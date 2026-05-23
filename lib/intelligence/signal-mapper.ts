/**
 * Signal Mapper - Maps CIL signal sources to concrete user actions.
 *
 * Each signal type maps to: label, description, action button text,
 * navigation href, and an optional server-side action handler key.
 *
 * NOT a 'use server' file. Pure mapping logic.
 */

import type { ProactiveSignal } from '@/lib/cil/types'

export type ActionCategory = 'client' | 'pricing' | 'operations'

export interface MappedSignalAction {
  signalType: string
  category: ActionCategory
  title: string
  description: string
  actionLabel: string
  actionHref: string
  /** Server-side action key for executeSignalAction */
  actionKey: string | null
  /** Urgency icon hint */
  urgencyIcon: 'alert' | 'warning' | 'info'
}

/**
 * Map a ProactiveSignal to a concrete action the chef can take.
 */
export function mapSignalToAction(signal: ProactiveSignal): MappedSignalAction {
  const mapping = SOURCE_ACTION_MAP[signal.source]

  if (mapping) {
    return {
      ...mapping,
      signalType: signal.source,
      urgencyIcon: signal.urgency >= 4 ? 'alert' : signal.urgency >= 3 ? 'warning' : 'info',
      actionHref: (signal.actionPayload?.href as string) || mapping.actionHref,
    }
  }

  return {
    signalType: signal.source,
    category: domainToCategory(signal.domain),
    title: signal.title,
    description: signal.detail,
    actionLabel: signal.suggestedAction || 'View Details',
    actionHref: (signal.actionPayload?.href as string) || '/intelligence',
    actionKey: null,
    urgencyIcon: signal.urgency >= 4 ? 'alert' : signal.urgency >= 3 ? 'warning' : 'info',
  }
}

function domainToCategory(domain: string): ActionCategory {
  switch (domain) {
    case 'clients':
    case 'reputation':
    case 'pipeline':
      return 'client'
    case 'finance':
    case 'inventory':
      return 'pricing'
    default:
      return 'operations'
  }
}

const SOURCE_ACTION_MAP: Record<
  string,
  Omit<MappedSignalAction, 'signalType' | 'urgencyIcon'>
> = {
  'clients.dormant': {
    category: 'client',
    title: 'Client Gone Quiet',
    description: 'This client has not booked in a while. A check-in could reignite the relationship.',
    actionLabel: 'Send Check-in',
    actionHref: '/clients',
    actionKey: 'draft_checkin',
  },
  'clients.atRisk': {
    category: 'client',
    title: 'Client At Risk',
    description: 'Signals suggest this client may be churning. Reach out before they go silent.',
    actionLabel: 'Send Check-in',
    actionHref: '/clients',
    actionKey: 'draft_checkin',
  },
  'clients.vipActivity': {
    category: 'client',
    title: 'VIP Client Active',
    description: 'A high-value client just took action. Great time for personalized outreach.',
    actionLabel: 'View Client',
    actionHref: '/clients',
    actionKey: null,
  },
  'clients.rebookingPrediction': {
    category: 'client',
    title: 'Rebooking Window Open',
    description: 'Based on past patterns, this client is likely ready to book again.',
    actionLabel: 'Suggest Dates',
    actionHref: '/clients',
    actionKey: 'draft_rebooking',
  },
  'clients.rebookingOverdue': {
    category: 'client',
    title: 'Rebooking Overdue',
    description: 'This client usually books by now. Time to reach out.',
    actionLabel: 'Send Follow-up',
    actionHref: '/clients',
    actionKey: 'draft_checkin',
  },
  'clients.spendingDecline': {
    category: 'client',
    title: 'Spending Decline',
    description: 'This client is spending less than usual. Consider a special offer.',
    actionLabel: 'View History',
    actionHref: '/clients',
    actionKey: null,
  },
  'clients.churnOverdue': {
    category: 'client',
    title: 'Churn Risk: Overdue',
    description: 'Client is past their typical rebooking window.',
    actionLabel: 'Send Check-in',
    actionHref: '/clients',
    actionKey: 'draft_checkin',
  },
  'clients.churnDecliningFrequency': {
    category: 'client',
    title: 'Churn Risk: Declining Frequency',
    description: 'This client is booking less often than before.',
    actionLabel: 'Send Check-in',
    actionHref: '/clients',
    actionKey: 'draft_checkin',
  },
  'clients.churnDecliningSpend': {
    category: 'client',
    title: 'Churn Risk: Declining Spend',
    description: 'This client is spending less per event.',
    actionLabel: 'Send Offer',
    actionHref: '/clients',
    actionKey: 'draft_checkin',
  },
  'clients.churnRejectedQuote': {
    category: 'client',
    title: 'Churn Risk: Rejected Quote',
    description: 'Client rejected a recent quote. Adjust pricing or follow up.',
    actionLabel: 'Review Quote',
    actionHref: '/quotes',
    actionKey: null,
  },
  'clients.churnNoResponse': {
    category: 'client',
    title: 'Churn Risk: No Response',
    description: 'Client has not responded to recent outreach.',
    actionLabel: 'Send Follow-up',
    actionHref: '/clients',
    actionKey: 'draft_checkin',
  },
  'clients.churnLongSilence': {
    category: 'client',
    title: 'Client Gone Silent',
    description: 'Long silence from this client. A warm note could help.',
    actionLabel: 'Send Check-in',
    actionHref: '/clients',
    actionKey: 'draft_checkin',
  },
  'clients.churnGeneric': {
    category: 'client',
    title: 'Churn Warning',
    description: 'Multiple factors suggest this client may be at risk.',
    actionLabel: 'Send Check-in',
    actionHref: '/clients',
    actionKey: 'draft_checkin',
  },
  'finance.overdueInvoices': {
    category: 'pricing',
    title: 'Invoice Overdue',
    description: 'An invoice is past due. Send a reminder to keep cash flow healthy.',
    actionLabel: 'Send Reminder',
    actionHref: '/finance/invoices',
    actionKey: 'send_payment_reminder',
  },
  'finance.revenueTrends': {
    category: 'pricing',
    title: 'Revenue Trend',
    description: 'Your revenue trend shifted. Review the data.',
    actionLabel: 'View Analytics',
    actionHref: '/analytics',
    actionKey: null,
  },
  'finance.expenseSpikes': {
    category: 'pricing',
    title: 'Expense Spike',
    description: 'Expenses jumped recently. Check purchases for anomalies.',
    actionLabel: 'Review Expenses',
    actionHref: '/analytics/finance',
    actionKey: null,
  },
  'pipeline.staleLeads': {
    category: 'client',
    title: 'Stale Lead',
    description: 'A lead has gone cold. Follow up before they move on.',
    actionLabel: 'Send Follow-up',
    actionHref: '/pipeline',
    actionKey: 'draft_followup',
  },
  'pipeline.expiringProposals': {
    category: 'client',
    title: 'Proposal Expiring',
    description: 'A proposal is about to expire. Nudge the client.',
    actionLabel: 'Send Follow-up',
    actionHref: '/quotes',
    actionKey: 'draft_followup',
  },
  'pipeline.unsignedContracts': {
    category: 'client',
    title: 'Contract Unsigned',
    description: 'A contract is waiting for signature. Follow up.',
    actionLabel: 'Send Reminder',
    actionHref: '/pipeline',
    actionKey: 'draft_followup',
  },
  'calendar.overload': {
    category: 'operations',
    title: 'Schedule Overload',
    description: 'Too many events in a short window. Consider rescheduling.',
    actionLabel: 'View Calendar',
    actionHref: '/calendar',
    actionKey: null,
  },
  'calendar.deadSpots': {
    category: 'operations',
    title: 'Calendar Gap',
    description: 'Empty dates ahead. Good time to reach out to dormant clients.',
    actionLabel: 'Fill Calendar',
    actionHref: '/pipeline',
    actionKey: null,
  },
  'calendar.bookingPace': {
    category: 'operations',
    title: 'Booking Pace',
    description: 'Your booking pace changed. Review the trend.',
    actionLabel: 'View Analytics',
    actionHref: '/analytics/pipeline',
    actionKey: null,
  },
  'inventory.priceSpikes': {
    category: 'pricing',
    title: 'Ingredient Price Spike',
    description: 'An ingredient cost jumped. Check vendors or adjust menu pricing.',
    actionLabel: 'Update Price',
    actionHref: '/culinary/ingredients',
    actionKey: null,
  },
  'inventory.wastePatterns': {
    category: 'pricing',
    title: 'Waste Pattern Detected',
    description: 'Consistent waste on certain ingredients. Adjust order quantities.',
    actionLabel: 'Review Waste',
    actionHref: '/culinary/ingredients',
    actionKey: null,
  },
  'reputation.testimonialOpportunity': {
    category: 'client',
    title: 'Testimonial Opportunity',
    description: 'A happy client just finished an event. Ask for a testimonial.',
    actionLabel: 'Request Review',
    actionHref: '/clients',
    actionKey: null,
  },
  'reputation.ratingTrend': {
    category: 'client',
    title: 'Rating Trend',
    description: 'Your average rating is shifting. Review recent feedback.',
    actionLabel: 'View Insights',
    actionHref: '/clients/insights',
    actionKey: null,
  },
  'reputation.unreviewedEvents': {
    category: 'client',
    title: 'Unreviewed Events',
    description: 'Recent events have no reviews. Send requests.',
    actionLabel: 'Send Requests',
    actionHref: '/clients',
    actionKey: null,
  },
  'commitment.gateFrequency': {
    category: 'operations',
    title: 'Gate Override Frequency',
    description: 'A readiness gate is being overridden often. Address the root cause.',
    actionLabel: 'Review Gates',
    actionHref: '/calendar',
    actionKey: null,
  },
  'commitment.timePressure': {
    category: 'operations',
    title: 'Time Pressure',
    description: 'Multiple overrides under time pressure. Consider earlier prep deadlines.',
    actionLabel: 'View Calendar',
    actionHref: '/calendar',
    actionKey: null,
  },
  'commitment.clientCorrelation': {
    category: 'client',
    title: 'Client Pattern',
    description: 'A specific client correlates with prep overrides. Review their events.',
    actionLabel: 'View Client',
    actionHref: '/clients',
    actionKey: null,
  },
  'commitment.confidenceErosion': {
    category: 'operations',
    title: 'Confidence Erosion',
    description: 'Override confidence is dropping. Fix blockers instead of bypassing.',
    actionLabel: 'Review Gates',
    actionHref: '/calendar',
    actionKey: null,
  },
  'commitment.menuUnlocks': {
    category: 'operations',
    title: 'Menu Unlock Pattern',
    description: 'Menus are being unlocked frequently after finalization.',
    actionLabel: 'View Menus',
    actionHref: '/menus',
    actionKey: null,
  },
}

/**
 * Get the category filter counts for a set of signals.
 */
export function getCategoryCounts(
  signals: ProactiveSignal[]
): Record<ActionCategory | 'all', number> {
  const counts: Record<ActionCategory | 'all', number> = {
    all: signals.length,
    client: 0,
    pricing: 0,
    operations: 0,
  }

  for (const signal of signals) {
    const mapped = mapSignalToAction(signal)
    counts[mapped.category]++
  }

  return counts
}
