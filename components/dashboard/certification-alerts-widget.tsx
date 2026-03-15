'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, Award } from '@/components/ui/icons'
import { getExpiringCertifications } from '@/lib/compliance/certification-actions'
import type { Certification } from '@/lib/compliance/certification-actions'
import Link from 'next/link'

function daysUntilExpiry(expiresAt: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiresAt + 'T00:00:00')
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function CertificationAlertsWidget() {
  const [certs, setCerts] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    getExpiringCertifications(60)
      .then((data) => setCerts(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  // Only show if there are alerts
  if (loading) return null
  if (error) return null
  if (certs.length === 0) return null

  const expired = certs.filter((c) => c.status === 'expired')
  const expiring = certs.filter((c) => c.status === 'expiring_soon')

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-base">Certification Alerts</CardTitle>
          {expired.length > 0 && <Badge variant="error">{expired.length} expired</Badge>}
          {expiring.length > 0 && <Badge variant="warning">{expiring.length} expiring</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {expired.map((cert) => (
          <div
            key={cert.id}
            className="flex items-center justify-between gap-2 rounded-md bg-red-900/20 border border-red-800/40 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-red-300 truncate">{cert.name}</p>
              <p className="text-xs text-red-400">
                Expired{' '}
                {cert.expires_at
                  ? new Date(cert.expires_at + 'T00:00:00').toLocaleDateString()
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <Link
                href="/settings/protection/certifications"
                className="text-xs font-medium text-red-300 hover:text-red-200 underline"
              >
                Renew
              </Link>
            </div>
          </div>
        ))}

        {expiring.map((cert) => {
          const days = cert.expires_at ? daysUntilExpiry(cert.expires_at) : 0
          return (
            <div
              key={cert.id}
              className="flex items-center justify-between gap-2 rounded-md bg-amber-900/20 border border-amber-800/40 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-300 truncate">{cert.name}</p>
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {days} day{days !== 1 ? 's' : ''} remaining
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href="/settings/protection/certifications"
                  className="text-xs font-medium text-amber-300 hover:text-amber-200 underline"
                >
                  Renew
                </Link>
              </div>
            </div>
          )
        })}

        <div className="pt-1">
          <Link
            href="/settings/protection/certifications"
            className="text-xs font-medium text-stone-400 hover:text-stone-300"
          >
            View all certifications
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
