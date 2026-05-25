import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { generateShoppingList } from '@/lib/culinary/shopping-list-actions'
import { groupByCategory } from '@/lib/culinary/shopping-list-utils'

export const metadata: Metadata = { title: 'Shopping List - Print' }

function liso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDefaultWindow() {
  const start = new Date()
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 14)
  return { startDate: liso(start), endDate: liso(end) }
}

function formatCategoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    produce: 'Produce',
    meat_seafood: 'Protein',
    dairy_eggs: 'Dairy',
    bakery: 'Bakery',
    deli: 'Deli',
    frozen: 'Frozen',
    pantry_dry: 'Dry Goods',
    canned: 'Canned',
    condiments_sauces: 'Condiments',
    spices: 'Spices',
    baking: 'Baking',
    beverages: 'Beverages',
    bulk: 'Bulk',
    international: 'International',
    household: 'Household',
    other: 'Other',
  }
  return labels[cat] ?? cat.replace(/_/g, ' ')
}

interface PageProps {
  searchParams?: Promise<{ startDate?: string; endDate?: string; eventIds?: string }>
}

export default async function PrintShoppingListPage({ searchParams }: PageProps) {
  await requireChef()
  const params = await searchParams
  const defaultWindow = getDefaultWindow()

  const startDate = params?.startDate ?? defaultWindow.startDate
  const endDate = params?.endDate ?? defaultWindow.endDate
  const eventIds = params?.eventIds ? params.eventIds.split(',').filter(Boolean) : undefined

  const result = await generateShoppingList({ startDate, endDate, eventIds }).catch(() => ({
    startDate,
    endDate,
    items: [],
    totalEstimatedCostCents: 0,
    shortageCount: 0,
    incompleteRecipes: [],
  }))

  const shortageItems = result.items.filter((i) => i.toBuy > 0)
  const grouped = groupByCategory(shortageItems)

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              nav, aside, header, footer, .no-print { display: none !important; }
              body { background: white !important; color: black !important; font-size: 11pt; }
              .print-page { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
              .print-category { break-inside: avoid; }
            }
            @media screen {
              .print-page { max-width: 800px; margin: 0 auto; padding: 2rem; }
            }
          `,
        }}
      />

      <div className="print-page">
        <div style={{ borderBottom: '2px solid #333', paddingBottom: '8px', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '18pt', fontWeight: 'bold', margin: 0 }}>Shopping List</h1>
          <p style={{ fontSize: '10pt', color: '#666', margin: '4px 0 0' }}>
            {startDate} to {endDate} | {shortageItems.length} items | Estimated: $
            {(result.totalEstimatedCostCents / 100).toFixed(2)}
          </p>
          {result.incompleteRecipes.length > 0 && (
            <p style={{ fontSize: '9pt', color: '#c00', margin: '4px 0 0' }}>
              {result.incompleteRecipes.length} recipe ingredient
              {result.incompleteRecipes.length === 1 ? '' : 's'} with missing quantities
            </p>
          )}
        </div>

        {[...grouped.entries()].map(([category, items]) => (
          <div key={category} className="print-category" style={{ marginBottom: '12px' }}>
            <h2
              style={{
                fontSize: '11pt',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                borderBottom: '1px solid #999',
                paddingBottom: '2px',
                marginBottom: '4px',
              }}
            >
              {formatCategoryLabel(category)}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={`${item.ingredientId}-${item.unit}`}
                    style={{ borderBottom: '1px solid #eee' }}
                  >
                    <td style={{ width: '20px', padding: '3px 4px', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          border: '1px solid #999',
                          borderRadius: '2px',
                        }}
                      />
                    </td>
                    <td style={{ padding: '3px 4px' }}>{item.ingredientName}</td>
                    <td style={{ padding: '3px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {item.toBuy.toFixed(1)} {item.unit}
                    </td>
                    <td
                      style={{
                        padding: '3px 4px',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        color: '#666',
                      }}
                    >
                      {item.estimatedCostCents > 0
                        ? `~$${(item.estimatedCostCents / 100).toFixed(2)}`
                        : '*'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div
          style={{
            borderTop: '2px solid #333',
            paddingTop: '8px',
            marginTop: '16px',
            fontSize: '10pt',
          }}
        >
          <p style={{ fontWeight: 'bold' }}>
            Estimated Total: ${(result.totalEstimatedCostCents / 100).toFixed(2)}
          </p>
          <p style={{ color: '#666', fontSize: '9pt' }}>
            * = no price data available. Prices are estimates.
          </p>
        </div>

        <div className="no-print" style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {}}
            className="rounded-md bg-stone-700 px-4 py-2 text-sm text-stone-100 hover:bg-stone-600"
            data-print-trigger
          >
            Print This Page
          </button>
          <script
            dangerouslySetInnerHTML={{
              __html: `document.querySelector('[data-print-trigger]')?.addEventListener('click', () => window.print())`,
            }}
          />
        </div>
      </div>
    </>
  )
}
