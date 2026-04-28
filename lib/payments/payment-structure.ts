import { formatCurrency } from '@/lib/utils/currency'

export type PaymentStructureMode =
  | 'full_upfront'
  | 'deposit_balance'
  | 'thirds'
  | 'split_evenly'
  | 'custom_terms'

export type PaymentInstallmentKind = 'deposit' | 'installment' | 'balance' | 'split' | 'custom'

export type PaymentStructureInstallment = {
  label: string
  amountCents: number
  kind: PaymentInstallmentKind
  dueLabel: string
  payerLabel?: string | null
}

export type PaymentStructure = {
  mode: PaymentStructureMode
  label: string
  totalCents: number
  depositCents?: number | null
  depositPercentage?: number | null
  participantCount?: number | null
  customTerms?: string | null
  installments: PaymentStructureInstallment[]
  clientNote: string
}

const PAYMENT_STRUCTURE_CONTEXT_KEY = 'paymentStructure'

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}

function cents(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.round(value)
}

function splitCents(totalCents: number, parts: number): number[] {
  const safeParts = clampInt(parts, 1, 100)
  const base = Math.floor(totalCents / safeParts)
  const remainder = totalCents - base * safeParts
  return Array.from({ length: safeParts }, (_, index) => base + (index < remainder ? 1 : 0))
}

function modeLabel(mode: PaymentStructureMode): string {
  switch (mode) {
    case 'full_upfront':
      return 'Full payment upfront'
    case 'deposit_balance':
      return 'Deposit plus balance'
    case 'thirds':
      return 'Three-stage payment plan'
    case 'split_evenly':
      return 'Split evenly between payers'
    case 'custom_terms':
      return 'Custom payment terms'
  }
}

function buildClientNote(structure: Omit<PaymentStructure, 'clientNote'>): string {
  if (structure.mode === 'custom_terms') {
    return structure.customTerms?.trim() || 'Payment terms to be confirmed with the chef.'
  }

  const lines = structure.installments.map((installment) => {
    const payer = installment.payerLabel ? `${installment.payerLabel}: ` : ''
    return `${payer}${installment.label} ${formatCurrency(installment.amountCents)} due ${installment.dueLabel}`
  })

  return [`Payment structure: ${structure.label}.`, ...lines].join('\n')
}

export function buildPaymentStructure(input: {
  mode: PaymentStructureMode
  totalCents: number
  depositCents?: number | null
  depositPercentage?: number | null
  participantCount?: number | null
  customTerms?: string | null
}): PaymentStructure {
  const totalCents = cents(input.totalCents)
  const mode = input.mode
  const label = modeLabel(mode)
  const depositCents = cents(input.depositCents ?? 0)
  const depositPercentage =
    typeof input.depositPercentage === 'number' && Number.isFinite(input.depositPercentage)
      ? input.depositPercentage
      : null
  const participantCount = input.participantCount
    ? clampInt(input.participantCount, 2, 100)
    : mode === 'split_evenly'
      ? 2
      : null

  let installments: PaymentStructureInstallment[] = []

  if (mode === 'full_upfront') {
    installments = [
      {
        label: 'Full payment',
        amountCents: totalCents,
        kind: 'balance',
        dueLabel: 'at booking',
      },
    ]
  }

  if (mode === 'deposit_balance') {
    const safeDeposit = Math.min(depositCents, totalCents)
    const balanceCents = Math.max(0, totalCents - safeDeposit)
    installments = [
      ...(safeDeposit > 0
        ? [
            {
              label: 'Deposit',
              amountCents: safeDeposit,
              kind: 'deposit' as const,
              dueLabel: 'to reserve the date',
            },
          ]
        : []),
      ...(balanceCents > 0
        ? [
            {
              label: 'Remaining balance',
              amountCents: balanceCents,
              kind: 'balance' as const,
              dueLabel: 'before service',
            },
          ]
        : []),
    ]
  }

  if (mode === 'thirds') {
    const [first, second, third] = splitCents(totalCents, 3)
    installments = [
      {
        label: 'First payment',
        amountCents: first,
        kind: 'deposit',
        dueLabel: 'to reserve the date',
      },
      {
        label: 'Second payment',
        amountCents: second,
        kind: 'installment',
        dueLabel: 'midway to service',
      },
      { label: 'Final payment', amountCents: third, kind: 'balance', dueLabel: 'before service' },
    ]
  }

  if (mode === 'split_evenly') {
    const shares = splitCents(totalCents, participantCount ?? 2)
    installments = shares.map((share, index) => ({
      label: 'Share',
      amountCents: share,
      kind: 'split',
      dueLabel: 'by the quote deadline',
      payerLabel: `Payer ${index + 1}`,
    }))
  }

  if (mode === 'custom_terms') {
    installments = [
      {
        label: 'Custom terms',
        amountCents: totalCents,
        kind: 'custom',
        dueLabel: 'as written',
      },
    ]
  }

  const withoutNote = {
    mode,
    label,
    totalCents,
    depositCents: depositCents || null,
    depositPercentage,
    participantCount,
    customTerms: input.customTerms?.trim() || null,
    installments,
  }

  return {
    ...withoutNote,
    clientNote: buildClientNote(withoutNote),
  }
}

export function serializePaymentStructureForContext(
  structure: PaymentStructure
): Record<string, unknown> {
  return {
    [PAYMENT_STRUCTURE_CONTEXT_KEY]: structure,
  }
}

export function readPaymentStructure(
  context: Record<string, unknown> | null | undefined
): PaymentStructure | null {
  const raw = context?.[PAYMENT_STRUCTURE_CONTEXT_KEY]
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<PaymentStructure>
  if (!value.mode || !Array.isArray(value.installments)) return null
  return value as PaymentStructure
}
