// Food Safety & Compliance Page
// Chef manages certifications (ServSafe, food handler cards, licenses)
// with expiry tracking and color-coded urgency indicators.

import type { Metadata } from 'next'
import Link from 'next/link'
import { PermitChecklistPanel } from '@/components/ai/permit-checklist-panel'
import { requireChef } from '@/lib/auth/get-user'
import { listCertifications, getExpiringCertifications } from '@/lib/compliance/actions'
import { getChefArchetype } from '@/lib/archetypes/actions'

// Pure utility - keeps compliance/actions.ts free of sync exports under 'use server'
function certExpiryStatus(expiryDate: Date | string | null | undefined) {
  if (!expiryDate) return { daysRemaining: null, tier: 'none' as const }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(dateToDateString(expiryDate as Date | string) + 'T00:00:00')
  const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const tier =
    daysRemaining < 0
      ? 'expired'
      : daysRemaining <= 14
        ? 'critical'
        : daysRemaining <= 60
          ? 'warning'
          : 'ok'
  return { daysRemaining, tier } as {
    daysRemaining: number
    tier: 'ok' | 'warning' | 'critical' | 'expired'
  }
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { CertForm } from './cert-form'
import { PermitForm, PermitList } from './permit-form'
import { listPermits, getExpiringPermits } from '@/lib/compliance/permit-actions'
import { dateToDateString } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Compliance' }

const CERT_LABELS: Record<string, string> = {
  food_handler: 'Food Handler Card',
  servsafe_manager: 'ServSafe Manager',
  allergen_awareness: 'Allergen Awareness',
  llc: 'LLC Formation',
  business_license: 'Business License',
  liability_insurance: 'Liability Insurance',
  cottage_food: 'Cottage Food Permit',
  other: 'Other',
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return <Badge variant="default">No expiry</Badge>

  const { daysRemaining, tier } = certExpiryStatus(expiryDate)

  if (tier === 'expired') return <Badge variant="error">Expired</Badge>
  if (tier === 'critical') return <Badge variant="error">{daysRemaining}d left</Badge>
  if (tier === 'warning') return <Badge variant="warning">{daysRemaining}d left</Badge>
  return <Badge variant="success">{daysRemaining}d left</Badge>
}

export default async function CompliancePage() {
  await requireChef()

  const [certs, expiring, archetype, permits, expiringPermits] = await Promise.all([
    listCertifications(),
    getExpiringCertifications(60),
    getChefArchetype(),
    listPermits(),
    getExpiringPermits(60),
  ])

  const activeCerts = certs.filter((c: any) => c.status === 'active')
  const otherCerts = certs.filter((c: any) => c.status !== 'active')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Food Safety & Compliance</h1>
        <p className="mt-1 text-sm text-stone-500">
          Track certifications, licenses, and insurance with expiry reminders.
        </p>
      </div>

      {/* HACCP Plan */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-stone-100">HACCP Plan</h2>
              <p className="text-sm text-stone-400 mt-0.5">
                {archetype
                  ? 'Your food safety plan is ready - auto-generated for your business type.'
                  : 'Select your business type in Settings to generate your HACCP plan.'}
              </p>
            </div>
            <Link href="/settings/compliance/haccp">
              <Button variant="secondary">View Plan</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Permit expiry alerts */}
      {expiringPermits.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-950 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            {expiringPermits.length} permit{expiringPermits.length > 1 ? 's' : ''} expiring within
            60 days
          </p>
          <ul className="mt-1 space-y-0.5">
            {expiringPermits.map((p: any) => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const expiry = new Date(
                dateToDateString(p.expiry_date as Date | string) + 'T00:00:00'
              )
              const daysRemaining = Math.ceil(
                (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              )
              return (
                <li key={p.id} className="text-sm text-amber-800">
                  {p.name} - {daysRemaining}d remaining (
                  {format(
                    new Date(dateToDateString(p.expiry_date as Date | string) + 'T00:00:00'),
                    'MMM d, yyyy'
                  )}
                  )
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Certification expiry alerts */}
      {expiring.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-950 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            {expiring.length} certification{expiring.length > 1 ? 's' : ''} expiring within 60 days
          </p>
          <ul className="mt-1 space-y-0.5">
            {expiring.map((c: any) => {
              const { daysRemaining } = certExpiryStatus(c.expiry_date)
              return (
                <li key={c.id} className="text-sm text-amber-800">
                  {c.name} - {daysRemaining}d remaining (
                  {format(
                    new Date(dateToDateString(c.expiry_date! as Date | string) + 'T00:00:00'),
                    'MMM d, yyyy'
                  )}
                  )
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Active certs */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-stone-100">Active</h2>
        {activeCerts.length === 0 ? (
          <p className="text-sm text-stone-500">No active certifications on file.</p>
        ) : (
          activeCerts.map((cert: any) => (
            <Card key={cert.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-100">{cert.name}</span>
                      <Badge variant="default">
                        {CERT_LABELS[cert.cert_type] ?? cert.cert_type}
                      </Badge>
                      <ExpiryBadge expiryDate={cert.expiry_date} />
                    </div>
                    {cert.issuing_body && (
                      <p className="mt-0.5 text-sm text-stone-400">{cert.issuing_body}</p>
                    )}
                    <div className="mt-0.5 flex gap-3 text-xs text-stone-400 flex-wrap">
                      {cert.issued_date && (
                        <span>
                          Issued{' '}
                          {format(
                            new Date(
                              dateToDateString(cert.issued_date as Date | string) + 'T00:00:00'
                            ),
                            'MMM d, yyyy'
                          )}
                        </span>
                      )}
                      {cert.expiry_date && (
                        <span>
                          Expires{' '}
                          {format(
                            new Date(
                              dateToDateString(cert.expiry_date as Date | string) + 'T00:00:00'
                            ),
                            'MMM d, yyyy'
                          )}
                        </span>
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
          <h2 className="text-base font-semibold text-stone-100">Expired / Pending Renewal</h2>
          {otherCerts.map((cert: any) => (
            <Card key={cert.id} className="opacity-70">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-stone-300">{cert.name}</span>
                  <Badge variant="default">{CERT_LABELS[cert.cert_type] ?? cert.cert_type}</Badge>
                  <Badge variant={cert.status === 'expired' ? 'error' : 'warning'}>
                    {cert.status === 'expired' ? 'Expired' : 'Pending renewal'}
                  </Badge>
                  {cert.expiry_date && (
                    <span className="text-xs text-stone-400">
                      {format(
                        new Date(dateToDateString(cert.expiry_date as Date | string) + 'T00:00:00'),
                        'MMM d, yyyy'
                      )}
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

      {/* Permits & Licenses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-100">Permits &amp; Licenses</h2>
        </div>
        <p className="text-xs text-stone-500">
          Health permits, business licenses, fire permits, mobile food unit permits, and other
          government-issued documents with expiry dates.
        </p>
        <PermitList permits={permits} />
        <PermitForm />
      </div>

      {/* AI Permit Renewal Checklist */}
      <PermitChecklistPanel />
    </div>
  )
}
