'use client'

// Allergy Records Panel
// Displays structured allergy records for a client with AI-detected
// records surfaced for chef confirmation.
// Replaces the flat allergy string[] with severity-aware, source-tracked records.

import { useState, useTransition } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  confirmAllergyRecord,
  dismissAllergyRecord,
  addAllergyRecord,
} from '@/lib/events/readiness'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AllergyRecord {
  id: string
  allergen: string
  severity: 'preference' | 'intolerance' | 'allergy' | 'anaphylaxis'
  source: 'chef_entered' | 'ai_detected' | 'intake_form' | 'client_stated'
  confirmed_by_chef: boolean
  confirmed_at: string | null
  notes: string | null
  created_at: string
}

interface AllergyRecordsPanelProps {
  clientId: string
  initialRecords: AllergyRecord[]
}

// ─── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  anaphylaxis: {
    label: 'Anaphylaxis',
    badge: 'error' as const,
    icon: ShieldAlert,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    description: 'Life-threatening — must avoid completely',
  },
  allergy: {
    label: 'Allergy',
    badge: 'error' as const,
    icon: AlertTriangle,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    description: 'Immune response — must avoid',
  },
  intolerance: {
    label: 'Intolerance',
    badge: 'warning' as const,
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    description: 'Causes discomfort — avoid where possible',
  },
  preference: {
    label: 'Preference',
    badge: 'default' as const,
    icon: Info,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
    description: 'Dislikes — accommodate if easy',
  },
}

const SOURCE_LABELS: Record<AllergyRecord['source'], string> = {
  chef_entered: 'Chef entered',
  ai_detected: 'AI detected — pending confirmation',
  intake_form: 'Intake form',
  client_stated: 'Client stated',
}

// ─── Add Record Form ──────────────────────────────────────────────────────────

