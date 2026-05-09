'use client'

import { useRouter } from 'next/navigation'
import type { FOHMenuData, FOHCourse } from '@/lib/menus/foh-menu-data'
import type { FOHMenuOptions } from '@/lib/menus/foh-menu-options'
import { defaultFOHMenuOptions } from '@/lib/menus/foh-menu-options'

// ---------------------------------------------------------------------------
// Front-of-House Menu
// Print-first, client-facing menu presentation. Inline styles throughout
// the menu body so print output is self-contained (no Tailwind dependency).
// ---------------------------------------------------------------------------

const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif"

// -- tiny helpers -----------------------------------------------------------

function DietaryBadges({ tags }: { tags: string[] }) {
  if (!tags.length) return null
  const abbrev: Record<string, string> = {
    vegan: 'VN',
    vegetarian: 'V',
    'gluten-free': 'GF',
    'dairy-free': 'DF',
    'nut-free': 'NF',
    pescatarian: 'PSC',
    halal: 'H',
    kosher: 'K',
  }
  return (
    <div style={{ marginTop: 6, textAlign: 'center' }}>
      {tags.map((t) => (
        <span
          key={t}
          style={{
            display: 'inline-block',
            fontFamily: SANS,
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#aaa',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            padding: '1px 6px',
            marginRight: 6,
            marginBottom: 2,
          }}
        >
          {abbrev[t.toLowerCase()] ?? t}
        </span>
      ))}
    </div>
  )
}

function CourseBlock({
  course,
  isLast,
  options,
}: {
  course: FOHCourse
  isLast: boolean
  options: FOHMenuOptions
}) {
  return (
    <div style={{ marginBottom: isLast ? 0 : 32 }}>
      {/* Course label */}
      <div
        style={{
          fontFamily: SANS,
          fontSize: 12,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#9a9a9a',
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {options.showCourseNumbers ? `${course.number}. ${course.label}` : course.label}
      </div>

      {/* Dish name (only if it differs from course label) */}
      {course.dishName && course.dishName.toLowerCase() !== course.label.toLowerCase() && (
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 20,
            fontWeight: 'normal',
            textAlign: 'center',
            color: '#1a1a1a',
            lineHeight: 1.35,
            marginBottom: 4,
          }}
        >
          {course.dishName}
        </div>
      )}

      {/* Description */}
      {course.description && (
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 14,
            fontStyle: 'italic',
            color: '#666',
            textAlign: 'center',
            lineHeight: 1.55,
            maxWidth: 480,
            margin: '0 auto',
          }}
        >
          {course.description}
        </div>
      )}

      {/* Dietary badges */}
      {options.showDietaryBadges && <DietaryBadges tags={course.dietaryTags} />}

      {/* Beverage pairing */}
      {options.showBeveragePairings && course.beveragePairing && (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#999',
            textAlign: 'center',
            marginTop: 10,
          }}
        >
          {course.beveragePairing}
        </div>
      )}

      {/* Divider between courses */}
      {!isLast && (
        <div
          style={{
            width: 40,
            height: 1,
            background: '#ddd',
            margin: '28px auto 0',
          }}
        />
      )}
    </div>
  )
}

// -- separator line ---------------------------------------------------------

