export type SupportFrequency = 'monthly' | 'one_time'

export type SupportOfferId =
  | 'support_5_monthly'
  | 'support_12_monthly'
  | 'support_25_monthly'
  | 'support_custom_monthly'
  | 'support_5_once'
  | 'support_12_once'
  | 'support_25_once'
  | 'support_custom_once'

export type SupportOffer = {
  id: SupportOfferId
  frequency: SupportFrequency
  amountCents: number | null
  label: string
  ctaLabel: string
  isPreferred: boolean
}

export const SUPPORT_COPY = {
  headline: 'ChefFlow is free to use.',
  story:
    'If ChefFlow helps your business, you can support its development with a voluntary contribution.',
  accessNote: 'Support does not change feature access. Every core feature remains available.',
} as const

export const SUPPORT_FIXED_AMOUNTS_CENTS = [500, 1200, 2500] as const
export const SUPPORT_DEFAULT_MONTHLY_AMOUNT_CENTS = 1200
export const SUPPORT_MIN_CUSTOM_AMOUNT_CENTS = 100
export const SUPPORT_MAX_CUSTOM_AMOUNT_CENTS = 50000

export const SUPPORT_OFFERS: SupportOffer[] = [
  {
    id: 'support_5_monthly',
    frequency: 'monthly',
    amountCents: 500,
    label: '$5 / month',
    ctaLabel: 'Contribute $5 monthly',
    isPreferred: false,
  },
  {
    id: 'support_12_monthly',
    frequency: 'monthly',
    amountCents: 1200,
    label: '$12 / month',
    ctaLabel: 'Contribute $12 monthly',
    isPreferred: true,
  },
  {
    id: 'support_25_monthly',
    frequency: 'monthly',
    amountCents: 2500,
    label: '$25 / month',
    ctaLabel: 'Contribute $25 monthly',
    isPreferred: false,
  },
  {
    id: 'support_custom_monthly',
    frequency: 'monthly',
    amountCents: null,
    label: 'Custom monthly',
    ctaLabel: 'Contribute monthly',
    isPreferred: false,
  },
  {
    id: 'support_5_once',
    frequency: 'one_time',
    amountCents: 500,
    label: '$5 once',
    ctaLabel: 'Contribute $5 once',
    isPreferred: false,
  },
  {
    id: 'support_12_once',
    frequency: 'one_time',
    amountCents: 1200,
    label: '$12 once',
    ctaLabel: 'Contribute $12 once',
    isPreferred: true,
  },
  {
    id: 'support_25_once',
    frequency: 'one_time',
    amountCents: 2500,
    label: '$25 once',
    ctaLabel: 'Contribute $25 once',
    isPreferred: false,
  },
  {
    id: 'support_custom_once',
    frequency: 'one_time',
    amountCents: null,
    label: 'Custom once',
    ctaLabel: 'Contribute once',
    isPreferred: false,
  },
]

export function getSupportOffer(id: string): SupportOffer | null {
  return SUPPORT_OFFERS.find((offer) => offer.id === id) ?? null
}

export function getSupportOffersByFrequency(frequency: SupportFrequency): SupportOffer[] {
  return SUPPORT_OFFERS.filter((offer) => offer.frequency === frequency)
}

export function formatSupportAmount(amountCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
  }).format(amountCents / 100)
}

export function parseSupportAmountCents(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string') return null
  const normalized = raw.trim().replace(/[$,]/g, '')
  if (!normalized) return null

  const amount = Number(normalized)
  if (!Number.isFinite(amount)) return null

  const cents = Math.round(amount * 100)
  if (cents < SUPPORT_MIN_CUSTOM_AMOUNT_CENTS || cents > SUPPORT_MAX_CUSTOM_AMOUNT_CENTS) {
    return null
  }

  return cents
}
