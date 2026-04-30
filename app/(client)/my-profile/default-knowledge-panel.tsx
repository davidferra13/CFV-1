'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { updateMyDefaultKnowledgeSettings } from '@/lib/clients/client-default-knowledge-actions'
import type {
  ClientDefaultKnowledgePassport,
  ClientDefaultKnowledgeProvenance,
  ClientDefaultKnowledgeScope,
  ClientDefaultKnowledgeSnapshot,
  UpdateClientDefaultKnowledgeInput,
} from '@/lib/clients/client-default-knowledge'
import {
  buildClientDefaultKnowledgeApplication,
  buildClientDefaultKnowledgeAuditTimeline,
  buildClientDefaultKnowledgeChangePreview,
  buildClientDefaultKnowledgeChefImpact,
  buildClientDefaultKnowledgeCoverageMeter,
  buildClientDefaultKnowledgeEventOverridePolicy,
  buildClientDefaultKnowledgeRestatementContract,
} from '@/lib/clients/client-default-knowledge'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  initialSnapshot: ClientDefaultKnowledgeSnapshot
}

type FormState = {
  communicationMode: ClientDefaultKnowledgePassport['communication_mode']
  preferredContactMethod: ClientDefaultKnowledgePassport['preferred_contact_method']
  chefAutonomyLevel: ClientDefaultKnowledgePassport['chef_autonomy_level']
  useAutoApproval: boolean
  autoApproveDollars: string
  maxInteractionRounds: string
  useStandingInstructions: boolean
  standingInstructions: string
  useServiceDefaults: boolean
  defaultGuestCount: string
  serviceStyle: NonNullable<ClientDefaultKnowledgePassport['service_style']> | ''
  useBudgetRange: boolean
  budgetMinDollars: string
  budgetMaxDollars: string
  useDelegate: boolean
  delegateName: string
  delegateEmail: string
  delegatePhone: string
}

const STATUS_LABELS: Record<ClientDefaultKnowledgeScope['status'], string> = {
  ready: 'Ready',
  partial: 'Partial',
  empty: 'Empty',
}

const STATUS_VARIANTS: Record<
  ClientDefaultKnowledgeScope['status'],
  'success' | 'warning' | 'default'
> = {
  ready: 'success',
  partial: 'warning',
  empty: 'default',
}

