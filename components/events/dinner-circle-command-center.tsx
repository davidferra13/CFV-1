'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import {
  AlertTriangle,
  ClipboardCheck,
  DollarSign,
  Eye,
  GitBranch,
  Image as ImageIcon,
  Leaf,
  Map,
  Megaphone,
  RefreshCcw,
  ShieldCheck,
  Save,
  Ticket,
  Users,
  Utensils,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { updateDinnerCircleConfig } from '@/lib/dinner-circles/actions'
import type {
  DinnerCircleAvailabilityItem,
  DinnerCircleConfig,
  DinnerCircleSnapshot,
} from '@/lib/dinner-circles/types'
import { CorporateProcurementPanel } from '@/components/events/corporate-procurement-panel'

type Props = {
  snapshot: DinnerCircleSnapshot
  collaborators: any[]
  ticketHolders: any[]
  approvalGates?: any[]
}

const fieldClass =
  'w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

const paletteOptions = [
  { id: 'field', label: 'Field', color: '#2f855a' },
  { id: 'hearth', label: 'Hearth', color: '#b45309' },
  { id: 'market', label: 'Market', color: '#0f766e' },
  { id: 'coastal', label: 'Coastal', color: '#2563eb' },
]

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseSimpleLinks(value: string) {
  return splitLines(value).map((line) => {
    const [label, url] = line.split('|').map((part) => part.trim())
    return { label: label || url || 'Past event', url: url || label || '#' }
  })
}

function parseSourceLinks(value: string) {
  return splitLines(value).map((line) => {
    const [ingredient, sourceName, notes] = line.split('|').map((part) => part.trim())
    return { ingredient: ingredient || 'Ingredient', sourceName: sourceName || 'Source', notes }
  })
}

function parseAvailabilityItems(value: string) {
  return splitLines(value).map((line) => {
    const [
      ingredient,
      quantity,
      sourceName,
      status,
      unitCost,
      allocatedTo,
      substitution,
      flavorRole,
    ] = line.split('|').map((part) => part.trim())
    const unitCostCents = unitCost ? Math.round(Number(unitCost) * 100) : null

    return {
      ingredient: ingredient || 'Ingredient',
      quantity: quantity || undefined,
      sourceName: sourceName || undefined,
      status: (status || 'pending') as any,
      unitCostCents: Number.isFinite(unitCostCents) ? unitCostCents : null,
      allocatedTo: allocatedTo || undefined,
      substitution: substitution || undefined,
      flavorRole: flavorRole || undefined,
    }
  })
}

function formatAvailabilityItems(items: DinnerCircleAvailabilityItem[]) {
  return items
    .map((item) =>
      [
        item.ingredient,
        item.quantity,
        item.sourceName,
        item.status,
        item.unitCostCents ? (item.unitCostCents / 100).toFixed(2) : '',
        item.allocatedTo,
        item.substitution,
        item.flavorRole,
      ]
        .filter((value, index) => index < 4 || Boolean(value))
        .join('|')
    )
    .join('\n')
}

function parseAnimals(value: string) {
  return splitLines(value).map((line) => {
    const [name, species, photoUrl, notes] = line.split('|').map((part) => part.trim())
    return { name: name || 'Animal', species, photoUrl, notes }
  })
}

function parseSocial(value: string) {
  return splitLines(value).map((line) => {
    const [label, url, body] = line.split('|').map((part) => part.trim())
    return { source: 'manual' as const, label: label || 'Update', url, body }
  })
}

