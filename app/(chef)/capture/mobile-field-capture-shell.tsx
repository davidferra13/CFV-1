'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Camera,
  ClipboardList,
  Home,
  PackageCheck,
  Paperclip,
  Recycle,
  Save,
  Shield,
  Truck,
  Users,
  WifiOff,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createCapture } from '@/lib/capture/actions'

type FieldCaptureKind =
  | 'incident'
  | 'vendor_issue'
  | 'loadout_state'
  | 'household_fact'
  | 'waste_note'
  | 'staff_performance'
  | 'craft_note'

type PrivacyDefault = 'private_only' | 'chef_internal'

type FieldCaptureAction = {
  kind: FieldCaptureKind
  label: string
  tag: string
  privacy: PrivacyDefault
  placeholder: string
  icon: typeof AlertTriangle
}

const DRAFT_KEY = 'chef-flow-mobile-field-capture-draft-v1'

const FIELD_CAPTURE_ACTIONS: FieldCaptureAction[] = [
  {
    kind: 'incident',
    label: 'Incident',
    tag: 'incident',
    privacy: 'private_only',
    placeholder: 'What happened, who is affected, and what needs a follow-up?',
    icon: AlertTriangle,
  },
  {
    kind: 'vendor_issue',
    label: 'Vendor issue',
    tag: 'vendor',
    privacy: 'chef_internal',
    placeholder: 'Vendor, item, impact, promised fix, and next contact.',
    icon: Truck,
  },
  {
    kind: 'loadout_state',
    label: 'Loadout',
    tag: 'loadout',
    privacy: 'chef_internal',
    placeholder: 'Packed, missing, broken, borrowed, or staged.',
    icon: PackageCheck,
  },
  {
    kind: 'household_fact',
    label: 'Household',
    tag: 'household',
    privacy: 'private_only',
    placeholder: 'Preference, access note, constraint, or relationship context.',
    icon: Home,
  },
  {
    kind: 'waste_note',
    label: 'Waste',
    tag: 'waste',
    privacy: 'chef_internal',
    placeholder: 'What was wasted, why, amount, and prevention idea.',
    icon: Recycle,
  },
  {
    kind: 'staff_performance',
    label: 'Staff',
    tag: 'staff',
    privacy: 'private_only',
    placeholder: 'Performance signal, delegation fit, risk, or coaching note.',
    icon: Users,
  },
  {
    kind: 'craft_note',
    label: 'Craft note',
    tag: 'craft',
    privacy: 'chef_internal',
    placeholder: 'Technique, menu learning, mise note, or future refinement.',
    icon: BookOpen,
  },
]

type DraftState = {
  kind: FieldCaptureKind
  note: string
  privacy: PrivacyDefault
  ownerHref: string
  ownerLabel: string
  attachmentName: string
  updatedAt: string
}

function getAction(kind: FieldCaptureKind) {
  return FIELD_CAPTURE_ACTIONS.find((action) => action.kind === kind) ?? FIELD_CAPTURE_ACTIONS[0]
}

function canUseStorage() {
  return typeof window !== 'undefined' && 'localStorage' in window
}

