// Profit Summary - Profit margin display with visual indicator

interface ProfitSummaryProps {
  quotedTotalCents: number
  actualTotalCents: number
  profitCents: number
  profitMarginPercent: number | null
}

function cents(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  return `${sign}$${(abs / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ProfitSummary({
  quotedTotalCents,
  actualTotalCents,
  profitCents,
  profitMarginPercent,
}: ProfitSummaryProps) {
  const isProfitable = profitCents >= 0
  const marginColor = isProfitable
    ? 'text-green-400 print:text-green-600'
    : 'text-red-400 print:text-red-600'
  const marginBg = isProfitable
    ? 'bg-green-900/30 border-green-800 print:bg-green-50 print:border-green-200'
    : 'bg-red-900/30 border-red-800 print:bg-red-50 print:border-red-200'

  return (
    <div>
      <h2 className="text-lg font-semibold text-stone-200 mb-3 print:text-stone-800">
        Profit Summary
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-stone-700 p-4 print:border-stone-300">
          <p className="text-xs text-stone-400 print:text-stone-500 uppercase tracking-wider">
            Quoted Price
          </p>
          <p className="mt-1 text-xl font-semibold text-stone-200 print:text-stone-800">
            {quotedTotalCents > 0 ? cents(quotedTotalCents) : 'N/A'}
          </p>
        </div>
        <div className="rounded-lg border border-stone-700 p-4 print:border-stone-300">
          <p className="text-xs text-stone-400 print:text-stone-500 uppercase tracking-wider">
            Total Cost
          </p>
          <p className="mt-1 text-xl font-semibold text-stone-200 print:text-stone-800">
            {cents(actualTotalCents)}
          </p>
        </div>
        <div className={`rounded-lg border p-4 col-span-2 ${marginBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-400 print:text-stone-500 uppercase tracking-wider">
                Net Profit
              </p>
              <p className={`mt-1 text-2xl font-bold ${marginColor}`}>
                {cents(profitCents)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-400 print:text-stone-500 uppercase tracking-wider">
                Margin
              </p>
              <p className={`mt-1 text-2xl font-bold ${marginColor}`}>
                {profitMarginPercent != null ? `${profitMarginPercent}%` : 'N/A'}
              </p>
            </div>
          </div>
          {/* Visual margin bar */}
          {profitMarginPercent != null && (
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-stone-700 print:bg-stone-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isProfitable ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(Math.max(Math.abs(profitMarginPercent), 0), 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-stone-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
