// FOH Menu Email - Renders the front-of-house menu inline in the email body
// Table-based layout with inline styles for Gmail/Outlook/Apple Mail compatibility

import { Button, Hr, Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'
import type { FOHMenuData, FOHCourse } from '@/lib/menus/foh-menu-data'

type FOHMenuEmailProps = {
  data: FOHMenuData
  publicMenuUrl: string
  chefBusinessName?: string
}

/**
 * Generate a subject line for the menu email.
 * Pattern: "[Title] from [ChefName]"
 * Avoids doubling "Menu" if the title already contains it.
 */
export function getMenuEmailSubject(data: FOHMenuData): string {
  const chef = data.chefName || 'Your Chef'
  const title = data.title || 'Your Menu'
  // If title already contains "menu" (case-insensitive), skip appending "Menu"
  const hasMenu = /menu/i.test(title)
  if (hasMenu) {
    return `${title} from ${chef}`
  }
  return `${title} from ${chef}`
}

export function FOHMenuEmail({ data, publicMenuUrl, chefBusinessName }: FOHMenuEmailProps) {
  const chefLabel = chefBusinessName || data.chefName || 'Your Chef'
  const preview = data.date
    ? `${data.title} on ${data.date} by ${chefLabel}`
    : `${data.title} by ${chefLabel}`

  return (
    <BaseLayout preview={preview}>
      {/* Menu Header */}
      <table style={menuHeaderTable}>
        <tbody>
          <tr>
            <td style={menuHeaderCell}>
              <Text style={menuTitle}>{data.title}</Text>
              {data.subtitle && <Text style={menuSubtitle}>{data.subtitle}</Text>}
              {data.date && <Text style={menuDate}>{data.date}</Text>}
              {data.serviceStyle && <Text style={menuServiceStyle}>{data.serviceStyle}</Text>}
            </td>
          </tr>
        </tbody>
      </table>

      <Hr style={divider} />

      {/* Courses */}
      <table style={coursesTable}>
        <tbody>
          {data.courses.map((course, idx) => (
            <React.Fragment key={idx}>
              <CourseRow course={course} />
              {idx < data.courses.length - 1 && (
                <tr>
                  <td style={courseDividerCell}>
                    <Hr style={courseDivider} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <Hr style={divider} />

      {/* View Full Menu CTA */}
      <table style={ctaTable}>
        <tbody>
          <tr>
            <td style={ctaCell}>
              <Button href={publicMenuUrl} style={ctaButton}>
                View Full Menu
              </Button>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Allergy Disclaimer */}
      <table style={disclaimerTable}>
        <tbody>
          <tr>
            <td style={disclaimerCell}>
              <Text style={disclaimerText}>
                Please inform your chef of any allergies or dietary restrictions before the event.
                While every effort is made to accommodate dietary needs, cross-contamination may
                occur in a shared kitchen environment.
              </Text>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Chef Attribution Footer */}
      <table style={attributionTable}>
        <tbody>
          <tr>
            <td style={attributionCell}>
              <Text style={attributionName}>{chefLabel}</Text>
              {data.tagline && <Text style={attributionTagline}>{data.tagline}</Text>}
            </td>
          </tr>
        </tbody>
      </table>

      <Text style={footerMuted}>
        You are receiving this because a menu was shared with you. If you believe this was sent in
        error, please contact your chef directly.
      </Text>
    </BaseLayout>
  )
}

function CourseRow({ course }: { course: FOHCourse }) {
  const dietaryText = course.dietaryTags.length > 0 ? course.dietaryTags.join(', ') : null

  return (
    <tr>
      <td style={courseCell}>
        <Text style={courseLabel}>{course.label}</Text>
        {course.dishName && <Text style={courseDishName}>{course.dishName}</Text>}
        {course.description && <Text style={courseDescription}>{course.description}</Text>}
        {dietaryText && <Text style={courseDietary}>{dietaryText}</Text>}
        {course.beveragePairing && (
          <Text style={coursePairing}>Paired with: {course.beveragePairing}</Text>
        )}
      </td>
    </tr>
  )
}

// ── Inline Styles (email-safe) ──

const menuHeaderTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
}

const menuHeaderCell: React.CSSProperties = {
  textAlign: 'center',
  padding: '8px 0 16px',
}

const menuTitle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#18181b',
  margin: '0 0 4px',
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
}

const menuSubtitle: React.CSSProperties = {
  fontSize: '16px',
  color: '#6b7280',
  margin: '0 0 4px',
  fontStyle: 'italic',
}

const menuDate: React.CSSProperties = {
  fontSize: '14px',
  color: '#9ca3af',
  margin: '0 0 4px',
}

const menuServiceStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
  textTransform: 'uppercase',
  letterSpacing: '1px',
}

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
}

const coursesTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
}

const courseCell: React.CSSProperties = {
  padding: '12px 0',
}

const courseDividerCell: React.CSSProperties = {
  padding: '0',
}

const courseDivider: React.CSSProperties = {
  borderColor: '#f3f4f6',
  margin: '0',
}

const courseLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  margin: '0 0 4px',
}

const courseDishName: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#18181b',
  margin: '0 0 4px',
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
}

const courseDescription: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 4px',
  lineHeight: '1.5',
}

const courseDietary: React.CSSProperties = {
  fontSize: '12px',
  color: '#78350f',
  margin: '4px 0 0',
  fontStyle: 'italic',
}

const coursePairing: React.CSSProperties = {
  fontSize: '13px',
  color: '#7c3aed',
  margin: '4px 0 0',
  fontStyle: 'italic',
}

const ctaTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
}

const ctaCell: React.CSSProperties = {
  textAlign: 'center',
  padding: '8px 0 24px',
}

const ctaButton: React.CSSProperties = {
  backgroundColor: '#18181b',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '6px',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
}

const disclaimerTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
}

const disclaimerCell: React.CSSProperties = {
  padding: '0 0 16px',
}

const disclaimerText: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0',
  lineHeight: '1.5',
  textAlign: 'center',
}

const attributionTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
}

const attributionCell: React.CSSProperties = {
  textAlign: 'center',
  padding: '0 0 16px',
}

const attributionName: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#374151',
  margin: '0 0 2px',
}

const attributionTagline: React.CSSProperties = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
  fontStyle: 'italic',
}

const footerMuted: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0',
  textAlign: 'center',
}
