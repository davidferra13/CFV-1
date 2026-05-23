'use client'

import { useMemo, useState } from 'react'
import { Archive, Check, Paperclip, RotateCw, Shield, Trash2 } from 'lucide-react'
import {
  CHEF_LIFE_CONSTRAINT_DOMAINS,
  CHEF_LIFE_CONSTRAINT_VISIBILITIES,
  type ChefLifeConstraintDomain,
  type ChefLifeConstraintFact,
  type ChefLifeConstraintVisibility,
} from '@/lib/intelligence/chef-life-constraint-capture-contract'

type ConstraintCaptureFormProps = {
  facts?: ChefLifeConstraintFact[]
  pending?: boolean
  error?: string | null
  onQuickCapture?: (note: string, domain: ChefLifeConstraintDomain) => void
  onStructuredCapture?: (input: {
    domain: ChefLifeConstraintDomain
    kind: string
    label: string
    value: string
    privateNotes: string
    visibility: ChefLifeConstraintVisibility
    evidenceUrl: string
  }) => void
  onConfirm?: (id: string) => void
  onRenew?: (id: string) => void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
}

export function ChefLifeConstraintCaptureForm({
  facts = [],
  pending = false,
  error = null,
  onQuickCapture,
  onStructuredCapture,
  onConfirm,
  onRenew,
  onArchive,
  onDelete,
}: ConstraintCaptureFormProps) {
  const [mode, setMode] = useState<'quick' | 'structured'>('quick')
  const [domain, setDomain] = useState<ChefLifeConstraintDomain>('strategy')
  const [quickNote, setQuickNote] = useState('')
  const [kind, setKind] = useState('')
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [privateNotes, setPrivateNotes] = useState('')
  const [visibility, setVisibility] = useState<ChefLifeConstraintVisibility>('private_only')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const activeFacts = useMemo(
    () => facts.filter((fact) => fact.state !== 'archived' && fact.state !== 'deleted'),
    [facts]
  )

  return (
    <section className="w-full max-w-full space-y-4 overflow-x-hidden rounded-lg border border-slate-200 bg-white p-3 text-slate-950 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-6">Constraint capture</h2>
          <p className="text-sm leading-5 text-slate-600">
            Sensitive facts stay private by default.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1">
          {(['quick', 'structured'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`min-h-11 rounded px-3 text-sm font-medium ${
                mode === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
              }`}
              onClick={() => setMode(item)}
            >
              {item === 'quick' ? 'Quick' : 'Structured'}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Domain
          <select
            className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 sm:text-sm"
            value={domain}
            onChange={(event) => setDomain(event.target.value as ChefLifeConstraintDomain)}
          >
            {CHEF_LIFE_CONSTRAINT_DOMAINS.map((item) => (
              <option key={item} value={item}>
                {item.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>

        {mode === 'structured' ? (
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Visibility
            <select
              className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 sm:text-sm"
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value as ChefLifeConstraintVisibility)
              }
            >
              {CHEF_LIFE_CONSTRAINT_VISIBILITIES.map((item) => (
                <option key={item} value={item}>
                  {item.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {mode === 'quick' ? (
        <div className="grid gap-3">
          <textarea
            className="min-h-32 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-base leading-6 text-slate-950 sm:text-sm"
            value={quickNote}
            onChange={(event) => setQuickNote(event.target.value)}
            placeholder="Capture only what is needed."
          />
          <button
            type="button"
            disabled={pending || !quickNote.trim()}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
            onClick={() => {
              onQuickCapture?.(quickNote, domain)
              setQuickNote('')
            }}
          >
            <Shield className="size-4" aria-hidden="true" />
            Capture private fact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Kind
            <input
              className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 sm:text-sm"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Label
            <input
              className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 sm:text-sm"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Value
            <textarea
              className="min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-base leading-6 text-slate-950 sm:text-sm"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Private notes
            <textarea
              className="min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-base leading-6 text-slate-950 sm:text-sm"
              value={privateNotes}
              onChange={(event) => setPrivateNotes(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Evidence URL
            <input
              className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 sm:text-sm"
              value={evidenceUrl}
              onChange={(event) => setEvidenceUrl(event.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={pending || (!label.trim() && !value.trim())}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
            onClick={() =>
              onStructuredCapture?.({
                domain,
                kind,
                label,
                value,
                privateNotes,
                visibility,
                evidenceUrl,
              })
            }
          >
            <Paperclip className="size-4" aria-hidden="true" />
            Save constraint
          </button>
        </div>
      )}

      <div className="grid gap-2">
        {pending ? <div className="rounded-md bg-slate-50 p-3 text-sm">Loading...</div> : null}
        {!pending && activeFacts.length === 0 ? (
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
            No active constraints captured.
          </div>
        ) : null}
        {activeFacts.map((fact) => (
          <article
            key={fact.id ?? `${fact.domain}:${fact.label}`}
            className="grid gap-3 rounded-md border border-slate-200 p-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-5">{fact.label}</div>
              <div className="break-words text-sm leading-5 text-slate-600">{fact.value}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <IconButton label="Confirm" onClick={() => fact.id && onConfirm?.(fact.id)}>
                <Check className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton label="Renew" onClick={() => fact.id && onRenew?.(fact.id)}>
                <RotateCw className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton label="Archive" onClick={() => fact.id && onArchive?.(fact.id)}>
                <Archive className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton label="Delete" onClick={() => fact.id && onDelete?.(fact.id)}>
                <Trash2 className="size-4" aria-hidden="true" />
              </IconButton>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-slate-700 hover:bg-slate-50"
      onClick={onClick}
    >
      {children}
    </button>
  )
}
