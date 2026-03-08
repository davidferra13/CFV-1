// Recipe Share — Chef-to-Chef Email
// Sent to a chef when another chef shares a recipe with them.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type Props = {
  chefName: string // Recipient chef's display name
  sharerName: string // The chef who shared the recipe
  recipeName: string // Name of the recipe being shared
  category: string | null // Recipe category (optional)
  note: string | null // Optional message from sharer
  dashboardUrl: string // Link to dashboard where they can accept
}

export function RecipeShareEmail({
  chefName,
  sharerName,
  recipeName,
  category,
  note,
  dashboardUrl,
}: Props) {
  return (
    <BaseLayout brand={brand} preview={`${sharerName} shared a recipe with you: ${recipeName}`}>
      <Text style={heading}>A chef shared a recipe with you</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        <strong>{sharerName}</strong> has shared one of their recipes with you via ChefFlow. If you
        accept, an independent editable copy will be added to your recipe library.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Recipe</td>
            <td style={detailValue}>{recipeName}</td>
          </tr>
          {category && (
            <tr>
              <td style={detailLabel}>Category</td>
              <td style={detailValue}>{category}</td>
            </tr>
          )}
          <tr>
            <td style={detailLabel}>From</td>
            <td style={detailValue}>{sharerName}</td>
          </tr>
        </tbody>
      </table>

      {note && <Text style={noteBox}>&ldquo;{note}&rdquo;</Text>}

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={dashboardUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#78350f',
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          View &amp; Accept Recipe
        </Link>
      </div>

      <Text style={muted}>
        Accepting creates a fully independent copy in your recipe library — you can edit it freely
        without affecting the original. You can also decline if it&apos;s not a fit.
      </Text>
    </BaseLayout>
  )
}

const heading = {
  fontSize: '24px',
  fontWeight: '600' as const,
  color: '#18181b',
  margin: '0 0 16px',
}
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 16px' }
const detailsTable = { width: '100%', marginBottom: '24px', borderCollapse: 'collapse' as const }
const detailLabel = {
  fontSize: '13px',
  color: '#6b7280',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
  width: '140px',
}
const detailValue = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#18181b',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
}
const noteBox = {
  fontSize: '14px',
  color: '#57534e',
  fontStyle: 'italic',
  backgroundColor: '#fafaf9',
  border: '1px solid #e7e5e4',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '0 0 20px',
}
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
