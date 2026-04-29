'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { updateMyDefaultKnowledgeSettings } from '@/lib/clients/client-default-knowledge-actions'
import type {
  ClientDefaultKnowledgePassport,
  ClientDefaultKnowledgeScope,
  ClientDefaultKnowledgeSnapshot,
  UpdateClientDefaultKnowledgeInput,
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
  const currentFormKey = JSON.stringify(form)
  const isDirty = currentFormKey !== initialFormKey

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
