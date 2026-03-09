import { Card } from '@/components/ui/card'
import { getClientQuoteLineItems } from '@/lib/quotes/cost-breakdown-actions'
import { formatCurrency } from '@/lib/utils/currency'

type QuoteCostBreakdownProps = {
  quoteId: string
}

export async function QuoteCostBreakdown({ quoteId }: QuoteCostBreakdownProps) {
  const data = await getClientQuoteLineItems(quoteId)

  if (!data.showCostBreakdown || data.lineItems.length === 0) {
    return null
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-stone-100">Cost Breakdown</h2>
      <p className="mt-1 text-sm text-stone-400">
        Your chef chose to share how this quote is structured.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-stone-700">
        <div className="grid grid-cols-[minmax(0,1.5fr)_120px_120px] gap-3 border-b border-stone-700 bg-stone-900/80 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
          <div>Line Item</div>
          <div>Amount</div>
          <div>Share</div>
        </div>
        <div className="divide-y divide-stone-800 bg-stone-950/40">
          {data.lineItems.map((item) => (
            <div key={item.id} className="grid grid-cols-[minmax(0,1.5fr)_120px_120px] gap-3 px-4 py-4">
              <div>
                <div className="font-medium text-stone-100">{item.label}</div>
                {item.source_note ? (
                  <div className="mt-1 text-xs text-stone-500">Source: {item.source_note}</div>
                ) : null}
              </div>
              <div className="font-medium text-stone-100">{formatCurrency(item.amount_cents)}</div>
              <div className="text-stone-400">
                {item.percentage != null ? `${Number(item.percentage).toFixed(0)}%` : 'n/a'}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-stone-700 bg-stone-900/80 px-4 py-3">
          <span className="text-sm font-semibold text-stone-200">Quote Total</span>
          <span className="text-base font-bold text-stone-100">
            {formatCurrency(data.totalQuotedCents)}
          </span>
        </div>
      </div>

      {data.exclusionsNote ? (
        <div className="mt-4 rounded-xl border border-stone-700 bg-stone-900/50 p-4">
          <h3 className="text-sm font-semibold text-stone-100">What&apos;s Not Included</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-stone-300">{data.exclusionsNote}</p>
        </div>
      ) : null}
    </Card>
  )
}
