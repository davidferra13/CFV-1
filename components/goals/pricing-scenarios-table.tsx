import type { PricingScenario } from '@/lib/goals/types'

interface PricingScenariosTableProps {
  scenarios: PricingScenario[]
  currentAvgCents: number
}

function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

export function PricingScenariosTable({ scenarios, currentAvgCents }: PricingScenariosTableProps) {
  if (scenarios.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
        Pricing scenarios to close gap
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200">
              <th className="text-left py-1.5 pr-4 font-medium text-stone-600">Price per event</th>
              <th className="text-left py-1.5 pr-4 font-medium text-stone-600">Events needed</th>
              <th className="text-left py-1.5 font-medium text-stone-600">Increase from avg</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s, i) => (
              <tr
                key={s.priceDeltaCents}
                className={`border-b border-stone-100 ${i === 0 ? 'font-medium text-stone-900' : 'text-stone-700'}`}
              >
                <td className="py-1.5 pr-4">{dollars(s.effectivePriceCents)}</td>
                <td className="py-1.5 pr-4">{s.eventsNeededAtPrice}</td>
                <td className="py-1.5 text-stone-500">
                  {s.priceDeltaCents === 0
                    ? 'Current avg'
                    : `+${dollars(s.priceDeltaCents)}/event`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
