'use client'

/**
 * DataControls - the "danger zone" panel where users can see their data
 * summary and delete specific categories or everything.
 * Also includes granular feature toggles for memory, suggestions, drafts.
 */

import { useState, useTransition } from 'react'
import {
  Trash2,
  MessageSquare,
  Brain,
  FileText,
  AlertTriangle,
  Check,
  ToggleLeft,
  ToggleRight,
  Power,
} from '@/components/ui/icons'
import type { AiDataSummary, AiPreferences } from '@/lib/ai/privacy-actions'
import {
  deleteAllConversations,
  deleteAllMemories,
  deleteAllArtifacts,
  deleteAllAiData,
  saveAiPreferences,
  disableRemy,
} from '@/lib/ai/privacy-actions'

type DeleteState = 'idle' | 'confirming' | 'deleting' | 'done'

function DeleteButton({
  label,
  count,
  icon: Icon,
  onDelete,
}: {
  label: string
  count: number
  icon: React.ElementType
  onDelete: () => Promise<void>
}) {
  const [state, setState] = useState<DeleteState>('idle')

  const handleClick = async () => {
    if (state === 'idle') {
      setState('confirming')
      return
    }
    if (state === 'confirming') {
      setState('deleting')
      try {
        await onDelete()
        setState('done')
        setTimeout(() => setState('idle'), 2000)
      } catch {
        setState('idle')
      }
    }
  }

  const handleCancel = () => setState('idle')

  if (state === 'done') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-950 p-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">Deleted</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-900 p-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-stone-300" />
        <div>
          <p className="text-sm font-medium text-stone-100">{label}</p>
          <p className="text-xs text-stone-500">
            {count} item{count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {state === 'confirming' && (
          <button onClick={handleCancel} className="text-xs text-stone-500 hover:text-stone-300">
            Cancel
          </button>
        )}
        <button
          onClick={handleClick}
          disabled={state === 'deleting' || count === 0}
          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            state === 'confirming'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'border border-red-200 text-red-600 hover:bg-red-950'
          } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          {state === 'deleting' ? (
            <>
              <div className="h-3 w-3 border border-white/30 border-t-white rounded-full animate-spin" />
              Deleting...
            </>
          ) : state === 'confirming' ? (
            <>
              <Trash2 className="h-3 w-3" />
              Confirm Delete
            </>
          ) : (
            <>
              <Trash2 className="h-3 w-3" />
              Delete
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function FeatureToggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string
  description: string
  enabled: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-900 p-3">
      <div>
        <p className="text-sm font-medium text-stone-100">{label}</p>
        <p className="text-xs text-stone-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`transition-colors ${enabled ? 'text-brand-500' : 'text-stone-300'}`}
        aria-label={`Toggle ${label}`}
      >
        {enabled ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
      </button>
    </div>
  )
}

export function DataControls({
  initialPrefs,
  initialSummary,
  onRefresh,
}: {
  initialPrefs: AiPreferences
  initialSummary: AiDataSummary
  onRefresh: () => void
}) {
  const [prefs, setPrefs] = useState(initialPrefs)
  const [summary, setSummary] = useState(initialSummary)
  const [saving, startSave] = useTransition()
  const [nuclearState, setNuclearState] = useState<DeleteState>('idle')
  const [disabling, setDisabling] = useState(false)

  const handleToggle = (
    key: 'allow_memory' | 'allow_suggestions' | 'allow_document_drafts',
    val: boolean
  ) => {
    const updated = { ...prefs, [key]: val }
    setPrefs(updated)
    startSave(async () => {
      await saveAiPreferences({ [key]: val })
    })
  }

  const handleDeleteConversations = async () => {
    const result = await deleteAllConversations()
    if (result.success) {
      setSummary((s) => ({ ...s, conversations: 0, messages: 0 }))
    }
  }

  const handleDeleteMemories = async () => {
    const result = await deleteAllMemories()
    if (result.success) {
      setSummary((s) => ({ ...s, memories: 0 }))
    }
  }

  const handleDeleteArtifacts = async () => {
    const result = await deleteAllArtifacts()
    if (result.success) {
      setSummary((s) => ({ ...s, artifacts: 0 }))
    }
  }

  const handleNuclearDelete = async () => {
    if (nuclearState === 'idle') {
      setNuclearState('confirming')
      return
    }
    if (nuclearState === 'confirming') {
      setNuclearState('deleting')
      try {
        const result = await deleteAllAiData()
        if (result.success) {
          setSummary({ conversations: 0, messages: 0, memories: 0, artifacts: 0 })
          setNuclearState('done')
          setTimeout(() => setNuclearState('idle'), 3000)
        }
      } catch {
        setNuclearState('idle')
      }
    }
  }

  const handleDisableRemy = async () => {
    setDisabling(true)
    try {
      const result = await disableRemy()
      if (result.success) {
        onRefresh()
      }
    } catch (err) {
      console.error('Failed to disable Remy:', err)
    } finally {
      setDisabling(false)
    }
  }

  const totalItems = summary.conversations + summary.memories + summary.artifacts

  return (
    <div className="space-y-6">
      {/* ─── Feature Toggles ───────────────────────────────── */}
      <div>
        <h3 className="font-semibold text-stone-100 mb-1">Feature Controls</h3>
        <p className="text-xs text-stone-500 mb-3">
          Turn individual features on or off. Changes take effect immediately.
        </p>
        <div className="space-y-2">
          <FeatureToggle
            label="Memory"
            description="Let Remy remember things between conversations"
            enabled={prefs.allow_memory}
            onChange={(val) => handleToggle('allow_memory', val)}
          />
          <FeatureToggle
            label="Suggestions"
            description="Let Remy proactively suggest helpful actions"
            enabled={prefs.allow_suggestions}
            onChange={(val) => handleToggle('allow_suggestions', val)}
          />
          <FeatureToggle
            label="Document Drafts"
            description="Let Remy draft emails and documents for you"
            enabled={prefs.allow_document_drafts}
            onChange={(val) => handleToggle('allow_document_drafts', val)}
          />
        </div>
        {saving && <p className="text-xs text-brand-500 mt-2">Saving...</p>}
      </div>

      {/* ─── Data Summary ──────────────────────────────────── */}
      <div>
        <h3 className="font-semibold text-stone-100 mb-1">Your AI Data</h3>
        <p className="text-xs text-stone-500 mb-3">
          Everything Remy knows about you. Delete individual categories or everything at once.
        </p>
        <div className="space-y-2">
          <DeleteButton
            label={`Conversations & Messages (${summary.messages} messages)`}
            count={summary.conversations}
            icon={MessageSquare}
            onDelete={handleDeleteConversations}
          />
          <DeleteButton
            label="Memories"
            count={summary.memories}
            icon={Brain}
            onDelete={handleDeleteMemories}
          />
          <DeleteButton
            label="Artifacts & Drafts"
            count={summary.artifacts}
            icon={FileText}
            onDelete={handleDeleteArtifacts}
          />
        </div>
      </div>

      {/* ─── Nuclear Delete ────────────────────────────────── */}
      <div className="rounded-xl border-2 border-red-200 bg-red-950/50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="font-semibold text-red-900">Delete All AI Data</h3>
        </div>
        <p className="text-sm text-red-700">
          This permanently deletes every conversation, memory, and artifact Remy has ever created.
          This cannot be undone.
        </p>
        <div className="flex items-center gap-3">
          {nuclearState === 'confirming' && (
            <button
              onClick={() => setNuclearState('idle')}
              className="text-sm text-stone-500 hover:text-stone-300"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleNuclearDelete}
            disabled={nuclearState === 'deleting' || totalItems === 0}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              nuclearState === 'confirming'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : nuclearState === 'done'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-red-500 text-white hover:bg-red-600'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            {nuclearState === 'deleting' ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting everything...
              </>
            ) : nuclearState === 'confirming' ? (
              <>
                <Trash2 className="h-4 w-4" />
                I&apos;m sure - delete everything
              </>
            ) : nuclearState === 'done' ? (
              <>
                <Check className="h-4 w-4" />
                All AI data deleted
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete All AI Data ({totalItems} items)
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Disable Remy ──────────────────────────────────── */}
      <div className="rounded-xl border border-stone-700 bg-stone-800 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Power className="h-5 w-5 text-stone-500" />
          <h3 className="font-semibold text-stone-100">Turn Off Remy</h3>
        </div>
        <p className="text-sm text-stone-500">
          Disable all AI features immediately. Your existing data is preserved until you choose to
          delete it - we never delete your data without your explicit action.
        </p>
        <button
          onClick={handleDisableRemy}
          disabled={disabling}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-600 bg-stone-900 px-4 py-2
                     text-sm font-medium text-stone-300 hover:bg-stone-700
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {disabling ? (
            <>
              <div className="h-4 w-4 border-2 border-stone-600 border-t-stone-600 rounded-full animate-spin" />
              Turning off...
            </>
          ) : (
            <>
              <Power className="h-4 w-4" />
              Turn Off Remy
            </>
          )}
        </button>
      </div>
    </div>
  )
}
