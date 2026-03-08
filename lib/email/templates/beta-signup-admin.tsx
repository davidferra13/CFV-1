// Beta Signup Admin Notification
// Sent to admin when a new chef signs up for the beta
// Quick summary so admin doesn't have to check the dashboard

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type BetaSignupAdminProps = {
  name: string
  email: string
  businessName: string | null
  cuisineType: string | null
  yearsInBusiness: string | null
  referralSource: string | null
  totalSignups: number
  brand?: ChefBrandProps
}

export function BetaSignupAdminEmail({
  name,
  email,
  businessName,
  cuisineType,
  yearsInBusiness,
  referralSource,
  totalSignups,
  brand,
}: BetaSignupAdminProps) {
  return (
    <BaseLayout brand={brand} preview={`New beta signup: ${name} (${email})`}>
      <Text style={heading}>New beta signup</Text>
      <Text style={paragraph}>
        Someone just signed up for the closed beta. Total signups: <strong>{totalSignups}</strong>.
      </Text>
      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Name</td>
            <td style={detailValue}>{name}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Email</td>
            <td style={detailValue}>
              <Link href={`mailto:${email}`} style={link}>
                {email}
              </Link>
            </td>
          </tr>
          {businessName && (
            <tr>
              <td style={detailLabel}>Business</td>
              <td style={detailValue}>{businessName}</td>
            </tr>
          )}
          {cuisineType && (
            <tr>
              <td style={detailLabel}>Cuisine</td>
              <td style={detailValue}>{cuisineType}</td>
            </tr>
          )}
          {yearsInBusiness && (
            <tr>
              <td style={detailLabel}>Years</td>
              <td style={detailValue}>{yearsInBusiness}</td>
            </tr>
          )}
          {referralSource && (
            <tr>
              <td style={detailLabel}>Source</td>
              <td style={detailValue}>{referralSource}</td>
            </tr>
          )}
        </tbody>
      </table>
      <Text style={cta}>
        <Link href={`${APP_URL}/admin/beta`} style={ctaLink}>
          View in admin panel →
        </Link>
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

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
}

const detailsTable = {
  width: '100%',
  marginBottom: '24px',
  borderCollapse: 'collapse' as const,
}

const detailLabel = {
  fontSize: '13px',
  color: '#6b7280',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
  width: '100px',
}

const detailValue = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#18181b',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
}

const link = {
  color: '#e88f47',
  textDecoration: 'none',
}

const cta = {
  margin: '0',
}

const ctaLink = {
  color: '#e88f47',
  textDecoration: 'none',
  fontWeight: '600' as const,
  fontSize: '15px',
}
