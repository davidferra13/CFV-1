'use client'

// Clipboard Print — Print-friendly layout for daily clipboard
// Clean table layout with no interactive elements. Uses @media print CSS.

type ClipboardEntry = {
  id: string
  on_hand: number
  made: number
  need_to_make: number
  need_to_order: number
  waste_qty: number
  waste_reason_code: string | null
  is_86d: boolean
  location: string
  notes: string | null
  station_components?: {
    id: string
    name: string
    unit: string
    par_level: number
    par_unit: string | null
    shelf_life_days: number | null
    station_menu_items?: {
      id: string
      name: string
    }
  }
}

type Props = {
  stationName: string
  date: string
  entries: ClipboardEntry[]
}

const REASON_LABELS: Record<string, string> = {
  expired: 'Expired',
  over_production: 'Over Prod.',
  dropped: 'Dropped',
  contamination: 'Contam.',
  quality: 'Quality',
  other: 'Other',
}

export function ClipboardPrint({ stationName, date, entries }: Props) {
  return (
    <div className="bg-white text-black p-8 min-h-screen">
      {/* Print-only styles */}
      <style>{`
        @media print {
          nav, header, footer, .no-print { display: none !important; }
          body { background: white !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
        @media screen {
          .print-container { max-width: 1100px; margin: 0 auto; }
        }
      `}</style>

      <div className="print-container">
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold">{stationName}</h1>
          <p className="text-sm text-gray-600 mt-1">Daily Clipboard — {date}</p>
          <p className="text-xs text-gray-400 mt-1">Printed {new Date().toLocaleString()}</p>
        </div>

        {/* Print button (screen only) */}
        <div className="no-print mb-4 text-center">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-stone-800 text-white rounded text-sm"
          >
            Print This Page
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No entries for this date.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2 pr-2 font-bold">Component</th>
                <th className="text-center py-2 px-2 font-bold">Par</th>
                <th className="text-center py-2 px-2 font-bold">On Hand</th>
                <th className="text-center py-2 px-2 font-bold">Need to Make</th>
                <th className="text-center py-2 px-2 font-bold">Made</th>
                <th className="text-center py-2 px-2 font-bold">Need to Order</th>
                <th className="text-center py-2 px-2 font-bold">Waste</th>
                <th className="text-center py-2 px-2 font-bold">Location</th>
                <th className="text-center py-2 px-2 font-bold">86'd</th>
                <th className="text-left py-2 pl-2 font-bold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                const comp = entry.station_components
                return (
                  <tr
                    key={entry.id}
                    className={`border-b border-gray-300 ${
                      entry.is_86d ? 'bg-red-100' : idx % 2 === 0 ? 'bg-gray-50' : ''
                    }`}
                  >
                    <td className="py-1.5 pr-2">
                      <div className="font-medium">{comp?.name ?? 'Unknown'}</div>
                      {comp?.station_menu_items?.name && (
                        <div className="text-xs text-gray-500">{comp.station_menu_items.name}</div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {comp?.par_level ?? 0} {comp?.par_unit ?? comp?.unit ?? ''}
                    </td>
                    <td className="py-1.5 px-2 text-center font-medium">{entry.on_hand}</td>
                    <td className="py-1.5 px-2 text-center">{entry.need_to_make}</td>
                    <td className="py-1.5 px-2 text-center">{entry.made}</td>
                    <td className="py-1.5 px-2 text-center">
                      {entry.need_to_order > 0 ? (
                        <span className="font-bold">{entry.need_to_order}</span>
                      ) : (
                        entry.need_to_order
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {entry.waste_qty > 0 ? (
                        <span>
                          {entry.waste_qty}
                          {entry.waste_reason_code && (
                            <span className="text-xs ml-1">
                              ({REASON_LABELS[entry.waste_reason_code] ?? entry.waste_reason_code})
                            </span>
                          )}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center uppercase text-xs font-medium">
                      {entry.location}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {entry.is_86d ? <span className="font-bold text-red-200">86</span> : '--'}
                    </td>
                    <td className="py-1.5 pl-2 text-xs max-w-[150px] truncate">
                      {entry.notes ?? ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div className="mt-8 border-t border-gray-300 pt-4 text-xs text-gray-400 text-center">
          ChefFlow Station Clipboard — {stationName} — {date}
        </div>
      </div>
    </div>
  )
}