function AddAllergyForm({
  clientId,
  onAdded,
}: {
  clientId: string
  onAdded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [allergen, setAllergen] = useState('')
  const [severity, setSeverity] = useState<string>('allergy')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!allergen.trim()) {
      setError('Please enter an allergen name')
      return
    }
    startTransition(async () => {
      setError(null)
      try {
        await addAllergyRecord(clientId, { allergen, severity, notes: notes || undefined })
        setAllergen('')
        setSeverity('allergy')
        setNotes('')
        setOpen(false)
        onAdded()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Add Allergen
      </Button>
    )
  }

  return (
    <div className="border border-stone-200 rounded-lg p-3 space-y-3 bg-stone-50">
      <p className="text-sm font-medium text-stone-700">Add Allergen Record</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Allergen *</label>
          <input
            type="text"
            value={allergen}
            onChange={(e) => setAllergen(e.target.value)}
            placeholder="e.g. Peanuts, Shellfish"
            className="w-full text-sm border border-stone-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Severity *</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="w-full text-sm border border-stone-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="preference">Preference (dislike)</option>
            <option value="intolerance">Intolerance</option>
            <option value="allergy">Allergy</option>
            <option value="anaphylaxis">Anaphylaxis (life-threatening)</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-stone-500 mb-1 block">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Small amounts OK, or EpiPen required"
          className="w-full text-sm border border-stone-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Allergen'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setError(null) }}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── Single Record Row ────────────────────────────────────────────────────────

function AllergyRecordRow({
  record,
  clientId,
  onUpdate,
}: {
  record: AllergyRecord
  clientId: string
  onUpdate: () => void
}) {
  const config = SEVERITY_CONFIG[record.severity]
  const Icon = config.icon
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showConfirmSeverity, setShowConfirmSeverity] = useState(false)
  const [newSeverity, setNewSeverity] = useState(record.severity)

  const handleConfirm = () => {
    startTransition(async () => {
      setError(null)
      try {
        await confirmAllergyRecord(record.id, { severity: newSeverity })
        onUpdate()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const handleDismiss = () => {
    startTransition(async () => {
      setError(null)
      try {
        await dismissAllergyRecord(record.id)
        onUpdate()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${config.bgColor}`}>
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-stone-900">{record.allergen}</span>
            <Badge variant={config.badge} className="text-xs">{config.label}</Badge>
            {!record.confirmed_by_chef && (
              <Badge variant="warning" className="text-xs">Unconfirmed</Badge>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">{config.description}</p>
          {record.notes && (
            <p className="text-xs text-stone-700 mt-1 italic">{record.notes}</p>
          )}
          <p className="text-xs text-stone-400 mt-1">
            Source: {SOURCE_LABELS[record.source]}
            {record.confirmed_by_chef && record.confirmed_at && (
              <> · Confirmed {new Date(record.confirmed_at).toLocaleDateString()}</>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!record.confirmed_by_chef && (
            <>
              <button
                onClick={() => setShowConfirmSeverity(!showConfirmSeverity)}
                className="text-xs text-green-700 hover:text-green-800 font-medium flex items-center gap-0.5 border border-green-300 rounded px-1.5 py-0.5 bg-white"
              >
                <CheckCircle2 className="h-3 w-3" />
                Confirm
              </button>
              <button
                onClick={handleDismiss}
                disabled={isPending}
                className="text-xs text-stone-500 hover:text-red-600 flex items-center gap-0.5 border border-stone-200 rounded px-1.5 py-0.5 bg-white"
              >
                <Trash2 className="h-3 w-3" />
                Dismiss
              </button>
            </>
          )}
          {record.confirmed_by_chef && (
            <button
              onClick={handleDismiss}
              disabled={isPending}
              className="text-xs text-stone-400 hover:text-red-500"
              title="Remove this allergen record"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Confirm with optional severity adjustment */}
      {showConfirmSeverity && !record.confirmed_by_chef && (
        <div className="ml-6 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-stone-600">Confirm severity:</label>
            <select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value as any)}
              className="text-xs border border-stone-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="preference">Preference</option>
              <option value="intolerance">Intolerance</option>
              <option value="allergy">Allergy</option>
              <option value="anaphylaxis">Anaphylaxis</option>
            </select>
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 flex items-center gap-1"
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Confirm
            </button>
          </div>
        </div>
      )}

      {error && <p className="ml-6 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function AllergyRecordsPanel({
  clientId,
  initialRecords,
}: AllergyRecordsPanelProps) {
  const [records, setRecords] = useState(initialRecords)

  const handleUpdate = () => {
    // Reload to get fresh data from server
    window.location.reload()
  }

  const unconfirmed = records.filter((r) => !r.confirmed_by_chef)
  const confirmed = records.filter((r) => r.confirmed_by_chef)
  const hasCritical = records.some((r) => r.severity === 'anaphylaxis')

  return (
    <Card className={hasCritical ? 'border-red-300' : unconfirmed.length > 0 ? 'border-amber-200' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Allergens & Dietary</CardTitle>
            {hasCritical && (
              <Badge variant="error" className="text-xs">Anaphylaxis Risk</Badge>
            )}
            {!hasCritical && unconfirmed.length > 0 && (
              <Badge variant="warning" className="text-xs">{unconfirmed.length} Unconfirmed</Badge>
            )}
          </div>
          <AddAllergyForm clientId={clientId} onAdded={handleUpdate} />
        </div>
        {unconfirmed.length > 0 && (
          <p className="text-xs text-amber-700 mt-1">
            {unconfirmed.length} AI-detected allergen{unconfirmed.length > 1 ? 's' : ''} need your confirmation before they lock into planning documents.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {records.length === 0 && (
          <p className="text-sm text-stone-400 text-center py-4">
            No allergens recorded yet. Add any known allergies or dietary restrictions.
          </p>
        )}

        {/* Unconfirmed first (AI-detected) */}
        {unconfirmed.map((r) => (
          <AllergyRecordRow key={r.id} record={r} clientId={clientId} onUpdate={handleUpdate} />
        ))}

        {/* Confirmed below */}
        {confirmed.map((r) => (
          <AllergyRecordRow key={r.id} record={r} clientId={clientId} onUpdate={handleUpdate} />
        ))}
      </CardContent>
    </Card>
  )
}