export function DinnerCircleCommandCenter({
  snapshot,
  collaborators,
  ticketHolders,
  approvalGates,
}: Props) {
  const [config, setConfig] = useState(snapshot.config)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<string | null>(null)

  const pastLinksText = useMemo(
    () =>
      (config.publicPage?.pastLinks ?? []).map((link) => `${link.label}|${link.url}`).join('\n'),
    [config.publicPage?.pastLinks]
  )
  const sourceLinksText = useMemo(
    () =>
      (config.supplier?.sourceLinks ?? [])
        .map((link) => `${link.ingredient}|${link.sourceName}${link.notes ? `|${link.notes}` : ''}`)
        .join('\n'),
    [config.supplier?.sourceLinks]
  )
  const animalsText = useMemo(
    () =>
      (config.farm?.animals ?? [])
        .map((animal) =>
          [animal.name, animal.species, animal.photoUrl, animal.notes].filter(Boolean).join('|')
        )
        .join('\n'),
    [config.farm?.animals]
  )
  const socialText = useMemo(
    () =>
      (config.social?.posts ?? [])
        .map((post) => [post.label, post.url, post.body].filter(Boolean).join('|'))
        .join('\n'),
    [config.social?.posts]
  )
  const availabilityText = useMemo(
    () => formatAvailabilityItems(config.adaptive?.availabilityItems ?? []),
    [config.adaptive?.availabilityItems]
  )

  function updateLocal(patch: Partial<DinnerCircleConfig>) {
    setConfig((current) => ({ ...current, ...patch }))
  }

  function save() {
    setStatus(null)
    startTransition(async () => {
      try {
        const result = await updateDinnerCircleConfig({
          eventId: snapshot.eventId,
          patch: config as Record<string, unknown>,
        })
        setConfig(result.config)
        setStatus('Saved')
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to save')
      }
    })
  }

  const suggestions =
    config.menu?.suggestionsEnabled && config.supplier?.ingredientLines?.length
      ? config.supplier.ingredientLines.slice(0, 6).map((line) => {
          const primary = line.split(/[,|-]/)[0]?.trim() || line
          return `${primary} course`
        })
      : []

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-stone-800 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
              Dinner Circle
            </p>
            <h2 className="mt-1 text-xl font-semibold text-stone-50">Event command center</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {snapshot.shareUrl && (
              <Button href={snapshot.shareUrl} target="_blank" variant="secondary" size="sm">
                <Eye className="h-4 w-4" />
                Public Page
              </Button>
            )}
            {snapshot.hubUrl && (
              <Button href={snapshot.hubUrl} target="_blank" variant="secondary" size="sm">
                <Users className="h-4 w-4" />
                Circle
              </Button>
            )}
            <Button onClick={save} disabled={isPending} loading={isPending} size="sm">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
        {status && <p className="mt-2 text-xs text-stone-400">{status}</p>}
      </div>

      <div className="space-y-6 p-5">
        <div className="grid gap-2 md:grid-cols-8">
          {snapshot.checks.map((check) => (
            <a
              key={check.key}
              href={check.actionHref ?? '#'}
              className={`rounded-lg border px-3 py-2 text-xs transition ${
                check.status === 'ready'
                  ? 'border-emerald-800 bg-emerald-950/30 text-emerald-200'
                  : 'border-amber-800 bg-amber-950/30 text-amber-200'
              }`}
            >
              <span className="block font-semibold capitalize">{check.key}</span>
              <span className="mt-1 block leading-4">{check.label}</span>
            </a>
          ))}
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-stone-800 p-4">
            <Header icon={<ShieldCheck className="h-4 w-4" />} title="Default Safeguards" />
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <Signal label="Public status" value={snapshot.defaults.statusMessage} />
              <Signal
                label="Contributors"
                value={
                  snapshot.defaults.contributorBalance.message ??
                  (snapshot.defaults.contributorBalance.visibleNames.join(', ') ||
                    'Primary host visible')
                }
              />
              {snapshot.defaults.nudges.slice(0, 4).map((nudge) => (
                <Signal key={nudge.id} label={nudge.label} value={nudge.message} />
              ))}
              {snapshot.defaults.rolePrompts.slice(0, 4).map((prompt) => (
                <Signal key={prompt.id} label={prompt.label} value={prompt.message} />
              ))}
              {snapshot.defaults.autoCleanup.message && (
                <Signal label="After event" value={snapshot.defaults.autoCleanup.message} />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-stone-800 p-4">
            <Header icon={<Megaphone className="h-4 w-4" />} title="Share Snippets" />
            <div className="mt-3 space-y-3">
              <input
                className={fieldClass}
                readOnly
                value={snapshot.defaults.shareSnippets.shortPreview || snapshot.shareUrl || ''}
              />
              <textarea
                className={fieldClass}
                readOnly
                rows={3}
                value={snapshot.defaults.shareSnippets.text}
              />
              <textarea
                className={fieldClass}
                readOnly
                rows={3}
                value={snapshot.defaults.shareSnippets.social}
              />
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-4">
          <Metric
            icon={<Users className="h-4 w-4" />}
            label="People"
            value={`${snapshot.counts.collaborators} roles`}
          />
          <Metric
            icon={<Ticket className="h-4 w-4" />}
            label="Sold"
            value={`${snapshot.counts.paidGuests} guests`}
          />
          <Metric
            icon={<DollarSign className="h-4 w-4" />}
            label="Projected Payout"
            value={formatCurrency(snapshot.money.netPayoutCents)}
          />
          <Metric
            icon={<ImageIcon className="h-4 w-4" />}
            label="Public Photos"
            value={`${snapshot.counts.publicPhotos}`}
          />
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-stone-800 p-4">
            <Header icon={<Users className="h-4 w-4" />} title="People, Roles, Permissions" />
            <div className="mt-3 space-y-2">
              {collaborators.length === 0 ? (
                <p className="text-sm text-stone-400">
                  Owner is primary. Add collaborators in Ops.
                </p>
              ) : (
                collaborators.slice(0, 5).map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-stone-200">
                      {collaborator.chef?.display_name ||
                        collaborator.chef?.business_name ||
                        'Collaborator'}
                    </span>
                    <span className="rounded-full bg-stone-800 px-2 py-1 text-xs text-stone-300">
                      {collaborator.role}
                    </span>
                  </div>
                ))
              )}
              <div className="pt-2 text-xs text-stone-500">
                Tickets and walk-ins add attendee records here after purchase or capture.
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-stone-800 p-4">
            <Header icon={<DollarSign className="h-4 w-4" />} title="Money Setup" />
            <div className="mt-3 grid gap-3">
              <input
                className={fieldClass}
                value={config.money?.paySplit ?? ''}
                onChange={(event) =>
                  updateLocal({ money: { ...config.money!, paySplit: event.target.value } })
                }
                placeholder="Pay split"
              />
              <input
                className={fieldClass}
                value={config.money?.ticketSeller ?? ''}
                onChange={(event) =>
                  updateLocal({ money: { ...config.money!, ticketSeller: event.target.value } })
                }
                placeholder="Ticket seller"
              />
              <textarea
                className={fieldClass}
                rows={2}
                value={config.money?.compensation ?? ''}
                onChange={(event) =>
                  updateLocal({ money: { ...config.money!, compensation: event.target.value } })
                }
                placeholder="Compensation"
              />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <MoneyLine label="Projected sales" value={snapshot.money.projectedRevenueCents} />
                <MoneyLine label="Platform fee" value={snapshot.money.platformFeeCents} />
                <MoneyLine label="Preview payout" value={snapshot.money.netPayoutCents} />
                <MoneyLine label="Final net" value={snapshot.money.finalNetCents} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-stone-800 p-4">
            <Header icon={<Leaf className="h-4 w-4" />} title="Supplier Ingredients" />
            <textarea
              className={`${fieldClass} mt-3`}
              rows={6}
              value={config.supplier?.rawInput ?? ''}
              onChange={(event) =>
                updateLocal({
                  supplier: {
                    ...config.supplier!,
                    rawInput: event.target.value,
                    ingredientLines: splitLines(event.target.value),
                  },
                })
              }
              placeholder="Ingredient, quantity, source, note"
            />
            <textarea
              className={`${fieldClass} mt-3`}
              rows={3}
              defaultValue={sourceLinksText}
              onBlur={(event) =>
                updateLocal({
                  supplier: {
                    ...config.supplier!,
                    sourceLinks: parseSourceLinks(event.target.value),
                  },
                })
              }
              placeholder="ingredient|source|note"
            />
          </div>

          <div className="rounded-lg border border-stone-800 p-4">
            <Header icon={<Utensils className="h-4 w-4" />} title="Menu Builder" />
            <textarea
              className={`${fieldClass} mt-3`}
              rows={5}
              value={config.menu?.manualNotes ?? ''}
              onChange={(event) =>
                updateLocal({ menu: { ...config.menu!, manualNotes: event.target.value } })
              }
              placeholder="Manual courses, serving notes, poll options"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-stone-300">
              <input
                type="checkbox"
                checked={config.menu?.pollEnabled ?? false}
                onChange={(event) =>
                  updateLocal({ menu: { ...config.menu!, pollEnabled: event.target.checked } })
                }
              />
              Enable menu polling
            </label>
            {suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <span
                    key={suggestion}
                    className="rounded-full bg-stone-800 px-2 py-1 text-xs text-stone-300"
                  >
                    {suggestion}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-stone-800 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <Header icon={<RefreshCcw className="h-4 w-4" />} title="Adaptive Sourcing" />
            <div className="grid gap-2 text-xs sm:grid-cols-4">
              <Signal label="Confirmed" value={`${snapshot.adaptive.confirmedCount}`} />
              <Signal label="Pending" value={`${snapshot.adaptive.pendingCount}`} />
              <Signal
                label="Substitutions"
                value={`${snapshot.adaptive.substitutionPendingCount}`}
              />
              <Signal
                label="Tracked Cost"
                value={formatCurrency(snapshot.adaptive.estimatedIngredientCostCents)}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              <Header icon={<GitBranch className="h-4 w-4" />} title="Live Menu State" />
              <input
                className={fieldClass}
                value={config.menu?.versionLabel ?? ''}
                onChange={(event) =>
                  updateLocal({ menu: { ...config.menu!, versionLabel: event.target.value } })
                }
                placeholder="Working menu version"
              />
              <textarea
                className={fieldClass}
                rows={3}
                value={config.menu?.fixedElements ?? ''}
                onChange={(event) =>
                  updateLocal({ menu: { ...config.menu!, fixedElements: event.target.value } })
                }
                placeholder="Fixed menu promises"
              />
              <textarea
                className={fieldClass}
                rows={3}
                value={config.menu?.flexibleElements ?? ''}
                onChange={(event) =>
                  updateLocal({ menu: { ...config.menu!, flexibleElements: event.target.value } })
                }
                placeholder="Flexible seasonal ranges"
              />
            </div>

            <div className="space-y-3">
              <Header icon={<AlertTriangle className="h-4 w-4" />} title="Availability Matrix" />
              <textarea
                className={fieldClass}
                rows={7}
                defaultValue={availabilityText}
                onBlur={(event) =>
                  updateLocal({
                    adaptive: {
                      ...config.adaptive!,
                      availabilityItems: parseAvailabilityItems(event.target.value),
                    },
                  })
                }
                placeholder="ingredient|quantity|source|status|unit cost|allocated event|substitution|flavor role"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <TextPanel
              icon={<Megaphone className="h-4 w-4" />}
              title="Client Expectation Layer"
              value={config.adaptive?.clientExpectationNote ?? ''}
              rows={4}
              placeholder="What can change and what stays fixed"
              onChange={(value) =>
                updateLocal({
                  adaptive: { ...config.adaptive!, clientExpectationNote: value },
                })
              }
            />
            <TextPanel
              icon={<DollarSign className="h-4 w-4" />}
              title="Pricing Adjustment"
              value={config.adaptive?.pricingAdjustmentPolicy ?? ''}
              rows={4}
              placeholder="How substitutions change the working cost"
              onChange={(value) =>
                updateLocal({
                  adaptive: { ...config.adaptive!, pricingAdjustmentPolicy: value },
                })
              }
            />
            <TextPanel
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Substitution Validation"
              value={config.adaptive?.substitutionValidationNotes ?? ''}
              rows={4}
              placeholder="Flavor role, texture, acidity, richness, service impact"
              onChange={(value) =>
                updateLocal({
                  adaptive: { ...config.adaptive!, substitutionValidationNotes: value },
                })
              }
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
            <label className="flex items-center gap-2 rounded-lg border border-stone-800 px-3 py-2 text-sm text-stone-300">
              <input
                type="checkbox"
                checked={config.adaptive?.finalValidationLocked ?? false}
                onChange={(event) =>
                  updateLocal({
                    adaptive: {
                      ...config.adaptive!,
                      finalValidationLocked: event.target.checked,
                    },
                  })
                }
              />
              Final validation locked
            </label>
            <input
              className={fieldClass}
              value={config.adaptive?.finalValidationNotes ?? ''}
              onChange={(event) =>
                updateLocal({
                  adaptive: { ...config.adaptive!, finalValidationNotes: event.target.value },
                })
              }
              placeholder="Final sourcing check"
            />
          </div>
        </section>

        <section className="rounded-lg border border-stone-800 p-4">
          <Header icon={<Map className="h-4 w-4" />} title="Layout And Flow" />
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative aspect-[16/9] rounded-lg border border-stone-800 bg-stone-950">
              {config.layout?.zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`absolute rounded-md border px-2 py-1 text-xs font-medium ${
                    zone.kind === 'path'
                      ? 'border-brand-500/70 bg-brand-950/40 text-brand-200'
                      : 'border-stone-600 bg-stone-900 text-stone-200'
                  }`}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.w}%`,
                    height: `${zone.h}%`,
                  }}
                >
                  {zone.label}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <input
                className={fieldClass}
                value={config.layout?.name ?? ''}
                onChange={(event) =>
                  updateLocal({ layout: { ...config.layout!, name: event.target.value } })
                }
                placeholder="Reusable layout name"
              />
              <textarea
                className={fieldClass}
                rows={5}
                value={config.layout?.chefNotes ?? ''}
                onChange={(event) =>
                  updateLocal({ layout: { ...config.layout!, chefNotes: event.target.value } })
                }
                placeholder="Chef movement, load-in, service path, reset notes"
              />
              <label className="flex items-center gap-2 text-sm text-stone-300">
                <input
                  type="checkbox"
                  checked={config.publicPage?.showGuestMap ?? false}
                  onChange={(event) =>
                    updateLocal({
                      publicPage: { ...config.publicPage!, showGuestMap: event.target.checked },
                    })
                  }
                />
                Show guest-facing map
              </label>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <TextPanel
            icon={<Megaphone className="h-4 w-4" />}
            title="Public Story"
            value={config.publicPage?.story ?? ''}
            rows={5}
            placeholder="Story, host note, location context"
            onChange={(value) =>
              updateLocal({ publicPage: { ...config.publicPage!, story: value } })
            }
          />
          <LinesPanel
            icon={<Leaf className="h-4 w-4" />}
            title="Farm Identity"
            value={animalsText}
            placeholder="name|species|photo url|note"
            onBlur={(value) =>
              updateLocal({
                farm: { ...config.farm!, enabled: true, animals: parseAnimals(value) },
              })
            }
          />
          <LinesPanel
            icon={<ClipboardCheck className="h-4 w-4" />}
            title="Live Content"
            value={socialText}
            placeholder="label|url|short note"
            onBlur={(value) =>
              updateLocal({
                social: { ...config.social!, enabled: true, posts: parseSocial(value) },
              })
            }
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-stone-800 p-4">
            <Header icon={<ImageIcon className="h-4 w-4" />} title="Past Links And Theme" />
            <textarea
              className={`${fieldClass} mt-3`}
              rows={3}
              defaultValue={pastLinksText}
              onBlur={(event) =>
                updateLocal({
                  publicPage: {
                    ...config.publicPage!,
                    pastLinks: parseSimpleLinks(event.target.value),
                  },
                })
              }
              placeholder="label|url"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {paletteOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    updateLocal({
                      theme: {
                        ...config.theme!,
                        palette: option.id as any,
                        accentColor: option.color,
                        backgroundMode: 'subtle_gradient',
                      },
                    })
                  }
                  className="flex items-center gap-2 rounded-lg border border-stone-700 px-3 py-2 text-xs text-stone-200"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-stone-800 p-4">
            <Header icon={<Users className="h-4 w-4" />} title="Attendee Capture" />
            <div className="mt-3 space-y-2">
              {ticketHolders.slice(0, 5).map((ticket) => (
                <div key={ticket.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-stone-200">{ticket.buyer_name}</span>
                  <span className="text-stone-500">{ticket.payment_status}</span>
                </div>
              ))}
              {ticketHolders.length === 0 && (
                <p className="text-sm text-stone-400">Ticket holders and walk-ins appear here.</p>
              )}
              {(config.vendorInquiries ?? []).length > 0 && (
                <div className="pt-3 text-xs text-stone-400">
                  {(config.vendorInquiries ?? []).length} vendor interest request
                  {(config.vendorInquiries ?? []).length === 1 ? '' : 's'} captured.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Corporate Procurement (conditional) */}
        {(config.corporate?.enabled || (approvalGates ?? []).length > 0) && (
          <section className="rounded-lg border border-stone-800 p-4">
            <CorporateProcurementPanel
              eventId={snapshot.eventId}
              config={config}
              gates={approvalGates ?? []}
            />
          </section>
        )}
      </div>
    </Card>
  )
}

function Header({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-stone-100">
      <span className="text-brand-300">{icon}</span>
      {title}
    </div>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-800 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-stone-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-stone-50">{value}</p>
    </div>
  )
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-950 px-3 py-2">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-sm leading-5 text-stone-200">{value}</p>
    </div>
  )
}

function MoneyLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-stone-950 px-3 py-2">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 font-semibold text-stone-100">{formatCurrency(value)}</p>
    </div>
  )
}

function TextPanel(props: {
  icon: ReactNode
  title: string
  value: string
  rows: number
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <div className="rounded-lg border border-stone-800 p-4">
      <Header icon={props.icon} title={props.title} />
      <textarea
        className={`${fieldClass} mt-3`}
        rows={props.rows}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
      />
    </div>
  )
}

function LinesPanel(props: {
  icon: ReactNode
  title: string
  value: string
  placeholder: string
  onBlur: (value: string) => void
}) {
  return (
    <div className="rounded-lg border border-stone-800 p-4">
      <Header icon={props.icon} title={props.title} />
      <textarea
        className={`${fieldClass} mt-3`}
        rows={5}
        defaultValue={props.value}
        onBlur={(event) => props.onBlur(event.target.value)}
        placeholder={props.placeholder}
      />
    </div>
  )
}
