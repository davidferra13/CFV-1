'use client'

import { useState } from 'react'

type PublicTable = {
  id: string
  name: string
  description: string | null
  displayArea: string | null
  displayVibe: string[]
  dietaryTheme: string[]
  openSeats: number | null
  emoji: string | null
  closesAt: string | null
}

interface Props {
  chefName: string
  chefId: string
  tables: PublicTable[]
}

export function PublicOpenTablesView({ chefName, chefId, tables }: Props) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-stone-900 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-display text-stone-100 mb-2">Open Tables</h1>
          <p className="text-stone-400">Discover dinner experiences curated by {chefName}</p>
        </div>

        {tables.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🍽</div>
            <h2 className="text-lg font-medium text-stone-200 mb-2">No open tables right now</h2>
            <p className="text-stone-400 text-sm max-w-md mx-auto">
              Check back soon! When foodies in {chefName}'s network open their dinner circles,
              you'll find them here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className="bg-stone-800 border border-stone-700 rounded-xl p-5 hover:border-stone-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-medium text-stone-100">
                      {table.emoji && <span className="mr-2">{table.emoji}</span>}
                      {table.name}
                    </h3>
                    {table.displayArea && (
                      <p className="text-sm text-stone-400">{table.displayArea}</p>
                    )}
                  </div>
                  {table.openSeats !== null && table.openSeats > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                      {table.openSeats} open {table.openSeats === 1 ? 'seat' : 'seats'}
                    </span>
                  )}
                </div>

                {table.description && (
                  <p className="text-sm text-stone-300 mb-3 italic">"{table.description}"</p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {table.displayVibe.map((v) => (
                    <span
                      key={v}
                      className="px-2 py-0.5 bg-stone-700 text-stone-300 text-xs rounded-full"
                    >
                      {v}
                    </span>
                  ))}
                  {table.dietaryTheme.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full"
                    >
                      {d}
                    </span>
                  ))}
                </div>

                {selectedTable === table.id ? (
                  <div className="border-t border-stone-700 pt-4">
                    <p className="text-sm text-stone-300 mb-3">
                      To join this table, reach out to {chefName} directly. They'll connect you with
                      the group.
                    </p>
                    <a
                      href={`/embed/inquiry/${chefId}?occasion=Open+Table&notes=${encodeURIComponent(`Interested in joining: ${table.name}`)}`}
                      className="inline-block px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors"
                    >
                      Contact {chefName}
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedTable(table.id)}
                    className="w-full px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors"
                  >
                    I'm Interested
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-stone-600 mt-8">Powered by ChefFlow</p>
      </div>
    </div>
  )
}
