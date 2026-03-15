'use client'

import { PrintLayout } from './print-layout'

interface Dish {
  name: string | null
  description: string | null
  dietary_tags: string[]
  allergen_flags: string[]
  course_name: string
  sort_order: number
}

interface Menu {
  name: string
  description: string | null
  cuisine_type: string | null
  service_style: string | null
  simple_mode: boolean
  simple_mode_content: string | null
}

interface MenuPrintViewProps {
  menu: Menu
  courses: Record<string, Dish[]>
  chefName: string
}

// Short dietary labels for inline display
const DIETARY_ICONS: Record<string, string> = {
  vegetarian: 'V',
  vegan: 'VG',
  'gluten-free': 'GF',
  'gluten free': 'GF',
  'dairy-free': 'DF',
  'dairy free': 'DF',
  'nut-free': 'NF',
  'nut free': 'NF',
  kosher: 'K',
  halal: 'H',
  pescatarian: 'P',
  keto: 'KE',
  paleo: 'PA',
}

export function MenuPrintView({ menu, courses, chefName }: MenuPrintViewProps) {
  const courseNames = Object.keys(courses)
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // If simple mode, render the freeform content
  if (menu.simple_mode && menu.simple_mode_content) {
    return (
      <PrintLayout title={menu.name} showDate={false}>
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          {menu.description && (
            <p style={{ fontSize: '15px', color: '#6b7280', fontStyle: 'italic', marginBottom: '32px' }}>
              {menu.description}
            </p>
          )}
          <div
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: '16px',
              lineHeight: '1.8',
            }}
          >
            {menu.simple_mode_content}
          </div>
          {chefName && (
            <p style={{ marginTop: '48px', fontSize: '14px', color: '#9ca3af' }}>
              {chefName} - {today}
            </p>
          )}
        </div>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title={menu.name} showDate={false}>
      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        {/* Menu header */}
        {menu.description && (
          <p
            style={{
              fontSize: '15px',
              color: '#6b7280',
              fontStyle: 'italic',
              marginBottom: '8px',
            }}
          >
            {menu.description}
          </p>
        )}
        {(menu.cuisine_type || menu.service_style) && (
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '32px' }}>
            {[menu.cuisine_type, menu.service_style].filter(Boolean).join(' - ')}
          </p>
        )}

        {/* Dietary legend */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '32px',
            fontSize: '12px',
            color: '#6b7280',
          }}
        >
          {Object.entries(DIETARY_ICONS).slice(0, 6).map(([label, abbr]) => (
            <span key={label}>
              <strong>{abbr}</strong> = {label}
            </span>
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '32px' }} />

        {/* Courses */}
        {courseNames.map((courseName, courseIdx) => {
          const dishes = courses[courseName]
          return (
            <div key={courseName} style={{ marginBottom: '36px' }}>
              <h2
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: '#6b7280',
                  marginBottom: '16px',
                }}
              >
                {courseName}
              </h2>
              {dishes.map((dish, dishIdx) => (
                <div key={dishIdx} style={{ marginBottom: '16px' }}>
                  <p
                    style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      margin: '0 0 4px',
                      color: '#111',
                    }}
                  >
                    {dish.name || 'Untitled Dish'}
                    {/* Dietary labels inline */}
                    {dish.dietary_tags.length > 0 && (
                      <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                        {dish.dietary_tags
                          .map(t => DIETARY_ICONS[t.toLowerCase()] || t)
                          .join(', ')}
                      </span>
                    )}
                  </p>
                  {dish.description && (
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        fontStyle: 'italic',
                        margin: 0,
                      }}
                    >
                      {dish.description}
                    </p>
                  )}
                  {dish.allergen_flags.length > 0 && (
                    <p style={{ fontSize: '12px', color: '#991b1b', fontWeight: 600, margin: '4px 0 0' }}>
                      Contains: {dish.allergen_flags.join(', ')}
                    </p>
                  )}
                </div>
              ))}
              {/* Course divider (except last) */}
              {courseIdx < courseNames.length - 1 && (
                <div
                  style={{
                    width: '40px',
                    borderTop: '1px solid #d1d5db',
                    margin: '24px auto 0',
                  }}
                />
              )}
            </div>
          )
        })}

        {/* Footer */}
        {chefName && (
          <div style={{ marginTop: '48px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
              {chefName}
            </p>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0' }}>
              {today}
            </p>
          </div>
        )}
      </div>
    </PrintLayout>
  )
}
