'use client'

import { PrintLayout } from './print-layout'

interface GroceryItem {
  ingredientName: string
  category: string
  quantity: number
  unit: string
  recipeName: string
  isOptional: boolean
  preparationNotes: string | null
}

interface GroceryListPrintViewProps {
  event: {
    eventDate: string
    serveTime: string
    guestCount: number
    occasion: string | null
    clientName: string
  }
  groceryByCategory: Record<string, GroceryItem[]>
  totalItems: number
}

// Friendlier category labels
const CATEGORY_LABELS: Record<string, string> = {
  produce: 'Produce',
  meat: 'Meat & Poultry',
  seafood: 'Seafood',
  dairy: 'Dairy & Eggs',
  bakery: 'Bakery & Bread',
  pantry: 'Pantry Staples',
  spices: 'Spices & Seasonings',
  frozen: 'Frozen',
  beverages: 'Beverages',
  condiments: 'Condiments & Sauces',
  grains: 'Grains & Pasta',
  oils: 'Oils & Vinegars',
  herbs: 'Fresh Herbs',
  other: 'Other',
}

export function GroceryListPrintView({ event, groceryByCategory, totalItems }: GroceryListPrintViewProps) {
  const categories = Object.keys(groceryByCategory)

  const formattedDate = new Date(event.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <PrintLayout title="Grocery List">
      {/* Event info header */}
      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '15px' }}>
              <strong>Client:</strong> {event.clientName}
            </p>
            <p style={{ margin: '0 0 4px', fontSize: '15px' }}>
              <strong>Date:</strong> {formattedDate}
            </p>
            {event.occasion && (
              <p style={{ margin: 0, fontSize: '15px' }}>
                <strong>Occasion:</strong> {event.occasion}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 4px', fontSize: '15px' }}>
              <strong>Guests:</strong> {event.guestCount}
            </p>
            <p style={{ margin: 0, fontSize: '15px' }}>
              <strong>Items:</strong> {totalItems}
            </p>
          </div>
        </div>
      </div>

      {/* Grocery items by category */}
      {categories.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280', fontSize: '16px' }}>
          No grocery items found. Add recipes to your menu dishes to generate a grocery list.
        </div>
      ) : (
        categories.map(category => {
          const items = groceryByCategory[category]
          const label = CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1)

          return (
            <div key={category} style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '2px solid #111',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {label}
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {items.map((item, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '8px 0',
                      borderBottom: '1px solid #f3f4f6',
                      fontSize: '16px',
                    }}
                  >
                    {/* Large checkbox */}
                    <span
                      style={{
                        display: 'inline-block',
                        width: '22px',
                        height: '22px',
                        minWidth: '22px',
                        border: '2px solid #374151',
                        borderRadius: '3px',
                        marginTop: '1px',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <span>
                        <strong style={{ fontSize: '17px' }}>{item.quantity} {item.unit}</strong>{' '}
                        {item.ingredientName}
                        {item.isOptional && (
                          <span style={{ fontSize: '13px', color: '#6b7280' }}> (optional)</span>
                        )}
                      </span>
                      <span style={{ fontSize: '13px', color: '#9ca3af', marginLeft: '8px' }}>
                        for: {item.recipeName}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })
      )}

      {/* Handwritten notes space */}
      <div
        style={{
          marginTop: '40px',
          borderTop: '2px solid #111',
          paddingTop: '16px',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Notes</h2>
        {/* Empty lined area for handwritten notes */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              borderBottom: '1px solid #d1d5db',
              height: '32px',
            }}
          />
        ))}
      </div>
    </PrintLayout>
  )
}
