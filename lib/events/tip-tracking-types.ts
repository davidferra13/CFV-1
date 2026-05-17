// Tip Tracking & Gratitude Intelligence types

export type TipMethod = 'cash' | 'card' | 'venmo' | 'zelle' | 'added_to_payment' | 'other'

export const TIP_METHODS: { value: TipMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'added_to_payment', label: 'Added to Payment' },
  { value: 'other', label: 'Other' },
]

export interface TipRecord {
  id: string
  eventId: string
  tenantId: string
  amountCents: number
  method: TipMethod
  receivedAt: string
  notes: string | null
  createdAt: string
}

export interface TipSummary {
  totalTipsCents: number
  tipCount: number
  averageTipCents: number
  tipPercentageOfInvoice: number | null
  methods: Record<TipMethod, number>
}

export interface ClientTipHistory {
  clientId: string
  clientName: string
  totalTipsCents: number
  tipCount: number
  averageTipCents: number
  averageTipPercentage: number | null
  firstTipDate: string | null
  lastTipDate: string | null
  tipsEveryTime: boolean
  totalEvents: number
  eventsWithTips: number
}

export interface TipTrend {
  month: string // YYYY-MM
  totalCents: number
  tipCount: number
  eventCount: number
  averageCents: number
}

export interface LapsedHighTipper {
  clientId: string
  clientName: string
  totalTipsCents: number
  tipCount: number
  averageTipCents: number
  lastEventDate: string
  daysSinceLastEvent: number
}

export interface TopTipper {
  clientId: string
  clientName: string
  totalTipsCents: number
  tipCount: number
  averageTipCents: number
  lastTipDate: string | null
}