export function DefaultKnowledgePanel({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [form, setForm] = useState<FormState>(() => toFormState(initialSnapshot.passport))
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const initialFormKey = useMemo(() => JSON.stringify(toFormState(snapshot.passport)), [snapshot])
  const bookingApplication = useMemo(
    () => buildClientDefaultKnowledgeApplication(snapshot, 'booking'),
    [snapshot]
  )
  const currentFormKey = JSON.stringify(form)
  const isDirty = currentFormKey !== initialFormKey
  const coverage = useMemo(() => buildClientDefaultKnowledgeCoverageMeter(snapshot), [snapshot])
  const restatementContract = useMemo(
    () => buildClientDefaultKnowledgeRestatementContract(snapshot, 'booking'),
    [snapshot]
  )
  const auditTimeline = useMemo(
    () => buildClientDefaultKnowledgeAuditTimeline(snapshot),
    [snapshot]
  )
  const chefImpact = useMemo(() => buildClientDefaultKnowledgeChefImpact(snapshot), [snapshot])
  const eventOverridePolicy = useMemo(
    () => buildClientDefaultKnowledgeEventOverridePolicy(snapshot),
    [snapshot]
  )
  const changePreview = useMemo(
    () => buildClientDefaultKnowledgeChangePreview(snapshot, toPassportPreview(form)),
    [form, snapshot]
  )

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setSuccess(false)
    setError(null)
  }

  function handleSave() {
    setError(null)
    setSuccess(false)

    const payload: UpdateClientDefaultKnowledgeInput = {
      communication_mode: form.communicationMode,
      preferred_contact_method: form.preferredContactMethod,
      chef_autonomy_level: form.chefAutonomyLevel,
      use_auto_approval: form.useAutoApproval,
      auto_approve_under_cents: form.useAutoApproval
        ? dollarsToCents(form.autoApproveDollars)
        : null,
      max_interaction_rounds: form.maxInteractionRounds
        ? Number.parseInt(form.maxInteractionRounds, 10)
        : null,
      use_standing_instructions: form.useStandingInstructions,
      standing_instructions: form.useStandingInstructions ? form.standingInstructions : null,
      use_service_defaults: form.useServiceDefaults,
      default_guest_count: form.useServiceDefaults ? nullableInteger(form.defaultGuestCount) : null,
      service_style: form.useServiceDefaults && form.serviceStyle ? form.serviceStyle : null,
      use_budget_range: form.useBudgetRange,
      budget_range_min_cents: form.useBudgetRange ? dollarsToCents(form.budgetMinDollars) : null,
      budget_range_max_cents: form.useBudgetRange ? dollarsToCents(form.budgetMaxDollars) : null,
      use_delegate: form.useDelegate,
      delegate_name: form.useDelegate ? form.delegateName : null,
      delegate_email: form.useDelegate ? form.delegateEmail : null,
      delegate_phone: form.useDelegate ? form.delegatePhone : null,
    }

    startTransition(async () => {
      try {
        const result = await updateMyDefaultKnowledgeSettings(payload)
        setSnapshot(result.snapshot)
        setForm(toFormState(result.snapshot.passport))
        setSuccess(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save default knowledge settings')
      }
    })
  }

  return (
    <Card data-testid="client-default-knowledge-panel">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Default Knowledge</CardTitle>
            <CardDescription className="mt-1">
              Control the account-level facts ChefFlow should reuse before asking again.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{snapshot.completion.ready} ready</Badge>
            <Badge variant={snapshot.completion.partial > 0 ? 'warning' : 'default'}>
              {snapshot.completion.partial} partial
            </Badge>
            <Badge variant={snapshot.completion.empty > 0 ? 'warning' : 'default'}>
              {snapshot.completion.empty} empty
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {success && <Alert variant="success">Default knowledge saved.</Alert>}
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid grid-cols-1 gap-3">
          {snapshot.scopes.map((scope) => (
            <ScopeRow key={scope.key} scope={scope} />
          ))}
        </div>

        <CoverageMeterCard coverage={coverage} />

        <div className="rounded-lg border border-brand-800 bg-brand-950 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-100">
                {bookingApplication.bannerTitle}
              </h3>
              <p className="mt-1 text-sm text-stone-400">
                New booking and inquiry flows should prefill these facts instead of asking from
                scratch.
              </p>
            </div>
            <Badge variant="info">{bookingApplication.appliedFields.length} applied</Badge>
          </div>
          {bookingApplication.bannerItems.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {bookingApplication.bannerItems.map((item) => (
                <span
                  key={item}
                  className="rounded-md bg-stone-900 px-2.5 py-1 text-xs text-stone-300"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>

        <RestatementContractCard contract={restatementContract} />
        <EventOverridePolicyCard policies={eventOverridePolicy} />
        <ChefImpactCard impact={chefImpact} />
        <SafetyConfirmationCard snapshot={snapshot} />
        <HouseholdProfilesCard snapshot={snapshot} />
        <ReviewQueueCard snapshot={snapshot} />
        <AuditTimelineCard timeline={auditTimeline} />
        <ProvenanceCard provenance={snapshot.provenance} />

        <div className="grid grid-cols-1 gap-4 border-t border-stone-800 pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Communication"
              value={form.communicationMode}
              onChange={(event) =>
                setField('communicationMode', event.target.value as FormState['communicationMode'])
              }
            >
              <option value="direct">Direct with me</option>
              <option value="delegate_preferred">Delegate preferred</option>
              <option value="delegate_only">Delegate only</option>
            </Select>
            <Select
              label="Preferred Contact"
              value={form.preferredContactMethod}
              onChange={(event) =>
                setField(
                  'preferredContactMethod',
                  event.target.value as FormState['preferredContactMethod']
                )
              }
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="phone">Phone</option>
              <option value="circle">Dinner Circle</option>
            </Select>
            <Select
              label="Chef Autonomy"
              value={form.chefAutonomyLevel}
              onChange={(event) =>
                setField('chefAutonomyLevel', event.target.value as FormState['chefAutonomyLevel'])
              }
            >
              <option value="full">Chef decides everything</option>
              <option value="high">Chef decides most things</option>
              <option value="moderate">Chef proposes, I approve</option>
              <option value="low">I direct the details</option>
            </Select>
          </div>

          <ToggleSection
            title="Use Service Defaults"
            description="Apply typical headcount and service style to new planning surfaces."
            checked={form.useServiceDefaults}
            onChange={(checked) => setField('useServiceDefaults', checked)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Typical Guest Count"
                inputMode="numeric"
                value={form.defaultGuestCount}
                onChange={(event) => setField('defaultGuestCount', event.target.value)}
                disabled={!form.useServiceDefaults}
                placeholder="8"
              />
              <Select
                label="Service Style"
                value={form.serviceStyle}
                onChange={(event) =>
                  setField('serviceStyle', event.target.value as FormState['serviceStyle'])
                }
                disabled={!form.useServiceDefaults}
              >
                <option value="">No preference</option>
                <option value="formal_plated">Formal plated</option>
                <option value="family_style">Family style</option>
                <option value="buffet">Buffet</option>
                <option value="cocktail">Cocktail</option>
                <option value="tasting_menu">Tasting menu</option>
                <option value="no_preference">No preference</option>
              </Select>
            </div>
          </ToggleSection>

          <ToggleSection
            title="Use Budget Range"
            description="Give the chef a default range without making every request start from zero."
            checked={form.useBudgetRange}
            onChange={(checked) => setField('useBudgetRange', checked)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Budget Min ($)"
                inputMode="decimal"
                value={form.budgetMinDollars}
                onChange={(event) => setField('budgetMinDollars', event.target.value)}
                disabled={!form.useBudgetRange}
                placeholder="800"
              />
              <Input
                label="Budget Max ($)"
                inputMode="decimal"
                value={form.budgetMaxDollars}
                onChange={(event) => setField('budgetMaxDollars', event.target.value)}
                disabled={!form.useBudgetRange}
                placeholder="1800"
              />
            </div>
          </ToggleSection>

          <ToggleSection
            title="Use Standing Instructions"
            description="Keep permanent instructions attached to the account."
            checked={form.useStandingInstructions}
            onChange={(checked) => setField('useStandingInstructions', checked)}
          >
            <Textarea
              label="Standing Instructions"
              value={form.standingInstructions}
              onChange={(event) => setField('standingInstructions', event.target.value)}
              disabled={!form.useStandingInstructions}
              rows={3}
              maxLength={4000}
              showCount
              placeholder="Always avoid shellfish, keep dinners under two hours, package leftovers."
            />
          </ToggleSection>

          <ToggleSection
            title="Use Auto Approval"
            description="Let qualifying proposals move without another confirmation step."
            checked={form.useAutoApproval}
            onChange={(checked) => setField('useAutoApproval', checked)}
          >
            <Input
              label="Auto Approve Under ($)"
              inputMode="decimal"
              value={form.autoApproveDollars}
              onChange={(event) => setField('autoApproveDollars', event.target.value)}
              disabled={!form.useAutoApproval}
              placeholder="500"
            />
          </ToggleSection>

          <ToggleSection
            title="Use Delegate"
            description="Route planning details through a trusted person when needed."
            checked={form.useDelegate}
            onChange={(checked) => setField('useDelegate', checked)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Delegate Name"
                value={form.delegateName}
                onChange={(event) => setField('delegateName', event.target.value)}
                disabled={!form.useDelegate}
              />
              <Input
                label="Delegate Email"
                type="email"
                value={form.delegateEmail}
                onChange={(event) => setField('delegateEmail', event.target.value)}
                disabled={!form.useDelegate}
              />
              <Input
                label="Delegate Phone"
                type="tel"
                value={form.delegatePhone}
                onChange={(event) => setField('delegatePhone', event.target.value)}
                disabled={!form.useDelegate}
              />
            </div>
          </ToggleSection>

          <Input
            label="Max Interaction Rounds"
            inputMode="numeric"
            value={form.maxInteractionRounds}
            onChange={(event) => setField('maxInteractionRounds', event.target.value)}
            helperText="Optional cap before ChefFlow should ask for a decision."
            placeholder="2"
          />
        </div>

        <ChangePreviewCard preview={changePreview} />

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleSave}
            loading={isPending}
            disabled={isPending || !isDirty}
          >
            Save Default Knowledge
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CoverageMeterCard({
  coverage,
}: {
  coverage: ReturnType<typeof buildClientDefaultKnowledgeCoverageMeter>
}) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Coverage Meter</h3>
          <p className="mt-1 text-sm text-stone-400">
            Shows what ChefFlow can reuse now, what is still missing, and what needs review.
          </p>
        </div>
        <Badge variant={coverage.safetyMissing > 0 ? 'warning' : 'success'}>
          {coverage.percent}% known
        </Badge>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-800">
        <div className="h-full bg-brand-500" style={{ width: `${coverage.percent}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md bg-stone-800 px-3 py-2">
          <p className="text-stone-500">Known</p>
          <p className="mt-1 text-sm font-medium text-stone-100">{coverage.known}</p>
        </div>
        <div className="rounded-md bg-stone-800 px-3 py-2">
          <p className="text-stone-500">Missing</p>
          <p className="mt-1 text-sm font-medium text-stone-100">{coverage.missing}</p>
        </div>
        <div className="rounded-md bg-stone-800 px-3 py-2">
          <p className="text-stone-500">Needs Review</p>
          <p className="mt-1 text-sm font-medium text-stone-100">{coverage.stale}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {coverage.scopes.map((scope) => (
          <div key={scope.key} className="rounded-md bg-stone-800 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-stone-300">{scope.label}</p>
              <span className="text-xs text-stone-500">
                {scope.known}/{scope.total}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-700">
              <div className="h-full bg-stone-300" style={{ width: `${scope.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RestatementContractCard({
  contract,
}: {
  contract: ReturnType<typeof buildClientDefaultKnowledgeRestatementContract>
}) {
  const visible = contract.rows.slice(0, 8)
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Ask Once Contract</h3>
          <p className="mt-1 text-sm text-stone-400">
            Booking fields with saved values are prefilled or confirmed instead of asked again.
          </p>
        </div>
        <Badge variant="info">{contract.blockedRestatements.length} blocked</Badge>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visible.map((row) => (
          <div key={row.fieldKey} className="rounded-md bg-stone-800 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-stone-500">{row.label}</p>
              <Badge
                variant={
                  row.status === 'confirm_instead'
                    ? 'warning'
                    : row.status === 'empty'
                      ? 'default'
                      : 'success'
                }
              >
                {row.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-stone-200">{row.value ?? 'Not saved yet'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function EventOverridePolicyCard({
  policies,
}: {
  policies: ReturnType<typeof buildClientDefaultKnowledgeEventOverridePolicy>
}) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <h3 className="text-sm font-semibold text-stone-100">Event Override Policy</h3>
      <p className="mt-1 text-sm text-stone-400">
        Event-specific changes stay scoped unless you choose to save them as new defaults.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {policies.map((policy) => (
          <div key={policy.fieldKey} className="rounded-md bg-stone-800 px-3 py-2">
            <p className="text-xs text-stone-500">{policy.label}</p>
            <p className="mt-1 text-sm text-stone-200">{policy.accountValue ?? 'No default'}</p>
            <p className="mt-1 text-xs text-brand-400">
              {policy.toggleLabel ?? 'Event-only override'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChefImpactCard({
  impact,
}: {
  impact: ReturnType<typeof buildClientDefaultKnowledgeChefImpact>
}) {
  const visible = impact.fields.slice(0, 6)
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Chef Impact Map</h3>
          <p className="mt-1 text-sm text-stone-400">
            These saved facts would notify the chef when changed because they affect menus, active
            events, or planning defaults.
          </p>
        </div>
        <Badge variant={impact.safetyCount > 0 ? 'warning' : 'info'}>
          {impact.fields.length} watched
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visible.map((field) => (
          <div key={field.fieldKey} className="rounded-md bg-stone-800 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-stone-500">{field.label}</p>
              <Badge variant={field.reason === 'food_safety' ? 'warning' : 'default'}>
                {field.reason.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-stone-200">{field.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SafetyConfirmationCard({ snapshot }: { snapshot: ClientDefaultKnowledgeSnapshot }) {
  const { safetyConfirmation } = snapshot
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Safety Confirmation</h3>
          <p className="mt-1 text-sm text-stone-400">
            Food safety facts should be confirmed, not restated from blank fields.
          </p>
        </div>
        <Badge
          variant={
            safetyConfirmation.status === 'current'
              ? 'success'
              : safetyConfirmation.status === 'missing'
                ? 'error'
                : 'warning'
          }
        >
          {safetyConfirmation.status.replace(/_/g, ' ')}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {safetyConfirmation.fields.map((field) => (
          <div key={field.fieldKey} className="rounded-md bg-stone-800 px-3 py-2">
            <p className="text-xs text-stone-500">{field.label}</p>
            <p className="mt-0.5 text-sm text-stone-200">{field.value ?? 'Not set'}</p>
            <p className="mt-1 text-xs text-brand-400">{field.confirmationLabel}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function HouseholdProfilesCard({ snapshot }: { snapshot: ClientDefaultKnowledgeSnapshot }) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <h3 className="text-sm font-semibold text-stone-100">Household Profiles</h3>
      <p className="mt-1 text-sm text-stone-400">
        Household details stay separated so one person&apos;s facts do not become vague account
        notes.
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {snapshot.householdProfiles.map((profile) => (
          <div key={profile.id} className="rounded-md bg-stone-800 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-stone-100">{profile.label}</p>
              <Badge variant="default">{profile.role}</Badge>
            </div>
            <div className="mt-2 space-y-1">
              {profile.facts
                .filter((fact) => fact.value)
                .map((fact) => (
                  <p key={fact.label} className="text-xs text-stone-400">
                    {fact.label}: <span className="text-stone-200">{fact.value}</span>
                  </p>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReviewQueueCard({ snapshot }: { snapshot: ClientDefaultKnowledgeSnapshot }) {
  const visible = snapshot.reviewQueue.slice(0, 6)
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Review Inbox</h3>
          <p className="mt-1 text-sm text-stone-400">
            New learned facts should wait for approve, edit, or reject before becoming defaults.
          </p>
        </div>
        <Badge variant={snapshot.reviewQueue.length > 0 ? 'warning' : 'success'}>
          {snapshot.reviewQueue.length} review
        </Badge>
      </div>
      <div className="mt-3 space-y-2">
        {visible.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-md bg-stone-800 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm text-stone-100">{item.label}</p>
              <p className="text-xs text-stone-400">{item.proposedValue}</p>
            </div>
            <p className="text-xs text-stone-400">Pending client review</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AuditTimelineCard({
  timeline,
}: {
  timeline: ReturnType<typeof buildClientDefaultKnowledgeAuditTimeline>
}) {
  const visible = timeline.slice(0, 8)
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Audit Timeline</h3>
          <p className="mt-1 text-sm text-stone-400">
            Saved facts keep their source, freshness, and edit destination visible.
          </p>
        </div>
        <Badge variant="info">{timeline.length} facts</Badge>
      </div>
      <div className="mt-3 space-y-2">
        {visible.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-md bg-stone-800 px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <p className="text-sm text-stone-100">{item.label}</p>
              <p className="text-xs text-stone-400">{item.value}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-stone-500">
              <span>{item.sourceLabel}</span>
              <span>{item.freshness.replace(/_/g, ' ')}</span>
              {item.safetyCritical && <span>Safety</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProvenanceCard({ provenance }: { provenance: ClientDefaultKnowledgeProvenance[] }) {
  const visible = provenance.filter((item) => item.value).slice(0, 8)
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <h3 className="text-sm font-semibold text-stone-100">Source and Freshness</h3>
      <p className="mt-1 text-sm text-stone-400">
        Every displayed fact keeps its source, freshness, and safety status visible.
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map((item) => (
          <div key={item.fieldKey} className="rounded-md bg-stone-800 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-stone-500">{item.label}</p>
              <Badge variant={item.safetyCritical ? 'warning' : 'default'}>
                {item.sourceLabel}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-stone-200">{item.value}</p>
            <p className="mt-1 text-xs text-stone-500">{item.freshness.replace(/_/g, ' ')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChangePreviewCard({
  preview,
}: {
  preview: ReturnType<typeof buildClientDefaultKnowledgeChangePreview>
}) {
  if (preview.changedFields.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
        <h3 className="text-sm font-semibold text-stone-100">Before Saving</h3>
        <p className="mt-1 text-sm text-stone-400">No default knowledge changes are pending.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-brand-800 bg-brand-950 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Before Saving</h3>
          <p className="mt-1 text-sm text-stone-400">
            These changes will affect future portal flows after you save.
          </p>
        </div>
        <Badge variant={preview.chefAlertCount > 0 ? 'warning' : 'info'}>
          {preview.changedFields.length} changes
        </Badge>
      </div>
      <div className="mt-3 space-y-2">
        {preview.changedFields.slice(0, 6).map((field) => (
          <div key={field.fieldKey} className="rounded-md bg-stone-900 px-3 py-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-stone-100">{field.label}</p>
                <p className="mt-1 text-xs text-stone-400">
                  {field.before ?? 'Not set'} to {field.after ?? 'Not set'}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {field.contexts.slice(0, 3).map((context) => (
                  <span
                    key={context}
                    className="rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-400"
                  >
                    {context.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      {preview.chefAlertCount > 0 && (
        <p className="mt-3 text-xs text-amber-300">
          {preview.chefAlertCount} change{preview.chefAlertCount === 1 ? '' : 's'} can affect chef
          planning or active event review.
        </p>
      )}
    </div>
  )
}

function ScopeRow({ scope }: { scope: ClientDefaultKnowledgeScope }) {
  const visibleItems = scope.items.filter((item) => item.value)

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-100">{scope.label}</h3>
            {scope.lockedOn && <Badge variant="info">Always on</Badge>}
          </div>
          <p className="mt-1 text-sm text-stone-400">{scope.description}</p>
        </div>
        <Badge variant={STATUS_VARIANTS[scope.status]}>{STATUS_LABELS[scope.status]}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <div key={item.label} className="rounded-md bg-stone-800 px-3 py-2">
              <p className="text-xs text-stone-500">{item.label}</p>
              <p className="mt-0.5 text-sm text-stone-200">{item.value}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-stone-500">No saved facts in this scope.</p>
        )}
      </div>
    </div>
  )
}

function ToggleSection({
  title,
  description,
  checked,
  onChange,
  children,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">{title}</h3>
          <p className="mt-1 text-sm text-stone-400">{description}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function toFormState(passport: ClientDefaultKnowledgePassport): FormState {
  return {
    communicationMode: passport.communication_mode,
    preferredContactMethod: passport.preferred_contact_method,
    chefAutonomyLevel: passport.chef_autonomy_level,
    useAutoApproval: passport.auto_approve_under_cents !== null,
    autoApproveDollars: centsToDollars(passport.auto_approve_under_cents),
    maxInteractionRounds: passport.max_interaction_rounds
      ? String(passport.max_interaction_rounds)
      : '',
    useStandingInstructions: Boolean(passport.standing_instructions),
    standingInstructions: passport.standing_instructions ?? '',
    useServiceDefaults: Boolean(passport.default_guest_count || passport.service_style),
    defaultGuestCount: passport.default_guest_count ? String(passport.default_guest_count) : '',
    serviceStyle: passport.service_style ?? '',
    useBudgetRange: Boolean(passport.budget_range_min_cents || passport.budget_range_max_cents),
    budgetMinDollars: centsToDollars(passport.budget_range_min_cents),
    budgetMaxDollars: centsToDollars(passport.budget_range_max_cents),
    useDelegate: Boolean(
      passport.delegate_name || passport.delegate_email || passport.delegate_phone
    ),
    delegateName: passport.delegate_name ?? '',
    delegateEmail: passport.delegate_email ?? '',
    delegatePhone: passport.delegate_phone ?? '',
  }
}

function toPassportPreview(form: FormState): ClientDefaultKnowledgePassport {
  return {
    communication_mode: form.communicationMode,
    preferred_contact_method: form.preferredContactMethod,
    chef_autonomy_level: form.chefAutonomyLevel,
    auto_approve_under_cents: form.useAutoApproval ? dollarsToCents(form.autoApproveDollars) : null,
    max_interaction_rounds: form.maxInteractionRounds
      ? Number.parseInt(form.maxInteractionRounds, 10)
      : null,
    standing_instructions: form.useStandingInstructions ? form.standingInstructions : null,
    default_guest_count: form.useServiceDefaults ? nullableInteger(form.defaultGuestCount) : null,
    service_style: form.useServiceDefaults && form.serviceStyle ? form.serviceStyle : null,
    budget_range_min_cents: form.useBudgetRange ? dollarsToCents(form.budgetMinDollars) : null,
    budget_range_max_cents: form.useBudgetRange ? dollarsToCents(form.budgetMaxDollars) : null,
    delegate_name: form.useDelegate ? form.delegateName : null,
    delegate_email: form.useDelegate ? form.delegateEmail : null,
    delegate_phone: form.useDelegate ? form.delegatePhone : null,
  }
}

function centsToDollars(cents: number | null): string {
  return typeof cents === 'number' && cents > 0 ? String(cents / 100) : ''
}

function dollarsToCents(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null
}

function nullableInteger(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}