function HRule({ width = '100%' }: { width?: string | number }) {
  return (
    <div
      style={{
        width,
        height: 1,
        background: '#ddd',
        margin: '0 auto',
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function FrontOfHouseMenu({
  data,
  showControls = true,
  options: optionsProp,
}: {
  data: FOHMenuData
  showControls?: boolean
  options?: Partial<FOHMenuOptions>
}) {
  const router = useRouter()
  const options: FOHMenuOptions = { ...defaultFOHMenuOptions, ...optionsProp }

  const handlePrint = () => window.print()
  const handleBack = () => router.back()

  const hasCourses = data.courses.length > 0

  return (
    <>
      {/* Print styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  .foh-controls { display: none !important; }
  .foh-menu-body {
    max-width: none !important;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
  }
  .foh-menu-wrapper {
    background: white !important;
    min-height: auto !important;
    padding: 0 !important;
  }
  @page {
    margin: 0.75in;
    size: letter;
  }
  body { background: white !important; }
}
`,
        }}
      />

      {/* Control bar (screen only) */}
      {showControls && (
        <div className="foh-controls flex items-center justify-between px-4 py-3 border-b bg-white/80 backdrop-blur sticky top-0 z-10">
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            &larr; Back
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="text-sm font-medium bg-neutral-900 text-white px-4 py-1.5 rounded hover:bg-neutral-700 transition-colors"
          >
            Print Menu
          </button>
        </div>
      )}

      {/* Wrapper: centers the paper and adds background texture */}
      <div
        className="foh-menu-wrapper"
        style={{
          minHeight: '100vh',
          background: '#f5f3ef',
          padding: '48px 16px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {/* The printable menu body */}
        <div
          className="foh-menu-body"
          style={{
            maxWidth: 650,
            width: '100%',
            background: '#fff',
            padding: '64px 56px',
            boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
            alignSelf: 'flex-start',
          }}
        >
          {/* ----- Chef Attribution ----- */}
          {options.showChefAttribution && data.chefName && (
            <div
              style={{
                fontFamily: SANS,
                fontSize: 11,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#aaa',
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              by {data.chefName}
            </div>
          )}

          {/* ----- Title ----- */}
          <h1
            style={{
              fontFamily: SERIF,
              fontSize: data.title.length < 24 ? 34 : 28,
              fontWeight: 'normal',
              textAlign: 'center',
              color: '#1a1a1a',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {data.title}
          </h1>

          {/* ----- Subtitle ----- */}
          {data.subtitle && (
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 17,
                fontStyle: 'italic',
                color: '#666',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              {data.subtitle}
            </div>
          )}

          {/* ----- Client name ----- */}
          {data.clientName && (
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 15,
                fontStyle: 'italic',
                color: '#888',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              for {data.clientName}
            </div>
          )}

          {/* ----- Date ----- */}
          {options.showDate && data.date && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 13,
                  color: '#999',
                  letterSpacing: '0.05em',
                }}
              >
                {data.date}
              </div>
            </div>
          )}

          {/* ----- Service style ----- */}
          {data.serviceStyle && (
            <div
              style={{
                fontFamily: SANS,
                fontSize: 12,
                color: '#bbb',
                textAlign: 'center',
                marginTop: 6,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {data.serviceStyle}
            </div>
          )}

          {/* ----- Decorative separator ----- */}
          <div style={{ margin: '28px 0 36px' }}>
            <HRule width={80} />
          </div>

          {/* ----- Courses ----- */}
          {hasCourses ? (
            <div>
              {data.courses.map((course, i) => (
                <CourseBlock
                  key={`${course.number}-${course.label}`}
                  course={course}
                  isLast={i === data.courses.length - 1}
                  options={options}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 16,
                fontStyle: 'italic',
                color: '#bbb',
                textAlign: 'center',
                padding: '48px 0',
              }}
            >
              Menu courses are being prepared
            </div>
          )}

          {/* ----- Footer ----- */}
          <div style={{ marginTop: 44 }}>
            <HRule />

            {/* Tagline or footer note */}
            {(options.footerNote || data.tagline || data.footerNote) && (
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: '#bbb',
                  textAlign: 'center',
                  marginTop: 20,
                  lineHeight: 1.5,
                }}
              >
                {options.footerNote ?? data.footerNote ?? data.tagline}
              </div>
            )}

            {/* Allergy disclaimer */}
            {options.showAllergyDisclaimer && (
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 12,
                  color: '#bbb',
                  textAlign: 'center',
                  marginTop: 16,
                }}
              >
                Please inform your chef of any food allergies
              </div>
            )}

            {/* ChefFlow attribution */}
            <div
              style={{
                fontFamily: SANS,
                fontSize: 9,
                color: '#ddd',
                textAlign: 'center',
                marginTop: 20,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Prepared with ChefFlow
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
