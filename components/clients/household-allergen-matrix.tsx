// Household Allergen Matrix - grid view of allergens x family members
// Rows: allergens (Big 9 first, then common, then other)
// Columns: family members (client + guests)
// Color-coded: red for Big 9, amber for common
// Print-friendly layout

'use client'

import { Check } from '@/components/ui/icons'
import { allergenShortName } from '@/lib/constants/allergens'
import type { AllergenMatrixEntry } from '@/lib/clients/dietary-dashboard-actions'

interface HouseholdAllergenMatrixProps {
  members: string[]
  matrix: AllergenMatrixEntry[]
}

export function HouseholdAllergenMatrix({ members, matrix }: HouseholdAllergenMatrixProps) {
  if (matrix.length === 0) {
    return <p className="text-sm text-zinc-500 py-4">No allergens recorded for this household.</p>
  }

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 border-b border-zinc-700 text-zinc-400 font-medium min-w-[140px]">
              Allergen
            </th>
            {members.map((member) => (
              <th
                key={member}
                className="text-center py-2 px-2 border-b border-zinc-700 text-zinc-400 font-medium min-w-[80px]"
              >
                <span className="truncate block max-w-[100px]" title={member}>
                  {member.split(' ')[0]}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr
              key={row.allergen}
              className={row.isBig9 ? 'bg-red-950/30 hover:bg-red-950/50' : 'hover:bg-zinc-800/50'}
            >
              <td
                className={`py-2 px-3 border-b border-zinc-800 font-medium ${
                  row.isBig9 ? 'text-red-400' : 'text-amber-400'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {row.isBig9 && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  )}
                  {allergenShortName(row.allergen)}
                </span>
              </td>
              {members.map((member) => (
                <td key={member} className="text-center py-2 px-2 border-b border-zinc-800">
                  {row.members[member] && (
                    <Check
                      size={16}
                      weight="bold"
                      className={row.isBig9 ? 'text-red-400 mx-auto' : 'text-amber-400 mx-auto'}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Print-only footer */}
      <div className="hidden print:block mt-4 text-xs text-zinc-500 border-t border-zinc-700 pt-2">
        <p>
          Red rows = FDA Big 9 allergens (legally required labeling). Generated{' '}
          {new Date().toLocaleDateString()}.
        </p>
      </div>
    </div>
  )
}
