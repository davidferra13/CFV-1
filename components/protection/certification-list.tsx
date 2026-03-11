'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Certification = {
  id: string
  name?: string
  cert_name?: string
  issuing_body?: string
  status?: string
  expiry_date?: string | null
  created_at?: string
  document_url?: string | null
}

function statusVariant(status?: string): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'active':
      return 'success'
    case 'expiring_soon':
      return 'warning'
    case 'expired':
      return 'error'
    default:
      return 'default'
  }
}

export function CertificationList({ certs }: { certs: Certification[] }) {
  if (certs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-stone-400">
          <p className="text-sm">No certifications recorded yet.</p>
          <p className="text-xs mt-1">
            Add your food safety, allergen training, and professional certifications here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {certs.map((cert) => (
        <Card key={cert.id}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-100">
                  {cert.cert_name ?? cert.name ?? 'Untitled certification'}
                </p>
                {cert.issuing_body && (
                  <p className="text-xs text-stone-500 mt-0.5">{cert.issuing_body}</p>
                )}
                {cert.expiry_date && (
                  <p className="text-xs text-stone-400 mt-1">
                    Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                  </p>
                )}
                {cert.document_url && (
                  <a
                    href={cert.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-amber-200 underline underline-offset-2"
                  >
                    View document
                  </a>
                )}
              </div>
              {cert.status && (
                <Badge variant={statusVariant(cert.status)}>{cert.status.replace(/_/g, ' ')}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
