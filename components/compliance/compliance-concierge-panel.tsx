import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createComplianceProofVaultItem,
  saveComplianceProfile,
  type ComplianceCenterState,
} from '@/lib/compliance/compliance-concierge-actions'
import { COMPLIANCE_NON_LEGAL_ADVICE_DISCLAIMER } from '@/lib/compliance/compliance-concierge'

const CATEGORY_LABELS: Record<string, string> = {
  license: 'License',
  insurance: 'Insurance',
  permit: 'Permit',
  food_safety: 'Food safety',
  allergen: 'Allergen',
  alcohol: 'Alcohol',
  cannabis: 'Cannabis',
  staff_vendor: 'Staff/vendor',
  venue: 'Venue',
  other: 'Other',
}

const VISIBILITY_LABELS: Record<string, string> = {
  private_only: 'Private only',
  chef_internal: 'Chef internal',
  client_safe: 'Client safe',
  public_profile: 'Public profile',
  requires_evidence: 'Requires evidence',
  expired: 'Expired',
  never_publish: 'Never publish',
}

function statusVariant(status: string) {
  if (status === 'active') return 'success'
  if (status === 'expiring_soon') return 'warning'
  if (status === 'expired' || status === 'missing') return 'error'
  return 'default'
}

export function ComplianceConciergePanel({ state }: { state: ComplianceCenterState }) {
  const flags = state.profile?.regulated_service_flags ?? {}

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Compliance Concierge</h2>
          <p className="text-sm text-stone-500">
            Chef-owned proof vault, event risk readiness, and public-safe credential filtering.
          </p>
        </div>
        <Link href="/settings/compliance/haccp">
          <Button variant="secondary" size="sm">
            Open HACCP
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-stone-500">Proof records</p>
            <p className="mt-1 text-2xl font-semibold text-stone-100">{state.credentials.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-stone-500">Expiring soon</p>
            <p className="mt-1 text-2xl font-semibold text-amber-300">{state.expiringCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-stone-500">Expired</p>
            <p className="mt-1 text-2xl font-semibold text-red-300">{state.expiredCount}</p>
          </CardContent>
        </Card>
      </div>

      {state.missingCoreCategories.length > 0 && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-4">
          <p className="text-sm font-medium text-red-200">Core proof missing</p>
          <p className="mt-1 text-sm text-red-200/80">
            Add current{' '}
            {state.missingCoreCategories.map((item) => CATEGORY_LABELS[item]).join(', ')} proof
            before treating high-risk event readiness as clear.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveComplianceProfile} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-stone-400">Default jurisdiction</span>
              <input
                name="default_jurisdiction"
                defaultValue={state.profile?.default_jurisdiction ?? ''}
                placeholder="State, county, or city"
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-stone-400">Private notes</span>
              <textarea
                name="private_notes"
                defaultValue={state.profile?.private_notes ?? ''}
                rows={3}
                className="w-full resize-none rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
              {[
                ['alcohol_service', 'Alcohol service'],
                ['cannabis_service', 'Cannabis service'],
                ['public_events', 'Public events'],
                ['staff_or_vendor_service', 'Staff/vendor involvement'],
              ].map(([name, label]) => (
                <label key={name} className="flex items-center gap-2 text-sm text-stone-300">
                  <input
                    type="checkbox"
                    name={name}
                    defaultChecked={Boolean(flags[name])}
                    className="rounded border-stone-600"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm">
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proof Vault</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.credentials.length === 0 ? (
            <p className="text-sm text-stone-500">No compliance proof on file.</p>
          ) : (
            <div className="grid gap-2">
              {state.credentials.slice(0, 8).map((credential) => (
                <div
                  key={`${credential.category}-${credential.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-stone-800 bg-stone-950/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-100">
                      {credential.label}
                    </p>
                    <p className="text-xs text-stone-500">
                      {CATEGORY_LABELS[credential.category]} |{' '}
                      {VISIBILITY_LABELS[credential.visibility]}
                      {credential.expiresAt ? ` | expires ${credential.expiresAt}` : ''}
                    </p>
                  </div>
                  <Badge variant={statusVariant(credential.status) as any}>
                    {credential.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <form
            action={createComplianceProofVaultItem}
            className="grid gap-3 border-t border-stone-800 pt-4 sm:grid-cols-2"
          >
            <label className="space-y-1">
              <span className="text-xs font-medium text-stone-400">Label</span>
              <input
                name="label"
                required
                placeholder="General liability certificate"
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-stone-400">Category</span>
              <select
                name="category"
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                defaultValue="insurance"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-stone-400">Visibility</span>
              <select
                name="visibility"
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                defaultValue="private_only"
              >
                {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-stone-400">Expires</span>
              <input
                type="date"
                name="expires_at"
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-stone-400">Evidence URL</span>
              <input
                type="url"
                name="evidence_url"
                placeholder="https://..."
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-stone-400">Public-safe label</span>
              <input
                name="public_label"
                placeholder="General liability insured"
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-stone-400">Notes</span>
              <textarea
                name="notes"
                rows={2}
                className="w-full resize-none rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm">
                Add Proof
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Public Credential Filtering</CardTitle>
        </CardHeader>
        <CardContent>
          {state.publicCredentialChips.length === 0 ? (
            <p className="text-sm text-stone-500">
              No public-safe verified credential chips are enabled. Private documents stay hidden.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {state.publicCredentialChips.map((chip) => (
                <Badge key={chip.id} variant="success">
                  {chip.label}
                </Badge>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-stone-500">{COMPLIANCE_NON_LEGAL_ADVICE_DISCLAIMER}</p>
        </CardContent>
      </Card>
    </section>
  )
}
