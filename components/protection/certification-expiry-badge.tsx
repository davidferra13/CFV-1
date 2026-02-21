'use client'

import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface CertificationExpiryBadgeProps {
  expiryDate: string | null
  isActive: boolean
}

export function CertificationExpiryBadge({ expiryDate, isActive }: CertificationExpiryBadgeProps) {
  if (!isActive) {
    return <Badge variant="default">Inactive</Badge>
  }

  if (!expiryDate) {
    return <Badge variant="info">No Expiry</Badge>
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  const diffMs = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const formatted = format(expiry, 'MMM d, yyyy')

  if (diffDays < 0) {
    return <Badge variant="error">Expired</Badge>
  }

  if (diffDays <= 30) {
    return <Badge variant="warning">Expires Soon</Badge>
  }

  if (diffDays <= 90) {
    return <Badge variant="warning">Expires {formatted}</Badge>
  }

  return <Badge variant="success">Valid until {formatted}</Badge>
}
