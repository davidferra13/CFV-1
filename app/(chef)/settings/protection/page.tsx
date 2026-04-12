// Protection Hub - overview page showing status of all protection areas.
// Links to insurance, certifications, business health, NDA, continuity, and crisis response.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, FileCheck, Award, FileText, Layers, AlertTriangle } from '@/components/ui/icons'
import { dateToDateString } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Protection Hub' }

export default async function ProtectionHubPage() {
  const chef = await requireChef()
  const db: any = createServerClient()

  const tenantId = chef.tenantId!

  // Fetch insurance policies
  const { data: policies } = await db
    .from('chef_insurance_policies')
    .select('id, status, expiry_date')
    .eq('tenant_id', tenantId)

  // Fetch business health checklist items
  const { data: healthItems } = await db
    .from('chef_business_health_items')
    .select('id, completed')
    .eq('tenant_id', tenantId)

  // Fetch certifications
  const { data: certifications } = await db
    .from('chef_certifications')
    .select('id, status, expiry_date')
    .eq('tenant_id', tenantId)

  const safePolices = policies ?? []
  const safeHealthItems = healthItems ?? []
  const safeCerts = certifications ?? []

  // Derive summary stats
  const activePolicies = safePolices.filter((p: any) => p.status === 'active')
  const today = new Date()
  const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)

  const expiringPolicies = activePolicies.filter((p: any) => {
    if (!p.expiry_date) return false
    const exp = new Date(dateToDateString(p.expiry_date as Date | string) + 'T00:00:00')
    return exp <= in60Days && exp >= today
  })

  const completedHealthItems = safeHealthItems.filter((i: any) => i.completed).length
  const totalHealthItems = safeHealthItems.length

  const activeCerts = safeCerts.filter((c: any) => c.status === 'active')
  const expiringCerts = activeCerts.filter((c: any) => {
    if (!c.expiry_date) return false
    const exp = new Date(dateToDateString(c.expiry_date as Date | string) + 'T00:00:00')
    return exp <= in60Days && exp >= today
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Protection Hub</h1>
        <p className="mt-1 text-sm text-stone-500">
          Your business protection posture at a glance - insurance, certifications, continuity, and
          crisis preparedness.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Business Health */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Business Health</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {totalHealthItems > 0 ? (
                <Badge variant={completedHealthItems === totalHealthItems ? 'success' : 'warning'}>
                  {completedHealthItems}/{totalHealthItems} complete
                </Badge>
              ) : (
                <Badge variant="default">Not started</Badge>
              )}
            </div>
            <p className="text-xs text-stone-500">
              Legal structure, contracts, liability foundations, and operational safeguards.
            </p>
            <Link
              href="/settings/protection/business-health"
              className="inline-flex items-center text-sm font-medium text-amber-700 hover:text-amber-900"
            >
              Manage →
            </Link>
          </CardContent>
        </Card>

        {/* Insurance */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Insurance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default">{activePolicies.length} active</Badge>
              {expiringPolicies.length > 0 && (
                <Badge variant="warning">{expiringPolicies.length} expiring soon</Badge>
              )}
            </div>
            <p className="text-xs text-stone-500">
              General liability, food contamination, workers&apos; comp, and umbrella coverage.
            </p>
            <Link
              href="/settings/protection/insurance"
              className="inline-flex items-center text-sm font-medium text-amber-700 hover:text-amber-900"
            >
              Manage →
            </Link>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Certifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default">{activeCerts.length} active</Badge>
              {expiringCerts.length > 0 && (
                <Badge variant="warning">{expiringCerts.length} expiring soon</Badge>
              )}
            </div>
            <p className="text-xs text-stone-500">
              Food safety certifications, allergen training, and professional credentials.
            </p>
            <Link
              href="/settings/protection/certifications"
              className="inline-flex items-center text-sm font-medium text-amber-700 hover:text-amber-900"
            >
              Manage →
            </Link>
          </CardContent>
        </Card>

        {/* NDA & Permissions */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">NDA &amp; Permissions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="info">Per-client</Badge>
            </div>
            <p className="text-xs text-stone-500">
              Non-disclosure agreements and photo permissions are managed per client on their
              profile.
            </p>
            <Link
              href="/settings/protection/nda"
              className="inline-flex items-center text-sm font-medium text-amber-700 hover:text-amber-900"
            >
              Manage →
            </Link>
          </CardContent>
        </Card>

        {/* Business Continuity */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Business Continuity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="default">Plan</Badge>
            </div>
            <p className="text-xs text-stone-500">
              Document your plan for handling extended incapacitation, data handoff, and client
              communication.
            </p>
            <Link
              href="/settings/protection/continuity"
              className="inline-flex items-center text-sm font-medium text-amber-700 hover:text-amber-900"
            >
              Manage →
            </Link>
          </CardContent>
        </Card>

        {/* Crisis Response */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Crisis Response</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="default">Playbook</Badge>
            </div>
            <p className="text-xs text-stone-500">
              Step-by-step playbook for food safety incidents, client complaints, and PR crises.
            </p>
            <Link
              href="/settings/protection/crisis"
              className="inline-flex items-center text-sm font-medium text-amber-700 hover:text-amber-900"
            >
              Manage →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
