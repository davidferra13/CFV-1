import { Badge } from '@/components/ui/badge'
import type { PaymentStructure } from '@/lib/payments/payment-structure'
import { formatCurrency } from '@/lib/utils/currency'

export function PaymentStructureSummary({
  structure,
  compact = false,
}: {
  structure: PaymentStructure | null
  compact?: boolean
}) {
  if (!structure) return null

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Payment Structure</h3>
          <p className="mt-1 text-sm text-stone-400">{structure.label}</p>
        </div>
        <Badge variant="info">{formatCurrency(structure.totalCents)}</Badge>
      </div>

      <div className={compact ? 'mt-3 space-y-2' : 'mt-4 space-y-3'}>
        {structure.installments.map((installment, index) => (
          <div
            key={`${installment.label}-${index}`}
            className="flex items-start justify-between gap-3 border-t border-stone-800 pt-3 text-sm first:border-t-0 first:pt-0"
          >
            <div>
              <p className="font-medium text-stone-200">
                {installment.payerLabel ? `${installment.payerLabel}: ` : ''}
                {installment.label}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">Due {installment.dueLabel}</p>
            </div>
            <span className="shrink-0 font-semibold text-stone-100">
              {formatCurrency(installment.amountCents)}
            </span>
          </div>
        ))}
      </div>

      {!compact && structure.customTerms ? (
        <p className="mt-3 border-t border-stone-800 pt-3 text-sm text-stone-300">
          {structure.customTerms}
        </p>
      ) : null}
    </div>
  )
}
