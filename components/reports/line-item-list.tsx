// Line Item List - Detailed expense line items for cost report

import type { DetailedLineItem } from '@/lib/reports/event-cost-report'

interface LineItemListProps {
  items: DetailedLineItem[]
}

function cents(amount: number): string {
  return `$${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

export function LineItemList({ items }: LineItemListProps) {
  if (items.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-stone-200 mb-3 print:text-stone-800">
          Line Items
        </h2>
        <p className="text-stone-400 print:text-stone-500 text-sm">
          No expenses recorded for this event.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-stone-200 mb-3 print:text-stone-800">
        Line Items
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700 print:border-stone-300 text-left">
              <th className="py-2 text-stone-400 print:text-stone-500 font-medium">Date</th>
              <th className="py-2 text-stone-400 print:text-stone-500 font-medium">Description</th>
              <th className="py-2 text-stone-400 print:text-stone-500 font-medium">Vendor</th>
              <th className="py-2 text-stone-400 print:text-stone-500 font-medium">Category</th>
              <th className="py-2 text-right text-stone-400 print:text-stone-500 font-medium">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-stone-800 print:border-stone-200"
              >
                <td className="py-2 text-stone-300 print:text-stone-700 whitespace-nowrap">
                  {formatDate(item.date)}
                </td>
                <td className="py-2 text-stone-200 print:text-stone-800">
                  {item.description}
                </td>
                <td className="py-2 text-stone-400 print:text-stone-600">
                  {item.vendorName ?? '-'}
                </td>
                <td className="py-2 text-stone-400 print:text-stone-600 text-xs">
                  {item.rawCategory}
                </td>
                <td className="py-2 text-right text-stone-200 print:text-stone-800 font-medium whitespace-nowrap">
                  {cents(item.amountCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