export function MobileFieldCaptureShell() {
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedKind, setSelectedKind] = useState<FieldCaptureKind>('incident')
  const selectedAction = useMemo(() => getAction(selectedKind), [selectedKind])
  const [note, setNote] = useState('')
  const [privacy, setPrivacy] = useState<PrivacyDefault>(selectedAction.privacy)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [ownerHref, setOwnerHref] = useState('/dashboard')
  const [ownerLabel, setOwnerLabel] = useState('Dashboard')
  const [online, setOnline] = useState(true)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const nextOwnerHref = searchParams.get('returnTo') || '/dashboard'
    const nextOwnerLabel = searchParams.get('ownerLabel') || 'Dashboard'
    setOwnerHref(
      nextOwnerHref.startsWith('/') && !nextOwnerHref.startsWith('//')
        ? nextOwnerHref
        : '/dashboard'
    )
    setOwnerLabel(nextOwnerLabel.slice(0, 48) || 'Dashboard')
  }, [searchParams])

  useEffect(() => {
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine)

    function handleOnline() {
      setOnline(true)
    }

    function handleOffline() {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!canUseStorage()) return
    const saved = window.localStorage.getItem(DRAFT_KEY)
    if (!saved) return
    try {
      const draft = JSON.parse(saved) as Partial<DraftState>
      if (draft.kind) setSelectedKind(draft.kind)
      if (draft.note) setNote(draft.note)
      if (draft.privacy) setPrivacy(draft.privacy)
      if (draft.ownerHref) setOwnerHref(draft.ownerHref)
      if (draft.ownerLabel) setOwnerLabel(draft.ownerLabel)
      if (draft.updatedAt) setDraftSavedAt(draft.updatedAt)
    } catch {
      window.localStorage.removeItem(DRAFT_KEY)
    }
  }, [])

  useEffect(() => {
    setPrivacy((current) => (current ? current : selectedAction.privacy))
  }, [selectedAction.privacy])

  useEffect(() => {
    if (!canUseStorage()) return
    const hasDraft = note.trim() || attachment
    if (!hasDraft) return
    const updatedAt = new Date().toISOString()
    const draft: DraftState = {
      kind: selectedKind,
      note,
      privacy,
      ownerHref,
      ownerLabel,
      attachmentName: attachment?.name ?? '',
      updatedAt,
    }
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    setDraftSavedAt(updatedAt)
  }, [attachment, note, ownerHref, ownerLabel, privacy, selectedKind])

  function clearDraft() {
    setNote('')
    setAttachment(null)
    setPrivacy(selectedAction.privacy)
    setDraftSavedAt(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (canUseStorage()) window.localStorage.removeItem(DRAFT_KEY)
  }

  function handleKindChange(kind: FieldCaptureKind) {
    const action = getAction(kind)
    setSelectedKind(kind)
    setPrivacy(action.privacy)
  }

  function handleSave() {
    if (!note.trim() && !attachment) {
      toast.error('Add a note or attachment before saving.')
      return
    }

    if (!online) {
      toast.info('Offline draft saved. Submit when the connection returns.')
      return
    }

    const attachmentLine = attachment
      ? `\n\nAttachment queued: ${attachment.name} (${Math.round(attachment.size / 1024)} KB)`
      : ''
    const rawContent = [
      `[${selectedAction.label}]`,
      `Privacy: ${privacy}`,
      `Owner: ${ownerLabel} (${ownerHref})`,
      note.trim() || 'Attachment-only field capture.',
      attachmentLine,
    ]
      .filter(Boolean)
      .join('\n')

    startTransition(async () => {
      try {
        await createCapture({
          captureType: attachment?.type.startsWith('image/') ? 'photo' : 'text',
          rawContent,
          tags: ['field-capture', selectedAction.tag, privacy],
          parsedItems: [
            {
              text: note.trim() || attachment?.name || selectedAction.label,
              category: selectedAction.kind,
              urgency: selectedAction.kind === 'incident' ? 'high' : 'medium',
              actionable: selectedAction.kind !== 'craft_note',
            },
          ],
          source: `mobile-field-capture:${selectedAction.kind}`,
        })
        toast.success('Field capture saved')
        clearDraft()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save field capture'
        toast.error(message)
      }
    })
  }

  const draftTime = draftSavedAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(draftSavedAt))
    : null

  return (
    <section
      className="overflow-x-hidden rounded-lg border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-950 sm:p-4"
      aria-labelledby="mobile-field-capture-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="mobile-field-capture-heading"
              className="text-base font-semibold leading-6 text-stone-950 dark:text-stone-50"
            >
              Field capture
            </h2>
            <Badge
              variant={privacy === 'private_only' ? 'warning' : 'info'}
              className="break-words"
            >
              {privacy === 'private_only' ? 'Private review' : 'Chef internal'}
            </Badge>
            {!online && (
              <Badge variant="warning" className="break-words">
                <WifiOff className="mr-1 h-3 w-3" />
                Offline draft
              </Badge>
            )}
          </div>
        </div>
        <Button
          href={ownerHref}
          variant="ghost"
          size="sm"
          className="w-full justify-start sm:w-auto"
          title={`Return to ${ownerLabel}`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="truncate">{ownerLabel}</span>
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FIELD_CAPTURE_ACTIONS.map((action) => {
          const Icon = action.icon
          const active = selectedKind === action.kind
          return (
            <button
              key={action.kind}
              type="button"
              onClick={() => handleKindChange(action.kind)}
              className={`min-h-14 rounded-lg border px-2 py-2 text-left text-sm font-medium transition active:scale-[0.98] ${
                active
                  ? 'border-stone-950 bg-stone-950 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-950'
                  : 'border-stone-200 bg-stone-50 text-stone-800 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-700'
              }`}
              aria-pressed={active}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="break-words leading-5">{action.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 space-y-3">
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={selectedAction.placeholder}
          className="min-h-36 w-full resize-y rounded-lg border border-stone-300 bg-white p-3 text-base leading-6 text-stone-950 placeholder:text-stone-500 focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-stone-100"
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200">
            <Shield className="h-4 w-4 shrink-0" />
            <select
              value={privacy}
              onChange={(event) => setPrivacy(event.target.value as PrivacyDefault)}
              className="min-w-0 flex-1 bg-transparent py-2 text-sm focus:outline-none"
              aria-label="Privacy default"
            >
              <option value="private_only">Private review</option>
              <option value="chef_internal">Chef internal</option>
            </select>
          </label>

          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200">
            <Paperclip className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {attachment ? attachment.name : 'Attach photo or file'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,audio/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-h-6 flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <Save className="h-3.5 w-3.5" />
            <span>{draftTime ? `Draft saved ${draftTime}` : 'Draft ready'}</span>
            {attachment && (
              <span className="break-words">
                <Camera className="mr-1 inline h-3.5 w-3.5" />
                Attachment staged
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={clearDraft}>
              Clear
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={isPending}
              disabled={isPending || !online}
            >
              <ClipboardList className="h-4 w-4" />
              Save capture
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
