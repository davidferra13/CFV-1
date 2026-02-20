// Food Safety & Compliance Page
// Chef manages certifications (ServSafe, food handler cards, licenses)
// with expiry tracking and color-coded urgency indicators.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  listCertifications,
  getExpiringCertifications,
} from '@/lib/compliance/actions'

// Pure utility — keeps compliance/actions.ts free of sync exports under 'use server'
function certExpiryStatus(expiryDate: string | null | undefined) {
  if (!expiryDate) return { daysRemaining: null, tier: 'none' as const }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate + 'T00:00:00')
  const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const tier = daysRemaining < 0 ? 'expired' : daysRemaining <= 14 ? 'critical' : daysRemaining <= 60 ? 'warning' : 'ok'
  return { daysRemaining, tier } as { daysRemaining: number; tier: 'ok' | 'warning' | 'critical' | 'expired' }
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { CertForm } from './cert-form'

export const metadata: Metadata = { title: 'Compliance — ChefFlow' }

const CERT_LABELS: Record<string, string> = {
  food_handler:        'Food Handler Card',
  servsafe_manager:    'ServSafe Manager',
  allergen_awareness:  'Allergen Awareness',
  llc:                 'LLC Formation',
  business_license:    'Business License',
  liability_insurance: 'Liability Insurance',
  cottage_food:        'Cottage Food Permit',
  other:               'Other',
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return <Badge variant="default">No expiry</Badge>

  const { daysRemaining, tier } = certExpiryStatus(expiryDate)

  if (tier === 'expired')  return <Badge variant="error">Expired</Badge>
  if (tier === 'critical') return <Badge variant="error">{daysRemaining}d left</Badge>
  if (tier === 'warning')  return <Badge variant="warning">{daysRemaining}d left</Badge>
  return <Badge variant="success">{daysRemaining}d left</Badge>
}

export default async function CompliancePage() {
  await requireChef()

  const [certs, expiring] = await Promise.all([
    listCertifications(),
    getExpiringCertifications(60),
  ])

  const activeCerts  = certs.filter((c: any) => c.status === 'active')
  const otherCerts   = certs.filter((c: any) => c.status !== 'active')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Food Safety & Compliance</h1>
        <p className="mt-1 text-sm text-stone-500">
          Track certifications, licenses, and insurance with expiry reminders.
        </p>
      </div>

      {/* Expiry alerts */}
      {expiring.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            {expiring.length} certification{expiring.length > 1 ? 's' : ''} expiring within 60 days
          </p>
          <ul className="mt-1 space-y-0.5">
            {expiring.map((c: any) => {
              const { daysRemaining } = certExpiryStatus(c.expiry_date)
              return (
                <li key={c.id} className="text-sm text-amber-800">
                  {c.name} — {daysRemaining}d remaining ({format(new Date(c.expiry_date! + 'T00:00:00'), 'MMM d, yyyy')})
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Active certs */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">Active</h2>
        {activeCerts.length === 0 ? (
          <p className="text-sm text-stone-500">No active certifications on file.</p>
        ) : (
          activeCerts.map((cert: any) => (
            <Card key={cert.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-900">{cert.name}</span>
                      <Badge variant="default">{CERT_LABELS[cert.cert_type] ?? cert.cert_type}</Badge>
                      <ExpiryBadge expiryDate={cert.expiry_date} />
                    </div>
                    {cert.issuing_body && (
                      <p className="mt-0.5 text-sm text-stone-600">{cert.issuing_body}</p>
                    )}
                    <div className="mt-0.5 flex gap-3 text-xs text-stone-400 flex-wrap">
                      {cert.issued_date && (
                        <span>Issued {format(new Date(cert.issued_date + 'T00:00:00'), 'MMM d, yyyy')}</span>
                      )}
                      {cert.expiry_date && (
                        <span>Expires {format(new Date(cert.expiry_date + 'T00:00:00'), 'MMM d, yyyy')}</span>
                      )}
                      {cert.cert_number && <span>#{cert.cert_number}</span>}
                    </div>
                    {cert.document_url && (
                      <a
                        href={cert.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-xs text-amber-700 underline"
                      >
                        View document
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Expired / pending */}
      {otherCerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-stone-900">Expired / Pending Renewal</h2>
          {otherCerts.map((cert: any) => (
            <Card key={cert.id} className="opacity-70">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-stone-700">{cert.name}</span>
                  <Badge variant="default">{CERT_LABELS[cert.cert_type] ?? cert.cert_type}</Badge>
                  <Badge variant={cert.status === 'expired' ? 'error' : 'warning'}>
                    {cert.status === 'expired' ? 'Expired' : 'Pending renewal'}
                  </Badge>
                  {cert.expiry_date && (
                    <span className="text-xs text-stone-400">
                      {format(new Date(cert.expiry_date + 'T00:00:00'), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add new */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Certification</CardTitle>
        </CardHeader>
        <CardContent>
          <CertForm />
        </CardContent>
      </Card>
    </div>
  )
}
